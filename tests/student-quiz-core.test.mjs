import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cycleStart,indiaDay,planQuiz,publicQuestions,questionOkay,scoreQuiz,verifiedAwards} from '../backend/student-portal/quiz-core.mjs';

const bank=(program,count)=>Array.from({length:count},(_,index)=>({id:`${program.replace(/\W/g,'')}_${String(index).padStart(3,'0')}`,program,question:`Question number ${index} in ${program}?`,options:['Option A','Option B','Option C','Option D'],answer:index%4,active:true}));

test('seven daily quizzes have 10 unique questions and never expose answers',()=>{
 const questions=bank('Computer basics',70),used=[];
 for(let day=23;day<=29;day++){
  const date=`2026-11-${day}`;
  const selected=planQuiz({uid:'student-alpha',day:date,program:'Computer basics',bank:questions,usedIds:used});
  assert.equal(selected.length,10);assert.equal(new Set(selected.map(row=>row.id)).size,10);
  assert(selected.every(row=>row.options.length===4));assert(publicQuestions(selected).every(row=>!Object.hasOwn(row,'answer')));
  used.push(...selected.map(row=>row.id));
 }
 assert.equal(new Set(used).size,70);
 assert.throws(()=>planQuiz({uid:'student-alpha',day:'2026-11-29',program:'Computer basics',bank:questions,usedIds:used}),/Not enough unused/);
});

test('advanced program gets six earlier and four current questions',()=>{
 const selected=planQuiz({uid:'student-beta',day:'2026-11-24',program:'MS Word',bank:[...bank('Computer basics',6),...bank('Notepad',6),...bank('MS Word',6)]});
 assert.equal(selected.filter(row=>row.program==='MS Word').length,4);
 assert.equal(selected.filter(row=>row.program!=='MS Word').length,6);
 const answers=selected.map(row=>row.answer);assert.equal(scoreQuiz(selected,answers),10);
 answers[0]=(answers[0]+1)%4;assert.equal(scoreQuiz(selected,answers),9);
 assert.throws(()=>scoreQuiz(selected,answers.slice(1)),/10 questions/);
});

test('cycle and verified awards are deterministic',()=>{
 assert.equal(cycleStart('2026-11-29'),'2026-11-23');
 assert.equal(cycleStart('2026-11-30'),'2026-11-30');
 assert.equal(indiaDay(new Date('2026-11-23T19:00:00Z')),'2026-11-24');
 assert.deepEqual(verifiedAwards({score:10,consecutiveDays:7}),{points:100,badges:['Perfect Quiz','Seven Day Streak']});
});

test('the same question text cannot return under a different ID or casing',()=>{
 const questions=bank('Computer basics',11);
 const previous=questions[0].question;
 questions[10].question='  '+previous.toUpperCase().replaceAll(' ','  ')+'  ';
 assert.throws(()=>planQuiz({uid:'student-alpha',day:'2026-11-24',program:'Computer basics',bank:questions,usedIds:[questions[0].id],usedQuestions:[previous]}),/Not enough unused/);
 assert.equal(questionOkay({...questions[0],options:['First',' first ','Third','Fourth']}),false);
});
