import {programs,cycleStart,indiaDay,publicQuestions,questionOkay} from './quiz-core.mjs';
import {bankRows} from './question-bank.mjs';
import {topicProgram} from '../../public/student-learning-path.js';
import {reviewUids} from './publications.mjs';
import {HttpError} from './worker.mjs';

const query=(db,sql,...args)=>db.prepare(sql).bind(...args);
const all=async statement=>(await statement.all()).results;
const tiers=[['Learner',0],['Bronze',25],['Silver',75],['Gold',150],['Platinum',300],['Diamond',600]];
const normalized=text=>text.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
const shortcutSubjects=new Set(['Notepad','WordPad','MS Word']);
const eligible=row=>questionOkay(row)&&row.explanation?.trim()&&(!shortcutSubjects.has(row.program)||/shortcut|keystroke|ctrl\+|shift\+|alt\+/i.test(row.question));
const approved=row=>eligible(row)&&row.active===1&&row.status==='Approved';

export function dailyMix(current,topics){
 const index=programs.indexOf(current);
 if(index===-1)throw new HttpError(409,'Choose your current software in Journey.');
 const learned=new Set(topics.filter(t=>t.done===true).map(topicProgram));
 const prior=programs.slice(0,index).filter(p=>learned.has(p)).slice(-2);
 return [...prior.map(program=>({program,count:6/prior.length})),{program:current,count:prior.length?4:10}];
}

async function learner(store,uid){
 const [view,selection]=await Promise.all([store.get('studentPortalViews/'+uid),store.get('studentPortalViews/'+uid+'/learning/current')]);
 const data=view.data();
 if(!data?.enabled||data.uid!==uid)return null;
 const current=selection.data()?.program;
 if(!programs.includes(current))return null;
 return {current,mix:dailyMix(current,data.journey?.topics||[])};
}
async function supply(env,store){
 const demand=new Map(),skipped=[];
 for(const uid of reviewUids(env)){
  const profile=await learner(store,uid);
  if(!profile){skipped.push(uid);continue;}
  for(const {program,count} of profile.mix)demand.set(program,Math.max(demand.get(program)||0,count*7));
 }
 const bank=await bankRows(env.DB);
 return {eligibleCount:reviewUids(env).length-skipped.length,subjects:[...demand].map(([program,needed])=>{
  const rows=bank.filter(r=>r.program===program&&eligible(r));
  const count=new Set(rows.filter(approved).map(r=>normalized(r.question))).size;
  return {program,needed,approved:count,missing:Math.max(0,needed-count),drafts:rows.filter(r=>['Draft','Review'].includes(r.status)).length};
 })};
}

