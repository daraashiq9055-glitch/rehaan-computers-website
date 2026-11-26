import test from 'node:test';
import assert from 'node:assert/strict';
import {learningPath,syncLearningPath} from '../public/student-learning-path.js';
test('MS Word infers only prior programs; current is not completed',()=>{
 const path=learningPath('MS Word');assert.deepEqual(path.completed,['Computer basics','Notepad','WordPad']);assert.equal(path.percent,25);assert.equal(path.steps[3].status,'current');assert.equal(path.steps[4].status,'upcoming');assert.equal(learningPath('invalid').percent,0);
});
test('admin projection preserves teacher topics and other student records and uses latest selection',async()=>{
 const records={a:{studentPortalAccount:{uid:'student-1'},learningProgress:{byCourse:{course:{topics:[{title:'Teacher topic',done:false}]}}}},b:{fullName:'Untouched'}};
 let program='MS Word',writes=0;
 const sdk={doc:(_, ...parts)=>parts.join('/'),runTransaction:async(_,fn)=>fn({get:async ref=>({exists:()=>true,data:()=>ref.startsWith('applications')?records[ref.split('/')[1]]:{program,updatedAt:{toMillis:()=>123}}}),update:(ref,patch)=>{writes++;Object.assign(records[ref.split('/')[1]],patch);}})};
 const teacher=structuredClone(records.a.learningProgress),other=structuredClone(records.b);
 const args={sdk,db:{},applicationId:'a',uid:'student-1',assertAdmin:()=>{}};
 await syncLearningPath(args);assert.equal(records.a.portalLearning.program,'MS Word');assert.deepEqual(records.a.learningProgress,teacher);assert.deepEqual(records.b,other);
 await syncLearningPath(args);assert.equal(writes,1);
 program='Notepad';await syncLearningPath(args);assert.deepEqual(records.a.portalLearning.completed,['Computer basics']);assert.deepEqual(records.a.learningProgress,teacher);
 await syncLearningPath({...args,uid:'wrong-uid'});assert.equal(writes,2);
 await assert.rejects(syncLearningPath({...args,assertAdmin:()=>{throw Error('Session changed');}}),/Session changed/);
});

test('portal watcher reports live changes and releases every listener on logout',async()=>{
 const {watchPortalStudents}=await import('../public/student-admin-portal.js');
 const listeners=[],seen=[];let active=true,stops=0;
 const app={studentPortalAccount:{uid:'student-1'}};
 const sdk={doc:(_, ...parts)=>parts.join('/'),collection:(_, ...parts)=>parts.join('/'),query:path=>path,where:()=>null,onSnapshot:(path,next,error)=>{listeners.push({path,next,error});return ()=>stops++;},runTransaction:async(_,fn)=>fn({get:async path=>({exists:()=>true,data:()=>path.startsWith('applications')?app:{program:'MS Word',updatedAt:{toMillis:()=>2}}}),update:(_,patch)=>Object.assign(app,patch)})};
 const stop=watchPortalStudents({db:{},sdk,students:[{id:'a',data:app}],isCurrent:()=>active,onChange:rows=>seen.push(rows)});
 listeners.find(row=>row.path.endsWith('learning/current')).next({exists:()=>true,data:()=>({program:'MS Word'})});
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(seen.at(-1)[0].path.percent,25);assert.equal(app.portalLearning.program,'MS Word');
 listeners.find(row=>row.path.endsWith('messages')).next({docs:[{data:()=>({sender:'student'})}]});assert.equal(seen.at(-1)[0].unread,1);
 active=false;const count=seen.length;listeners[0].error();assert.equal(seen.length,count);stop();assert.equal(stops,3);
});
