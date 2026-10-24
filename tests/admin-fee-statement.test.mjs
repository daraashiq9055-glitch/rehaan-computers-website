import {test} from 'node:test';
import assert from 'node:assert/strict';
import {feeStatement,statementWhatsApp} from '../public/admin-fee-statement-model.js';
const record=()=>({id:'student-1',data:{fullName:'Test Student',phone:'9999999991',status:'Approved',admissionNumber:'001',admissionDate:'2026-08-10',coursePreference:'Computer Diploma',photo:'private-reference',payment:{status:'paid',amount:100,providerId:'preserve'},monthlyFees:{'2026-09-10':500,'2026-10-10':999},customLegacy:{keep:true}}});
const receipt=(amount=50000)=>({id:'a'.repeat(32),studentId:'student-1',due:'2026-09-10',date:'2026-09-12',amount,amendments:[{before:{amount:60000}}]});
test('statement preserves records, separates due/upcoming and uses learning-month labels',()=>{
 const entry=record(),before=structuredClone(entry),s=feeStatement(entry,'2026-10-24');
 assert.deepEqual(s.rows.map(r=>r.key),['2026-09-10','2026-10-10','2026-11-10']);assert.deepEqual(s.rows.map(r=>r.label),['August 2026','September 2026','October 2026']);assert.equal(s.totals.due,49900);assert.equal(s.totals.upcoming,99900);assert.equal(s.totals.received,149900);assert.equal(s.oldest.label,'August 2026');assert.equal(s.reliable,true);assert.deepEqual(entry,before);
});
test('receipt/correction amounts are references, never added a second time; older payments stay undated',()=>{
 const entry=record();entry.data.feeReceipts={a:receipt()};const s=feeStatement(entry,'2026-10-24');assert.equal(s.totals.received,149900);assert.equal(s.rows[0].receiptCount,1);assert.equal(s.rows[0].legacyPaid,0);assert.equal(s.rows[1].legacyPaid,99900);assert.equal(s.totals.legacy,99900);assert.equal(s.totals.due,49900);
 entry.data.feeReceipts.a.amount=60000;assert.equal(feeStatement(entry,'2026-10-24').reliable,false);
});
test('new students have no arrears before their first anniversary; leap years and month clamping match existing billing',()=>{
 const entry=record();entry.data.admissionDate='2026-10-10';entry.data.monthlyFees={};let s=feeStatement(entry,'2026-10-24');assert.equal(s.totals.due,0);assert.equal(s.totals.upcoming,99900);assert.equal(s.oldest,null);assert.equal(s.rows[0].label,'October 2026');
 entry.data.admissionDate='2028-01-31';s=feeStatement(entry,'2028-03-15');assert.deepEqual(s.rows.map(r=>r.key),['2028-02-29','2028-03-31']);assert.deepEqual(s.rows.map(r=>r.label),['January 2028','February 2028']);
 entry.data.admissionDate='2026-12-31';s=feeStatement(entry,'2027-01-31');assert.equal(s.rows[0].key,'2027-01-31');assert.equal(s.rows[0].label,'December 2026');assert.equal(s.rows[0].status,'Due today');assert.equal(s.totals.due,99900);
});
test('advance payments and overpayments are visible separately and never silently settle another month',()=>{
 const entry=record();entry.data.monthlyFees['2027-01-10']=999;entry.data.monthlyFees['2026-10-10']=1200;const s=feeStatement(entry,'2026-10-24');assert.equal(s.rows.at(-1).label,'December 2026');assert.equal(s.totals.due,49900);assert.equal(s.totals.credit,20100);assert.ok(s.warnings.some(w=>w.includes('Overpayment')));assert.equal(s.totals.received,269900);
});
test('bad dates, unmatched ledger entries, invalid receipts and inactive records block misleading share totals without discarding originals',()=>{
 for(const change of [e=>delete e.data.admissionDate,e=>e.data.admissionDate='2026-02-31',e=>e.data.monthlyFees['2026-09-11']=500,e=>e.data.monthlyFees['2026-09-10']='bad',e=>e.data.feeReceipts={a:{...receipt(),studentId:'another-student'}},e=>e.data.status='New',e=>e.data.enrolmentStatus='Cancelled',e=>e.data.admissionDate='1990-01-10']){
  const entry=record();change(entry);const before=structuredClone(entry),s=feeStatement(entry,'2026-10-24');assert.equal(s.reliable,false);assert.ok(s.warnings.length);assert.equal(statementWhatsApp(s),null);assert.deepEqual(entry,before);
 }
});
test('WhatsApp statement targets saved phone, labels total due and upcoming separately, with no sending or public data URLs',()=>{
 const s=feeStatement(record(),'2026-10-24'),url=new URL(statementWhatsApp(s));assert.equal(url.pathname,'/919999999991');const text=url.searchParams.get('text');assert.match(text,/TOTAL DUE: ₹499/);assert.match(text,/Upcoming fees.*₹999/);assert.match(text,/August 2026/);assert.doesNotMatch(text,/6006433125|res\.cloudinary|providerId/);s.student.phone='invalid';assert.equal(statementWhatsApp(s),null);
});
