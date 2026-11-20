// Real SDK/rules checks are restricted to a local emulator and demo project.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {saveMonthlyPayment,correctReceipt,deleteReceipt} from '../public/admin-feature-store.js';
import {indiaDate} from '../public/admin-feature-model.js';
const require=createRequire(import.meta.url);
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,updateDoc,runTransaction}=require('firebase/firestore');
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088')throw Error('Use the local Firestore emulator on 127.0.0.1:8088 only.');
const env=await initializeTestEnvironment({projectId:'demo-rehaan-receipt-delete',firestore:{host:'127.0.0.1',port:8088,rules:readFileSync('firestore.rules','utf8')}});
const due='2026-02-14',a='a'.repeat(32),b='b'.repeat(32),op='c'.repeat(32);
const student={fullName:'Receipt Delete Fixture',phone:'9999999991',coursePreference:'Diploma',status:'Approved',admissionNumber:'001',admissionDate:'2026-01-14',monthlyFees:{[due]:200,'2026-03-14':999},payment:{status:'paid',amount:100,providerId:'keep'},photo:'private-reference',markCard:{title:'Keep'},unknown:{all:['preserved']}};
try{
 await env.clearFirestore();await env.withSecurityRulesDisabled(async c=>{for(const uid of ['admin-one','admin-two'])await setDoc(doc(c.firestore(),'admins',uid),{uid,isAdmin:true});for(const id of ['student','race','corrected','protected'])await setDoc(doc(c.firestore(),'applications',id),student);});
 const first=env.authenticatedContext('admin-one').firestore(),second=env.authenticatedContext('admin-two').firestore();
 const pay=(db,id,extra={})=>saveMonthlyPayment({db,ref:doc(db,'applications',id),counterRef:doc(db,'receiptCounters','tuition'),runTransaction,assertSession:()=>{},actor:db===first?'admin-one':'admin-two',id,due,amount:400,expectedPaid:200,expectedAdmission:'001',expectedJoined:'2026-01-14',receiptId:a,...extra});
 const request=(db,id,r,extra={})=>({db,ref:doc(db,'applications',id),runTransaction,assertSession:()=>{},actor:db===first?'admin-one':'admin-two',id,receiptId:r.id,deletionId:op,input:{reason:'Accidentally recorded payment'},expected:r,expectedPaid:600,...extra});
 const read=async id=>(await getDoc(doc(first,'applications',id))).data();
 const receipt=await pay(first,'student');const other=await pay(first,'student',{receiptId:b,amount:100,expectedPaid:600});
 const counterBefore=(await getDoc(doc(first,'receiptCounters','tuition'))).data();
 const original=await read('student'),args=request(first,'student',receipt,{expectedPaid:700});const removed=await deleteReceipt(args);assert.equal(removed.totalPaid,300);
 const after=await read('student');assert.equal(after.monthlyFees[due],300);assert.equal(after.feeReceipts[a],undefined);assert.deepEqual(after.feeReceipts[b],other);assert.equal(after.monthlyFees['2026-03-14'],999);
 for(const key of ['payment','photo','markCard','unknown','fullName'])assert.deepEqual(after[key],original[key]);
 assert.deepEqual((await getDoc(doc(first,'receiptCounters','tuition'))).data(),counterBefore);
 assert.deepEqual(await deleteReceipt(args),removed);assert.deepEqual(await read('student'),after);await assert.rejects(pay(first,'student'),/deleted/);
 const deletes=await Promise.allSettled([deleteReceipt(request(first,'student',other,{expectedPaid:300,deletionId:'d'.repeat(32)})),deleteReceipt(request(second,'student',other,{expectedPaid:300,deletionId:'e'.repeat(32)}))]);assert.equal(deletes.filter(r=>r.status==='fulfilled').length,1);assert.equal((await read('student')).monthlyFees[due],200);
 console.log('PASS: actual SDK atomically removes receipt and payment, preserves other data/numbering, handles retries, blocks resurrection and concurrent double deletion');
 const r=await pay(first,'race');const concurrent=await Promise.allSettled([deleteReceipt(request(first,'race',r)),pay(second,'race',{receiptId:b,amount:100,expectedPaid:600})]);assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);const race=await read('race');assert.equal(race.monthlyFees[due],200+Object.values(race.feeReceipts).reduce((sum,r)=>sum+r.amount/100,0));
 const originalCorrected=await pay(first,'corrected');const correction=await correctReceipt({db:first,ref:doc(first,'applications','corrected'),runTransaction,assertSession:()=>{},actor:'admin-one',receiptId:a,correctionId:'f'.repeat(32),input:{name:student.fullName,admission:'001',course:'Diploma',date:indiaDate(),method:'Cash',amount:'300',note:'',reason:'Correcting accidental amount'},expected:originalCorrected,expectedPaid:600});await deleteReceipt(request(first,'corrected',correction.receipt,{expectedPaid:500}));assert.equal((await read('corrected')).monthlyFees[due],200);
 console.log('PASS: real transaction conflicts cannot lose a concurrent payment; corrected receipts reverse their current amount');
 const protectedReceipt=await pay(first,'protected'),protectedBefore=await read('protected');
 for(const db of [env.unauthenticatedContext().firestore(),env.authenticatedContext('not-an-admin').firestore()]){
  await assertFails(deleteReceipt(request(db,'protected',protectedReceipt)));
  await assertFails(updateDoc(doc(db,'applications','protected'),{feeReceipts:{},monthlyFees:{},feeReceiptDeletions:{[a]:{id:op}}}));
  await assertFails(getDoc(doc(db,'applications','protected')));
 }
 assert.deepEqual(await read('protected'),protectedBefore);
 console.log('PASS: existing Firestore rules deny public and non-admin receipt/ledger removal or private-data reads; no rules change required');
}finally{await env.cleanup();}
