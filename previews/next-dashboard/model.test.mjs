import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,recordPayment,billFor,reportFor,whatsappText,parseAmount,examResult,updateScores,parseCSV,reviewImport,commitImport,csvCell,indiaDate,SAMPLE_PERIOD} from './model.js';
const input=amount=>({studentId:'demo-001',period:SAMPLE_PERIOD,amount,date:indiaDate(),method:'Cash'});
test('partial payment has a unique receipt, a frozen historical balance and an accurate current WhatsApp balance',()=>{
 const state=createState();const receipt=recordPayment(state,input('400'));
 assert.equal(receipt.amount,40000);assert.equal(receipt.balanceAtIssue,39900);assert.equal(receipt.receivedAtIssue,60000);
 const original=structuredClone(receipt);
 const second=recordPayment(state,input('399'));
 assert.notEqual(receipt.number,second.number);assert.equal(billFor(state,'demo-001',SAMPLE_PERIOD).balance,0);
 assert.deepEqual(receipt,original);
 const draft=whatsappText(state,receipt);assert.match(draft,/Ayaan Demo/);assert.match(draft,/October 2026/);assert.match(draft,/Amount received: ₹400/);assert.match(draft,/Current remaining balance: ₹0/);
 state.students[0].name='Updated demo name';assert.equal(receipt.student.name,'Ayaan Demo');
});
test('invalid and excessive payments leave all sample state untouched',()=>{
 for(const amount of ['0','-1','1000','NaN','Infinity','1.005','1e2','']){
  const state=createState();const before=structuredClone(state);
  assert.throws(()=>recordPayment(state,input(amount)));assert.deepEqual(state,before);
 }
 for(const patch of [{date:'2026-02-31'},{date:'2999-01-01'},{method:'Gateway verified'},{period:'2026-13'},{period:'2026-11'}]){
  const state=createState();const before=structuredClone(state);assert.throws(()=>recordPayment(state,{...input('10'),...patch}));assert.deepEqual(state,before);
 }
 assert.equal(parseAmount('0.25'),25);
});
test('reports reconcile exactly with recorded monthly payments',()=>{
 const state=createState();let report=reportFor(state,SAMPLE_PERIOD);
 assert.equal(report.billed,299700);assert.equal(report.received,119900);assert.equal(report.balance,179800);
 recordPayment(state,input('400'));report=reportFor(state,SAMPLE_PERIOD);
 assert.equal(report.received,159900);assert.equal(report.balance,139800);assert.equal(report.received+report.balance,report.billed);
 assert.deepEqual(reportFor(state,'2026-11'),{rows:[],billed:0,received:0,balance:0});
});
test('mark cards require complete components and distinguish component failure from the overall percentage',()=>{
 const state=createState();const result=examResult(state,'demo-003');assert.equal(result.percentage,54.67);assert.equal(result.passed,false);
 updateScores(state,'demo-001',[80,85,95]);assert.equal(examResult(state,'demo-001').grade,'A');
 updateScores(state,'demo-001',[90,'',95]);assert.equal(examResult(state,'demo-001').complete,false);
 const before=structuredClone(state);assert.throws(()=>updateScores(state,'demo-001',[90,101,95]));assert.deepEqual(state,before);
});
const header='admission_number,name,phone,course,batch,gender\n';
test('CSV handles quoted names, CRLF, BOM and rejects malformed or privileged columns',()=>{
 const rows=parseCSV('\uFEFF'+header.replace('\n','\r\n')+'DEMO/004,"Student, Four",9999999994,Computer Diploma,Morning,male\r\n');
 assert.equal(rows[0].values.name,'Student, Four');
 assert.throws(()=>parseCSV(header+'DEMO/004,"Bad quote,9999999994,Computer,Morning,male'));
 assert.throws(()=>parseCSV(header.trim()+',payment.verified\nDEMO/004,Student,9999999994,Computer,Morning,male,true'));
 assert.throws(()=>parseCSV(''));
});
test('CSV import protects existing profiles, skips bad/duplicate rows, records no payments and cannot repeat import',()=>{
 const state=createState();const existing=structuredClone(state.students);const payments=structuredClone(state.payments);
 const csv=header+'DEMO/004,Student Four,9999999994,Computer Diploma,Morning,male\nDEMO/001,Duplicate Name,9999999995,Computer Diploma,Morning,female\nDEMO/005,Bad Phone,123,Computer Diploma,Morning,female\n';
 const rows=reviewImport(state,csv);assert.equal(rows.filter(row=>!row.errors.length).length,1);
 assert.equal(commitImport(state,csv,SAMPLE_PERIOD),1);assert.equal(state.students.length,4);
 assert.deepEqual(state.students.slice(0,3),existing);assert.deepEqual(state.payments,payments);assert.equal(state.students[3].feeReview,true);
 assert.throws(()=>commitImport(state,csv,SAMPLE_PERIOD));assert.equal(state.students.length,4);
});
test('exported cells resist spreadsheet formulas and HTML text is not interpreted by the model',()=>{
 for(const value of ['=SUM(A1)','+1','@test','-1','  =1'])assert.ok(csvCell(value).startsWith('"\''));
 const state=createState();const rows=reviewImport(state,header+'DEMO/004,=HYPERLINK(test),9999999994,Course,Morning,male');
 assert.ok(rows[0].errors.length);
});
