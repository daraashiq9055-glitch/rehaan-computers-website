import {basicsExercises,approveQuestions,setProgrammeOpen} from '../previews/admin-premium/weekly-bank.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleReview,scheduledReview} from '../backend/student-portal/review-worker.mjs';
import {syncOfficialJourney,reviewOfficialJourney} from '../backend/student-portal/journey-server.mjs';
import {previewPublication,savePublication,deliverPublication,deletePublication} from '../backend/student-portal/publications.mjs';
import {readiness,normalizeQuestion} from '../backend/student-portal/question-bank.mjs';
import {decode,encode} from '../backend/student-portal/firestore-server.mjs';
const file=path=>readFileSync(new URL('../backend/student-portal/'+path,import.meta.url),'utf8');
function database(){const sql=new DatabaseSync(':memory:');sql.exec(file('schema.sql'));sql.exec(file('migrations/0002_review.sql'));const prepare=(query,values=[])=>({bind(...args){return prepare(query,args);},first:async()=>sql.prepare(query).get(...values)||null,all:async()=>({results:sql.prepare(query).all(...values)}),run:async()=>({meta:sql.prepare(query).run(...values)})});return {sql,prepare,async batch(rows){sql.exec('BEGIN');try{for(const row of rows)await row.run();sql.exec('COMMIT');}catch(error){sql.exec('ROLLBACK');throw error;}}};}
const timestamp=value=>{if(value instanceof Date)return {seconds:Math.floor(value.getTime()/1000),toMillis:()=>value.getTime()};if(Array.isArray(value))return value.map(timestamp);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,timestamp(v)]));return value;};
function store(){const docs=new Map();for(const [id,gender] of [['alpha','Female'],['beta','Male']]){const uid='student-'+id;docs.set('applications/'+id,{status:'Approved',enrolmentStatus:'Active',fullName:id,gender,batch:'Morning',admissionNumber:id,coursePreference:'Office',studentPortalAccount:{uid,enabled:true},learningProgress:{byCourse:{Office:{topics:[{id:'teacher',title:'WordPad',done:true,manual:true}]}}}});docs.set('studentPortalViews/'+uid,{uid,applicationId:id,enabled:true,journey:{}});docs.set('studentPortalViews/'+uid+'/learning/current',{program:'MS Word',updatedAt:new Date('2026-11-23T01:00:00Z')});}
const snapshot=path=>({exists:()=>docs.has(path),data:()=>timestamp(structuredClone(docs.get(path)))});const sdk={doc:(_, ...parts)=>parts.join('/'),runTransaction:async(_,fn)=>{const writes=[];const result=await fn({get:async path=>snapshot(path),set:(path,data)=>writes.push(()=>docs.set(path,structuredClone(data))),update:(path,data)=>writes.push(()=>docs.set(path,{...docs.get(path),...structuredClone(data)})),delete:path=>writes.push(()=>docs.delete(path))});writes.forEach(fn=>fn());return result;}};return {docs,sdk,db:{},get:async path=>snapshot(path),listApplications:async()=>[...docs].filter(([key])=>key.startsWith('applications/')).map(([key,data])=>({id:key.split('/')[1],data}))};}
const jwt=uid=>'h.'+Buffer.from(JSON.stringify({sub:uid})).toString('base64url')+'.s';
async function auth(url,options){const uid=['student-alpha','student-beta','student-outsider','admin-0001'].find(x=>options.headers.Authorization==='Bearer '+jwt(x)),path=decodeURIComponent(new URL(url).pathname.split('/documents/')[1]||'');if(path==='admins/admin-0001'&&uid==='admin-0001')return Response.json({fields:{uid:{stringValue:uid},isAdmin:{booleanValue:true}}});if(uid&&path==='studentPortalViews/'+uid)return Response.json({fields:{uid:{stringValue:uid},enabled:{booleanValue:true},profile:{mapValue:{fields:{name:{stringValue:uid},admissionNumber:{stringValue:uid}}}}}});if(uid&&path==='studentPortalViews/'+uid+'/learning/current')return Response.json({fields:{program:{stringValue:'Computer basics'}}});return Response.json({error:'denied'},{status:403});}
const env=db=>({DB:db,REVIEW_MODE:'true',REVIEW_ADMIN_UIDS:'admin-0001',REVIEW_STUDENT_UIDS:'student-alpha,student-beta',FIREBASE_PROJECT_ID:'rehaan-computers',ALLOWED_ORIGINS:'http://localhost:8000',QUIZ_LIMITER:{limit:async()=>({success:true})}});
async function call(environment,path,uid='student-alpha',method='GET',input,day='2026-11-23',server=store()) {const request=new Request('https://review.test'+path,{method,headers:{Origin:'http://localhost:8000',Authorization:'Bearer '+jwt(uid),'CF-Connecting-IP':'127.0.0.1',...(input?{'Content-Type':'application/json'}:{})},...(input?{body:JSON.stringify(input)}:{})});const result=await handleReview(request,environment,auth,server,new Date(day+'T10:00:00Z'));return {status:result.status,data:await result.json()};}

