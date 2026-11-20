import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessmentKey,assessmentGroups,groupResults} from '../admin-group-marks-model.js';
import {groupSVG} from '../admin-group-marks.js';
const card=()=>({title:'MS Word & Typing',date:'2026-11-01',subjects:[{name:'MS Word',max:20,marks:14},{name:'Typing',max:50,marks:33,typing:{speed:25,accuracy:88}}]});
const entry=(id,n,change={})=>({id,data:{fullName:n,admissionNumber:id,markCard:{...card(),...change},monthlyFees:{'2026-11-01':999},payment:{status:'paid'},photo:'private-photo'}});
test('group sheets keep real saved grades, incomplete and failing results and do not mutate records',()=>{const records=[entry('002','B'),entry('001','A',{subjects:[{name:'MS Word',max:20,marks:2},{name:'Typing',max:50,marks:49,typing:{speed:32,accuracy:99}}]}),entry('003','C',{subjects:[{name:'MS Word',max:20,marks:null},{name:'Typing',max:50,marks:44,typing:{speed:35,accuracy:95}}]})],before=structuredClone(records),key=assessmentKey(card()),result=groupResults(records,key,records.map(r=>r.id));assert.deepEqual(result.rows.map(r=>r.id),['001','002','003']);assert.deepEqual([result.summary.passed,result.summary.failed,result.summary.incomplete],[1,1,1]);assert.equal(result.rows[0].result.grade,'F');assert.match(result.rows[1].note,/accuracy/);assert.deepEqual(records,before);assert.equal(groupResults(records,key,['002','002']).summary.students,1);});
test('different exam/date/subject maxima cannot be silently merged; invalid cards stay flagged',()=>{const records=[entry('1','A'),entry('2','B',{date:'2026-10-01'}),entry('3','C',{subjects:[{name:'MS Word',max:100,marks:14}] }),entry('4','D',{date:'bad'}),{id:'5',data:{}}];const groups=assessmentGroups(records);assert.equal(groups.groups.length,3);assert.equal(groups.missing,1);assert.deepEqual(groups.review,['4']);assert.throws(()=>groupResults(records,assessmentKey(card()),['1','2']),/same assessment/);assert.throws(()=>groupResults(records,assessmentKey(card()),[]),/Select/);});
test('saved manual grade and all subjects survive grouping; print image escapes every user field',()=>{const records=[entry('1','<script>alert(1)</script>',{manualGrade:'A+'})],result=groupResults(records,assessmentKey(card()),['1']);assert.equal(result.rows[0].result.grade,'A+');const svg=groupSVG(result,'<img onerror=alert(1)>',{name:'REHAAN COMPUTERS',address:'Charangam',phone:'9797205429',phone2:'9149551258',website:'https://rehaan-computers.web.app'});assert.doesNotMatch(svg,/<script>|<img /);assert.match(svg,/&lt;script&gt;/);assert.match(svg,/ACCURACY/);assert.match(svg,/9797205429/);assert.match(svg,/88/);assert.match(svg,/PASS/);});

import {applyGroupDraft,SHEET_LABELS} from '../admin-group-draft.js';
import {groupInsights,groupRankings} from '../admin-group-sheet.js';
test('report averages exclude incomplete results and missing values but include recorded zeroes',()=>{
 const records=[entry('1','Zero',{subjects:[{name:'MS Word',max:20,marks:0},{name:'Typing',max:50,marks:0,typing:{speed:0,accuracy:0}}]}),entry('2','Full',{subjects:[{name:'MS Word',max:20,marks:20},{name:'Typing',max:50,marks:50,typing:{speed:null,accuracy:null}}]}),entry('3','Pending',{subjects:[{name:'MS Word',max:20,marks:null},{name:'Typing',max:50,marks:0,typing:{speed:50,accuracy:100}}]})];
 const result=groupResults(records,assessmentKey(card()),records.map(r=>r.id)),before=structuredClone(result),insights=groupInsights(result);
 assert.equal(insights.completed,2);assert.equal(insights.average,50);assert.equal(insights.passRate,50);assert.equal(insights.highest,100);
 assert.equal(insights.subjects[0].average,10);assert.equal(insights.subjects[0].recorded,2);assert.equal(insights.subjects[1].speed,25);assert.equal(insights.subjects[1].speedCount,2);assert.equal(insights.subjects[1].accuracy,50);assert.equal(insights.subjects[1].accuracyCount,2);
 assert.deepEqual(result,before);
 const incomplete=groupResults([records[2]],assessmentKey(card()),['3']);const pending=groupInsights(incomplete);assert.equal(pending.average,null);assert.equal(pending.highest,null);assert.equal(pending.passRate,null);
 const svg=groupSVG(incomplete,'',{name:'REHAAN COMPUTERS',address:'Charangam',website:'https://rehaan-computers.web.app'});assert.doesNotMatch(svg,/NaN|Infinity|undefined/);assert.match(svg,/No complete results yet/);assert.match(svg,/INCOMPLETE/);
});
test('editable sheet draft recalculates totals and grades while leaving original marks and payments untouched',()=>{const records=[entry('1','Original')],before=structuredClone(records),draft={title:'Edited exam',date:'2026-11-01',labels:{...SHEET_LABELS,student:'LEARNER'},profile:{name:'REHAAN COMPUTERS',address:'Charangam Beerwah',email:'rehaancomputers881@gmail.com',phone:'9797205429',phone2:'9149551258',website:'https://rehaan-computers.web.app'},subjects:[{name:'Word Practical',max:20},{name:'Typing',max:50}],students:{'1':{name:'Edited name',admission:'101',serial:'5',marks:{0:20,1:50},typing:{1:{speed:45,accuracy:98}},note:'Excellent progress.'}}};const out=applyGroupDraft(records,assessmentKey(card()),['1'],draft);assert.equal(out.result.rows[0].result.total,70);assert.equal(out.result.rows[0].result.grade,'A+');assert.equal(out.result.rows[0].note,'Excellent progress.');assert.equal(out.labels.student,'LEARNER');assert.deepEqual(records,before);draft.students['1'].marks[0]=21;assert.throws(()=>applyGroupDraft(records,assessmentKey(card()),['1'],draft),/Obtained marks/);assert.deepEqual(records,before);});

