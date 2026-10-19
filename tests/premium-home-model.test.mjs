import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {courseSlug,matchesDuration,typingScore,recommendCourses,brochurePDF} from '../previews/premium-home/model.js';
const courses=JSON.parse(readFileSync(new URL('../previews/premium-home/courses.json',import.meta.url)));
test('course links remain stable across ordering and duration filtering uses the actual course data',()=>{
  assert.equal(new Set(courses.map(courseSlug)).size,7);
  assert.equal(courses.filter(course=>matchesDuration(course,'short')).length,3);
  assert.equal(courses.filter(course=>matchesDuration(course,'six')).length,1);
  assert.equal(courses.filter(course=>matchesDuration(course,'year')).length,1);
  assert.equal(courses.filter(course=>matchesDuration(course,'flexible')).length,2);
  for(const course of courses)assert.match(courseSlug(course),/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});
test('recommendations respect learning goals and course length, using only existing course IDs',()=>{
  for(const goal of ['basics','office','accounting','typing'])for(const experience of ['new','some'])for(const time of ['short','six','year','flexible']){
    const result=recommendCourses(courses,{goal,experience,time});assert.ok(courses[result.id]);assert.ok(result.reason.length>30);
    if(goal==='typing')assert.equal(courses[result.id].category,'Typing');
    if(goal==='accounting')assert.match(courses[result.id].title,/Tally Prime/);
    if(goal==='basics'&&time==='short')assert.match(courses[result.id].title,/Three Month/);
    if(goal==='office'&&time==='year')assert.match(courses[result.id].title,/One Year/);
  }
});
test('typing accuracy counts incorrect/extra characters and WPM uses actual elapsed time capped to the test length',()=>{
  assert.deepEqual(typingScore('hello','hello',30000),{correct:5,accuracy:100,wpm:2});
  assert.deepEqual(typingScore('hello','hellx',15000),{correct:4,accuracy:80,wpm:3});
  assert.deepEqual(typingScore('hello','hello!',30000),{correct:5,accuracy:83,wpm:2});
  assert.equal(typingScore('hello','hello',90000).wpm,2);
  assert.equal(typingScore('hello','',0).wpm,0);
});
test('every generated brochure is a complete PDF with valid object offsets and all detailed Tally modules',async()=>{
  for(const course of courses){
    const blob=brochurePDF(course),text=await blob.text();assert.equal(blob.type,'application/pdf');assert.ok(text.startsWith('%PDF-1.4'));
    const offset=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(text.slice(offset,offset+4),'xref');
    const lines=text.slice(offset).split('\n'),count=Number(lines[1].split(' ')[1]);
    for(let id=1;id<count;id++){const start=Number(lines[id+2].slice(0,10));assert.ok(text.slice(start).startsWith(`${id} 0 obj`));}
    assert.match(text,/Rs\. 100/);assert.match(text,/9149551258/);assert.match(text,/9797205429/);assert.match(text,/Dar Yasir/);
    assert.ok(text.length>4000);
    if(course.syllabus)for(const module of course.syllabus)assert.ok(text.includes(module.module.replace(/[–—]/g,'-')),module.module);
  }
});

test('all course metadata, original application field names and qualification choices are retained',async()=>{
  const vm=await import('node:vm');
  const script=readFileSync(new URL('../public/script.js',import.meta.url),'utf8');
  const start=script.indexOf('const courses = ['),end=script.indexOf('\n];',start)+3;
  const original=JSON.parse(vm.runInNewContext(script.slice(start,end)+';JSON.stringify(courses)'));
  assert.deepEqual(courses,original);
  const source=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  const form=source.slice(source.indexOf('<form id="applicationForm"'),source.indexOf('</form>',source.indexOf('<form id="applicationForm"')));
  const preview=readFileSync(new URL('../previews/premium-home/index.html',import.meta.url),'utf8');
  for(const [,name] of form.matchAll(/name="([^"]+)"/g))assert.ok(preview.includes(`name="${name}"`),name);
  const qualification=form.match(/id="qualification"[\s\S]*?<\/select>/)[0];
  for(const [,value] of qualification.matchAll(/<option value="([^"]+)"/g))assert.ok(preview.includes(`value="${value}"`),value);
});
