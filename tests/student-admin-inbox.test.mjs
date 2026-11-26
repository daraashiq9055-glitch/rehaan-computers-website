import test from 'node:test';
import assert from 'node:assert/strict';
import {watchAdminStudentInbox} from '../public/student-admin-inbox.js';

test('admin unread notifications isolate student threads and stop after logout',()=>{
 const listeners=[],seen=[];let current=true,stopped=0;
 const sdk={collection:(_, ...parts)=>parts.join('/'),where:(...args)=>args,query:(path,filter)=>({path,filter}),onSnapshot:(ref,next,error)=>{listeners.push({ref,next,error});return ()=>stopped++;}};
 const students=['a','b'].map(id=>({id,data:{fullName:id,studentPortalAccount:{uid:'uid-'+id}}}));
 const stop=watchAdminStudentInbox({sdk,db:{},students,isCurrent:()=>current,onChange:rows=>seen.push(rows)});
 assert.equal(listeners.length,2);assert.equal(listeners[0].ref.path,'studentPortalViews/uid-a/messages');
 assert.deepEqual(listeners[0].ref.filter,['readByAdmin','==',false]);
 listeners[0].next({docs:[{data:()=>({sender:'student'})},{data:()=>({sender:'admin'})}]});
 assert.equal(seen.at(-1)[0].unread,1);assert.equal(seen.at(-1)[1].unread,0);
 listeners[1].error();assert.equal(seen.at(-1)[1].error,true);
 listeners[0].next({docs:[]});assert.equal(seen.at(-1)[0].unread,0);
 current=false;const count=seen.length;listeners[0].next({docs:[{data:()=>({sender:'student'})}]});assert.equal(seen.length,count);
 stop();assert.equal(stopped,2);current=true;listeners[0].error();assert.equal(seen.length,count);
});
