import {cycleStart,indiaDay,lastClosedCycle,planQuiz,publicQuestions,questionOkay,scoreQuiz,verifiedAwards} from './quiz-core.mjs';

export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
const profileValue=(fields,key)=>fields?.[key]?.stringValue||'';
const d1=(db,sql,...values)=>db.prepare(sql).bind(...values);
const parse=value=>{try{return JSON.parse(value);}catch{throw new HttpError(503,'Stored quiz data needs administrator review.');}};
const originAllowed=(origin,env)=>Boolean(origin&&String(env.ALLOWED_ORIGINS||'').split(',').map(value=>value.trim()).includes(origin));

async function firestoreDoc(path,bearer,env,fetcher){
 const response=await fetcher(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`,{headers:{Authorization:bearer},redirect:'manual',signal:AbortSignal.timeout(10000)});
 if(response.status===404)return null;
 if(!response.ok)throw new HttpError(response.status===401?401:403,'Your account cannot access this record. Sign in again.');
 return response.json();
}
function bearerUid(request){
 const bearer=request.headers.get('Authorization')||'';
 if(!/^Bearer [A-Za-z0-9_.-]+$/.test(bearer)||bearer.length>8192)throw new HttpError(401,'Sign in to your account.');
 let uid;try{const raw=bearer.slice(7).split('.')[1];uid=JSON.parse(atob(raw.replace(/-/g,'+').replace(/_/g,'/'))).sub;}catch{throw new HttpError(401,'Sign in again.');}
 if(!/^[A-Za-z0-9:_-]{8,128}$/.test(uid||''))throw new HttpError(401,'Sign in again.');
 // The decoded UID is untrusted until Firestore validates this bearer token
 // and authorizes a read using the deployed student/admin security rules.
 return {uid,bearer};
}
export async function student(request,env,fetcher,selectionNeeded=false){
 const {uid,bearer}=bearerUid(request);
 const view=await firestoreDoc(`studentPortalViews/${encodeURIComponent(uid)}`,bearer,env,fetcher);
 if(!view||view.fields?.uid?.stringValue!==uid||view.fields?.enabled?.booleanValue!==true)throw new HttpError(403,'Student access is not active.');
 const profile=view.fields?.profile?.mapValue?.fields||{},name=profileValue(profile,'name').slice(0,100),admission=profileValue(profile,'admissionNumber').slice(0,40);
 let program='';
 if(selectionNeeded){const selected=await firestoreDoc(`studentPortalViews/${encodeURIComponent(uid)}/learning/current`,bearer,env,fetcher);program=selected?.fields?.program?.stringValue||'';if(!program)throw new HttpError(409,'Choose your learning program in Journey before starting the quiz.');}
 return {uid,name,admission,program};
}
export async function admin(request,env,fetcher){
 const {uid,bearer}=bearerUid(request),record=await firestoreDoc(`admins/${encodeURIComponent(uid)}`,bearer,env,fetcher);
 if(record?.fields?.uid?.stringValue!==uid||record?.fields?.isAdmin?.booleanValue!==true)throw new HttpError(403,'Administrator access required.');
 return uid;
}
export async function jsonBody(request){
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new HttpError(415,'Send JSON.');
 const text=await request.text();if(text.length>12000)throw new HttpError(413,'Request is too large.');
 try{return JSON.parse(text);}catch{throw new HttpError(400,'Invalid JSON.');}
}
async function visit(db,uid,day){await d1(db,'INSERT OR IGNORE INTO visits(uid,day) VALUES(?,?)',uid,day).run();}
async function streak(db,uid,day){
 const rows=(await d1(db,'SELECT day FROM visits WHERE uid=? AND day<=? ORDER BY day DESC LIMIT 60',uid,day).all()).results||[];
 let count=0,date=new Date(day+'T00:00:00Z');
 for(const row of rows){if(row.day!==date.toISOString().slice(0,10))break;count++;date=new Date(date.getTime()-86400000);}
 return count;
}
const resultFor=row=>({day:row.day,program:row.program,questions:publicQuestions(parse(row.questions_json)),completed:row.score!==null,score:row.score,points:row.points,correctAnswers:row.score!==null?parse(row.key_json):undefined,selectedAnswers:row.score!==null?parse(row.answers_json):undefined});

async function todayQuiz(db,identity,day){
 let row=await d1(db,'SELECT * FROM attempts WHERE uid=? AND day=?',identity.uid,day).first();
 if(row)return resultFor(row);
 const cycle=cycleStart(day),prior=(await d1(db,'SELECT questions_json,program FROM attempts WHERE uid=? AND cycle=?',identity.uid,cycle).all()).results||[];
 if(prior.some(item=>item.program!==identity.program))throw new HttpError(409,'Your quiz program is locked for this seven-day cycle. Choose a new program next week.');
 const used=prior.flatMap(item=>parse(item.questions_json));
 const bankRows=(await d1(db,'SELECT id,program,question,options_json,answer,active FROM question_bank WHERE active=1 LIMIT 3000').all()).results||[];
 const bank=bankRows.map(item=>({...item,options:parse(item.options_json)}));
 let selected;try{selected=planQuiz({uid:identity.uid,day,program:identity.program,bank,usedIds:used.map(item=>item.id),usedQuestions:used.map(item=>item.question)});}catch(error){throw new HttpError(409,error.message);}
 await d1(db,'INSERT OR IGNORE INTO attempts(uid,day,cycle,program,questions_json,key_json) VALUES(?,?,?,?,?,?)',identity.uid,day,cycle,identity.program,JSON.stringify(publicQuestions(selected)),JSON.stringify(selected.map(item=>item.answer))).run();
 row=await d1(db,'SELECT * FROM attempts WHERE uid=? AND day=?',identity.uid,day).first();return resultFor(row);
}
async function submitQuiz(db,identity,day,answers){
 const row=await d1(db,'SELECT * FROM attempts WHERE uid=? AND day=?',identity.uid,day).first();if(!row)throw new HttpError(409,'Open today’s quiz first.');
 if(row.score!==null)return resultFor(row);
 const key=parse(row.key_json),questions=parse(row.questions_json).map((question,index)=>({...question,answer:key[index]}));
 let score;try{score=scoreQuiz(questions,answers);}catch(error){throw new HttpError(400,error.message);}
 const points=verifiedAwards({score,consecutiveDays:await streak(db,identity.uid,day)}).points;
 await d1(db,'UPDATE attempts SET answers_json=?,score=?,points=?,completed_at=? WHERE uid=? AND day=? AND score IS NULL',JSON.stringify(answers),score,points,new Date().toISOString(),identity.uid,day).run();
 return resultFor(await d1(db,'SELECT * FROM attempts WHERE uid=? AND day=?',identity.uid,day).first());
}
async function myProgress(db,uid,day){
 const cycle=cycleStart(day),totals=await d1(db,'SELECT COUNT(*) AS quiz_days,COALESCE(SUM(score),0) AS score,COALESCE(SUM(points),0) AS points,COALESCE(MAX(score),0) AS best FROM attempts WHERE uid=? AND completed_at IS NOT NULL',uid).first();
 const weekly=await d1(db,'SELECT COALESCE(SUM(score),0) AS score,COUNT(*) AS quiz_days FROM attempts WHERE uid=? AND cycle=? AND completed_at IS NOT NULL',uid,cycle).first();
 const bonus=await d1(db,'SELECT COALESCE(SUM(bonus),0) AS points FROM league_awards WHERE uid=?',uid).first();
 const publishedCycle=await latestPublishedCycle(db);
 const ranks={};for(const [period,key] of [['weekly',publishedCycle],['overall','all']]){const row=await d1(db,'SELECT rank,score,quiz_days FROM league_entries WHERE period=? AND period_key=? AND uid=?',period,key,uid).first();ranks[period]=row||null;}
 const consecutiveDays=await streak(db,uid,day),badges=verifiedAwards({score:Number(totals.best)||0,consecutiveDays}).badges;
 if(ranks.weekly?.rank<=3&&ranks.weekly)badges.push('Weekly Top '+ranks.weekly.rank);
 return {quizDays:totals.quiz_days||0,score:totals.score||0,weeklyScore:weekly.score||0,points:(totals.points||0)+(bonus.points||0),streak:consecutiveDays,badges,ranks,publishedCycle};
}
async function questionsAdmin(request,db,uid,path){
 if(request.method==='GET'){
  const rows=(await d1(db,'SELECT * FROM question_bank ORDER BY program,created_at DESC LIMIT 2000').all()).results||[];
  return {questions:rows.map(row=>({id:row.id,program:row.program,question:row.question,options:parse(row.options_json),answer:row.answer,active:Boolean(row.active)}))};
 }
 if(request.method==='POST'){
  const input=await jsonBody(request),question={...input,id:input.id||crypto.randomUUID().replace(/-/g,'')};
  if(!questionOkay(question))throw new HttpError(400,'Enter a program, question, four options and one correct answer.');
  await d1(db,'INSERT INTO question_bank(id,program,question,options_json,answer,active,created_at,author_uid) VALUES(?,?,?,?,?,?,?,?)',question.id,question.program,question.question.trim(),JSON.stringify(question.options.map(value=>value.trim())),question.answer,1,new Date().toISOString(),uid).run();
  return {id:question.id,created:true};
 }
 if(request.method==='DELETE'&&/^\/admin\/questions\/[A-Za-z0-9_-]{8,80}$/.test(path)){
  const id=path.split('/').at(-1);await d1(db,'UPDATE question_bank SET active=0 WHERE id=?',id).run();return {id,active:false};
 }
 throw new HttpError(405,'Method not allowed.');
}
async function latestPublishedCycle(db){
 const row=await d1(db,"SELECT MAX(period_key) AS cycle FROM league_entries WHERE period='weekly'").first();
 return row?.cycle||'';
}
export async function publishLeaderboard(db,period,day,requestedCycle,preview=false,reviewToken=null){
 if(!['weekly','overall'].includes(period))throw new HttpError(400,'Choose weekly or overall.');
 const key=period==='weekly'?(requestedCycle||lastClosedCycle(day)):'all';
 if(period==='weekly'){
  let isMonday=false;try{isMonday=cycleStart(key)===key;}catch{}
  if(!isMonday||key>=cycleStart(day))throw new HttpError(409,'Choose a Monday for a quiz week that has ended in India.');
 }
 const query=period==='weekly'
  ?`SELECT a.uid,p.display_name,SUM(a.score) AS score,COUNT(*) AS quiz_days FROM attempts a LEFT JOIN student_profiles p ON a.uid=p.uid WHERE a.cycle=? AND a.completed_at IS NOT NULL GROUP BY a.uid LIMIT 301`
  :`SELECT a.uid,p.display_name,SUM(a.points)+COALESCE((SELECT SUM(bonus) FROM league_awards l WHERE l.uid=a.uid),0) AS score,COUNT(*) AS quiz_days FROM attempts a LEFT JOIN student_profiles p ON a.uid=p.uid WHERE a.completed_at IS NOT NULL GROUP BY a.uid LIMIT 301`;
 const participants=(await (period==='weekly'?d1(db,query,key):d1(db,query)).all()).results||[];
 if(participants.length>300)throw new HttpError(409,'More than 300 results require a reviewed pagination release before publishing.');
 if(!participants.length)throw new HttpError(409,'No completed quizzes are ready for publication.');
 participants.sort((a,b)=>b.score-a.score||b.quiz_days-a.quiz_days||a.uid.localeCompare(b.uid));
 const signature=JSON.stringify({period,key,participants});
 const token=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(signature)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(preview)return {period,key,students:participants,reviewToken:token};
 if(reviewToken!==null&&token!==reviewToken)throw new HttpError(409,'Results changed. Preview the league again before publishing.');
 const publishedAt=new Date().toISOString(),statements=[d1(db,'DELETE FROM league_entries WHERE period=? AND period_key=?',period,key)];
 const ranked=participants.map((row,index)=>({...row,rank:index+1,display_name:row.display_name||'Student'}));
 // Bind the whole snapshot as one JSON value to stay within D1 parameter and
 // statement limits. D1 commits the delete and inserts as one batch.
 statements.push(d1(db,`INSERT INTO league_entries(period,period_key,uid,rank,display_name,score,quiz_days,published_at)
  SELECT ?,?,value->>'uid',value->>'rank',value->>'display_name',value->>'score',value->>'quiz_days',? FROM json_each(?)`,period,key,publishedAt,JSON.stringify(ranked)));
 if(period==='weekly'){
  const awards=ranked.slice(0,3).map((row,index)=>({uid:row.uid,rank:row.rank,bonus:[50,30,20][index]}));
  statements.push(d1(db,'DELETE FROM league_awards WHERE cycle=?',key),d1(db,`INSERT INTO league_awards(cycle,uid,bonus,rank)
   SELECT ?,value->>'uid',value->>'bonus',value->>'rank' FROM json_each(?)`,key,JSON.stringify(awards)));
 }
 await db.batch(statements);return {period,key,publishedAt,students:participants.length};
}

export async function handleRequest(request,env,fetcher=fetch,now=new Date()){
 const origin=request.headers.get('Origin'),cors={'Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(!originAllowed(origin,env))return Response.json({error:'Origin not allowed.'},{status:403,headers:cors});
 cors['Access-Control-Allow-Origin']=origin;cors['Access-Control-Allow-Headers']='Authorization,Content-Type';cors['Access-Control-Allow-Methods']='GET,POST,DELETE,OPTIONS';
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const reply=(data,status=200)=>Response.json(data,{status,headers:cors});
 try{
  if(!env.DB||!env.QUIZ_LIMITER||!/^[a-zA-Z0-9-]+$/.test(env.FIREBASE_PROJECT_ID||''))throw new HttpError(503,'Quiz service is not configured.');
  const ip=request.headers.get('CF-Connecting-IP');if(!ip)throw new HttpError(503,'Request protection is unavailable.');
  if(!(await env.QUIZ_LIMITER.limit({key:ip})).success)throw new HttpError(429,'Too many quiz requests. Please wait.');
  const path=new URL(request.url).pathname,day=indiaDay(now);
  if(path==='/leaderboard'&&request.method==='GET'){
   const period=new URL(request.url).searchParams.get('period')==='overall'?'overall':'weekly',key=period==='weekly'?await latestPublishedCycle(env.DB):'all';
   const rows=(await d1(env.DB,'SELECT rank,display_name,score,quiz_days,published_at FROM league_entries WHERE period=? AND period_key=? ORDER BY rank LIMIT 10',period,key).all()).results||[];
   return reply({published:rows.length>0,period,key,students:rows.map(row=>({rank:row.rank,name:row.display_name,score:row.score,quizDays:row.quiz_days})),updatedAt:rows[0]?.published_at||''});
  }
  if(path.startsWith('/admin/')){
   const uid=await admin(request,env,fetcher);
   if(path==='/admin/questions'||path.startsWith('/admin/questions/'))return reply(await questionsAdmin(request,env.DB,uid,path));
   if(path==='/admin/publish'&&request.method==='POST'){const body=await jsonBody(request);return reply(await publishLeaderboard(env.DB,body.period,day,body.cycle));}
   throw new HttpError(404,'Admin quiz route not found.');
  }
  if(path.startsWith('/quiz/')){
   const identity=await student(request,env,fetcher,path==='/quiz/today');await visit(env.DB,identity.uid,day);
   await d1(env.DB,'INSERT INTO student_profiles(uid,display_name,admission) VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET display_name=excluded.display_name,admission=excluded.admission',identity.uid,identity.name||'Student',identity.admission).run();
   if(path==='/quiz/today'&&request.method==='GET')return reply(await todayQuiz(env.DB,identity,day));
   if(path==='/quiz/submit'&&request.method==='POST'){
    const body=await jsonBody(request);
    if(body.day!==day)throw new HttpError(409,'This quiz date has ended. Open today’s quiz to continue.');
    return reply(await submitQuiz(env.DB,identity,day,body.answers));
   }
   if(path==='/quiz/me'&&request.method==='GET')return reply(await myProgress(env.DB,identity.uid,day));
   throw new HttpError(404,'Quiz route not found.');
  }
  throw new HttpError(404,'Route not found.');
 }catch(error){return reply({error:error instanceof HttpError?error.message:'Quiz service failed. Try again later.'},error instanceof HttpError?error.status:503);}
}
export default {fetch(request,env){return handleRequest(request,env);}};
