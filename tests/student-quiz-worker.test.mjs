import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleRequest} from '../backend/student-portal/worker.mjs';

function database(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../backend/student-portal/schema.sql',import.meta.url),'utf8'));
 const prepare=(sql,args=[])=>({bind(...values){return prepare(sql,values);},first:async()=>sqlite.prepare(sql).get(...args)||null,all:async()=>({results:sqlite.prepare(sql).all(...args)}),run:async()=>({meta:sqlite.prepare(sql).run(...args)})});
 return {sqlite,prepare(sql){return prepare(sql);},async batch(statements){sqlite.exec('BEGIN');try{for(const statement of statements)await statement.run();sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
}
const jwt=uid=>'h.'+Buffer.from(JSON.stringify({sub:uid})).toString('base64url')+'.s';
const users={'student-alpha':{name:'Aisha Test',program:'Computer basics'},'student-beta':{name:'Bilal Test',program:'MS Word'}};
async function firestore(url,options){
 const uid=Object.keys(users).concat('admin-0001').find(value=>options.headers.Authorization==='Bearer '+jwt(value));
 const path=decodeURIComponent(new URL(url).pathname.split('/documents/')[1]||'');
 if(path==='admins/admin-0001'&&uid==='admin-0001')return Response.json({fields:{uid:{stringValue:'admin-0001'},isAdmin:{booleanValue:true}}});
 if(path===`studentPortalViews/${uid}`&&users[uid])return Response.json({fields:{uid:{stringValue:uid},enabled:{booleanValue:true},profile:{mapValue:{fields:{name:{stringValue:users[uid].name},admissionNumber:{stringValue:uid}}}}}});
 if(path===`studentPortalViews/${uid}/learning/current`&&users[uid])return Response.json({fields:{program:{stringValue:users[uid].program}}});
 return Response.json({error:'permission denied'},{status:403});
}
function request(path,uid,method='GET',body){return new Request('https://quiz.test'+path,{method,headers:{Origin:'https://rehaan-computers.web.app','CF-Connecting-IP':'127.0.0.1',Authorization:'Bearer '+jwt(uid),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});}
const now=day=>new Date(day+'T10:00:00Z');
const call=async(env,path,uid,method='GET',body,day='2026-11-23')=>{const response=await handleRequest(request(path,uid,method,body),env,firestore,now(day));return {status:response.status,data:await response.json()};};

test('admin bank, two isolated students, locked scoring, seven-day rotation and published rank',async()=>{
 const db=database(),env={DB:db,QUIZ_LIMITER:{limit:async()=>({success:true})},FIREBASE_PROJECT_ID:'rehaan-computers',ALLOWED_ORIGINS:'https://rehaan-computers.web.app'};
 assert.equal((await call(env,'/admin/questions','student-alpha','POST',{program:'MS Word',question:'What does a table contain?',options:['Rows','Only pictures','Nothing','Only sound'],answer:0})).status,403);
 const created=await call(env,'/admin/questions','admin-0001','POST',{program:'MS Word',question:'What does a table contain?',options:['Rows','Only pictures','Nothing','Only sound'],answer:0});assert.equal(created.status,200);
 assert.equal((await call(env,'/admin/questions/'+created.data.id,'admin-0001','DELETE')).data.active,false);
 for(const [program,count] of [['Computer basics',70],['MS Word',27]])for(let index=0;index<count;index++)db.sqlite.prepare('INSERT INTO question_bank(id,program,question,options_json,answer,active,created_at,author_uid) VALUES(?,?,?,?,?,?,?,?)').run(`${program.replace(/\W/g,'')}_${String(index).padStart(3,'0')}`,program,`Question ${index} for ${program}?`,JSON.stringify(['Answer A','Answer B','Answer C','Answer D']),index%4,1,'2026-11-23','admin-0001');
 const allIds=new Set();
 for(let day=23;day<=29;day++){
  const date=`2026-11-${day}`,opened=await call(env,'/quiz/today','student-alpha','GET',undefined,date);assert.equal(opened.status,200);assert.equal(opened.data.questions.length,10);
  for(const question of opened.data.questions){assert.equal(question.options.length,4);assert.equal(Object.hasOwn(question,'answer'),false);assert.equal(allIds.has(question.id),false);allIds.add(question.id);}
  const result=await call(env,'/quiz/submit','student-alpha','POST',{day:date,answers:Array(10).fill(0)},date);assert.equal(result.status,200);assert.equal(result.data.completed,true);
  const retry=await call(env,'/quiz/submit','student-alpha','POST',{day:date,answers:Array(10).fill(1)},date);assert.equal(retry.data.score,result.data.score);
 }
 assert.equal(allIds.size,70);
 const beta=await call(env,'/quiz/today','student-beta');assert.equal(beta.status,200);assert.equal(beta.data.questions.filter(item=>item.program==='MS Word').length,4);
 const stale=await call(env,'/quiz/submit','student-beta','POST',{day:'2026-11-22',answers:Array(10).fill(0)});assert.equal(stale.status,409);
 assert.equal((await call(env,'/quiz/submit','student-beta','POST',{day:'2026-11-23',answers:Array(10).fill(0)})).status,200);
 users['student-beta'].program='MS Excel';const changed=await call(env,'/quiz/today','student-beta','GET',undefined,'2026-11-24');assert.equal(changed.status,409);assert.match(changed.data.error,/locked/);users['student-beta'].program='MS Word';
 assert.equal((await call(env,'/leaderboard','student-beta')).data.published,false);
 assert.equal((await call(env,'/admin/publish','admin-0001','POST',{period:'weekly',cycle:'2026-11-23'})).status,409);
 const published=await call(env,'/admin/publish','admin-0001','POST',{period:'weekly'},'2026-11-30');assert.equal(published.status,200);assert.equal(published.data.students,2);
 const league=await call(env,'/leaderboard','student-beta','GET',undefined,'2026-12-09');assert.equal(league.data.published,true);assert.equal(league.data.students.length,2);assert.equal(league.data.key,'2026-11-23');
 const overallPublish=await call(env,'/admin/publish','admin-0001','POST',{period:'overall'},'2026-11-30');assert.equal(overallPublish.status,200);
 assert.equal((await call(env,'/leaderboard?period=overall','student-beta')).data.students.length,2);
 const alpha=await call(env,'/quiz/me','student-alpha','GET',undefined,'2026-11-30');assert.equal(alpha.data.ranks.weekly.rank>0,true);assert.equal(alpha.data.streak,8);
 assert(alpha.data.points>alpha.data.quizDays*10);
 const other=await call(env,'/quiz/me','student-beta');assert.equal(other.data.quizDays,1);assert.notEqual(alpha.data.quizDays,other.data.quizDays);
 db.sqlite.close();
});
