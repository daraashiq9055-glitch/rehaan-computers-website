const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {generateKeyPairSync}=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {initializeApp,deleteApp}=require('firebase/app');
const {getAuth,connectAuthEmulator,createUserWithEmailAndPassword}=require('firebase/auth');
const {getFirestore,connectFirestoreEmulator,doc,setDoc,getDocFromServer,updateDoc,serverTimestamp}=require('firebase/firestore');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
async function main(){
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Local emulator guard failed.');
 const project='demo-rc-review',environment=await initializeTestEnvironment({projectId:project,firestore:{host:'127.0.0.1',port:8088,rules:fs.readFileSync('firestore.rules','utf8')}}),apps=[];
 const {handleReview,scheduledReview}=await import('../backend/student-portal/review-worker.mjs');const {serverStore}=await import('../backend/student-portal/firestore-server.mjs');
 const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync('backend/student-portal/schema.sql','utf8'));sql.exec(fs.readFileSync('backend/student-portal/migrations/0002_review.sql','utf8'));const prepare=(query,args=[])=>({bind(...v){return prepare(query,v);},first:async()=>sql.prepare(query).get(...args)||null,all:async()=>({results:sql.prepare(query).all(...args)}),run:async()=>({meta:sql.prepare(query).run(...args)})});const DB={prepare};
 async function account(name){const app=initializeApp({projectId:project,apiKey:'demo-key',appId:'test'},name);apps.push(app);const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8088);const user=(await createUserWithEmailAndPassword(auth,name+'@test.invalid','ReviewTest123')).user;return {db,auth,user,uid:user.uid};}
 try{
 const alpha=await account('review-alpha'),beta=await account('review-beta'),admin=await account('review-admin');
 await environment.withSecurityRulesDisabled(async context=>{for(const [id,person] of [['alpha',alpha],['beta',beta]]){
 await setDoc(doc(context.firestore(),'applications',id),{status:'Approved',enrolmentStatus:'Active',fullName:id,gender:id==='alpha'?'Female':'Male',batch:'Morning',admissionNumber:id,coursePreference:'Office',studentPortalAccount:{uid:person.uid,enabled:true},learningProgress:{byCourse:{Office:{topics:[{id:'teacher',title:'WordPad',done:true,manual:true}]}}}});
 await setDoc(doc(context.firestore(),'studentPortalViews',person.uid),{uid:person.uid,applicationId:id,enabled:true,profile:{name:id,admissionNumber:id},fees:{},attendance:[],journey:{},updatedAt:new Date().toISOString()});}
 await setDoc(doc(context.firestore(),'admins',admin.uid),{uid:admin.uid,isAdmin:true});});
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
 const env={DB,QUIZ_LIMITER:{limit:async()=>({success:true})},REVIEW_MODE:'true',REVIEW_ADMIN_UIDS:admin.uid,REVIEW_STUDENT_UIDS:alpha.uid+','+beta.uid,FIREBASE_PROJECT_ID:project,ALLOWED_ORIGINS:'http://localhost:8000',FIREBASE_SERVICE_ACCOUNT:JSON.stringify({project_id:project,client_email:'local-review@test.invalid',private_key:privateKey})};
 const localFetch=async(url,options)=>{if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'owner',expires_in:3600});if(!url.startsWith('https://firestore.googleapis.com/'))throw Error('Unexpected external request');return fetch(url.replace('https://firestore.googleapis.com','http://127.0.0.1:8088'),options);};
 const store=serverStore(env,localFetch);
 const call=async(person,route,method='GET',input)=>{const response=await handleReview(new Request('http://review.test'+route,{method,headers:{Origin:'http://localhost:8000','CF-Connecting-IP':'127.0.0.1',Authorization:'Bearer '+await person.user.getIdToken(),...(input?{'Content-Type':'application/json'}:{})},...(input?{body:JSON.stringify(input)}:{})}),env,localFetch,store);return {status:response.status,value:await response.json()};};
 // No admin client writes, browser listener or open admin UI participates in selection or projection.
 const choice=await call(alpha,'/journey/selection','POST',{program:'MS Word',learned:['Notepad']});assert.equal(choice.status,200,JSON.stringify(choice));
 let projected=(await getDocFromServer(doc(alpha.db,'studentPortalViews',alpha.uid))).data();const unchangedAt=projected.updatedAt;assert.equal((await call(alpha,'/journey/sync','POST',{})).status,200);assert.equal((await getDocFromServer(doc(alpha.db,'studentPortalViews',alpha.uid))).data().updatedAt,unchangedAt);assert.equal(projected.journey.currentProgram,'MS Word');assert.equal(projected.journey.topics.find(row=>row.title==='WordPad').done,true);
 assert.equal((await getDocFromServer(doc(beta.db,'studentPortalViews',beta.uid))).data().journey.currentProgram,undefined);
 await assert.rejects(getDocFromServer(doc(beta.db,'studentPortalViews',alpha.uid)),{code:'permission-denied'});
 await assert.rejects(updateDoc(doc(alpha.db,'applications','alpha'),{learningProgress:{}}),{code:'permission-denied'});
 assert.equal((await call(alpha,'/admin/journey/requests','POST',{uid:beta.uid})).status,403);
 assert.equal((await call(alpha,'/journey/selection','POST',{uid:beta.uid,program:'MS Excel'})).status,400);
 const request=await call(admin,'/admin/journey/requests','POST',{uid:alpha.uid});assert.equal(request.status,200,JSON.stringify(request));
 assert.equal((await call(admin,'/admin/journey/review','POST',{uid:alpha.uid,version:request.value.version,approved:['Notepad']})).status,200);
 await setDoc(doc(alpha.db,'studentPortalViews',alpha.uid,'learning','current'),{program:'MS Excel',updatedAt:serverTimestamp()});
 await scheduledReview(env,store);
 projected=(await getDocFromServer(doc(alpha.db,'studentPortalViews',alpha.uid))).data();assert.equal(projected.journey.currentProgram,'MS Excel');assert.equal(projected.journey.topics.find(row=>row.title==='Notepad').done,true);
 const canonical=(await getDocFromServer(doc(admin.db,'applications','alpha'))).data().learningProgress.byCourse.Office;assert.deepEqual(projected.journey.topics.map(row=>[row.title,row.done]),canonical.topics.map(row=>[row.title,row.done]));
 assert.equal((await call(alpha,'/account/onboarding','POST',{})).status,200);assert.equal((await call(alpha,'/account/onboarding')).value.followed,true);
 const publication={target:{kind:'girls'},scheduledAt:new Date(Date.now()-1000).toISOString(),payload:{category:'Class notes',title:'Review class image',details:'Private review lesson.',author:'Teacher',image:'data:image/jpeg;base64,'+fs.readFileSync('tests/fixtures/photo-check.jpg').toString('base64')}};
 const preview=await call(admin,'/admin/publications/preview','POST',publication);assert.equal(preview.status,200,JSON.stringify(preview));assert.deepEqual(preview.value.recipients.map(row=>row.uid),[alpha.uid]);
 const input={...publication,publicationId:preview.value.publicationId,reviewedIds:['alpha']};
 const saved=await call(admin,'/admin/publications','POST',input);assert.equal(saved.status,200,JSON.stringify(saved));
 await scheduledReview(env,store);
 const updateRef=doc(alpha.db,'studentPortalViews',alpha.uid,'updates','centre-'+saved.value.id);
 assert.equal((await getDocFromServer(updateRef)).data().image,publication.payload.image);
 assert.equal((await getDocFromServer(doc(beta.db,'studentPortalViews',beta.uid,'updates','centre-'+saved.value.id))).exists(),false);
 await assert.rejects(getDocFromServer(doc(beta.db,'studentPortalViews',alpha.uid,'updates','centre-'+saved.value.id)),{code:'permission-denied'});
 await updateDoc(updateRef,{readByStudent:true});
 assert.equal((await call(admin,'/admin/publications/'+saved.value.id+'/reads')).value.students[0].read,true);
 const changed=await call(admin,'/admin/publications','POST',{...input,id:saved.value.id,revision:1,payload:{...publication.payload,title:'Corrected review note'}});assert.equal(changed.status,200,JSON.stringify(changed));await scheduledReview(env,store);
 assert.equal((await getDocFromServer(updateRef)).data().title,'Corrected review note');assert.equal((await getDocFromServer(updateRef)).data().readByStudent,true);
 assert.equal((await call(admin,'/admin/publications/'+saved.value.id,'DELETE',{revision:2})).status,200);await scheduledReview(env,store);assert.equal((await getDocFromServer(updateRef)).exists(),false);
 console.log('PASS: Worker centre publication with real emulator records: target eligibility, private image, scheduled delivery, student read state, admin reads, edit, delete and other-student denial.');
 console.log('PASS: genuine disposable Firebase emulator identities; Worker REST transaction synchronizes Journey without admin browser; scheduled recovery, teacher confirmation, canonical projection, account Follow and cross-student denials.');
 }finally{for(const app of apps)await deleteApp(app);sql.close();await environment.cleanup();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
