// Executes the bundled review Worker and real local D1 in workerd. Only the
// upstream Firebase response is stubbed; actual Auth is checked separately.
const {Miniflare}=require('miniflare');
const fs=require('node:fs'),assert=require('node:assert/strict');
const jwt=uid=>'h.'+Buffer.from(JSON.stringify({sub:uid})).toString('base64url')+'.s';
async function main(){
 const {encodedFields}=await import('../backend/student-portal/firestore-server.mjs');
 const {privateKey}=require('node:crypto').generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{format:'pem',type:'pkcs8'},publicKeyEncoding:{format:'pem',type:'spki'}});
 const documents=new Map();for(const id of ['alpha','beta']){documents.set('studentPortalViews/student-'+id,{fields:encodedFields({uid:'student-'+id,applicationId:id,enabled:true,journey:{}})});documents.set('applications/'+id,{fields:encodedFields({status:'Approved',enrolmentStatus:'Active',fullName:id,admissionNumber:id,coursePreference:'Office',studentPortalAccount:{uid:'student-'+id,enabled:true}})});}
 const outboundService=async request=>{
  const url=new URL(request.url),authorization=request.headers.get('Authorization');
  if(url.hostname==='oauth2.googleapis.com'&&url.pathname==='/token')return Response.json({access_token:'server-test-token',expires_in:3600});
  if(url.hostname!=='firestore.googleapis.com')throw Error('Unexpected external service in runtime test.');
  const path=url.pathname.split('/documents')[1];
  if(request.method==='GET'){
   const uid=['admin-0001','student-alpha','student-beta'].find(value=>authorization==='Bearer '+jwt(value));
   if(uid==='admin-0001'&&path==='/admins/'+uid)return Response.json({fields:{uid:{stringValue:uid},isAdmin:{booleanValue:true}}});
   if(uid?.startsWith('student-')&&path==='/studentPortalViews/'+uid)return Response.json({fields:{uid:{stringValue:uid},enabled:{booleanValue:true},profile:{mapValue:{fields:{name:{stringValue:uid},admissionNumber:{stringValue:uid}}}}}});
   if(uid?.startsWith('student-')&&path==='/studentPortalViews/'+uid+'/learning/current')return Response.json({fields:{program:{stringValue:'Computer basics'}}});
   return Response.json({error:'denied'},{status:403});
  }
  assert.equal(authorization,'Bearer server-test-token');
  const input=await request.json();
  if(path===':beginTransaction')return Response.json({transaction:'dGVzdA=='});
  if(path===':batchGet')return Response.json(input.documents.map(name=>{const key=name.split('/documents/')[1];return documents.has(key)?{found:{name,...documents.get(key)}}:{missing:name};}));
  if(path===':commit'){for(const write of input.writes){const key=(write.update?.name||write.delete).split('/documents/')[1];if(write.delete)documents.delete(key);else documents.set(key,{fields:write.updateMask?{...documents.get(key)?.fields,...write.update.fields}:write.update.fields});}return Response.json({writeResults:[],commitTime:new Date().toISOString()});}
  if(path===':rollback')return Response.json({});
  throw Error('Unexpected Firestore method: '+path);
 };
 const mf=new Miniflare({modules:true,scriptPath:'build/review-worker-bundle/review-worker.js',compatibilityDate:'2026-11-24',port:0,outboundService,d1Databases:['DB'],ratelimits:{QUIZ_LIMITER:{simple:{limit:1000,period:60}}},bindings:{FIREBASE_SERVICE_ACCOUNT:JSON.stringify({project_id:'rehaan-computers',client_email:'runtime@test.invalid',private_key:privateKey}),REVIEW_MODE:'true',REVIEW_ADMIN_UIDS:'admin-0001',REVIEW_STUDENT_UIDS:'student-alpha,student-beta',FIREBASE_PROJECT_ID:'rehaan-computers',ALLOWED_ORIGINS:'http://localhost:8000'}});
 try{
 const url=await mf.ready,db=await mf.getD1Database('DB');for(const file of ['schema.sql','migrations/0002_review.sql'])for(const sql of fs.readFileSync('backend/student-portal/'+file,'utf8').split(';').filter(x=>x.trim()))await db.prepare(sql).run();
 const call=async(path,uid,method='GET',body)=>{const response=await fetch(new URL(path,url),{method,headers:{Origin:'http://localhost:8000','CF-Connecting-IP':'127.0.0.1',Authorization:'Bearer '+jwt(uid),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};};
 const synced=await call('/journey/selection','student-alpha','POST',{program:'MS Word',learned:['Notepad']});assert.equal(synced.status,200,JSON.stringify(synced));assert.equal(synced.data.journey.currentProgram,'MS Word');assert.equal(synced.data.journey.topics.find(t=>t.title==='Notepad').requestStatus,'requested');
 assert.equal((await call('/admin/status','admin-0001')).status,200);
 assert.equal((await call('/admin/questions','student-alpha')).status,403);
 assert.equal((await call('/quiz/today','student-alpha')).status,409);
 for(let i=0;i<70;i++)await db.prepare("INSERT INTO question_bank(id,program,question,options_json,answer,active,created_at,author_uid,status) VALUES(?,'Computer basics',?,?,0,1,'2026-11-27','admin-0001','Approved')").bind('runtime-'+String(i).padStart(3,'0'),'Runtime computer question '+i+'?',JSON.stringify(['Right','Wrong B','Wrong C','Wrong D'])).run();
 assert.equal((await call('/admin/activation','admin-0001','POST',{enabled:true,programs:['Computer basics']})).status,200);
 const quiz=await call('/quiz/today','student-alpha');assert.equal(quiz.status,200,JSON.stringify(quiz));assert.equal(quiz.data.questions.length,10);assert(quiz.data.questions.every(q=>q.options.length===4&&!('answer'in q)));assert(!quiz.data.correctAnswers);
 const result=await call('/quiz/submit','student-alpha','POST',{day:quiz.data.day,answers:Array(10).fill(0)});assert.equal(result.data.score,10);
 const retry=await call('/quiz/submit','student-alpha','POST',{day:quiz.data.day,answers:Array(10).fill(3)});assert.equal(retry.data.score,10);
 assert.equal((await call('/quiz/me','student-beta')).data.quizDays,0);
 const unauth=await fetch(new URL('/leaderboard',url),{headers:{Origin:'http://localhost:8000','CF-Connecting-IP':'127.0.0.1'}});assert.equal(unauth.status,401);
 console.log('PASS: bundled Worker through local HTTP URL + real local D1: server credential signing and Journey transaction, auth gates, teacher readiness, ten-question issuance without keys, immutable score, two-account separation and private leaderboard. Upstream Firebase is mocked here.');
 }finally{await mf.dispose();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
