import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeSelectedProgram,syncLearningPath} from '../public/student-learning-path.js';
import {studentViewFromApplication} from '../public/student-view-model.js';
const base=()=>({status:'Approved',admissionNumber:'101',coursePreference:'Office',studentPortalAccount:{uid:'student-1'}});
test('selection updates only the existing official checklist and its exact student projection',()=>{
 const data=base(),next=mergeSelectedProgram(data,'MS Word',1),course=next.byCourse.Office;
 assert.equal(course.topics.length,12);assert.deepEqual(course.topics.filter(row=>row.done).map(row=>row.title),['Computer basics','Notepad','WordPad']);assert.equal(course.currentProgram,'MS Word');
 const view=studentViewFromApplication({...data,learningProgress:next});assert.equal(view.journey.currentProgram,'MS Word');assert.equal(view.journey.topics.filter(row=>row.done).length,3);
 assert.equal(mergeSelectedProgram({...data,learningProgress:next},'MS Word',1),next);
});
test('preserves every existing assessment and course; manual corrections survive new selection',()=>{
 const data={...base(),learningProgress:{custom:'keep',byCourse:{Other:{topics:[{id:'other',title:'Drawing',done:true}]},Office:{note:'teacher note',topics:[{id:'word',title:'MS Word',done:false},{id:'custom',title:'Teacher exercise',done:true}]}}}};
 const next=mergeSelectedProgram(data,'MS Excel',2),topics=next.byCourse.Office.topics;
 assert.equal(topics.find(row=>row.id==='word').done,false);assert.equal(topics.find(row=>row.id==='custom').done,true);assert.equal(topics.filter(row=>row.title==='MS Word').length,1);assert.deepEqual(next.byCourse.Other,data.learningProgress.byCourse.Other);assert.equal(next.byCourse.Office.note,'teacher note');assert.equal(next.custom,'keep');
 const notepad=topics.find(row=>row.title==='Notepad');notepad.manual=true;notepad.done=false;
 const later=mergeSelectedProgram({...data,learningProgress:next},'PowerPoint',3);assert.equal(later.byCourse.Office.topics.find(row=>row.title==='Notepad').done,false);
});
test('transaction uses latest identity and selection, updates sanitized view, denies stale session',async()=>{
 const record=base(),view={uid:'student-1',enabled:true};let writes=0;
 const sdk={doc:(_, ...parts)=>parts.join('/'),runTransaction:async(_,fn)=>fn({get:async ref=>({exists:()=>true,data:()=>ref.startsWith('applications')?record:ref.endsWith('learning/current')?{program:'MS Word',updatedAt:{toMillis:()=>12}}:view}),update:(ref,patch)=>{writes++;Object.assign(ref.startsWith('applications')?record:view,patch);}})};
 const args={sdk,db:{},applicationId:'a',uid:'student-1',assertAdmin:()=>{}};
 await syncLearningPath(args);assert.equal(record.learningProgress.byCourse.Office.currentProgram,'MS Word');assert.equal(view.journey.topics.filter(row=>row.done).length,3);assert.equal(record.portalLearning,undefined);
 await syncLearningPath(args);assert.equal(writes,2);await syncLearningPath({...args,uid:'other-user'});assert.equal(writes,2);
 await assert.rejects(syncLearningPath({...args,assertAdmin:()=>{throw Error('Session changed');}}),/Session changed/);
});
