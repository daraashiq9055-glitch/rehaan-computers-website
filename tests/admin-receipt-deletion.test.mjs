import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveMonthlyPayment,correctReceipt,deleteReceipt} from '../public/admin-feature-store.js';
import {feeStatement} from '../public/admin-fee-statement-model.js';
import {indiaDate} from '../public/admin-feature-model.js';

const due='2026-02-14',id='student-1',rid='a'.repeat(32),otherId='b'.repeat(32),op='c'.repeat(32);
const base=()=>({fullName:'Test Student',status:'Approved',admissionNumber:'001',admissionDate:'2026-01-14',coursePreference:'Diploma',monthlyFees:{[due]:200,'2026-03-14':999},payment:{status:'paid',amount:100,providerId:'preserved'},photo:'private-photo',markCard:{title:'Keep marks'},custom:{keep:['all','fields']}});
function harness(){
 let data=base(),queue=Promise.resolve(),denied=false,lost=false;const writes=[];
 return {get data(){return structuredClone(data)},set data(value){data=structuredClone(value)},writes,deny:()=>{denied=true},loseAcknowledgement:()=>{lost=true},runTransaction:(_db,fn)=>{
  const task=queue.then(async()=>{let patch;const result=await fn({get:async()=>({exists:()=>data!==null,data:()=>structuredClone(data)}),update:(_ref,value)=>{patch=structuredClone(value)}});
   if(denied)throw Error('permission-denied');
   if(patch){const next=structuredClone(data);for(const [key,value]of Object.entries(patch)){const parts=key.split('.');let target=next;for(const part of parts.slice(0,-1))target=target[part]??(target[part]={});target[parts.at(-1)]=structuredClone(value);}data=next;writes.push(patch);if(lost){lost=false;throw Error('Acknowledgement lost after commit');}}
   return result;});queue=task.catch(()=>{});return task;
 }};
}
const pay=(h,extra={})=>saveMonthlyPayment({db:{},ref:{},runTransaction:h.runTransaction,assertSession:()=>{},actor:'admin-one',id,due,amount:400,expectedPaid:200,expectedAdmission:'001',expectedJoined:'2026-01-14',receiptId:rid,now:'2026-04-01T06:00:00.000Z',...extra});
const args=(h,receipt,extra={})=>({db:{},ref:{},runTransaction:h.runTransaction,assertSession:()=>{},actor:'admin-one',id,receiptId:receipt.id,deletionId:op,input:{reason:'Accidental payment entry'},expected:receipt,expectedPaid:h.data.monthlyFees[due]??0,now:'2026-04-02T06:00:00.000Z',...extra});

