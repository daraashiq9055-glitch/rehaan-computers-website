import test from 'node:test';
import assert from 'node:assert/strict';
import {audienceRows} from '../public/student-broadcast.js';
const row=(id,gender,batch,extra={})=>({id,data:{status:'Approved',gender,batch,studentPortalAccount:{uid:id,enabled:true},...extra}});
const rows=[row('a','Female','Morning'),row('b','Male','Evening'),row('c','Female','Evening'),row('d','Male','Morning',{status:'Pending'}),row('e','Female','Morning',{studentPortalAccount:{uid:'e',enabled:false}}),row('f','Male','Morning',{enrolmentStatus:'Cancelled'})];
test('centre audiences use approved active linked accounts with exact target filtering',()=>{
 const ids=target=>audienceRows(rows,target).map(row=>row.id);
 assert.deepEqual(ids({kind:'all'}),['a','b','c']);
 assert.deepEqual(ids({kind:'boys'}),['b']);assert.deepEqual(ids({kind:'girls'}),['a','c']);
 assert.deepEqual(ids({kind:'batch',batch:'Evening'}),['b','c']);
 assert.deepEqual(ids({kind:'selected',ids:['c','d','e']}),['c']);
 assert.throws(()=>ids({kind:'unknown'}),/audience/);
});
