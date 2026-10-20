import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditEvent,recordAudit} from '../backend/audit/audit.js';
import {createAuditReader} from '../backend/audit/reader.js';

const snapshot=value=>({exists:value!==null,data:()=>structuredClone(value)});
const event=(old,next,extra={})=>({id:'event-123',project:'demo-rehaan-audit',database:'(default)',params:{applicationId:'student-one'},time:'2026-10-20T10:00:00Z',authType:'unknown',authId:'real-admin',data:{before:snapshot(old),after:snapshot(next)},...extra});

test('create/update/delete history uses trusted context, retains deleted evidence and never mutates student data',()=>{
  const old={fullName:'Student',status:'Approved',monthlyFees:{Jan:200},payment:{status:'paid',amount:100},legacy:{private:'value'}};
  const next={...structuredClone(old),monthlyFees:{Jan:300},updatedBy:'forged-admin'};
  const originals=structuredClone({old,next});
  const entry=auditEvent(event(old,next));
  assert.equal(entry.actor.principal,'real-admin');assert.equal(entry.operation,'updated');
  assert.deepEqual(entry.changes.find(row=>row.field==='monthlyFees.Jan'),{field:'monthlyFees.Jan',before:{present:true,value:200},after:{present:true,value:300}});
  assert.deepEqual({old,next},originals);
  assert.equal(auditEvent(event(null,old)).operation,'created');
  const deleted=auditEvent(event(old,null));assert.equal(deleted.operation,'deleted');assert.equal(deleted.changes.find(row=>row.field==='fullName').before.value,'Student');
  assert.equal(auditEvent(event(old,old)),null);
  assert.equal(auditEvent(event(null,null)),null);
  assert.throws(()=>auditEvent({...event(old,next),id:null}),/context/);
});

test('photos, payment tokens, nested credentials and unknown values cannot leak into the private journal',()=>{
  const input={fullName:'Student',paymentToken:'raw-token-never-log',photo:'data:image/jpeg;base64,private-image',unknownField:{secretText:'do-not-copy'},payment:{amount:100,status:'paid',gatewayPayload:{secret:'provider-secret'}},feeReceipts:{r:{amount:300,secret:'nested-secret',paymentToken:'nested-token',photo:'nested-photo'}}};
  const entry=auditEvent(event(null,input)),text=JSON.stringify(entry);
  for(const secret of ['raw-token-never-log','private-image','do-not-copy','provider-secret','nested-secret','nested-token','nested-photo'])assert.ok(!text.includes(secret),secret);
  assert.equal(entry.changes.find(row=>row.field==='payment').after.value.amount,100);
  assert.equal(entry.changes.find(row=>row.field==='photo').after.hasPhoto,true);
  const blank=auditEvent(event(null,{photo:''}));assert.equal(blank.changes[0].after.hasPhoto,false);
});

test('missing server identity stays unattributed, never inferred from client fields',()=>{
  for(const authType of ['unknown','unauthenticated','service_account','system','api_key']){
    const entry=auditEvent(event({}, {updatedBy:'fake',fullName:'Name'}, {authType,authId:undefined}));
    assert.equal(entry.actor.principal,null);assert.equal(entry.actor.attribution,'unavailable');assert.equal(entry.actor.type,authType);
  }
  assert.equal(auditEvent(event({}, {fullName:'Name'},{authType:'service_account',authId:'payments@project.iam.gserviceaccount.com'})).actor.principal,'payments@project.iam.gserviceaccount.com');
});

test('concurrent delivery/retries create one immutable entry; failed writes propagate and a later retry recovers',async()=>{
  const docs=new Map();let fail=true;
  const create=async(id,data)=>{if(fail)throw Object.assign(Error('Unavailable'),{code:14});if(docs.has(id))throw Object.assign(Error('Exists'),{code:6});docs.set(id,data);};
  const e=event({monthlyFees:{Jan:200}},{monthlyFees:{Jan:300}});
  await assert.rejects(recordAudit(e,{create}),/Unavailable/);assert.equal(docs.size,0);
  fail=false;const results=await Promise.all([recordAudit(e,{create}),recordAudit(e,{create}),recordAudit(e,{create})]);
  assert.equal(docs.size,1);assert.equal(results.filter(row=>row.created).length,1);
  const original=structuredClone([...docs.values()][0]);await recordAudit(e,{create,now:()=> 'later'});assert.deepEqual([...docs.values()][0],original);
  assert.notEqual(auditEvent({...e,id:'event-next'}).id,auditEvent(e).id);
});

test('large histories are explicitly bounded below Firestore size limits, including unicode and nested receipts',()=>{
  const receipt={note:'₹'.repeat(50000),amount:100,history:Array.from({length:120},()=>({note:'x'.repeat(2000)}))};
  const old={feeReceipts:Object.fromEntries(Array.from({length:150},(_,i)=>['r'+i,{amount:1}]))};
  const next={feeReceipts:Object.fromEntries(Array.from({length:150},(_,i)=>['r'+i,receipt]))};
  const result=auditEvent(event(old,next));assert.equal(result.limited,true);assert.ok(Buffer.byteLength(JSON.stringify(result))<400000);
  assert.match(JSON.stringify(result),/entry limit|size limit|array limit/);
});

test('candidate rules preserve every existing application/admin rule and add only bounded admin reads for audit history',()=>{
  const production=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
  const candidate=readFileSync(new URL('../backend/audit/firestore.rules',import.meta.url),'utf8');
  const block=candidate.slice(candidate.indexOf('    /* Server-created audit entries:'),candidate.indexOf('    /*\n     * Everything else is denied.'));
  assert.equal(candidate.replace(block,''),production);
  assert.match(block,/allow create, update, delete: if false/);
  const config=JSON.parse(readFileSync(new URL('../firebase.audit.json',import.meta.url),'utf8'));
  assert.ok(!config.hosting);assert.equal(config.functions[0].codebase,'application-audit');
});

test('read-only history loader scopes pages, applies a stable cursor and discards results after a session change',async()=>{
  let uid='admin1',queries=[],wait=false;
  const doc={id:'event1',data:()=>({operation:'updated'})};
  const sdk=Object.fromEntries(['collection','where','orderBy','documentId','startAfter','limit','query'].map(name=>[name,(...args)=>({name,args})]));
  sdk.getDocs=async query=>{queries.push(query);if(wait)uid='admin2';return {docs:[doc]};};
  const page=createAuditReader({db:{},sdk,identity:()=>uid?{uid}:null});
  const first=await page({applicationId:'student1',pageSize:1});assert.deepEqual(first.entries,[{id:'event1',operation:'updated'}]);assert.equal(first.hasMore,true);
  await page({after:first.cursor});assert.match(JSON.stringify(queries),/startAfter/);assert.match(JSON.stringify(queries),/applicationId/);
  assert.doesNotMatch(Object.keys(sdk).join(),/setDoc|updateDoc|deleteDoc/);
  await assert.rejects(page({pageSize:101}),/size/);await assert.rejects(page({applicationId:'bad/id'}),/identifier/);
  wait=true;await assert.rejects(page(),/session changed/);uid=null;await assert.rejects(page(),/Sign in/);
});
