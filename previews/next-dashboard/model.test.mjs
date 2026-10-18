import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateCard,cardResult,makeReceipt,indiaDate} from './model.js';
import {previewState,resetRecords,replaceRecords,runTransaction,doc,getDoc} from './preview-backend.js';
const card=subjects=>({title:'Monthly assessment',date:indiaDate(),subjects});
test('marks calculate totals/grade, preserve component failures and allow incomplete drafts',()=>{
 let result=cardResult(validateCard(card([{name:'Theory',max:100,marks:76},{name:'Practical',max:100,marks:91}])));assert.equal(result.total,167);assert.equal(result.percentage,83.5);assert.equal(result.grade,'A');
 result=cardResult(validateCard(card([{name:'Theory',max:100,marks:90},{name:'Practical',max:100,marks:28}])));assert.equal(result.passed,false);assert.equal(result.grade,'Not passed');
 result=cardResult(validateCard(card([{name:'Theory',max:100,marks:''}])));assert.equal(result.complete,false);assert.equal(result.total,null);
});
test('invalid marks, duplicate subjects, maxima and dates are rejected without modifying the input',()=>{
 for(const subjects of [[{name:'Test',max:100,marks:101}],[{name:'Test',max:100,marks:-1}],[{name:'Test',max:0,marks:0}],[{name:'Test',max:NaN,marks:0}],[{name:'Same',max:100,marks:80},{name:'same',max:100,marks:80}],[]]){const input=card(subjects),before=structuredClone(input);assert.throws(()=>validateCard(input));assert.deepEqual(input,before);}
 for(const date of ['2026-02-31','2999-01-01','bad'])assert.throws(()=>validateCard({...card([{name:'Test',max:100,marks:90}]),date}));
});
test('receipt snapshots freeze exact partial-payment values without mutating student/payment records',()=>{
 const data={fullName:'Demo student',phone:'9999999991',admissionNumber:'DEMO/1',coursePreference:'Computer Diploma',monthlyFees:{'2026-09-14':200},payment:{status:'paid',amount:100},legacy:{keep:true}};const before=structuredClone(data);const receipt=makeReceipt({id:'demo',data,due:'2026-09-14',added:400,total:600,monthly:999},1);assert.equal(receipt.amount,40000);assert.equal(receipt.receivedAtIssue,60000);assert.equal(receipt.balanceAtIssue,39900);assert.deepEqual(data,before);data.fullName='Changed later';assert.equal(receipt.student.name,'Demo student');
 for(const total of [1000,399,NaN])assert.throws(()=>makeReceipt({id:'demo',data,due:'2026-09-14',added:400,total,monthly:999},2));
});
test('local adapter stages atomically and rejects any transaction against private backup records',async()=>{
 resetRecords();const before=structuredClone(previewState.records);
 await assert.rejects(runTransaction({},async tx=>{tx.update(doc({},'applications','sample-ayaan'),{fullName:'Changed'});throw Error('Abort');}));assert.deepEqual(previewState.records,before);assert.equal(previewState.writes.length,0);
 replaceRecords({records:[{id:'original',data:{fullName:'Private',monthlyFees:{'2026-09-14':500.25},unknown:[1,2,3]}}]});const snapshot=structuredClone(previewState.records);
 await assert.rejects(runTransaction({},async tx=>tx.update(doc({},'applications','original'),{'monthlyFees.2026-09-14':999})),/read-only/);assert.deepEqual(previewState.records,snapshot);assert.equal(previewState.writes.length,0);assert.deepEqual((await getDoc(doc({},'applications','original'))).data(),snapshot.original);resetRecords();
});
