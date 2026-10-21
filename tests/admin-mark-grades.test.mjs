import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateCard,cardResult,subjectResult,indiaDate} from '../public/admin-feature-model.js';
import {saveMarkCard} from '../public/admin-feature-store.js';
const make=(marks,max=100)=>({title:'Assessment',date:indiaDate(),subjects:[{name:'Practical',max,marks}]});
test('automatic grades and subject descriptions use exact percentage boundaries for different maximums',()=>{
  for(const [marks,grade,label] of [[100,'A+','Excellent'],[98,'A+','Excellent'],[90,'A+','Excellent'],[89.99,'A','Excellent'],[75,'A','Excellent'],[74.99,'B','Very Good'],[60,'B','Very Good'],[59.99,'C','Good'],[45,'C','Good'],[44.99,'D','Pass'],[33,'D','Pass'],[32.99,'F','Fail'],[0,'F','Fail']]){
    for(const max of [50,100,200]){
      const card=validateCard(make(marks*max/100,max));assert.equal(subjectResult(card.subjects[0]).grade,grade);assert.equal(subjectResult(card.subjects[0]).label,label);assert.equal(cardResult(card).grade,grade);
    }
  }
});
test('manual subject/final grades survive validation, switching to automatic removes only overrides',()=>{
  const manual={...make(49,50),manualGrade:'C'};manual.subjects[0].manualGrade='B';
  const clean=validateCard(manual);assert.equal(clean.manualGrade,'C');assert.equal(subjectResult(clean.subjects[0]).label,'Very Good');assert.equal(cardResult(clean).grade,'C');assert.equal(cardResult(clean).total,49);
  const auto=validateCard({...clean,manualGrade:'',subjects:clean.subjects.map(s=>({...s,manualGrade:''}))});assert.deepEqual(auto,make(49,50));assert.equal(cardResult(auto).grade,'A+');assert.equal(subjectResult(auto.subjects[0]).label,'Excellent');
});
test('blank marks remain incomplete, failing marks or manual F cannot be shown as a pass',()=>{
  let card=validateCard({...make(''),manualGrade:'A+'});assert.equal(cardResult(card).grade,'Incomplete');assert.equal(subjectResult(card.subjects[0]).label,'Unmarked');
  card=make(90);card.subjects.push({name:'Theory',max:100,marks:20,manualGrade:'A+'});card.manualGrade='A+';assert.equal(cardResult(validateCard(card)).grade,'F');assert.equal(cardResult(validateCard(card)).passed,false);
  for(const location of ['subject','overall']){card=make(90);if(location==='subject')card.subjects[0].manualGrade='F';else card.manualGrade='F';assert.equal(cardResult(validateCard(card)).grade,'F');assert.equal(cardResult(validateCard(card)).passed,false);}
});
test('invalid overrides are rejected before persistence',async()=>{
  for(const grade of ['E','A++','pass',true,12,{}])for(const location of ['subject','overall']){
    const card=make(80);if(location==='subject')card.subjects[0].manualGrade=grade;else card.manualGrade=grade;
    await assert.rejects(saveMarkCard({card,runTransaction:()=>assert.fail('Invalid grade reached a write')}),/valid grade/);
  }
});
test('manual-grade save preserves payment, fees, photo and every unrelated student field',async()=>{
  const original={fullName:'Test student',photo:'private-photo',payment:{status:'paid',providerId:'keep'},monthlyFees:{'2026-10-01':999},customField:{keep:true}};const record=structuredClone(original);let patch;
  const card=make(49,50);card.manualGrade='A';card.subjects[0].manualGrade='A';
  const saved=await saveMarkCard({card,db:{},ref:{},expected:null,actor:'admin',assertSession:()=>{},runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>true,data:()=>structuredClone(record)}),update:(_,value)=>{patch=value;Object.assign(record,value);}})});
  assert.equal(saved.manualGrade,'A');assert.equal(saved.subjects[0].manualGrade,'A');for(const [key,value] of Object.entries(original))assert.deepEqual(record[key],value);assert.deepEqual(Object.keys(patch).sort(),['markCard','updatedAt','updatedBy']);
});
