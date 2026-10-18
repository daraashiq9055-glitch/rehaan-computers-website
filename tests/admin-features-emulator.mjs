// Run only against the local demo emulator, never a real Firebase project.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {saveMarkCard,saveMonthlyPayment,correctReceipt} from '../public/admin-feature-store.js';
import {indiaDate} from '../public/admin-feature-model.js';
const require=createRequire(import.meta.url);
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,runTransaction}=require('firebase/firestore');
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088')throw Error('Local demo emulator on 127.0.0.1:8088 is required.');
const env=await initializeTestEnvironment({projectId:'demo-rehaan-features',firestore:{host:'127.0.0.1',port:8088,rules:readFileSync('firestore.rules','utf8')}});
const student={fullName:'Emulator Fixture',phone:'9999999991',status:'Approved',admissionNumber:'TEST/001',admissionDate:'2026-01-14',monthlyFees:{'2026-02-14':200},payment:{status:'paid',amount:100,providerId:'keep'},photo:'retained-photo-reference',unknown:{all:['original','fields']}};
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async context=>{const db=context.firestore();for(const uid of ['admin-one','admin-two'])await setDoc(doc(db,'admins',uid),{uid,isAdmin:true});for(const id of ['student','concurrent'])await setDoc(doc(db,'applications',id),student);});
 const first=env.authenticatedContext('admin-one').firestore(),second=env.authenticatedContext('admin-two').firestore();
 const input=(db,id='student',receiptId='a'.repeat(32))=>({db,ref:doc(db,'applications',id),runTransaction,assertSession:()=>{},actor:db===first?'admin-one':'admin-two',id,due:'2026-02-14',amount:400,expectedPaid:200,expectedAdmission:'TEST/001',expectedJoined:'2026-01-14',receiptId});
 const receipt=await saveMonthlyPayment(input(first));assert.equal(receipt.balanceAtIssue,39900);
 const persisted=(await getDoc(doc(second,'applications','student'))).data();assert.equal(persisted.monthlyFees['2026-02-14'],600);assert.deepEqual(persisted.feeReceipts[receipt.id],receipt);for(const key of ['payment','photo','unknown'])assert.deepEqual(persisted[key],student[key]);
 assert.deepEqual(await saveMonthlyPayment(input(first)),receipt);assert.equal((await getDoc(doc(first,'applications','student'))).data().monthlyFees['2026-02-14'],600);
 const result=await Promise.allSettled([saveMonthlyPayment(input(first,'concurrent','b'.repeat(32))),saveMonthlyPayment(input(second,'concurrent','c'.repeat(32)))]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.match(result.find(r=>r.status==='rejected').reason.message,/changed/);const simultaneous=(await getDoc(doc(first,'applications','concurrent'))).data();assert.equal(simultaneous.monthlyFees['2026-02-14'],600);assert.equal(Object.keys(simultaneous.feeReceipts).length,1);
 const correction={name:'Emulator Fixture',admission:'TEST/001',course:'Diploma',date:indiaDate(),method:'Cash',note:'Corrected after checking cash register',reason:'Original amount entered incorrectly',amount:'300'};
 const correctionArgs=db=>({db,ref:doc(db,'applications','student'),runTransaction,assertSession:()=>{},actor:db===first?'admin-one':'admin-two',receiptId:receipt.id,correctionId:'e'.repeat(32),input:correction,expected:receipt,expectedPaid:600});
 const corrected=await correctReceipt(correctionArgs(first));assert.equal(corrected.totalPaid,500);assert.equal(corrected.receipt.amount,30000);assert.equal(corrected.receipt.balanceAtIssue,49900);assert.equal(corrected.receipt.amendments[0].before.amount,40000);
 assert.deepEqual(await correctReceipt(correctionArgs(first)),corrected);
 await assert.rejects(correctReceipt({...correctionArgs(second),correctionId:'f'.repeat(32)}),/another session/);
 await assert.rejects(correctReceipt({...correctionArgs(second),expected:corrected.receipt,expectedPaid:499,correctionId:'4'.repeat(32)}),/ledger changed/);
 const nextArgs=db=>({...correctionArgs(db),expected:corrected.receipt,expectedPaid:500,input:{...correction,amount:'350'},correctionId:(db===first?'1':'2').repeat(32)});
 const concurrentCorrections=await Promise.allSettled([correctReceipt(nextArgs(first)),correctReceipt(nextArgs(second))]);assert.equal(concurrentCorrections.filter(r=>r.status==='fulfilled').length,1);assert.match(concurrentCorrections.find(r=>r.status==='rejected').reason.message,/another session/);
 const revised=(await getDoc(doc(first,'applications','student'))).data();assert.equal(revised.monthlyFees['2026-02-14'],550);assert.equal(revised.feeReceipts[receipt.id].amendments.length,2);for(const key of ['payment','photo','unknown'])assert.deepEqual(revised[key],student[key]);
 const card={title:'Emulator assessment',date:indiaDate(),subjects:[{name:'Theory',max:100,marks:85},{name:'Practical',max:100,marks:92}]};
 const mark=await saveMarkCard({db:first,ref:doc(first,'applications','student'),runTransaction,assertSession:()=>{},actor:'admin-one',card,expected:null});const after=(await getDoc(doc(second,'applications','student'))).data();assert.deepEqual(after.markCard,mark);assert.deepEqual(after.feeReceipts,revised.feeReceipts);assert.deepEqual(after.payment,student.payment);
 await assert.rejects(saveMarkCard({db:second,ref:doc(second,'applications','student'),runTransaction,assertSession:()=>{},actor:'admin-two',card:{...card,title:'Stale edit'},expected:null}),/another session/);
 const anonymous=env.unauthenticatedContext().firestore(),nonAdmin=env.authenticatedContext('not-admin').firestore();
 for(const db of [anonymous,nonAdmin]){await assertFails(getDoc(doc(db,'applications','student')));await assert.rejects(saveMonthlyPayment(input(db,'student','d'.repeat(32))));await assert.rejects(correctReceipt({...correctionArgs(db),correctionId:'3'.repeat(32)}));await assert.rejects(saveMarkCard({db,ref:doc(db,'applications','student'),runTransaction,assertSession:()=>{},actor:'not-admin',card,expected:null}));}
 const base={fullName:'Public applicant',phone:'9999999991',coursePreference:'Diploma',status:'Pending Payment',payment:{status:'awaiting',amount:100}};
 await assertFails(setDoc(doc(anonymous,'applications','injected-marks'),{...base,markCard:card}));await assertFails(setDoc(doc(anonymous,'applications','injected-receipt'),{...base,feeReceipts:{fake:receipt}}));
 console.log('PASS: actual Firestore SDK + deployed rules preserve records, persist marks, atomically save receipts, audit atomic receipt corrections, reject concurrent corrections/duplicates/stale marks and deny non-admin access/injection');
}finally{await env.cleanup();}