test('server Journey updates existing checklist with no admin browser, preserves corrections, and scheduled recovery is idempotent',async()=>{
 const server=store(),db=database(),environment=env(db),now=new Date('2026-11-23T10:00:00Z');
 await syncOfficialJourney(server,'student-alpha',{program:'MS Excel',learned:['Notepad','WordPad']},now);
 let view=server.docs.get('studentPortalViews/student-alpha').journey;
 assert.equal(view.currentProgram,'MS Excel');assert.equal(view.topics.find(t=>t.title==='WordPad').done,true);assert.equal(view.topics.find(t=>t.title==='Notepad').requestStatus,'requested');
 await reviewOfficialJourney(server,'student-alpha',{version:now.getTime(),approved:['Notepad']},now);
 await syncOfficialJourney(server,'student-alpha',{program:'PowerPoint'},new Date(now.getTime()+1000));
 assert.equal(server.docs.get('studentPortalViews/student-alpha').journey.topics.find(t=>t.title==='Notepad').done,true);
 server.docs.set('studentPortalViews/student-alpha/learning/current',{program:'MS Access',updatedAt:new Date(now.getTime()+2000)});
 await scheduledReview(environment,server,now);assert.equal(server.docs.get('studentPortalViews/student-alpha').journey.currentProgram,'MS Access');
 const saved=JSON.stringify(server.docs.get('applications/alpha'));await scheduledReview(environment,server,now);assert.equal(JSON.stringify(server.docs.get('applications/alpha')),saved);
 await assert.rejects(syncOfficialJourney(server,'student-alpha',{uid:'student-beta',program:'MS Word'}),/Unsupported/);
 assert.equal(server.docs.get('applications/beta').learningProgress.byCourse.Office.currentProgram,'MS Word');db.sql.close();
});
test('review question bank requires separate approval; readiness blocks activation; private seven-day quizzes keep keys and scores secure',async()=>{
 const db=database(),environment=env(db);
 assert.equal((await call(environment,'/leaderboard','student-outsider')).status,403);
 assert.equal((await call(environment,'/admin/questions','student-alpha')).status,403);
 assert.equal((await call(environment,'/quiz/today')).status,409);
 const drafts=JSON.parse(file('question-drafts.json'));assert.equal(drafts.questions.length,33);assert.equal(new Set(drafts.questions.map(q=>q.program)).size,11);
 assert.equal((await call(environment,'/admin/questions/import','admin-0001','POST',drafts)).status,200);
 const imported=(await call(environment,'/admin/questions','admin-0001')).data;assert(imported.questions.every(row=>row.status==='Draft'&&row.active===0));assert(imported.readiness.every(row=>!row.ready));
 const first=imported.questions[0];assert.equal((await call(environment,'/admin/questions','admin-0001','POST',{...first,expectedUpdatedAt:first.updated_at,status:'Approved'})).status,400);
 assert.equal((await call(environment,'/admin/questions','admin-0001','POST',{...first,expectedUpdatedAt:first.updated_at,status:'Review'})).status,200);
 const latest=(await call(environment,'/admin/questions','admin-0001')).data.questions.find(q=>q.id===first.id);
 assert.equal((await call(environment,'/admin/questions','admin-0001','POST',{...latest,expectedUpdatedAt:latest.updated_at,status:'Approved'})).status,200);
 assert.equal((await call(environment,'/admin/activation','admin-0001','POST',{enabled:true,programs:['Computer basics']})).status,400);
 const exercises=basicsExercises();
 assert.equal(new Set(exercises.map(row=>row.question)).size,70);
 assert.equal((await call(environment,'/admin/questions/import','admin-0001','POST',{questions:exercises})).status,200);
 const pending=(await call(environment,'/admin/questions','admin-0001')).data.questions.filter(row=>row.id.startsWith('rc-basics-math-'));
 let finished=0;
 await approveQuestions(async(path,{body})=>{
  const response=await call(environment,path,'admin-0001','POST',body);
  assert.equal(response.status,200,JSON.stringify(response.data));
 },pending,done=>{finished=done;});
 assert.equal(finished,70);

 const adminApi=async(path,options={})=>{
  const response=await call(environment,path,'admin-0001',options.method||'GET',options.body);
  assert.equal(response.status,200,JSON.stringify(response.data));return response.data;
 };
 assert.deepEqual(await setProgrammeOpen(adminApi,'Computer basics',true),['Computer basics']);
 assert.deepEqual(await setProgrammeOpen(adminApi,'Computer basics',false),[]);
 assert.equal((await call(environment,'/quiz/today','student-alpha')).status,409);
 assert.deepEqual(await setProgrammeOpen(adminApi,'Computer basics',true),['Computer basics']);
 assert.equal((await call(environment,'/quiz/me','student-alpha')).data.quizReady,true);
 const used=new Set();for(let d=23;d<=29;d++){const day='2026-11-'+d,quiz=await call(environment,'/quiz/today','student-alpha','GET',undefined,day);assert.equal(quiz.status,200);assert.equal(quiz.data.questions.length,10);assert(!quiz.data.correctAnswers);for(const q of quiz.data.questions){assert.equal(q.options.length,4);assert(!('answer'in q));assert(!used.has(q.id));used.add(q.id);}const result=await call(environment,'/quiz/submit','student-alpha','POST',{day,answers:Array(10).fill(0)},day);assert.equal(result.status,200);assert.equal(result.data.correctAnswers.length,10);const retry=await call(environment,'/quiz/submit','student-alpha','POST',{day,answers:Array(10).fill(3)},day);assert.equal(retry.data.score,result.data.score);}
 assert.equal((await call(environment,'/quiz/me','student-beta')).data.quizDays,0);
 assert.equal((await call(environment,'/admin/publish','admin-0001','POST',{period:'weekly'},'2026-11-30')).status,400);
 const preview=await call(environment,'/admin/results/preview','admin-0001','POST',{period:'weekly'},'2026-11-30');assert.equal(preview.status,200);
 assert.equal((await call(environment,'/admin/publish','admin-0001','POST',{period:'weekly',reviewToken:preview.data.reviewToken},'2026-11-30')).status,200);
 assert.equal(db.sql.prepare('SELECT bonus FROM league_awards').get().bonus,50);
 db.sql.close();
});
test('scheduled centre publications deliver without browser, retain read flags on edits and delete all copies',async()=>{
 const db=database(),server=store(),environment=env(db),now=new Date('2026-11-23T10:00:00Z');
 const input={publicationId:'review-publication-001',target:{kind:'all'},scheduledAt:'2026-11-24T10:00:00Z',payload:{category:'Homework',title:'Class exercise',details:'Complete the lesson.',author:'Teacher'}};
 const preview=await previewPublication(server,environment,input,now);assert.equal(preview.recipients.length,2);
 for(const [target,ids] of [[{kind:'boys'},['beta']],[{kind:'girls'},['alpha']],[{kind:'batch',batch:'Morning'},['alpha','beta']],[{kind:'selected',ids:['alpha']},['alpha']]])assert.deepEqual((await previewPublication(server,environment,{...input,target},now)).recipients.map(row=>row.id),ids);
 const saved=await savePublication(db,server,environment,{...input,reviewedIds:['alpha','beta']},'admin-0001',now);
 await savePublication(db,server,environment,{...input,reviewedIds:['alpha','beta']},'admin-0001',now);assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM publications').get().n,1);
 await deliverPublication(db,server,environment,saved.id,now);assert(!server.docs.has('studentPortalViews/student-alpha/updates/centre-'+saved.id));
 const later=new Date('2026-11-24T11:00:00Z');await deliverPublication(db,server,environment,saved.id,later);
 const path='studentPortalViews/student-alpha/updates/centre-'+saved.id;assert.equal(server.docs.get(path).readByStudent,false);server.docs.get(path).readByStudent=true;
 await savePublication(db,server,environment,{...input,id:saved.id,revision:1,reviewedIds:['alpha','beta'],payload:{...input.payload,title:'Corrected exercise'}},'admin-0001',later);
 await deliverPublication(db,server,environment,saved.id,later);assert.equal(server.docs.get(path).title,'Corrected exercise');assert.equal(server.docs.get(path).readByStudent,true);
 await deletePublication(db,saved.id,2);await deliverPublication(db,server,environment,saved.id,later);assert(!server.docs.has(path));assert(!server.docs.has('studentPortalViews/student-beta/updates/centre-'+saved.id));
 assert.equal(db.sql.prepare('SELECT state FROM publications').get().state,'deleted');db.sql.close();
});
test('Firestore codec retains precise timestamps and nested canonical checklist data',()=>{const original={program:'MS Word',updatedAt:new Date('2026-11-23T12:34:56.789Z'),topics:[{done:false,title:'Notepad'}]};assert.deepEqual(encode(decode({timestampValue:'2026-11-23T12:34:56.123456789Z'})),{timestampValue:'2026-11-23T12:34:56.123456789Z'});const value=decode(encode(original));assert.equal(value.updatedAt.toMillis(),original.updatedAt.getTime());assert.deepEqual(value.topics,original.topics);});

