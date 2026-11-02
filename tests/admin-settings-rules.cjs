// Local emulator only. No production credentials or project are accepted.
const {readFileSync}=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,updateDoc,deleteDoc,runTransaction}=require('firebase/firestore');
(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088')throw Error('Requires local emulator at 127.0.0.1:8088');
 const env=await initializeTestEnvironment({projectId:'demo-rehaan-settings',firestore:{host:'127.0.0.1',port:8088,rules:readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{for(const uid of ['admin-a','admin-b'])await setDoc(doc(ctx.firestore(),'admins',uid),{uid,isAdmin:true});});
  const a=env.authenticatedContext('admin-a').firestore(),b=env.authenticatedContext('admin-b').firestore(),publicDB=env.unauthenticatedContext().firestore(),outsider=env.authenticatedContext('student').firestore();
  const payload={institute:{name:'REHAAN COMPUTERS',address:'Main Road Charangam',email:'rehaancomputers881@gmail.com',phone:'9797205429',phone2:'9149551258',website:'https://rehaan-computers.web.app'},documents:{receipt:{colour:'#fffcf2',footer:''},marks:{colour:'#fbf7ec',footer:''}},messages:{attendance:'',fee:'',admission:''},revision:1,updatedBy:'admin-a',updatedAt:new Date().toISOString()};
  const ref=db=>doc(db,'instituteSettings','workspace');
  for(const db of [publicDB,outsider]){await assertFails(getDoc(ref(db)));await assertFails(setDoc(ref(db),payload));}
  await assertSucceeds(setDoc(ref(a),payload));await assertSucceeds(getDoc(ref(b)));
  await assertFails(getDocs(collection(a,'instituteSettings')));await assertFails(deleteDoc(ref(a)));
  await assertFails(setDoc(doc(a,'instituteSettings','secret'),payload));
  await assertFails(updateDoc(ref(b),{revision:2,updatedBy:'admin-a'}));
  await assertFails(updateDoc(ref(a),{revision:1}));
  await assertFails(updateDoc(ref(a),{revision:3}));
  const badPatches=[{apiSecret:'forbidden'}, {institute:{...payload.institute,phone:'123'}},{institute:{...payload.institute,website:'javascript:alert(1)'}},{documents:{...payload.documents,receipt:{colour:'red',footer:''}}},{messages:{...payload.messages,fee:'x'.repeat(1501)}},{documents:{...payload.documents,marks:{colour:'#abcdef',footer:'x'.repeat(121)}}}];
  for(const patch of badPatches)await assertFails(updateDoc(ref(a),{...patch,revision:2}));
  await assertSucceeds(updateDoc(ref(b),{revision:2,updatedBy:'admin-b','institute.name':'REHAAN UPDATED'}));
  const {saveSharedSettings}=await import('../public/admin-settings-model.js?v=20261102-settings-1');
  const expected=(await getDoc(ref(a))).data();
  const input={institute:expected.institute,documents:expected.documents,messages:expected.messages};
  const attempts=await Promise.allSettled([[a,'admin-a'],[b,'admin-b']].map(([db,actor])=>saveSharedSettings({db,ref:ref(db),runTransaction,assertSession:()=>{},actor,input:{...input,institute:{...input.institute,name:actor+' institute'}},expected})));
  if(attempts.filter(v=>v.status==='fulfilled').length!==1)throw Error('Concurrent settings saves must not both succeed');
  if((await getDoc(ref(a))).data().revision!==3)throw Error('Settings revision must increment once');
  const record={fullName:'Test Student',phone:'9876543210',coursePreference:'Diploma',status:'Pending Payment',payment:{status:'awaiting',amount:100},paymentToken:'test-token-1234567890'};
  await assertSucceeds(setDoc(doc(publicDB,'applications','public-valid'),record));
  await assertFails(setDoc(doc(publicDB,'applications','public-invalid'),{...record,monthlyAttendance:{'2026-10':{days:24}}}));
  await assertFails(getDoc(doc(publicDB,'applications','public-valid')));
  await assertFails(setDoc(doc(outsider,'admins','student'),{uid:'student',isAdmin:true}));
  console.log('PASS: shared settings admin-only reads/writes, two-admin revision control, schema bounds, no list/delete/other settings access, and public admission protection');
 }finally{await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
