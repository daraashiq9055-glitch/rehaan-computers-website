const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {initializeApp,deleteApp}=require('firebase/app');
const {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut}=require('firebase/auth');
const {getFirestore,connectFirestoreEmulator,doc,runTransaction,getDocFromServer,setDoc,getDocs,collection,serverTimestamp,updateDoc}=require('firebase/firestore');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');

async function main(){
 const projectId='demo-rehaan-student-portal',environment=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8088,rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});
 const {linkStudentPortal,setStudentPortalEnabled,studentLoginEmail,syncStudentPortal}=await import('../public/student-portal-access.js');
 const {studentUpdatePayload}=await import('../public/student-portal-updates.js');
 const apps=[];
 const account=async(name,email)=>{
  const app=initializeApp({apiKey:'demo-key',authDomain:projectId+'.firebaseapp.com',projectId,appId:'demo-app'},name);apps.push(app);
  const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8088);
  const created=await createUserWithEmailAndPassword(auth,email,'StudentPass123');return {auth,db,uid:created.user.uid};
 };
 try{
  const admin=await account('admin-test','admin@test.invalid');
  const alpha=await account('student-alpha',studentLoginEmail('alpha123'));
  const beta=await account('student-beta',studentLoginEmail('beta1234'));
  await environment.withSecurityRulesDisabled(async context=>{
   const db=context.firestore();await setDoc(doc(db,'admins',admin.uid),{uid:admin.uid,isAdmin:true});
   for(const [id,name] of [['alpha','Aisha Test'],['beta','Bilal Test']])await setDoc(doc(db,'applications',id),{status:'Approved',enrolmentStatus:'Active',fullName:name,admissionNumber:id==='alpha'?'101':'102',admissionDate:'2026-10-01',coursePreference:'MS Word',monthlyFees:{'2026-11-01':500}});
  });
  const assertion=()=>{if(admin.auth.currentUser?.uid!==admin.uid)throw Error('Admin session changed.');};
  await linkStudentPortal({db:admin.db,doc,runTransaction,assertAdmin:assertion,applicationId:'alpha',uid:alpha.uid,username:'alpha123'});
  await linkStudentPortal({db:admin.db,doc,runTransaction,assertAdmin:assertion,applicationId:'beta',uid:beta.uid,username:'beta1234'});
  const view=(db,...rest)=>doc(db,'studentPortalViews',alpha.uid,...rest);
  const ownA=await getDocFromServer(view(alpha.db));
  const ownB=await getDocFromServer(doc(beta.db,'studentPortalViews',beta.uid));
  assert.equal(ownA.data().profile.name,'Aisha Test');assert.equal(ownB.data().profile.name,'Bilal Test');
  await assert.rejects(getDocFromServer(view(beta.db)),{code:'permission-denied'});
  await assert.rejects(getDocs(collection(alpha.db,'studentPortalViews')),{code:'permission-denied'});

  await updateDoc(doc(admin.db,'applications','alpha'),{
   'monthlyFees.2026-11-01':999,
   'monthlyAttendance.2026-11':{days:8,totalDays:10},
   learningProgress:{byCourse:{'MS%20Word':{topics:[{title:'Tables',done:true}]}}}
  });
  await syncStudentPortal({db:admin.db,doc,runTransaction,assertAdmin:assertion,applicationId:'alpha'});
  const record=(await getDocFromServer(view(alpha.db))).data();
  assert.equal(record.fees.periods[0].received,999);
  assert.deepEqual(record.attendance[0],{month:'2026-11',attended:8,classes:10,note:''});
  assert.deepEqual(record.journey.topics,[{title:'Tables',done:true}]);
  await assert.rejects(updateDoc(view(alpha.db),{'fees.admissionAmount':0}),{code:'permission-denied'});

  const image='data:image/jpeg;base64,'+fs.readFileSync(path.join(__dirname,'fixtures/photo-check.jpg')).toString('base64');
  const update=studentUpdatePayload({category:'Class notes',title:'Tables',details:'Practise with the class image.',author:'Centre',image});
  await setDoc(view(admin.db,'updates','note'),update);
  assert.equal((await getDocFromServer(view(alpha.db,'updates','note'))).data().image,image);
  await assert.rejects(getDocFromServer(view(beta.db,'updates','note')),{code:'permission-denied'});
  await updateDoc(view(alpha.db,'updates','note'),{readByStudent:true,savedByStudent:true});

  await setDoc(view(alpha.db,'messages','question'),{sender:'student',text:'Can I repeat the exercise?',createdAt:serverTimestamp(),readByStudent:true,readByAdmin:false});
  assert.equal((await getDocFromServer(view(admin.db,'messages','question'))).data().readByAdmin,false);
  await setDoc(view(admin.db,'messages','reply'),{sender:'admin',text:'Yes. Practise the second table.',createdAt:serverTimestamp(),readByStudent:false,readByAdmin:true});
  assert.equal((await getDocFromServer(view(alpha.db,'messages','reply'))).data().sender,'admin');
  await assert.rejects(updateDoc(view(alpha.db,'messages','reply'),{text:'Changed reply'}),{code:'permission-denied'});
  await assert.rejects(getDocFromServer(view(beta.db,'messages','reply')),{code:'permission-denied'});

  await setDoc(view(alpha.db,'learning','current'),{program:'MS Excel',updatedAt:serverTimestamp()});
  assert.equal((await getDocFromServer(view(admin.db,'learning','current'))).data().program,'MS Excel');
  await assert.rejects(setDoc(view(beta.db,'learning','current'),{program:'Notepad',updatedAt:serverTimestamp()}),{code:'permission-denied'});
  const {syncLearningPath}=await import('../public/student-learning-path.js');
  const sdk={doc,runTransaction};
  const before=(await getDocFromServer(doc(admin.db,'applications','alpha'))).data();
  await syncLearningPath({db:admin.db,sdk,applicationId:'alpha',uid:alpha.uid,assertAdmin:assertion});
  const after=(await getDocFromServer(doc(admin.db,'applications','alpha'))).data();
  const course=after.learningProgress.byCourse['MS%20Word'];
  assert.equal(course.currentProgram,'MS Excel');
  assert.equal(course.topics.find(row=>row.title==='Tables').done,true);
  assert.equal(course.topics.filter(row=>row.program&&row.done).length,0);
  const projected=(await getDocFromServer(view(alpha.db))).data().journey;
  assert.equal(projected.currentProgram,course.currentProgram);
  assert.deepEqual(projected.topics.map(row=>[row.title,row.done]),course.topics.map(row=>[row.title,row.done]));
  assert.equal((await getDocFromServer(doc(admin.db,'applications','beta'))).data().learningProgress,undefined);
  const {saveProgress}=await import('../previews/admin-premium/journey-service.js');
  const corrected=course.topics.map((row,index)=>({...row,id:row.id||'teacher-'+index,done:row.title==='Notepad'?false:row.done}));
  await saveProgress({db:admin.db,ref:doc(admin.db,'applications','alpha'),runTransaction,assertSession:assertion,actor:admin.uid,expected:after.learningProgress,course:'MS Word',topics:corrected});
  await syncStudentPortal({db:admin.db,doc,runTransaction,assertAdmin:assertion,applicationId:'alpha'});
  assert.equal((await getDocFromServer(view(alpha.db))).data().journey.topics.find(row=>row.title==='Notepad').done,false);
  await setDoc(view(alpha.db,'learning','current'),{program:'PowerPoint',updatedAt:serverTimestamp()});
  await syncLearningPath({db:admin.db,sdk,applicationId:'alpha',uid:alpha.uid,assertAdmin:assertion});
  assert.equal((await getDocFromServer(view(alpha.db))).data().journey.topics.find(row=>row.title==='Notepad').done,false);
  console.log('PASS: one official checklist syncs selection and teacher corrections to student view, preserves assessments and other students, and persists on server reads.');
  const {portalAdminAction}=await import('../public/student-portal-admin-service.js');
  const fullSdk=require('firebase/firestore'),manage=(action,input)=>portalAdminAction({db:admin.db,sdk:fullSdk,assertAdmin:assertion,actor:admin.uid,action,id:'alpha',input});
  await manage('publish',{category:'Homework',title:'Direct homework',details:'Practise tables',author:'Centre'});
  assert.ok((await manage('updates',{})).some(row=>row.title==='Direct homework'));
  await manage('message',{text:'Direct workspace reply'});
  assert.ok((await getDocs(collection(alpha.db,'studentPortalViews',alpha.uid,'messages'))).docs.some(row=>row.data().text==='Direct workspace reply'));
  await manage('attendance',{month:'2026-11',value:{days:'9',totalDays:'10',note:'Saved from workspace'},expected:before.monthlyAttendance['2026-11']});
  assert.equal((await getDocFromServer(view(alpha.db))).data().attendance[0].attended,9);
  await setDoc(doc(admin.db,'applications','gamma'),{status:'Approved',fullName:'New portal student',admissionNumber:'103',coursePreference:'MS Word'});
  await portalAdminAction({db:admin.db,sdk:fullSdk,assertAdmin:assertion,actor:admin.uid,action:'create',id:'gamma',input:{username:'gamma123',password:'LocalTestPass123'},provision:async()=>{const user=await account('student-gamma',studentLoginEmail('gamma123'));return {uid:user.uid,rollback:async()=>{},close:async()=>{}};}});
  const gamma=(await getDocFromServer(doc(admin.db,'applications','gamma'))).data();assert.equal(gamma.studentPortalAccount.username,'gamma123');assert.ok(!JSON.stringify(gamma).includes('LocalTestPass123'));assert.equal(admin.auth.currentUser.uid,admin.uid);
  console.log('PASS: direct workspace service publishes homework, sends replies, saves attendance and provisions a linked emulator account without storing its password.');
  const onboarding=view(alpha.db,'preferences','onboarding');
  await setDoc(onboarding,{followed:true,completedAt:serverTimestamp()});
  assert.equal((await getDocFromServer(onboarding)).data().followed,true);
  await signOut(alpha.auth);await signInWithEmailAndPassword(alpha.auth,studentLoginEmail('alpha123'),'StudentPass123');
  assert.equal((await getDocFromServer(onboarding)).data().followed,true);
  const secondApp=initializeApp({apiKey:'demo-key',projectId,appId:'demo-device'},'second-device');apps.push(secondApp);
  const secondAuth=getAuth(secondApp);connectAuthEmulator(secondAuth,'http://127.0.0.1:9099',{disableWarnings:true});
  const secondDb=getFirestore(secondApp);connectFirestoreEmulator(secondDb,'127.0.0.1',8088);
  await signInWithEmailAndPassword(secondAuth,studentLoginEmail('alpha123'),'StudentPass123');
  assert.equal((await getDocFromServer(view(secondDb,'preferences','onboarding'))).data().followed,true);

  await assert.rejects(updateDoc(onboarding,{followed:false}),{code:'permission-denied'});
  await assert.rejects(getDocFromServer(view(beta.db,'preferences','onboarding')),{code:'permission-denied'});
  await setDoc(view(alpha.db,'learning','requests'),{programs:['Notepad','WordPad'],updatedAt:serverTimestamp()});
  assert.deepEqual((await getDocFromServer(view(admin.db,'learning','requests'))).data().programs,['Notepad','WordPad']);
  await assert.rejects(setDoc(view(alpha.db,'learning','requests'),{programs:['Unknown'],updatedAt:serverTimestamp()}),{code:'permission-denied'});
  console.log('PASS: account Follow persists, cannot be reset or read by another student; learned requests are bounded and readable by admin.');
  const request=await manage('learnedRequests',{});
  await manage('reviewLearning',{version:request.version,approved:['WordPad']});
  let official=(await getDocFromServer(view(alpha.db))).data().journey;
  assert.equal(official.topics.find(row=>row.title==='WordPad').done,true);
  assert.equal(official.topics.find(row=>row.title==='Notepad').done,false);
  assert.equal(official.topics.find(row=>row.title==='Notepad').requestStatus,'needs-practice');
  await assert.rejects(manage('reviewLearning',{version:request.version-1,approved:['WordPad']}),/request changed/);
  await setDoc(view(alpha.db,'learning','current'),{program:'MS Access',updatedAt:serverTimestamp()});
  await syncLearningPath({db:admin.db,sdk,applicationId:'alpha',uid:alpha.uid,assertAdmin:assertion});
  official=(await getDocFromServer(view(alpha.db))).data().journey;
  assert.equal(official.topics.find(row=>row.title==='WordPad').done,true);
  assert.equal(official.topics.find(row=>row.title==='Notepad').done,false);
  await assert.rejects(setDoc(view(beta.db,'learning','requests'),{programs:['Notepad'],updatedAt:serverTimestamp()}),{code:'permission-denied'});
  await assert.rejects(updateDoc(view(alpha.db),{journey:{topics:[{title:'WordPad',done:true}]}}),{code:'permission-denied'});
  const {audienceRows}=await import('../public/student-broadcast.js');
  const rows=(await getDocs(collection(admin.db,'applications'))).docs.map(row=>({id:row.id,data:row.data()}));
  const ids=audienceRows(rows,{kind:'all'}).map(row=>row.id);
  const broadcast={target:{kind:'all'},reviewedIds:ids,publicationId:'test-publication-001',payload:studentUpdatePayload({category:'Announcements',title:'Centre holiday',details:'Classes resume Monday.',author:'Centre'})};
  await manage('broadcast',broadcast);
  assert.equal((await getDocFromServer(doc(beta.db,'studentPortalViews',beta.uid,'updates',broadcast.publicationId))).data().title,'Centre holiday');
  await updateDoc(view(alpha.db,'updates',broadcast.publicationId),{readByStudent:true,savedByStudent:true});
  await manage('broadcast',broadcast);
  assert.equal((await getDocFromServer(view(alpha.db,'updates',broadcast.publicationId))).data().readByStudent,true);
  await assert.rejects(manage('broadcast',{...broadcast,reviewedIds:[]}),/audience changed/);
  await assert.rejects(setDoc(view(alpha.db,'updates','forged'),broadcast.payload),{code:'permission-denied'});
  console.log('PASS: reviewed completion persists in the official checklist; rejection preserves teacher corrections; centre fanout reaches linked accounts, retries preserve read state, stale audience and student publication are denied.');
  await setStudentPortalEnabled({db:admin.db,doc,runTransaction,assertAdmin:assertion,applicationId:'alpha',enabled:false});
  await assert.rejects(getDocFromServer(view(alpha.db)),{code:'permission-denied'});
  await assert.rejects(getDocFromServer(view(alpha.db,'updates','note')),{code:'permission-denied'});
  console.log('PASS: Firebase emulator accounts verified provisioning, fees, attendance, class images, messaging, Journey and account isolation.');
 }finally{for(const app of apps)await deleteApp(app).catch(()=>{});await environment.cleanup();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