async function board(db,week){
 const rows=await all(query(db,`SELECT uid,MAX(name) AS name,SUM(score) AS score,COUNT(*) AS quizDays,MAX(submitted_at) AS reached
  FROM competition_attempts WHERE week=? AND score IS NOT NULL GROUP BY uid ORDER BY score DESC,reached,uid`,week));
 return rows.map((r,i)=>({...r,rank:i+1,tied:r.score===rows[i-1]?.score||r.score===rows[i+1]?.score}));
}
const visible=(r,uid)=>({rank:r.rank,name:r.name,score:r.score,quizDays:r.quizDays,tied:r.tied,mine:r.uid===uid});
const weekInfo=(db,week)=>query(db,'SELECT * FROM competition_weeks WHERE week=?',week).first();
async function standing(db,uid,week,day){
 const [rows,info,total,legacy,awards]=await Promise.all([board(db,week),weekInfo(db,week),
  query(db,'SELECT COALESCE(SUM(score),0) AS n FROM competition_attempts WHERE uid=?',uid).first(),
  query(db,'SELECT COALESCE(SUM(score),0) AS n FROM attempts WHERE uid=? AND completed_at IS NOT NULL',uid).first(),
  all(query(db,'SELECT week,final_json FROM competition_weeks WHERE published_at IS NOT NULL ORDER BY week DESC'))]);
 const points=total.n+legacy.n,badges=tiers.filter(([,threshold])=>points>=threshold).map(([name])=>name);
 const next=tiers.find(([,threshold])=>threshold>points);
 const mine=rows.find(r=>r.uid===uid);
 return {week,todaySubmitted:Boolean(await query(db,'SELECT 1 AS done FROM competition_attempts WHERE uid=? AND day=? AND score IS NOT NULL',uid,day).first()),open:Boolean(info&&!info.published_at),students:rows.map(r=>visible(r,uid)),rank:mine?.rank??null,weeklyTotal:mine?.score??0,
  points,badges,next:next?{name:next[0],threshold:next[1],remaining:next[1]-points}:null,
  podium:awards.flatMap(a=>JSON.parse(a.final_json).slice(0,3).filter(r=>r.uid===uid).map(r=>({week:a.week,rank:r.rank})))};
}
function result(row){
 const paper=JSON.parse(row.paper),completed=row.score!==null;
 return {day:row.day,program:row.program,questions:publicQuestions(paper),completed,score:row.score,points:row.score,
  ...(completed?{selectedAnswers:JSON.parse(row.choices),correctAnswers:paper.map(q=>q.answer),explanations:paper.map(q=>q.explanation)}:{})};
}
async function attempt(db,uid,name,week,day,store){
 const saved=()=>query(db,'SELECT * FROM competition_attempts WHERE uid=? AND day=?',uid,day).first();
 const existing=await saved();if(existing)return result(existing);
 const info=await weekInfo(db,week);
 if(!info||info.published_at)throw new HttpError(409,'Your centre has not opened this week’s competition.');
 const profile=await learner(store,uid);if(!profile)throw new HttpError(409,'Save your current software in Journey first.');
 const previous=await all(query(db,'SELECT paper FROM competition_attempts WHERE uid=? AND week=?',uid,week));
 const used=new Set(previous.flatMap(r=>JSON.parse(r.paper).map(q=>normalized(q.question))));
 const bank=(await bankRows(db)).filter(approved),paper=[];
 for(const {program,count} of profile.mix){
  const pool=bank.filter(r=>r.program===program&&!used.has(normalized(r.question)));
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const start=paper.length;
  for(const q of pool){
   const key=normalized(q.question);if(used.has(key))continue;
   used.add(key);paper.push({id:q.id,program,question:q.question,options:q.options,answer:q.answer,explanation:q.explanation});
   if(paper.length-start===count)break;
  }
  if(paper.length-start<count)throw new HttpError(409,program+' needs '+(count-paper.length+start)+' more approved questions for your attempt.');
 }
 await query(db,'INSERT OR IGNORE INTO competition_attempts(uid,day,week,name,program,paper) VALUES(?,?,?,?,?,?)',uid,day,week,name||'Student',profile.current,JSON.stringify(paper)).run();
 return result(await saved());
}
export async function competition({path,method,env,identity,input,now,store}){
 const db=env.DB,day=indiaDay(now),week=cycleStart(day),uid=identity?.uid;
 if(path==='/competition/published'&&method==='GET'){
  const final=await query(db,'SELECT * FROM competition_weeks WHERE published_at IS NOT NULL ORDER BY week DESC LIMIT 1').first();
  if(!final){
   const records=await all(query(db,"SELECT * FROM league_entries WHERE period='weekly' AND period_key=(SELECT MAX(period_key) FROM league_entries WHERE period='weekly' AND period_key<?) ORDER BY rank LIMIT 10",week));
   if(records.length)return {published:true,week:records[0].period_key,publishedAt:records[0].published_at,students:records.map(r=>({rank:r.rank,name:r.display_name,score:r.score,quizDays:r.quiz_days}))};
  }
  return final?{published:true,week:final.week,publishedAt:final.published_at,students:JSON.parse(final.final_json).slice(0,10).map(r=>visible(r,null))}:{published:false,students:[]};
 }
 if(path==='/admin/competition'&&method==='GET'){
  const [inventory,info,rows,pending]=await Promise.all([supply(env,store()),weekInfo(db,week),board(db,week),
   all(query(db,'SELECT week FROM competition_weeks WHERE week<? AND published_at IS NULL ORDER BY week DESC',week))]);
  return {...inventory,week,open:!!info,students:rows.map(r=>visible(r,null)),completedWeeks:pending.map(r=>r.week)};
 }
 if(path==='/admin/competition/open'&&method==='POST'){
  if(await weekInfo(db,week))return {week,open:true};
  const inventory=await supply(env,store()),short=inventory.subjects.filter(r=>r.missing);
  if(!inventory.eligibleCount||short.length)throw new HttpError(409,short.map(r=>r.program+': '+r.missing+' more approved').join(', ')||'No eligible students have saved their programme.');
  await query(db,'INSERT OR IGNORE INTO competition_weeks(week,opened_at,opened_by) VALUES(?,?,?)',week,now.toISOString(),identity).run();
  return {week,open:true};
 }
 if(['/admin/competition/preview','/admin/competition/publish'].includes(path)&&method==='POST'){
  const selected=input?.week;
  if(!selected||cycleStart(selected)!==selected||selected>=week)throw new HttpError(409,'Select a completed competition week.');
  const info=await weekInfo(db,selected);if(!info)throw new HttpError(404,'Competition week not found.');
  const rows=info.final_json?JSON.parse(info.final_json):await board(db,selected);
  if(!rows.length)throw new HttpError(409,'There are no submitted scores for this week.');
  if(path.endsWith('/publish'))await query(db,'UPDATE competition_weeks SET final_json=?,published_at=? WHERE week=? AND published_at IS NULL',JSON.stringify(rows),now.toISOString(),selected).run();
  return {week:selected,students:rows.map(r=>visible(r,null)),published:path.endsWith('/publish')||!!info.published_at};
 }
 if(path==='/competition/me'&&method==='GET')return standing(db,uid,week,day);
 if(path==='/competition/today'&&method==='GET')return attempt(db,uid,identity.name,week,day,store());
 if(path==='/competition/submit'&&method==='POST'){
  if(input.day!==day)throw new HttpError(409,'This quiz day has ended.');
  const read=()=>query(db,'SELECT * FROM competition_attempts WHERE uid=? AND day=?',uid,day).first();
  let row=await read();if(!row)throw new HttpError(409,'Start your daily attempt first.');
  if(row.score===null){
   const answers=input.answers;
   if(!Array.isArray(answers)||answers.length!==10||answers.some(a=>a!==null&&(!Number.isInteger(a)||a<0||a>3)))throw new HttpError(400,'Invalid answer choices.');
   const score=JSON.parse(row.paper).reduce((n,q,i)=>n+Number(q.answer===answers[i]),0);
   await query(db,'UPDATE competition_attempts SET choices=?,score=?,submitted_at=? WHERE uid=? AND day=? AND score IS NULL',JSON.stringify(answers),score,now.toISOString(),uid,day).run();
   row=await read();
  }
  const stats=await standing(db,uid,week,day);
  return {...result(row),rank:stats.rank,weeklyTotal:stats.weeklyTotal,stats};
 }
 throw new HttpError(404,'Competition route not found.');
}
