import {audienceRows} from '../../public/student-broadcast.js';
import {studentUpdatePayload} from '../../public/student-portal-updates.js';
export const reviewUids=env=>String(env.REVIEW_STUDENT_UIDS||'').split(',').map(x=>x.trim()).filter(Boolean);
const get=(db,id)=>db.prepare('SELECT * FROM publications WHERE id=?').bind(id).first();
function date(input){const parsed=new Date(input);if(!input||!Number.isFinite(parsed.getTime()))throw Error('Choose a valid publication date.');return parsed.toISOString();}
export async function previewPublication(store,env,input,now=new Date()){
 const rows=await store.listApplications(),allowed=new Set(reviewUids(env));
 const recipients=audienceRows(rows,input.target).filter(row=>allowed.has(row.data.studentPortalAccount.uid));
 if(!recipients.length)throw Error('No eligible linked review students match this target.');
 const payload=studentUpdatePayload(input.payload,now.toISOString());
 const scheduledAt=date(input.scheduledAt||now.toISOString());
 return {publicationId:input.id||input.publicationId||crypto.randomUUID(),payload,target:input.target,scheduledAt,recipients:recipients.map(row=>({id:row.id,uid:row.data.studentPortalAccount.uid,name:row.data.fullName,admissionNumber:row.data.admissionNumber})),reviewOnly:true};
}
export async function savePublication(db,store,env,input,actor,now=new Date()){
 const preview=await previewPublication(store,env,input,now);
 const recipientIds=preview.recipients.map(row=>row.id);
 if(JSON.stringify(input.reviewedIds)!==JSON.stringify(recipientIds))throw Error('Recipients changed. Preview again.');
 const id=input.id||input.publicationId;if(!/^[A-Za-z0-9-]{8,80}$/.test(id||''))throw Error('Preview the publication before saving.');
 const existing=await get(db,id);
 if(!input.id&&existing){const previous=JSON.parse(existing.payload_json),keys=['category','title','details','author','image'];if(existing.author_uid===actor&&keys.every(key=>previous[key]===preview.payload[key])&&existing.scheduled_at===preview.scheduledAt&&JSON.stringify(JSON.parse(existing.recipients_json).map(row=>row.id))===JSON.stringify(recipientIds)&&existing.target_json===JSON.stringify(input.target))return {id,revision:existing.revision,state:existing.state,scheduledAt:existing.scheduled_at};throw Error('Publication identity conflict. Start a new preview.');}
 if(input.id&&!existing)throw Error('Publication was not found.');
 if(existing&&existing.lease_until>now.toISOString())throw Error('Delivery is in progress. Retry editing after it finishes.');
 if(existing&&existing.state==='deleted')throw Error('A deleted publication cannot be republished.');
 if(existing&&Number(input.revision)!==existing.revision)throw Error('Publication changed. Reload before editing.');
 if(existing&&JSON.stringify(JSON.parse(existing.recipients_json).map(row=>row.uid))!==JSON.stringify(preview.recipients.map(row=>row.uid)))throw Error('Editing the audience of a published item is not allowed. Delete it and preview a new publication.');
 if(existing&&existing.state==='published'&&preview.scheduledAt>now.toISOString())throw Error('Published items cannot be hidden by moving their date. Delete and schedule a new item.');
 const revision=(existing?.revision||0)+1;
 const result=await db.prepare(`INSERT INTO publications(id,payload_json,target_json,recipients_json,scheduled_at,author_uid,state,revision,updated_at) VALUES(?,?,?,?,?,?,'scheduled',?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json,scheduled_at=excluded.scheduled_at,state='scheduled',revision=excluded.revision,updated_at=excluded.updated_at,error=NULL WHERE publications.revision=? AND publications.lease_until<=excluded.updated_at`).bind(id,JSON.stringify(preview.payload),JSON.stringify(preview.target),JSON.stringify(preview.recipients),preview.scheduledAt,actor,revision,now.toISOString(),existing?.revision||0).run();
 if(result.meta?.changes===0)throw Error('Publication changed. Reload.');
 return {id,revision,state:'scheduled',scheduledAt:preview.scheduledAt};
}
export async function deletePublication(db,id,revision){
 const result=await db.prepare("UPDATE publications SET state='deleting',revision=revision+1,updated_at=? WHERE id=? AND revision=? AND state<>'deleted' AND lease_until<=?").bind(new Date().toISOString(),id,revision,new Date().toISOString()).run();if(result.meta?.changes===0)throw Error('Publication changed. Reload.');return {id,state:'deleting'};
}
export async function deliverPublication(db,store,env,id,now=new Date()){
 const row=await get(db,id);if(!row||row.state==='deleted'||(row.state!=='deleting'&&row.scheduled_at>now.toISOString()))return;
 const locked=await db.prepare('UPDATE publications SET lease_until=? WHERE id=? AND revision=? AND lease_until<=?').bind(new Date(now.getTime()+600000).toISOString(),id,row.revision,now.toISOString()).run();if(locked.meta?.changes===0)return;
 try{
 const recipients=JSON.parse(row.recipients_json),payload=JSON.parse(row.payload_json),allowed=new Set(reviewUids(env));
 // Two review recipients per tick keep server requests bounded; delivery journal resumes on later ticks.
 const delivered=(await db.prepare('SELECT uid FROM publication_deliveries WHERE publication_id=? AND revision=?').bind(id,row.revision).all()).results||[];
 const todo=recipients.filter(person=>!delivered.some(item=>item.uid===person.uid)).slice(0,2);
 for(const person of todo){
  if(!allowed.has(person.uid))throw Error('Review allowlist changed. Restore it or review publication cleanup.');
  const path=`studentPortalViews/${person.uid}/updates/centre-${id}`;
  await store.sdk.runTransaction(store.db,async tx=>{
   const [app,view,old]=await Promise.all([tx.get(`applications/${person.id}`),tx.get(`studentPortalViews/${person.uid}`),tx.get(path)]);
   if(row.state==='deleting'){if(old.exists())tx.delete(path);return;}
   const eligible=audienceRows([{id:person.id,data:app.data()||{}}],JSON.parse(row.target_json));
   if(!eligible.length||app.data().studentPortalAccount.uid!==person.uid||view.data()?.enabled!==true){if(old.exists())tx.delete(path);return;}
   tx.set(path,{...payload,readByStudent:old.exists()?old.data().readByStudent===true:false,savedByStudent:old.exists()?old.data().savedByStudent===true:false});
  });
  await db.prepare('INSERT INTO publication_deliveries(publication_id,uid,revision) VALUES(?,?,?) ON CONFLICT(publication_id,uid) DO UPDATE SET revision=excluded.revision').bind(id,person.uid,row.revision).run();
 }
 const count=await db.prepare('SELECT COUNT(*) AS n FROM publication_deliveries WHERE publication_id=? AND revision=?').bind(id,row.revision).first();
 if(count.n===recipients.length)await db.prepare('UPDATE publications SET state=?,error=NULL WHERE id=? AND revision=?').bind(row.state==='deleting'?'deleted':'published',id,row.revision).run();
 }finally{await db.prepare("UPDATE publications SET lease_until='' WHERE id=? AND revision=?").bind(id,row.revision).run();}
}
export async function publicationList(db){return ((await db.prepare('SELECT * FROM publications ORDER BY updated_at DESC LIMIT 100').all()).results||[]).map(row=>({...row,payload:JSON.parse(row.payload_json),target:JSON.parse(row.target_json),recipients:JSON.parse(row.recipients_json)}));}
