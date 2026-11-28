import {shortcutDrafts} from './shortcut-drafts.mjs';
import {competition} from './competition.mjs';
import teacherDrafts from './question-drafts.json' with {type:'json'};
import {handleRequest,student,admin,HttpError,publishLeaderboard} from './worker.mjs';
import {indiaDay,programs} from './quiz-core.mjs';
import {bankRows,readiness,saveQuestion,normalizeQuestion} from './question-bank.mjs';
import {serverStore} from './firestore-server.mjs';
import {syncOfficialJourney,reviewOfficialJourney} from './journey-server.mjs';
import {reviewUids,previewPublication,savePublication,deletePublication,deliverPublication,publicationList} from './publications.mjs';
const adminUids=env=>String(env.REVIEW_ADMIN_UIDS||'').split(',').map(x=>x.trim()).filter(Boolean);
export async function body(request){
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new HttpError(415,'Send JSON.');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Missing JSON body.');const chunks=[];let size=0;
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>750000){await reader.cancel();throw new HttpError(413,'Request too large.');}chunks.push(value);}
 const buffer=new Uint8Array(size);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}try{return JSON.parse(new TextDecoder().decode(buffer));}catch{throw new HttpError(400,'Invalid JSON.');}
}
function configured(env){if(env.REVIEW_MODE!=='true'||!reviewUids(env).length||reviewUids(env).length>10||!adminUids(env).length||!env.DB)throw new HttpError(503,'Private review allowlists are not configured.');}
export async function handleReview(request,env,fetcher=fetch,storeOverride=null,now=new Date()){
 const origin=request.headers.get('Origin'),headers={'Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'},reply=(value,status=200)=>Response.json(value,{status,headers});
 if(!origin||!String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).includes(origin))return reply({error:'Origin not allowed.'},403);
 Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  configured(env);const ip=request.headers.get('CF-Connecting-IP');if(!ip||!env.QUIZ_LIMITER)throw new HttpError(503,'Request protection unavailable.');if(!(await env.QUIZ_LIMITER.limit({key:ip})).success)throw new HttpError(429,'Please wait before retrying.');
  const path=new URL(request.url).pathname;
  if(path==='/competition/published'&&request.method==='GET')return reply(await competition({path,method:'GET',env,now}));
  const isAdmin=path.startsWith('/admin/'),identity=isAdmin?await admin(request,env,fetcher):await student(request,env,fetcher,path==='/quiz/today'||path==='/quiz/me');
  const uid=isAdmin?identity:identity.uid;if(!(isAdmin?adminUids(env):reviewUids(env)).includes(uid))throw new HttpError(403,'This account is not enrolled in private review.');
  const store=()=>storeOverride||serverStore(env,fetcher);
  if(path.startsWith('/competition/')||path.startsWith('/admin/competition')){
   return reply(await competition({path,method:request.method,env,identity,input:request.method==='POST'?await body(request):null,now,store}));
  }
  if(path==='/admin/status'&&request.method==='GET')return reply({reviewOnly:true,quizEnabled:JSON.parse((await env.DB.prepare("SELECT value FROM review_settings WHERE id='activation'").first())?.value||'null'),readiness:readiness(await bankRows(env.DB)),serverSyncConfigured:Boolean(env.FIREBASE_SERVICE_ACCOUNT),students:reviewUids(env).length,sync:(await env.DB.prepare("SELECT id,value FROM review_settings WHERE id LIKE 'sync:%'").all()).results||[]});
  if(path==='/admin/shortcut-drafts'&&request.method==='GET')return reply({questions:shortcutDrafts(new URL(request.url).searchParams.get('program'))});
  if(path==='/admin/questions/drafts'&&request.method==='GET')return reply(teacherDrafts);
  if(path==='/admin/questions'&&request.method==='GET')return reply({questions:await bankRows(env.DB),readiness:readiness(await bankRows(env.DB))});
  if(path==='/admin/questions'&&request.method==='POST')return reply(await saveQuestion(env.DB,await body(request),uid));
  if(path==='/admin/questions/approve-group'&&request.method==='POST'){
   const {questions}=await body(request);
   if(!Array.isArray(questions)||!questions.length||questions.length>1000)throw new HttpError(400,'Select 1–1000 reviewed drafts.');
   const bank=new Map((await bankRows(env.DB)).map(q=>[q.id,q]));
   const ids=new Set();
   for(const item of questions){
    const q=bank.get(item?.id);
    if(!q||ids.has(q.id)||q.revision!==item.revision||!['Draft','Review'].includes(q.status))throw new HttpError(409,'The bank changed. Refresh and review the updated questions.');
    normalizeQuestion({...q,status:'Review'},uid,q);ids.add(q.id);
   }
   const saved=await env.DB.prepare(`WITH reviewed AS MATERIALIZED (
    SELECT q.id FROM question_bank q JOIN json_each(?) j ON q.id=json_extract(j.value,'$.id')
    WHERE q.revision=json_extract(j.value,'$.revision') AND q.status IN ('Draft','Review'))
    UPDATE question_bank SET status='Approved',active=1,reviewed_by=?,reviewed_at=?,updated_at=?,revision=revision+1
    WHERE id IN (SELECT id FROM reviewed) AND (SELECT COUNT(*) FROM reviewed)=?`)
    .bind(JSON.stringify(questions),uid,now.toISOString(),now.toISOString(),questions.length).run();
   if(saved.meta.changes!==questions.length)throw new HttpError(409,'The bank changed. Refresh and review the updated questions.');
   return reply({approved:questions.length});
  }
  if(path==='/admin/questions/import'&&request.method==='POST'){
   const input=await body(request);if(!Array.isArray(input.questions)||input.questions.length>100||!input.questions.length)throw Error('Import 1–100 questions at a time.');
   const rows=input.questions.map(row=>normalizeQuestion({...row,id:row.id||crypto.randomUUID().replaceAll('-',''),status:'Draft'},uid));
   const known=await bankRows(env.DB),keys=new Set(known.map(row=>row.question.trim().toLowerCase()));
   if(rows.some(row=>{const key=row.question.trim().toLowerCase();if(keys.has(key)||known.some(old=>old.id===row.id))return true;keys.add(key);return false;}))throw Error('Import contains existing or duplicate questions. No changes saved.');
   await env.DB.batch(rows.map(row=>env.DB.prepare('INSERT INTO question_bank(id,program,question,options_json,answer,active,created_at,author_uid,difficulty,explanation,status,updated_at) VALUES(?,?,?,?,?,0,?,?,?,?,\'Draft\',?)').bind(row.id,row.program,row.question,JSON.stringify(row.options),row.answer,now.toISOString(),uid,row.difficulty,row.explanation,now.toISOString())));return reply({imported:rows.length,status:'Draft'});
  }
  if(path==='/admin/activation'&&request.method==='POST'){
   const input=await body(request);if(typeof input.enabled!=='boolean')throw Error('Choose enabled or disabled.');
   const selected=input.programs;if(!Array.isArray(selected)||!selected.length||selected.some(p=>!programs.includes(p)))throw Error('Choose approved review programs.');
   const ready=readiness(await bankRows(env.DB));if(input.enabled&&selected.some(p=>!ready.find(row=>row.program===p)?.ready))throw Error('Activation blocked: more teacher-approved questions are needed for seven days.');
   await env.DB.prepare("INSERT INTO review_settings(id,value) VALUES('activation',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").bind(JSON.stringify({enabled:input.enabled,programs:selected,reviewedBy:uid,reviewedAt:now.toISOString()})).run();return reply({reviewOnly:true,enabled:input.enabled});
  }
  if(path==='/admin/results/preview'&&request.method==='POST'){const input=await body(request);return reply(await publishLeaderboard(env.DB,input.period,indiaDay(now),input.cycle,true));}
  if(path==='/admin/publish'&&request.method==='POST'){const input=await body(request);if(!/^[a-f0-9]{64}$/.test(input.reviewToken||''))throw Error('Preview and review results before publication.');return reply(await publishLeaderboard(env.DB,input.period,indiaDay(now),input.cycle,false,input.reviewToken));}
  if(path==='/account/onboarding'){
   const ref=`studentPortalViews/${uid}/preferences/onboarding`,db=store();
   if(request.method==='GET'){const value=await db.get(ref);return reply(value.data()||{});}
   if(request.method==='POST'){await db.sdk.runTransaction(db.db,async tx=>{const old=await tx.get(ref);if(!old.exists())tx.set(ref,{followed:true,completedAt:now});});return reply({followed:true});}
  }
  if(path==='/journey/requests'&&request.method==='GET'){const value=await store().get(`studentPortalViews/${uid}/learning/requests`);return reply(value.exists()?{programs:value.data().programs,version:value.data().updatedAt.toMillis(),updatedAt:{seconds:value.data().updatedAt.seconds}}:{});}
  if(path==='/admin/journey/requests'||path==='/admin/journey/review'){
   const input=await body(request);if(!reviewUids(env).includes(input.uid))throw new HttpError(403,'Student is outside private review.');
   if(path.endsWith('/review'))return reply(await reviewOfficialJourney(store(),input.uid,input,now));
   const savedRequest=await store().get(`studentPortalViews/${input.uid}/learning/requests`);return reply(savedRequest.exists()?{programs:savedRequest.data().programs,version:savedRequest.data().updatedAt.toMillis()}:null);
  }
  if(path==='/journey/selection'&&request.method==='POST')return reply(await syncOfficialJourney(store(),uid,await body(request),now));
  if(path==='/journey/sync'&&request.method==='POST')return reply(await syncOfficialJourney(store(),uid,null,now));
  if(path==='/admin/publications/preview'&&request.method==='POST')return reply(await previewPublication(store(),env,await body(request),now));
  if(path==='/admin/publications'&&request.method==='POST')return reply(await savePublication(env.DB,store(),env,await body(request),uid,now));
  if(path==='/admin/publications'&&request.method==='GET')return reply({publications:await publicationList(env.DB)});
  const item=path.match(/^\/admin\/publications\/([A-Za-z0-9-]{8,80})(\/reads)?$/);
  if(item&&request.method==='DELETE')return reply(await deletePublication(env.DB,item[1],(await body(request)).revision));
  if(item?.[2]&&request.method==='GET'){
   const pub=(await publicationList(env.DB)).find(row=>row.id===item[1]);if(!pub)throw Error('Publication not found.');
   const statuses=[];for(const recipient of pub.recipients){const saved=await store().get(`studentPortalViews/${recipient.uid}/updates/centre-${pub.id}`);statuses.push({uid:recipient.uid,name:recipient.name,delivered:saved.exists(),read:saved.data()?.readByStudent===true});}return reply({students:statuses});
  }
  if(path==='/quiz/me'&&request.method==='GET'){
   const result=await handleRequest(request,env,fetcher,now),data=await result.json();if(!result.ok)return reply(data,result.status);
   const activation=JSON.parse((await env.DB.prepare("SELECT value FROM review_settings WHERE id='activation'").first())?.value||'null');
   return reply({...data,reviewMode:true,quizReady:Boolean(activation?.enabled&&activation.programs.includes(identity.program)&&readiness(await bankRows(env.DB)).find(row=>row.program===identity.program)?.ready)});
  }
  if(path==='/quiz/today'){
   const activation=JSON.parse((await env.DB.prepare("SELECT value FROM review_settings WHERE id='activation'").first())?.value||'null');
   if(!activation?.enabled||!activation.programs.includes(identity.program))throw new HttpError(409,'Private quiz attempts are disabled pending teacher approval and readiness.');
   if(!readiness(await bankRows(env.DB)).find(row=>row.program===identity.program)?.ready)throw new HttpError(409,'Question bank is no longer ready for a seven-day cycle.');
  }
  if(path==='/leaderboard'||path.startsWith('/quiz/'))return handleRequest(request,env,fetcher,now);
  throw new HttpError(404,'Review route not found.');
 }catch(error){return reply({error:error instanceof HttpError?error.message:(error.message||'Review request failed.').slice(0,240)},error instanceof HttpError?error.status:400);}
}
export async function scheduledReview(env,storeOverride=null,now=new Date()){
 configured(env);const store=storeOverride||serverStore(env),uids=reviewUids(env);
 const cursor=Number((await env.DB.prepare("SELECT value FROM review_settings WHERE id='sync-cursor'").first())?.value||0);
 for(let i=0;i<Math.min(2,uids.length);i++){
  const uid=uids[(cursor+i)%uids.length];try{await syncOfficialJourney(store,uid,null,now);await env.DB.prepare('INSERT INTO review_settings(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('sync:'+uid,JSON.stringify({ok:true,at:now.toISOString()})).run();}catch(error){await env.DB.prepare('INSERT INTO review_settings(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('sync:'+uid,JSON.stringify({ok:false,at:now.toISOString(),error:error.message})).run();}
 }
 await env.DB.prepare("INSERT INTO review_settings(id,value) VALUES('sync-cursor',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").bind(String((cursor+2)%uids.length)).run();
 const due=(await env.DB.prepare("SELECT id FROM publications WHERE state IN ('scheduled','deleting') AND (scheduled_at<=? OR state='deleting') ORDER BY updated_at LIMIT 1").bind(now.toISOString()).all()).results||[];
 for(const row of due){try{await deliverPublication(env.DB,store,env,row.id,now);}catch(error){await env.DB.prepare('UPDATE publications SET error=? WHERE id=?').bind(error.message.slice(0,200),row.id).run();}}
}
export default {fetch(request,env){return handleReview(request,env);},scheduled(event,env,context){context.waitUntil(scheduledReview(env));}};