test('deletion removes exactly one receipt/payment and fee statements reflect the restored balance',async()=>{
 const h=harness(),receipt=await pay(h),second=await pay(h,{receiptId:otherId,expectedPaid:600,amount:300}),before=h.data;
 const asOf=indiaDate(),previous=feeStatement({id,data:before},asOf);const result=await deleteReceipt(args(h,receipt));const after=h.data;
 assert.equal(after.monthlyFees[due],500);assert.equal(result.totalPaid,500);assert.equal(result.amount,400);
 assert.equal(after.feeReceipts[rid],undefined);assert.deepEqual(after.feeReceipts[otherId],second);assert.equal(after.monthlyFees['2026-03-14'],999);
 for(const field of ['fullName','payment','photo','markCard','custom'])assert.deepEqual(after[field],before[field]);
 assert.equal(after.feeReceiptDeletions[rid].amount,40000);assert.equal(after.feeReceiptDeletions[rid].ledgerAfter,50000);assert.equal(after.feeReceiptDeletions[rid].reason,'Accidental payment entry');
 assert.equal('student' in after.feeReceiptDeletions[rid],false);
 const current=feeStatement({id,data:after},asOf);assert.equal(current.reliable,true);assert.equal(current.totals.due-previous.totals.due,40000);assert.equal(previous.totals.received-current.totals.received,40000);
});
test('deleting the only payment removes its ledger entry and never changes another month',async()=>{
 const h=harness();h.data={...h.data,monthlyFees:{'2026-03-14':999}};const receipt=await pay(h,{amount:999,expectedPaid:0});await deleteReceipt(args(h,receipt));assert.equal(Object.hasOwn(h.data.monthlyFees,due),false);assert.deepEqual(h.data.feeReceipts,{});assert.deepEqual(h.data.monthlyFees,{'2026-03-14':999});
});
test('a corrected receipt reverses its current amount rather than its original amount',async()=>{
 const h=harness(),receipt=await pay(h);const result=await correctReceipt({db:{},ref:{},runTransaction:h.runTransaction,assertSession:()=>{},actor:'admin-one',receiptId:rid,correctionId:'d'.repeat(32),input:{name:'Test Student',admission:'001',course:'Diploma',date:'2026-04-01',method:'Cash',amount:'300',note:'',reason:'Correct amount entered'},expected:receipt,expectedPaid:600});
 assert.equal(result.totalPaid,500);await deleteReceipt(args(h,result.receipt));assert.equal(h.data.monthlyFees[due],200);assert.equal(h.data.feeReceiptDeletions[rid].amount,30000);
});
test('retry after a lost acknowledgement is idempotent and a stale payment cannot resurrect the deleted receipt',async()=>{
 const h=harness(),receipt=await pay(h),request=args(h,receipt);h.loseAcknowledgement();await assert.rejects(deleteReceipt(request),/Acknowledgement/);const after=h.data,count=h.writes.length;
 const retried=await deleteReceipt(request);assert.equal(retried.totalPaid,200);assert.deepEqual(h.data,after);assert.equal(h.writes.length,count);
 await assert.rejects(pay(h),/was deleted/);assert.deepEqual(h.data,after);
 await assert.rejects(deleteReceipt({...request,deletionId:'f'.repeat(32)}),/already deleted/);assert.equal(h.writes.length,count);
});
test('concurrent deletions reverse once; deleting races safely with a new payment or correction',async()=>{
 const h=harness(),receipt=await pay(h),request=args(h,receipt);
 const results=await Promise.allSettled([deleteReceipt(request),deleteReceipt({...request,deletionId:'f'.repeat(32),actor:'admin-two'})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(h.data.monthlyFees[due],200);
 const h2=harness(),r2=await pay(h2);const outcomes=await Promise.allSettled([pay(h2,{receiptId:otherId,expectedPaid:600,amount:100}),deleteReceipt(args(h2,r2))]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(h2.data.monthlyFees[due],700);assert.ok(h2.data.feeReceipts[rid]);
 const h3=harness(),r3=await pay(h3);const race=await Promise.allSettled([deleteReceipt(args(h3,r3)),correctReceipt({db:{},ref:{},runTransaction:h3.runTransaction,assertSession:()=>{},actor:'admin-two',receiptId:rid,correctionId:'f'.repeat(32),input:{name:'Test Student',admission:'001',course:'Diploma',date:'2026-04-01',method:'Cash',amount:'300',note:'',reason:'Correction entered elsewhere'},expected:r3,expectedPaid:600})]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(h3.data.monthlyFees[due],200);
});
test('stale, inconsistent, invalid or denied operations preserve receipt and ledger together',async()=>{
 for(const mode of ['receipt','ledger','denied','session-after-read','session-before-commit','reason','student','negative-ledger','inconsistent-other','missing-student']){
  const h=harness(),receipt=await pay(h);let request=args(h,receipt);
  if(mode==='receipt')request.expected={...receipt,note:'Stale copy'};
  if(mode==='ledger')request.expectedPaid=599;
  if(mode==='denied')h.deny();
  if(mode.startsWith('session')){let calls=0;request.assertSession=()=>{if(++calls===(mode==='session-after-read'?2:3))throw Error('Session ended');};}
  if(mode==='reason')request.input.reason='';
  if(mode==='student')request.id='another-student';
  if(mode==='negative-ledger'){h.data={...h.data,monthlyFees:{[due]:100}};request.expectedPaid=100;}
  if(mode==='inconsistent-other'){h.data={...h.data,monthlyFees:{[due]:400},feeReceipts:{...h.data.feeReceipts,[otherId]:{...receipt,id:otherId,amount:10000}}};request.expectedPaid=400;}
  if(mode==='missing-student')h.data=null;
  const before=h.data,count=h.writes.length;await assert.rejects(deleteReceipt(request),mode);assert.deepEqual(h.data,before,mode);assert.equal(h.writes.length,count,mode);
 }
});
