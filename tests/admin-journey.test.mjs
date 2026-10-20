import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveLifecycle,saveProgress,stageOf,courseKey,progressOf,cleanPreferences} from '../previews/admin-premium/journey-service.js';
const clone=value=>structuredClone(value);
function harness(){let data={status:'Approved',fullName:'Student',coursePreference:'Diploma',payment:{status:'paid',amount:100,providerId:'keep'},monthlyFees:{'2026-10-12':400},feeReceipts:{old:{keep:true}},photo:'private-reference',markCard:{title:'Exam'},legacy:{keep:true}};let denied=false;const writes=[];return{get data(){return clone(data)},set data(value){data=clone(value)},writes,deny(){denied=true},async runTransaction(_db,fn){let patch;const result=await fn({get:async()=>({exists:()=>true,data:()=>clone(data)}),update:(_ref,value)=>{patch=clone(value)}});if(denied)throw Error('Denied');if(patch){data={...data,...patch};writes.push(patch);}return result;}};}
const base=(h,extra={})=>({db:{},ref:{},runTransaction:h.runTransaction,assertSession:()=>{},actor:'admin-1',...extra});
const protectedFields=['status','payment','monthlyFees','feeReceipts','photo','markCard','legacy'];
test('lifecycle changes and restoration keep financial, admission, photo, mark and unknown fields intact',async()=>{
 const h=harness(),before=h.data;
 for(const stage of ['On hold','Completed','Archived','Active'])await saveLifecycle(base(h,{expected:h.data.studentLifecycle??null,stage,reason:'Reviewed student journey'}));
 assert.equal(stageOf(h.data),'Active');assert.equal(h.data.studentLifecycle.events.length,4);assert.equal(h.data.studentLifecycle.events[2].to,'Archived');assert.equal(h.data.studentLifecycle.events[3].from,'Archived');
 for(const field of protectedFields)assert.deepEqual(h.data[field],before[field]);
});
test('stale lifecycle, denied writes, invalid reasons, changed enrolment and session loss cannot save',async()=>{
 for(const scenario of ['stale','denied','reason','enrolment','session']){const h=harness();if(scenario==='denied')h.deny();if(scenario==='enrolment')h.data={...h.data,status:'Cancelled'};const before=h.data;await assert.rejects(saveLifecycle(base(h,{expected:scenario==='stale'?{stage:'Archived'}:null,stage:'Completed',reason:scenario==='reason'?'x':'Course assessment reviewed',...(scenario==='session'?{assertSession(){throw Error('Ended')}}:{})})));assert.deepEqual(h.data,before);assert.equal(h.writes.length,0);}
});
test('stage changes allow an unrelated newer payment without replacing it',async()=>{
 const h=harness();const expected=h.data.studentLifecycle??null;h.data={...h.data,monthlyFees:{'2026-10-12':700}};await saveLifecycle(base(h,{expected,stage:'On hold',reason:'Student requested a pause'}));assert.equal(h.data.monthlyFees['2026-10-12'],700);
});
test('course checklists keep prior course progress, marks, photos, payments and custom fields',async()=>{
 const h=harness(),before=h.data,topics=[{id:'topic-1',title:'Create a document',done:true}];await saveProgress(base(h,{expected:null,course:'Diploma',topics}));assert.equal(progressOf(h.data,'Diploma',[]).topics[0].done,true);
 const first=h.data.learningProgress;h.data={...h.data,coursePreference:'Tally'};await saveProgress(base(h,{expected:first,course:'Tally',topics:[{id:'topic-2',title:'Create a company',done:false}]}));assert.equal(Object.keys(h.data.learningProgress.byCourse).length,2);assert.equal(h.data.learningProgress.byCourse[courseKey('Diploma')].topics[0].done,true);for(const field of protectedFields)assert.deepEqual(h.data[field],before[field]);
});
test('course changes, stale checklist snapshots and invalid topic shapes are rejected without writes',async()=>{
 for(const scenario of ['course','stale','duplicate','boolean','empty']){const h=harness(),topics=scenario==='empty'?[]:[{id:'topic',title:'Practice',done:scenario==='boolean'?'yes':true}];if(scenario==='duplicate')topics.push({...topics[0]});const before=h.data;await assert.rejects(saveProgress(base(h,{expected:scenario==='stale'?{byCourse:{}}:null,course:scenario==='course'?'Wrong course':'Diploma',topics})));assert.deepEqual(h.data,before);}
});
test('preferences accept only presentation choices and at most four known shortcuts',()=>{
 const value=cleanPreferences({start:'accounts',density:'compact',layout:'cards',motion:'reduced',favourites:['fees','fees','students','bad','accounts','today','records'],password:'never',studentData:{private:true}});assert.deepEqual(value,{start:'accounts',density:'compact',layout:'cards',motion:'reduced',favourites:['fees','students','accounts','today']});assert.deepEqual(Object.keys(value).sort(),['density','favourites','layout','motion','start']);assert.equal(cleanPreferences({start:'evil',density:'xx'}).start,'overview');
});