test('shared weekly competition uses confirmed Journey history, 8 correct = 8 points, and one frozen public podium',async()=>{
 const db=database();db.sql.exec(file('migrations/0003_competition.sql'));
 const environment=env(db),server=store();
 const {shortcutDrafts}=await import('../backend/student-portal/shortcut-drafts.mjs');
 const {dailyMix}=await import('../backend/student-portal/competition.mjs');
 assert.deepEqual(dailyMix('MS Word',[]),[{program:'MS Word',count:10}]);
 assert.deepEqual(dailyMix('MS Word',[{title:'WordPad',done:true}]),[{program:'WordPad',count:6},{program:'MS Word',count:4}]);
 for(const student of ['alpha','beta']){
  server.docs.get('studentPortalViews/student-'+student).journey={topics:['Computer basics','Notepad','WordPad'].map(title=>({title,done:true}))};
 }
 const run=async(path,user='admin-0001',method='GET',input,day='2026-11-23')=>{
  const response=await call(environment,path,user,method,input,day,server);
  assert.equal(response.status,200,JSON.stringify(response.data));return response.data;
 };
 const initial=await run('/admin/competition');assert.deepEqual(initial.subjects.map(s=>s.missing),[21,21,28]);
 for(const {program,needed} of initial.subjects){
  const drafts=shortcutDrafts(program).slice(0,needed);
  await run('/admin/questions/import','admin-0001','POST',{questions:drafts});
  const pending=(await run('/admin/questions')).questions.filter(q=>q.program===program);
  const batch={questions:pending.map(q=>({id:q.id,revision:q.revision}))};
  assert.equal((await run('/admin/questions/approve-group','admin-0001','POST',batch)).approved,needed);
  assert.equal((await call(environment,'/admin/questions/approve-group','admin-0001','POST',batch)).status,409);
 }
 await run('/admin/competition/open','admin-0001','POST',{});
 const ids=new Set();
 for(const [user,points] of [['student-alpha',8],['student-beta',9]]){
  assert.equal((await run('/competition/me',user)).rank,null);
  const attempt=await run('/competition/today',user),again=await run('/competition/today',user);
  assert.deepEqual(again,attempt);assert.equal(attempt.questions.length,10);
  assert.deepEqual(['Notepad','WordPad','MS Word'].map(p=>attempt.questions.filter(q=>q.program===p).length),[3,3,4]);
  assert(attempt.questions.every(q=>q.options.length===4&&!('answer'in q)&&!('explanation'in q)));
  const answers=attempt.questions.map((q,i)=>{
   if(user==='student-alpha')ids.add(q.question);
   const bank=db.sql.prepare('SELECT options_json,answer FROM question_bank WHERE question=?').get(q.question);
   const key=q.options.indexOf(JSON.parse(bank.options_json)[bank.answer]);assert(key>=0);
   return i<points?key:i===9?null:(key+1)%4;
  });
  const submit=(choices)=>run('/competition/submit',user,'POST',{day:attempt.day,answers:choices});
  const result=await submit(answers);
  assert.equal(result.score,points);assert.equal(result.stats.points,points);assert.equal(result.rank,1);
  assert.equal(result.weeklyTotal,points);assert.equal(result.points,points);assert.equal(result.explanations.length,10);
  assert.equal((await submit(Array(10).fill(0))).stats.points,points);
 }
 const now=await run('/competition/me','student-alpha');
 assert.equal(now.rank,2);assert.equal(now.students.length,2);assert(now.students[1].mine);
 for(let d=24;d<=29;d++){
  const next=await run('/competition/today','student-alpha','GET',undefined,'2026-11-'+d);
  for(const q of next.questions){assert(!ids.has(q.question));ids.add(q.question);}
 }
 assert.equal(ids.size,70);
 assert.equal((await run('/competition/published')).published,false);
 const week={week:initial.week};
 assert.equal((await call(environment,'/admin/competition/publish','admin-0001','POST',week)).status,409);
 await run('/admin/competition/preview','admin-0001','POST',week,'2026-11-30');
 await run('/admin/competition/publish','admin-0001','POST',week,'2026-11-30');
 await run('/admin/competition/publish','admin-0001','POST',week,'2026-11-30');
 const official=await run('/competition/published');
 assert.deepEqual(official.students.map(r=>r.score),[9,8]);assert(!('uid'in official.students[0]));
 const recognition=await run('/competition/me','student-alpha','GET',undefined,'2026-11-30');
 assert.deepEqual(recognition.podium,[{week:initial.week,rank:2}]);assert.equal(recognition.points,8);
 db.sql.close();
});

test('the teacher can prepare a full subject bank for every later Journey programme',async()=>{
 const {programs,questionOkay}=await import('../backend/student-portal/quiz-core.mjs');
 const db=database(),environment=env(db);
 for(const program of programs.slice(1)){
  const response=await call(environment,'/admin/competition-drafts?program='+encodeURIComponent(program),'admin-0001');
  assert.equal(response.status,200);
  const questions=response.data.questions;
  assert(questions.length>=70);assert.equal(new Set(questions.map(q=>q.question)).size,questions.length);
  assert(questions.every(q=>questionOkay(q)&&q.status==='Draft'&&q.question.includes(program)&&q.explanation.length>=5));
 }
 db.sql.close();
});
