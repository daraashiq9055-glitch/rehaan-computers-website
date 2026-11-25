import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reminder} from '../public/admin-reminder-model.js';
import {studentWhatsAppURL} from '../public/admin-whatsapp.js';
import {feeStatement} from '../public/admin-fee-statement-model.js';
const record=(joined='2026-10-10',monthlyFees={})=>({id:'test',data:{status:'Approved',admissionNumber:'RC1',fullName:'Test Student',phone:'9999999991',admissionDate:joined,monthlyFees,feeReminders:{'2026-11-10':'sent'}}});
test('date boundaries and repeatable reminders regardless of payment status',()=>{
 for(const [date,expected] of [['2026-11-24',false],['2026-11-25',true],['2026-11-30',true],['2026-12-01',false],['2026-12-25',true],['2027-02-28',true],['2028-02-29',true]]){
  for(const fees of [{},{'2026-11-10':999,'2026-12-10':999}])assert.equal(reminder(record('2026-10-10',fees),date).canShare,expected);
 }
});
test('previous partial balance and current month separately listed and totaled',()=>{
 const entry=record('2026-10-10',{'2026-11-10':500}),before=JSON.stringify(entry),r=reminder(entry,'2026-11-25');
 assert.deepEqual(r.rows.map(row=>[row.month,row.balance]),[['2026-10',49900],['2026-11',99900]]);
 assert.equal(r.total,149800);assert.equal(r.overdue,49900);assert.match(r.message,/CURRENT MONTH: November 2026/);assert.match(r.message,/October 2026/);assert.equal(JSON.stringify(entry),before);assert.equal(feeStatement(entry,'2026-11-25').totals.due,49900);
});
test('paid months omitted; fully paid still shareable',()=>{
 const e=record('2026-10-10',{'2026-11-10':999});let r=reminder(e,'2026-11-25');assert.equal(r.total,99900);assert.equal(r.rows.length,1);assert.equal(r.rows[0].month,'2026-11');
 e.data.monthlyFees['2026-12-10']=999;r=reminder(e,'2026-11-25');assert.equal(r.total,0);assert.equal(r.canShare,true);assert.match(r.message,/Fee already paid/);assert.doesNotMatch(r.message,/TOTAL REMAINING/);
});
test('late anniversary includes current month without false overdue status',()=>{
 const r=reminder(record('2026-10-30'),'2026-11-25');assert.deepEqual(r.rows.map(x=>[x.month,x.key,x.upcoming]),[['2026-10','2026-11-30',true],['2026-11','2026-12-30',true]]);assert.equal(r.total,199800);assert.equal(r.overdue,0);
});
test('new admissions, short months, leap year and year rollover',()=>{
 for(const [joined,date,key] of [['2026-11-25','2026-11-25','2026-12-25'],['2026-12-31','2026-12-31','2027-01-31'],['2028-01-31','2028-01-31','2028-02-29']]){const r=reminder(record(joined),date);assert.equal(r.rows[0].key,key);assert.equal(r.total,99900);}
});
test('cancelled and pending excluded; unreliable ledger shares no amounts',()=>{
 for(const change of [{status:'New'},{enrolmentStatus:'Cancelled'}])assert.equal(reminder({...record(),data:{...record().data,...change}},'2026-11-25').canShare,false);
 const e=record();delete e.data.admissionDate;const r=reminder(e,'2026-11-25');assert.equal(r.canShare,true);assert.equal(r.total,0);assert.doesNotMatch(r.message,/TOTAL REMAINING|₹/);
});
test('WhatsApp encodes exact text to saved number repeatedly without writes',()=>{
 const e=record(),before=JSON.stringify(e),r=reminder(e,'2026-11-25');for(let i=0;i<2;i++){const url=studentWhatsAppURL(e.data.phone,r.message);assert.equal(url,'https://wa.me/919999999991?text='+encodeURIComponent(r.message));}assert.equal(JSON.stringify(e),before);
});
