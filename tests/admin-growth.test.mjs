import test from 'node:test';import assert from 'node:assert/strict';
import {validateProspect,prospectMessage,validateIncome,validateConcession,leagueRankings,improvementMessage} from '../previews/admin-premium/growth-model.js';
import {saveGrowthRecord,saveConcession} from '../previews/admin-premium/growth-store.js';

test('provisional registry validates contact details and prepares respectful reminder/cancellation text',()=>{
 const row=validateProspect({name:' Aamir Shah ',phone:'90000 00101',course:'Excel',visitDate:'2026-11-22',followUpDate:'2026-11-24',status:'Interested',source:'Physical register',notes:''});
 assert.equal(row.phone,'9000000101');assert.match(prospectMessage(row),/continue with admission/);assert.match(prospectMessage(row,'cancel'),/No admission was created/);
 assert.throws(()=>validateProspect({...row,phone:'123'}),/10-digit/);assert.throws(()=>validateProspect({...row,name:'<\u0000'}),/Student name/);
});
test('manual income is paise-safe and expenses are not an accepted category or data shape',()=>{
 const row=validateIncome({date:'2026-11-22',amount:'125.50',category:'Certificate fee',method:'UPI',reference:'UPI-1',note:''});assert.equal(row.amount,12550);assert.equal(row.method,'UPI');
 assert.throws(()=>validateIncome({...row,amount:-1}),/valid amount/);assert.equal('expense' in row,false);
});
test('a concession must exactly settle the month and remains distinct from received cash',()=>{
 const full=validateConcession({due:'2026-11-12',type:'Full concession',concession:999,reason:'Approved absence for this learning month.'},{monthly:999,paid:0});assert.equal(full.concession,99900);assert.equal(full.paidBefore,0);
 const partial=validateConcession({due:'2026-11-12',type:'Half-month fee',concession:499,reason:'Half-month attendance approved.'},{monthly:999,paid:500});assert.equal(partial.concession,49900);
 assert.throws(()=>validateConcession({due:'2026-11-12',type:'Partial concession',concession:300,reason:'Approved reason'},{monthly:999,paid:500}),/exactly settle/);
});
test('weekly league ranks only complete results and creates targeted improvement guidance',()=>{
 const row=(id,p,complete=true,subject={name:'Typing',max:100,marks:p,typing:{speed:20,accuracy:82}})=>({id,name:'Student '+id,result:{complete,percentage:p,total:p,maximum:100,grade:'B'},card:{subjects:[subject]}}),rows=[row('a',90),row('b',30),row('c',70),row('d',99,false)];
 const rank=leagueRankings(rows,3);assert.deepEqual(rank.top.map(r=>r.id),['a','c','b']);assert.deepEqual(rank.improve.map(r=>r.id),['b','c','a']);assert.doesNotMatch(JSON.stringify(rank),/"d"/);assert.match(improvementMessage(rows[1]),/accuracy/);
});
function harness(data){let value=structuredClone(data),writes=0;return {get value(){return value},get writes(){return writes},runTransaction:async(_db,fn)=>fn({get:async()=>({exists:()=>value!==undefined,data:()=>structuredClone(value)}),set:(_ref,next)=>{value=structuredClone(next);writes++},update:(_ref,patch)=>{for(const [path,next] of Object.entries(patch)){const keys=path.split('.');let target=value;for(const key of keys.slice(0,-1))target=target[key]??=( {});target[keys.at(-1)]=structuredClone(next);}writes++;}})}}
test('growth saves reject stale edits and concession transaction preserves unrelated student data',async()=>{
 const h=harness(undefined),input={name:'Aamir Shah',phone:'9000000101',course:'Excel',visitDate:'2026-11-22',followUpDate:'',status:'Interested',source:'Register',notes:''};
 const saved=await saveGrowthRecord({db:{},ref:{},runTransaction:h.runTransaction,assertSession(){},actor:'admin',kind:'prospect',input,expected:null,now:'2026-11-22T10:00:00.000Z'});assert.equal(saved.revision,1);await assert.rejects(saveGrowthRecord({db:{},ref:{},runTransaction:h.runTransaction,assertSession(){},actor:'admin',kind:'prospect',input,expected:null}),/changed/);
 const student=harness({fullName:'Student',status:'Approved',admissionNumber:'001',monthlyFees:{},custom:{kept:true}});const concession=await saveConcession({db:{},ref:{},runTransaction:student.runTransaction,assertSession(){},actor:'admin',id:'s1',input:{due:'2026-11-12',type:'Full concession',concession:999,reason:'Approved no-fee month.'},expectedPaid:0,now:'2026-11-22T10:00:00.000Z'});assert.equal(student.value.monthlyFees['2026-11-12'],999);assert.equal(student.value.feeConcessions['2026-11-12'].concession,99900);assert.deepEqual(student.value.custom,{kept:true});assert.equal(concession.studentId,'s1');
});
