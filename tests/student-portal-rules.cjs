const fs=require('node:fs');
const path=require('node:path');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,getDocs,collection,setDoc,deleteDoc,updateDoc,serverTimestamp}=require('firebase/firestore');

async function run(){
 const environment=await initializeTestEnvironment({projectId:'demo-rehaan-student-portal',firestore:{host:'127.0.0.1',port:8088,rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});
 const view=(uid,enabled=true)=>({uid,applicationId:'application-'+uid,enabled,profile:{name:uid},fees:{},attendance:[],journey:{},updatedAt:'2026-11-24T00:00:00.000Z'});
 try{
  await environment.withSecurityRulesDisabled(async context=>{
   const db=context.firestore();await setDoc(doc(db,'admins','admin-1'),{uid:'admin-1',isAdmin:true});
   await setDoc(doc(db,'studentPortalViews','student-1'),view('student-1'));
   await setDoc(doc(db,'studentPortalViews','student-2'),view('student-2'));
  });
  const first=environment.authenticatedContext('student-1').firestore(),second=environment.authenticatedContext('student-2').firestore(),admin=environment.authenticatedContext('admin-1').firestore(),publicDb=environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(first,'studentPortalViews','student-1')));
  await assertSucceeds(getDoc(doc(second,'studentPortalViews','student-2')));
  await assertFails(getDoc(doc(first,'studentPortalViews','student-2')));
  await assertFails(getDoc(doc(second,'studentPortalViews','student-1')));
  await assertFails(getDocs(collection(first,'studentPortalViews')));
  await assertFails(getDoc(doc(publicDb,'studentPortalViews','student-1')));
  await assertFails(setDoc(doc(first,'studentPortalViews','student-1'),view('student-1')));
  const update={category:'Class notes',title:'MS Word lesson',details:'Review tables.',author:'Rehaan Computers',createdAt:'2026-11-24T00:00:00.000Z',image:'',readByStudent:false,savedByStudent:false};
  await assertSucceeds(setDoc(doc(admin,'studentPortalViews','student-1','updates','note-1'),update));
  await assertSucceeds(setDoc(doc(admin,'studentPortalViews','student-1','updates','image-1'),{...update,title:'Class image',image:'data:image/jpeg;base64,/9j/2Q=='}));
  await assertSucceeds(getDocs(collection(first,'studentPortalViews','student-1','updates')));
  await assertFails(getDoc(doc(second,'studentPortalViews','student-1','updates','image-1')));
  await assertFails(getDocs(collection(second,'studentPortalViews','student-1','updates')));
  await assertFails(setDoc(doc(first,'studentPortalViews','student-1','updates','note-2'),update));
  await assertFails(setDoc(doc(admin,'studentPortalViews','student-1','updates','bad-image'),{...update,image:'https://public.example/image.jpg'}));
  await assertSucceeds(updateDoc(doc(first,'studentPortalViews','student-1','updates','note-1'),{readByStudent:true,savedByStudent:true}));
  await assertFails(updateDoc(doc(first,'studentPortalViews','student-1','updates','note-1'),{details:'Student altered teacher note'}));
  await assertFails(updateDoc(doc(first,'studentPortalViews','student-1','updates','note-1'),{readByStudent:false}));
  const studentMessage={sender:'student',text:'Please explain the lesson.',createdAt:serverTimestamp(),readByStudent:true,readByAdmin:false};
  const adminMessage={sender:'admin',text:'We will cover it tomorrow.',createdAt:serverTimestamp(),readByStudent:false,readByAdmin:true};
  await assertSucceeds(setDoc(doc(first,'studentPortalViews','student-1','messages','question-1'),studentMessage));
  await assertSucceeds(setDoc(doc(admin,'studentPortalViews','student-1','messages','reply-1'),adminMessage));
  await assertSucceeds(getDocs(collection(first,'studentPortalViews','student-1','messages')));
  await assertFails(getDocs(collection(second,'studentPortalViews','student-1','messages')));
  await assertFails(setDoc(doc(first,'studentPortalViews','student-1','messages','fake-reply'),adminMessage));
  await assertFails(updateDoc(doc(first,'studentPortalViews','student-1','messages','question-1'),{text:'Changed after sending'}));
  await assertSucceeds(updateDoc(doc(admin,'studentPortalViews','student-1','messages','question-1'),{readByAdmin:true}));
  await assertSucceeds(updateDoc(doc(first,'studentPortalViews','student-1','messages','reply-1'),{readByStudent:true}));
  await assertSucceeds(setDoc(doc(first,'studentPortalViews','student-1','learning','current'),{program:'MS Word',updatedAt:serverTimestamp()}));
  await assertSucceeds(getDoc(doc(admin,'studentPortalViews','student-1','learning','current')));
  await assertFails(getDoc(doc(second,'studentPortalViews','student-1','learning','current')));
  await assertFails(setDoc(doc(first,'studentPortalViews','student-1','learning','current'),{program:'Unapproved',updatedAt:serverTimestamp()}));
  await assertFails(deleteDoc(doc(first,'studentPortalViews','student-1')));
  await assertFails(getDoc(doc(first,'applications','application-student-1')));
  await assertSucceeds(setDoc(doc(admin,'studentPortalViews','student-1'),view('student-1',false)));
  await assertFails(getDoc(doc(first,'studentPortalViews','student-1')));
  await assertFails(getDocs(collection(first,'studentPortalViews','student-1','updates')));
  await assertFails(getDocs(collection(first,'studentPortalViews','student-1','messages')));
  await assertFails(getDoc(doc(first,'studentPortalViews','student-1','learning','current')));
  await assertSucceeds(getDoc(doc(admin,'studentPortalViews','student-1')));
  await assertFails(setDoc(doc(admin,'studentPortalViews','student-1'),{uid:'student-2',enabled:true}));
  console.log('PASS: two students are isolated; disabled access and student writes are denied; admin can publish a valid view.');
 }finally{await environment.cleanup();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
