import {test} from 'node:test';
import assert from 'node:assert/strict';
import {studentViewFromApplication} from '../public/student-view-model.js';

test('student projection separates two students and never includes admin or payment secrets',()=>{
 const first={status:'Approved',fullName:'Student One',admissionNumber:'101',phone:'9000000001',coursePreference:'MS Word',monthlyFees:{'2026-11-10':999},feeReceipts:{receipt1:{number:'RC-1',date:'2026-11-10',due:'2026-11-10',amount:99900}},adminNote:'PRIVATE ADMIN NOTE',paymentToken:'PRIVATE TOKEN',aadhaarLast4:'1234',photo:'PRIVATE PHOTO'};
 const second={...first,fullName:'Student Two',admissionNumber:'102',phone:'9000000002',monthlyFees:{'2026-11-10':0},feeReceipts:{},adminNote:'SECOND ADMIN NOTE'};
 const one=studentViewFromApplication(first),two=studentViewFromApplication(second);
 assert.equal(one.profile.name,'Student One');assert.equal(two.profile.name,'Student Two');assert.equal(one.fees.receipts.length,1);assert.equal(two.fees.receipts.length,0);
 const serialized=JSON.stringify([one,two]);for(const secret of ['PRIVATE ADMIN NOTE','PRIVATE TOKEN','PRIVATE PHOTO','1234','SECOND ADMIN NOTE'])assert.equal(serialized.includes(secret),false);
});
test('concessions are separated from cash and deleted receipts stay hidden',()=>{
 const result=studentViewFromApplication({status:'Approved',fullName:'Student',admissionNumber:'040',coursePreference:'MS Excel',monthlyFees:{'2026-11-10':999},feeConcessions:{'2026-11-10':{concession:49900}},feeReceipts:{old:{number:'OLD',date:'2026-11-10',amount:50000}},feeReceiptDeletions:{old:{at:'2026-11-11'}},monthlyAttendance:{'2026-11':{days:18,totalDays:20,note:'Keep practising'}},learningProgress:{byCourse:{'MS%20Excel':{topics:[{title:'Formulas',done:true}]}}}});
 assert.deepEqual(result.fees.periods[0],{due:'2026-11-10',received:500,concession:499});assert.deepEqual(result.fees.receipts,[]);
 assert.equal(result.attendance[0].attended,18);assert.deepEqual(result.journey.topics,[{title:'Formulas',done:true}]);
});
test('unapproved or unnumbered records cannot be projected',()=>{
 assert.throws(()=>studentViewFromApplication({status:'New',admissionNumber:'100'}));
 assert.throws(()=>studentViewFromApplication({status:'Approved'}));
});
