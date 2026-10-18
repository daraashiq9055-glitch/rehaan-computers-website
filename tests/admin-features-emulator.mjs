// Run only against the local demo emulator, never a real Firebase project.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {saveMarkCard,saveMonthlyPayment} from '../public/admin-feature-store.js';
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
 const card={title:'Emulator assessment',date:indiaDate(),subjects:[{name:'Theory',max:100,marks:85},{name:'Practical',max:100,marks:92}]};
 const mark=await saveMarkCard({db:first,ref:doc(first,'applications','student'),runTransaction,assertSession:()=>{},actor:'admin-one',card,expected:null});const after=(await getDoc(doc(second,'applications','student'))).data();assert.deepEqual(after.markCard,mark);assert.deepEqual(after.feeReceipts,persisted.feeReceipts);assert.deepEqual(after.payment,student.payment);
 await assert.rejects(saveMarkCard({db:second,ref:doc(second,'applications','student'),runTransaction,assertSession:()=>{},actor:'admin-two',card:{...card,title:'Stale edit'},expected:null}),/another session/);
 const anonymous=env.unauthenticatedContext().firestore(),nonAdmin=env.authenticatedContext('not-admin').firestore();
 for(const db of [anonymous,nonAdmin]){await assertFails(getDoc(doc(db,'applications','student')));await assert.rejects(saveMonthlyPayment(input(db,'student','d'.repeat(32))));await assert.rejects(saveMarkCard({db,ref:doc(db,'applications','student'),runTransaction,assertSession:()=>{},actor:'not-admin',card,expected:null}));}
 const base={fullName:'Public applicant',phone:'9999999991',coursePreference:'Diploma',status:'Pending Payment',payment:{status:'awaiting',amount:100}};
 await assertFails(setDoc(doc(anonymous,'applications','injected-marks'),{...base,markCard:card}));await assertFails(setDoc(doc(anonymous,'applications','injected-receipt'),{...base,feeReceipts:{fake:receipt}}));
 console.log('PASS: actual Firestore SDK + deployed rules preserve records, persist marks, atomically save receipts, reject concurrent duplicates/stale marks and deny non-admin access/injection');
}finally{await env.cleanup();}
