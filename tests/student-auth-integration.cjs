const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {initializeApp,deleteApp}=require('firebase/app');
const {getAuth,connectAuthEmulator,createUserWithEmailAndPassword}=require('firebase/auth');
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
  await setStudentPortalEnabled({db:admin.db,doc,runTransaction,assertAdmin:assertion,applicationId:'alpha',enabled:false});
  await assert.rejects(getDocFromServer(view(alpha.db)),{code:'permission-denied'});
  await assert.rejects(getDocFromServer(view(alpha.db,'updates','note')),{code:'permission-denied'});
  console.log('PASS: Firebase emulator accounts verified provisioning, fees, attendance, class images, messaging, Journey and account isolation.');
 }finally{for(const app of apps)await deleteApp(app).catch(()=>{});await environment.cleanup();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