import {composeGroup} from '../admin-group-marks-model.js';
test('manual source includes students without cards and never borrows marks from other exams',()=>{
 const records=[entry('1','Saved'),{id:'2',data:{fullName:'New',admissionNumber:'2'}},entry('3','Other',{date:'2026-10-01'})],before=structuredClone(records);
 const g=composeGroup(records,card());assert.equal(g.entries.length,3);assert.equal(g.entries[0].data.markCard.subjects[0].marks,14);
 for(const row of g.entries.slice(1)){assert.equal(row.data.markCard.subjects[0].marks,null);assert.deepEqual(row.data.markCard.subjects[1].typing,{speed:null,accuracy:null});}
 assert.deepEqual(records,before);
});
test('incomplete students cannot be overall toppers even with high partial totals',()=>{
 const records=[entry('1','Complete',{subjects:[{name:'MS Word',max:20,marks:10},{name:'Typing',max:50,marks:20,typing:{speed:25,accuracy:95}}]}),entry('2','Pending',{subjects:[{name:'MS Word',max:20,marks:null},{name:'Typing',max:50,marks:50,typing:{speed:40,accuracy:99}}]})];
 const svg=groupSVG(groupResults(records,assessmentKey(card()),['1','2']),'',{name:'Rehaan',address:'Charangam'});
 assert.match(svg,/TOP 3 STUDENTS/);assert.deepEqual(groupRankings(groupResults(records,assessmentKey(card()),['1','2'])).top.map(r=>r.id),['1']);assert.match(svg,/TOP 3 IMPROVEMENT PRIORITIES/);
});
test('rankings contain exactly the three highest and three lowest complete scores with stable ties',()=>{
 const records=[10,80,50,0,80,90,40].map((marks,i)=>entry(String(i),`Student ${i}`,{subjects:[{name:'Exam',max:100,marks}]}));
 const result=groupResults(records,assessmentKey(records[0].data.markCard),records.map(r=>r.id)),before=structuredClone(result);
 const ranked=groupRankings(result);assert.deepEqual(ranked.top.map(r=>r.id),['5','1','4']);assert.deepEqual(ranked.lowest.map(r=>r.id),['3','0','6']);assert.deepEqual(result,before);
 const none=groupRankings({...result,rows:[]});assert.deepEqual(none,{top:[],lowest:[]});
});
test('compact sheet omits summary panels and accepts only validated private PNG signatures',()=>{
 const records=[entry('1','Student')],result=groupResults(records,assessmentKey(card()),['1']);
 const svg=groupSVG(result,'',{name:'Rehaan',address:'Charangam'});
 for(const title of ['CLASS AVERAGE','PASS RATE','HIGHEST SCORE','AWAITING MARKS','SUBJECT PERFORMANCE','RESULT SUMMARY','INSTITUTE SEAL'])assert.ok(!svg.includes(title));
 assert.match(svg,/EXAMINER \/ ASSESSOR/);assert.match(svg,/AUTHORIZED SIGNATORY/);assert.match(svg,/#176343/);
 assert.throws(()=>groupSVG(result,'',{name:'Rehaan'},undefined,{examiner:'https://example.test/signature.png'}),/PNG/);
});
