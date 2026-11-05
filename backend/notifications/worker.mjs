const encoder=new TextEncoder();
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hash=async value=>b64(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
let cachedAccess=null;
async function access(env,fetcher){
 if(cachedAccess?.email===env.FCM_CLIENT_EMAIL&&cachedAccess.expires>Date.now())return cachedAccess.token;
 if(!env.FCM_PRIVATE_KEY||!env.FCM_CLIENT_EMAIL)throw new HttpError(503,'Notification sending is not configured.');
 const now=Math.floor(Date.now()/1000),header=b64(encoder.encode(JSON.stringify({alg:'RS256',typ:'JWT'}))),payload=b64(encoder.encode(JSON.stringify({iss:env.FCM_CLIENT_EMAIL,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})));
 const der=Uint8Array.from(atob(env.FCM_PRIVATE_KEY.replace(/-----[^-]+-----|\s/g,'')),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);const data=header+'.'+payload;
 const assertion=data+'.'+b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,encoder.encode(data)));
 const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new HttpError(503,'Notification sender authentication failed.');const result=await response.json();if(!result.access_token)throw new HttpError(503,'Notification sender unavailable.');cachedAccess={email:env.FCM_CLIENT_EMAIL,token:result.access_token,expires:Date.now()+3000000};return result.access_token;
}
async function fcm(env,token,data,validate,fetcher){
 const bearer=await access(env,fetcher);
 return fetcher(`https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`,{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:JSON.stringify({validate_only:validate,message:{token,data,webpush:{headers:{TTL:'86400'}}}}),signal:AbortSignal.timeout(10000)});
}
async function fcmFailure(response){
 let payload={};try{payload=await response.clone().json();}catch{}
 const status=String(payload.error?.status||'').toUpperCase();
 const detail=payload.error?.details?.map(row=>row?.errorCode).find(Boolean)||'';
 if(response.status===403||status==='PERMISSION_DENIED')return {code:'sender_permission',message:'Notification sender permission is not active yet. Enable the Firebase Cloud Messaging API and confirm the sender role.'};
 if(detail==='SENDER_ID_MISMATCH')return {code:'sender_mismatch',message:'This browser token belongs to a different Firebase sender. Reload the website and try again.'};
 if(detail==='UNREGISTERED')return {code:'token_expired',message:'This browser subscription expired. Reload the website and follow again.'};
 return {code:'provider_rejected',message:'The notification provider rejected this browser subscription. Reload and try again.'};
}
async function admin(request,env,fetcher){
 const auth=request.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9_.-]+$/.test(auth)||auth.length>8192)throw new HttpError(401,'Sign in as an administrator.');let uid;
 try{const raw=auth.slice(7).split('.')[1];uid=JSON.parse(atob(raw.replace(/-/g,'+').replace(/_/g,'/'))).sub;if(typeof uid!=='string'||!uid||uid.length>128)throw Error();}catch{throw new HttpError(401,'Invalid sign-in.');}
 // Untrusted decoded UID is only a lookup key. Firestore verifies the signed token and rules.
 const response=await fetcher(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/admins/${encodeURIComponent(uid)}`,{headers:{Authorization:auth},redirect:'manual',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new HttpError(403,'Administrator access required.');const record=await response.json();if(record.fields?.uid?.stringValue!==uid||record.fields?.isAdmin?.booleanValue!==true)throw new HttpError(403,'Administrator access required.');return uid;
}
export function validateNotice(d){
 if(!d||!/^[-a-zA-Z0-9]{16,80}$/.test(d.id||'')||typeof d.title!=='string'||!d.title.trim()||d.title.length>100||typeof d.body!=='string'||!d.body.trim()||d.body.length>240||typeof d.path!=='string'||!/^\/(?!\/)[a-zA-Z0-9/#?=&_.%-]*$/.test(d.path)||d.path.length>200)throw new HttpError(400,'Use a title, short update and a path on this website.');
 const url=new URL(d.path,'https://rehaan-computers.web.app');if(url.origin!=='https://rehaan-computers.web.app')throw new HttpError(400,'Only institute website links are allowed.');return {id:d.id,title:d.title.trim(),body:d.body.trim(),path:d.path};
}
async function body(request){
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new HttpError(415,'Use JSON.');const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Missing request.');let length=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>12000){await reader.cancel();throw new HttpError(413,'Request is too large.');}chunks.push(value);}try{const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'Invalid JSON.');}
}
export async function handleRequest(request,env,fetcher=fetch){
 const origin=request.headers.get('Origin'),allowed=String(env.ALLOWED_ORIGINS||'').split(','),cors={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers:cors});
 if(!origin||!allowed.includes(origin))return reply(403,{error:'Origin is not allowed.'});cors['Access-Control-Allow-Origin']=origin;cors['Access-Control-Allow-Headers']='Authorization,Content-Type';cors['Access-Control-Allow-Methods']='GET,POST,OPTIONS';
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 try{
  if(!env.DB||!env.FCM_CLIENT_EMAIL||!env.FCM_PRIVATE_KEY)throw new HttpError(503,'Website updates are not connected yet.');
  const path=new URL(request.url).pathname;
  const isAdmin=path.startsWith('/admin/'),limiter=isAdmin?env.ADMIN_LIMITER:env.SUBSCRIBE_LIMITER;
  if(!limiter)throw new HttpError(503,'Request protection is not configured.');
  if(!(await limiter.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'})).success)throw new HttpError(429,'Please wait a minute and try again.');
  if(path==='/health'&&request.method==='GET'){await access(env,fetcher);await env.DB.prepare('SELECT COUNT(*) AS count FROM subscribers').first();return reply(200,{ok:true});}
  const uid=isAdmin?await admin(request,env,fetcher):null;
  if(path==='/admin/stats'&&request.method==='GET'){
   const count=await env.DB.prepare('SELECT COUNT(*) AS count FROM subscribers').first();return reply(200,{subscribedBrowsers:count.count,asOf:new Date().toISOString(),definition:'Subscribed browsers/devices, not unique people. Stale subscriptions are removed when FCM reports them invalid.'});
  }
  if(path==='/admin/visits'&&request.method==='GET'){
   const month=new URL(request.url).searchParams.get('month')||'';if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new HttpError(400,'Choose a valid report month.');
   const rows=await env.DB.prepare('SELECT first_day AS day,COUNT(*) AS visitors FROM website_visitors WHERE month=? GROUP BY first_day ORDER BY first_day').bind(month).all();
   const count=await env.DB.prepare('SELECT COUNT(*) AS count FROM website_visitors WHERE month=?').bind(month).first();
   const days=rows.results.map(row=>({day:row.day,visitors:row.visitors}));
   return reply(200,{month,days,uniqueBrowsers:count.count,definition:'Anonymous browsers counted once in the selected month. Different browsers or cleared browser storage may count separately. No visitor identity is stored.'});
  }
  if(request.method!=='POST')throw new HttpError(405,'Method not allowed.');const d=await body(request),now=new Date().toISOString();
  if(path==='/visit'){
   const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   if(typeof d.visitorId!=='string'||!/^[a-f0-9]{32,64}$/.test(d.visitorId))throw new HttpError(400,'Invalid anonymous visitor identifier.');
   const visitorHash=await hash(d.visitorId),month=day.slice(0,7);
   await env.DB.prepare('INSERT INTO website_visitors(month,visitor_hash,first_day,last_seen,visit_count) VALUES(?,?,?,?,1) ON CONFLICT(month,visitor_hash) DO UPDATE SET last_seen=excluded.last_seen,visit_count=visit_count+1').bind(month,visitorHash,day,now).run();return reply(200,{recorded:true});
  }
  if(path==='/subscribe'||path==='/unsubscribe'){
   if(typeof d.token!=='string'||!/^[a-zA-Z0-9_:.-]{40,4096}$/.test(d.token)||!/^\w{64}$/.test(d.secret||''))throw new HttpError(400,'Invalid subscription.');
   const id=await hash(d.token),management=await hash(d.secret),prior=await env.DB.prepare('SELECT management_hash FROM subscribers WHERE id=?').bind(id).first();
   if(prior&&prior.management_hash!==management)throw new HttpError(403,'This subscription belongs to another browser profile.');
   if(path==='/unsubscribe'){await env.DB.prepare('DELETE FROM subscribers WHERE id=? AND management_hash=?').bind(id,management).run();return reply(200,{subscribed:false});}
   const response=await fcm(env,d.token,{title:'Rehaan Computers',body:'Subscription verification',path:'/'},true,fetcher);if(!response.ok){const failure=await fcmFailure(response);const error=new HttpError(response.status===403?503:400,failure.message);error.code=failure.code;throw error;}
   const saved=await env.DB.prepare('INSERT INTO subscribers(id,token,management_hash,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at WHERE management_hash=excluded.management_hash').bind(id,d.token,management,now,now).run();if(!saved.meta.changes)throw new HttpError(409,'Subscription ownership changed.');return reply(200,{subscribed:true});
  }
  if(path==='/admin/test'){
   if(typeof d.token!=='string'||!/^[a-zA-Z0-9_:.-]{40,4096}$/.test(d.token)||!/^\w{64}$/.test(d.secret||'')||!/^[-a-zA-Z0-9]{16,80}$/.test(d.testId||''))throw new HttpError(400,'Follow the website on this browser before testing.');
   const id=await hash(d.token),management=await hash(d.secret),record=await env.DB.prepare('SELECT management_hash FROM subscribers WHERE id=?').bind(id).first();
   if(!record||record.management_hash!==management)throw new HttpError(403,'This browser does not have a verified subscription.');
   const response=await fcm(env,d.token,{title:'Rehaan Computers',body:'Test update: your browser is connected to institute notifications.',path:'/',testId:d.testId},false,fetcher);
   if(!response.ok)throw new HttpError(503,'Test could not be accepted. Check the sender permissions and this browser subscription.');
   return reply(200,{accepted:true,note:'Sent only to the verified browser subscription. Provider acceptance does not confirm delivery.'});
  }
  if(path==='/admin/send'){
   const n=validateNotice(d);await env.DB.prepare('INSERT OR IGNORE INTO campaigns(id,title,body,path,created_at,created_by) VALUES(?,?,?,?,?,?)').bind(n.id,n.title,n.body,n.path,now,uid).run();
   const saved=await env.DB.prepare('SELECT * FROM campaigns WHERE id=?').bind(n.id).first();if(saved.title!==n.title||saved.body!==n.body||saved.path!==n.path||saved.created_by!==uid)throw new HttpError(409,'This update ID is already in use.');
   const rows=await env.DB.prepare('SELECT id,token FROM subscribers WHERE created_at<=? AND id NOT IN (SELECT subscriber_id FROM deliveries WHERE campaign_id=?) ORDER BY id LIMIT 10').bind(saved.created_at,n.id).all();let accepted=0,unknown=0,expired=0;
   for(const row of rows.results){
    const claim=await env.DB.prepare('INSERT OR IGNORE INTO deliveries(campaign_id,subscriber_id,state,updated_at) VALUES(?,?,?,?)').bind(n.id,row.id,'processing',now).run();if(!claim.meta.changes)continue;
    let state='unknown';try{const response=await fcm(env,row.token,{title:n.title,body:n.body,path:n.path},false,fetcher);if(response.ok){state='accepted';accepted++;}else{const error=await response.json();if(error.error?.details?.some(d=>d.errorCode==='UNREGISTERED')){state='expired';expired++;await env.DB.prepare('DELETE FROM subscribers WHERE id=?').bind(row.id).run();}else unknown++;}}catch{unknown++;}
    await env.DB.prepare('UPDATE deliveries SET state=?,updated_at=? WHERE campaign_id=? AND subscriber_id=?').bind(state,new Date().toISOString(),n.id,row.id).run();
   }
   const remaining=await env.DB.prepare('SELECT COUNT(*) AS count FROM subscribers WHERE created_at<=? AND id NOT IN (SELECT subscriber_id FROM deliveries WHERE campaign_id=?)').bind(saved.created_at,n.id).first();const uncertain=await env.DB.prepare("SELECT COUNT(*) AS count FROM deliveries WHERE campaign_id=? AND state IN ('processing','unknown')").bind(n.id).first();return reply(200,{accepted,unknown,expired,uncertainTotal:uncertain.count,remaining:remaining.count,note:'Accepted by FCM does not confirm delivery or reading. Uncertain sends are not retried automatically.'});
  }
  throw new HttpError(404,'Not found.');
 }catch(error){return reply(error.status||503,{error:error.status?error.message:'Notification service is temporarily unavailable.',...(error.code?{code:error.code}:{})});}
}
// Cloudflare supplies an ExecutionContext as the third argument, not a fetch function.
export default {fetch(request,env){return handleRequest(request,env);}};
