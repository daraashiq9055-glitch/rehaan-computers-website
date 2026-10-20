// Explicit local-only guard: neither Admin SDK nor test contexts may reach production.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {recordAudit} from '../backend/audit/audit.js';
import {createAuditReader} from '../backend/audit/reader.js';
import {saveMonthlyPayment,correctReceipt} from '../public/admin-feature-store.js';
const require=createRequire(new URL('../backend/audit/package.json',import.meta.url));
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const sdk=require('firebase/firestore');
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088')throw Error('Only the local emulator at 127.0.0.1:8088 is supported.');
const projectId='demo-rehaan-audit';
const env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8088,rules:readFileSync(new URL('../backend/audit/firestore.rules',import.meta.url),'utf8')}});
const app=initializeApp({projectId},'audit-emulator');
const db=getFirestore(app);
const student={fullName:'Local audit fixture',phone:'9999999991',status:'Approved',admissionNumber:'TEST/001',admissionDate:'2026-01-14',coursePreference:'Diploma',monthlyFees:{'2026-02-14':200},payment:{status:'paid',amount:100,providerId:'retain-original'},photo:'private-reference',legacy:{all:['retained']}};
try {
  await env.clearFirestore();
  for(const uid of ['admin-one','admin-two'])await db.doc('admins/'+uid).set({uid,isAdmin:true});
  await db.doc('admins/mismatched').set({uid:'different-uid',isAdmin:true});
  const first=env.authenticatedContext('admin-one').firestore(),second=env.authenticatedContext('admin-two').firestore();
  const anon=env.unauthenticatedContext().firestore(),outsider=env.authenticatedContext('not-admin').firestore(),mismatched=env.authenticatedContext('mismatched').firestore();
  const ref=sdk.doc(first,'applications','student-one');await sdk.setDoc(ref,student);
  const before=await db.doc('applications/student-one').get();
  const args=(client,id)=>({db:client,ref:sdk.doc(client,'applications','student-one'),runTransaction:sdk.runTransaction,assertSession:()=>{},actor:'admin-one',id:'student-one',due:'2026-02-14',expectedPaid:200,expectedAdmission:'TEST/001',expectedJoined:'2026-01-14',amount:100,receiptId:id});
  const receipt=await saveMonthlyPayment(args(first,'a'.repeat(32)));
  const after=await db.doc('applications/student-one').get();
  const event={id:'trusted-local-delivery',project:projectId,database:'(default)',time:new Date().toISOString(),params:{applicationId:'student-one'},authType:'unknown',authId:'admin-one',data:{before,after}};
  const create=(id,payload)=>db.collection('applicationAudit').doc(id).create(payload);
  const entries=await Promise.all([recordAudit(event,{create}),recordAudit(event,{create}),recordAudit(event,{create})]);
  assert.equal(entries.filter(entry=>entry.created).length,1);
  assert.equal((await db.collection('applicationAudit').get()).size,1);
  const logRef=client=>sdk.doc(client,'applicationAudit',entries[0].id);
  for(const client of [first,second]){
    const stored=await assertSucceeds(sdk.getDoc(logRef(client)));assert.equal(stored.data().actor.principal,'admin-one');
    await assertSucceeds(sdk.getDocs(sdk.query(sdk.collection(client,'applicationAudit'),sdk.orderBy('occurredAt','desc'),sdk.limit(30))));
    await assertFails(sdk.setDoc(sdk.doc(client,'applicationAudit','fake'),{actor:{principal:'admin-two'}}));
    await assertFails(sdk.updateDoc(logRef(client),{operation:'forged'}));await assertFails(sdk.deleteDoc(logRef(client)));
    await assertFails(sdk.getDocs(sdk.collection(client,'applicationAudit')));
    await assertFails(sdk.getDocs(sdk.query(sdk.collection(client,'applicationAudit'),sdk.limit(101))));
  }
  for(const client of [anon,outsider,mismatched]){
    await assertFails(sdk.getDoc(logRef(client)));
    await assertFails(sdk.getDocs(sdk.query(sdk.collection(client,'applicationAudit'),sdk.limit(30))));
    await assertFails(sdk.setDoc(sdk.doc(client,'applicationAudit','fake'),{operation:'forged'}));
    await assertFails(sdk.deleteDoc(logRef(client)));
  }
  const read=createAuditReader({db:second,sdk,identity:()=>({uid:'admin-two'})});
  const page=await read({applicationId:'student-one',pageSize:1});assert.equal(page.entries.length,1);assert.equal((await read({after:page.cursor,applicationId:'student-one'})).entries.length,0);
  console.log('PASS: actual emulator rules permit both verified admins to read bounded history; every client is denied create/edit/delete; signed-out, non-admin and mismatched-admin reads fail; stable pagination works');
  // Simulated delivery failure must not roll back or rewrite a committed student/payment.
  const committed=after.data();await assert.rejects(recordAudit({...event,id:'retry-delivery'},{create:async()=>{throw Error('log temporarily unavailable');}}));
  assert.deepEqual((await db.doc('applications/student-one').get()).data(),committed);
  await recordAudit({...event,id:'retry-delivery'},{create});assert.equal((await db.collection('applicationAudit').get()).size,2);
  const revised=await correctReceipt({db:second,ref:sdk.doc(second,'applications','student-one'),runTransaction:sdk.runTransaction,assertSession:()=>{},actor:'admin-two',receiptId:receipt.id,expected:committed.feeReceipts[receipt.id],expectedPaid:300,correctionId:'b'.repeat(32),input:{name:'Local audit fixture',admission:'TEST/001',course:'Diploma',date:'2026-10-20',method:'Cash',note:'Corrected fixture',reason:'Local test correction',amount:'150'}});
  const corrected=(await db.doc('applications/student-one').get()).data();
  assert.equal(corrected.monthlyFees['2026-02-14'],350);
  for(const key of ['photo','payment','legacy','admissionNumber'])assert.deepEqual(corrected[key],student[key]);
  assert.equal(revised.receipt.amount,15000);
  await assert.rejects(saveMonthlyPayment(args(second,'c'.repeat(32))));
  console.log('PASS: logging failure/retry leaves committed payment intact; real SDK saves payment and receipt atomically, corrects amount with history, preserves legacy/photo/admission fields and rejects stale balances');
} finally {await env.cleanup();await db.terminate();await deleteApp(app);}
