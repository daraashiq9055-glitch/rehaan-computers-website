import {test} from 'node:test';
import assert from 'node:assert/strict';
import {studentUpdatePayload} from '../public/student-portal-updates.js';

test('published class content is bounded and never accepts an external image URL',()=>{
 const payload=studentUpdatePayload({category:'Class notes',title:'MS Word tables',details:'Practise two-column tables.',author:'Centre',image:'data:image/jpeg;base64,/9j/2Q=='});
 assert.equal(payload.readByStudent,false);assert.equal(payload.savedByStudent,false);
 assert.throws(()=>studentUpdatePayload({...payload,image:'https://public.example/student.jpg'}),/smaller JPG/);
 assert.throws(()=>studentUpdatePayload({...payload,details:'a'.repeat(5001)}),/5,000/);
});
