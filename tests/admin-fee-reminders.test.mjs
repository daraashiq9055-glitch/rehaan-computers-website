import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
// Exercise the actual dashboard functions without Firebase, messages or payments.
const source=readFileSync(new URL('../public/admin-app.js',import.meta.url),'utf8');
const billing=source.slice(source.indexOf('const MONTHLY_TUITION_FEE = 999;'),source.indexOf('async function openTuitionReminder'));
const api=vm.runInNewContext(billing+';({select:actionableFeeReminder,message:tuitionWhatsAppMessage})',{Intl,Date,Math,Number,Boolean,adminIsEnrolled:data=>data.status==='Approved'});
const now=day=>new Date(`2026-10-${String(day).padStart(2,'0')}T06:00:00Z`);
const record=()=>({status:'Approved',admissionNumber:'001',admissionDate:'2026-07-10',fullName:'Test Student',photo:'keep-private-photo',payment:{status:'paid',amount:100,providerId:'keep-provider'},monthlyFees:{'2026-08-10':500},feeReminders:{'2026-08-10':'2026-08-11T06:00:00Z'},customLegacy:{keep:true}});
test('unpaid reminders remain available on every calendar day, including the previously closed dates',()=>{
 const data=record(),before=structuredClone(data);
 for(let day=1;day<=31;day++){
  const bill=api.select(data,now(day));assert.equal(bill.key,'2026-08-10');assert.equal(bill.remaining,499);assert.equal(bill.sent,true);
 }
 assert.deepEqual(data,before);
});
test('oldest partially paid month remains first after reminders; only clearing its balance advances the period',()=>{
 const data=record();data.feeReminders['2026-09-10']='2026-09-15T06:00:00Z';
 assert.equal(api.select(data,now(24)).key,'2026-08-10');
 data.monthlyFees['2026-08-10']=999;let bill=api.select(data,now(24));assert.equal(bill.key,'2026-09-10');assert.equal(bill.remaining,999);assert.equal(bill.sent,true);
 data.monthlyFees['2026-09-10']=300;assert.equal(api.select(data,now(24)).remaining,699);
 data.monthlyFees['2026-09-10']=999;assert.equal(api.select(data,now(24)).key,'2026-10-10');
});
test('upcoming reminders also work more than five days before due; paid current/upcoming periods are not requested',()=>{
 const data=record();data.admissionDate='2026-10-01';data.monthlyFees={};data.feeReminders={};
 let bill=api.select(data,now(2));assert.equal(bill.key,'2026-11-01');assert.ok(bill.diff>5);
 data.monthlyFees['2026-11-01']=999;assert.equal(api.select(data,now(24)),null);
 for(const status of ['New','Cancelled']){data.monthlyFees={};data.status=status;assert.equal(api.select(data,now(24)),null);}
 data.status='Approved';data.enrolmentStatus='Cancelled';assert.equal(api.select(data,now(24)),null);
});
test('month-wise warnings contain the oldest period and exact remaining balance without suggesting an overdue date is in the future',()=>{
 const data=record(),bill=api.select(data,now(24)),message=api.message(data,bill);
 assert.match(message,/OVERDUE MONTHLY FEE REMINDER/);assert.match(message,/Fee Month:\* \*July 2026\*/);assert.match(message,/\*AMOUNT TO PAY\*\n\*₹499\*/);assert.match(message,/Due Date:\* 10-08-2026/);assert.doesNotMatch(message,/on or before the due date/);
 const before=structuredClone(data);api.message(data,bill);assert.deepEqual(data,before);
});
test('short months, leap days and year changes still select the original oldest unpaid due date',()=>{
 for(const text of ['2026-12-31','2027-01-01','2027-02-28','2028-02-29']){
  const data=record();assert.equal(api.select(data,new Date(text+'T06:00:00Z')).key,'2026-08-10');
 }
});

test('fee month names the learning month, while the original due date and balances stay unchanged',()=>{
 for(const [joined,due,label] of [['2026-10-01','2026-11-01','October 2026'],['2026-10-10','2026-11-10','October 2026'],['2026-12-10','2027-01-10','December 2026'],['2027-01-31','2027-02-28','January 2027'],['2028-01-31','2028-02-29','January 2028']]){
  const data=record();data.admissionDate=joined;data.monthlyFees={};data.feeReminders={};const before=structuredClone(data),bill=api.select(data,new Date(joined+'T06:00:00Z'));
  assert.equal(bill.key,due);const message=api.message(data,bill);assert.ok(message.includes('*Fee Month:* *'+label+'*'));assert.ok(message.includes('*Due Date:* '+due.split('-').reverse().join('-')));assert.ok(message.includes('*AMOUNT TO PAY*\n*₹999*'));assert.doesNotMatch(message,/PAYMENT NUMBER|6006433125|pay directly to this number/);assert.deepEqual(data,before);
 }
});

test('the rupee amount has its own bold line, with two decimal places for partial rupees',()=>{
 const data=record(),bill=api.select(data,now(24));bill.remaining=499.5;
 const message=api.message(data,bill);assert.match(message,/\*AMOUNT TO PAY\*\n\*₹499\.50\*/);assert.doesNotMatch(message,/Rs\.|PAYMENT NUMBER|6006433125|pay directly to this number/);
});
