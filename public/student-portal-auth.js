import {studentLoginEmail} from './student-portal-access.js';
import {stages} from './student-quiz.js';

const config={apiKey:'AIzaSyBXRQvUZBPP_E3Q0SZBYTsOc6sfzAEiqpE',authDomain:'rehaan-computers.firebaseapp.com',projectId:'rehaan-computers',storageBucket:'rehaan-computers.firebasestorage.app',messagingSenderId:'292017935720',appId:'1:292017935720:web:d767adbf23823fbf5c72dd'};
let clientPromise=null,auth=null;
function client(){
 if(!clientPromise)clientPromise=(async()=>{
  const [appSdk,authSdk,storeSdk]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js')
  ]);
  const app=appSdk.getApps().find(value=>value.name==='rc-learn-student')||appSdk.initializeApp(config,'rc-learn-student');
  auth=authSdk.getAuth(app);
  await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);
  return {sdk:{authSdk,storeSdk},auth,db:storeSdk.getFirestore(app)};
 })().catch(error=>{clientPromise=null;throw error;});
 return clientPromise;
}
async function privateView(user){const {sdk,db}=await client();const ref=sdk.storeSdk.doc(db,'studentPortalViews',user.uid),snapshot=await sdk.storeSdk.getDocFromServer(ref);if(!snapshot.exists()||snapshot.data().enabled!==true||snapshot.data().uid!==user.uid)throw Error('Your student access is not active. Contact the centre.');return {view:snapshot.data(),ref};}
export async function signInStudent(username,password){const {sdk,auth}=await client();const {user}=await sdk.authSdk.signInWithEmailAndPassword(auth,studentLoginEmail(username),password);try{return {user,...await privateView(user)};}catch(error){await sdk.authSdk.signOut(auth).catch(()=>{});throw error;}}
export async function restoreStudent(){const {auth}=await client();await auth.authStateReady();return auth.currentUser?{user:auth.currentUser,...await privateView(auth.currentUser)}:null;}
export async function watchStudent(ref,onValue,onError){const {sdk,db}=await client();return sdk.storeSdk.onSnapshot(ref,snapshot=>{if(snapshot.exists()&&snapshot.data().enabled===true)onValue(snapshot.data());else onError(Error('Student access is disabled. Contact the centre.'));},onError);}
export async function watchStudentUpdates(uid,onValue,onError){const {sdk,db}=await client();if(auth.currentUser?.uid!==uid)throw Error('Student session changed.');return sdk.storeSdk.onSnapshot(sdk.storeSdk.collection(db,'studentPortalViews',uid,'updates'),snapshot=>onValue(snapshot.docs.map(item=>({id:item.id,...item.data()})).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))),onError);}
export async function setStudentUpdateState(uid,id,changes){const {sdk,db}=await client();if(auth.currentUser?.uid!==uid)throw Error('Student session changed.');const fields={};if(typeof changes.readByStudent==='boolean')fields.readByStudent=changes.readByStudent;if(typeof changes.savedByStudent==='boolean')fields.savedByStudent=changes.savedByStudent;if(!Object.keys(fields).length)throw Error('No update state to change.');await sdk.storeSdk.updateDoc(sdk.storeSdk.doc(db,'studentPortalViews',uid,'updates',id),fields);}
export async function watchStudentMessages(uid,onValue,onError){const {sdk,db}=await client();if(auth.currentUser?.uid!==uid)throw Error('Student session changed.');return sdk.storeSdk.onSnapshot(sdk.storeSdk.collection(db,'studentPortalViews',uid,'messages'),snapshot=>onValue(snapshot.docs.map(item=>({id:item.id,...item.data()})).sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0))),onError);}
export async function sendStudentMessage(uid,message){const {sdk,db}=await client();if(auth.currentUser?.uid!==uid)throw Error('Student session changed.');const value=String(message||'').trim();if(!value||value.length>1500)throw Error('Write a message of at most 1,500 characters.');await sdk.storeSdk.addDoc(sdk.storeSdk.collection(db,'studentPortalViews',uid,'messages'),{sender:'student',text:value,createdAt:sdk.storeSdk.serverTimestamp(),readByStudent:true,readByAdmin:false});}
export async function markStudentMessageRead(uid,id){const {sdk,db}=await client();if(auth.currentUser?.uid!==uid)throw Error('Student session changed.');await sdk.storeSdk.updateDoc(sdk.storeSdk.doc(db,'studentPortalViews',uid,'messages',id),{readByStudent:true});}
export async function watchStudentSelection(uid,onValue,onError){const {sdk,db}=await client();if(auth.currentUser?.uid!==uid)throw Error('Student session changed.');return sdk.storeSdk.onSnapshot(sdk.storeSdk.doc(db,'studentPortalViews',uid,'learning','current'),snapshot=>onValue(snapshot.exists()?snapshot.data():null),onError);}
export async function setStudentSelection(uid,program){const {sdk,db}=await client();if(auth.currentUser?.uid!==uid)throw Error('Student session changed.');if(!stages.includes(program))throw Error('Choose one of the listed learning programs.');await sdk.storeSdk.setDoc(sdk.storeSdk.doc(db,'studentPortalViews',uid,'learning','current'),{program,updatedAt:sdk.storeSdk.serverTimestamp()});}
export async function studentIdToken(uid){const {auth}=await client();if(auth.currentUser?.uid!==uid)throw Error('Student session changed.');return auth.currentUser.getIdToken();}
export async function signOutStudent(){if(!auth)return;const {sdk}=await client();await sdk.authSdk.signOut(auth);}

export async function readStudentOnboarding(uid){const {sdk,db}=await client();if(auth.currentUser?.uid!==uid)throw Error('Student session changed.');const snapshot=await sdk.storeSdk.getDocFromServer(sdk.storeSdk.doc(db,'studentPortalViews',uid,'preferences','onboarding'));return snapshot.exists()?snapshot.data():null;}
export async function completeStudentOnboarding(uid){const {sdk,db}=await client();if(auth.currentUser?.uid!==uid)throw Error('Student session changed.');const ref=sdk.storeSdk.doc(db,'studentPortalViews',uid,'preferences','onboarding');await sdk.storeSdk.runTransaction(db,async tx=>{const snap=await tx.get(ref);if(auth.currentUser?.uid!==uid)throw Error('Student session changed.');if(!snap.exists())tx.set(ref,{followed:true,completedAt:sdk.storeSdk.serverTimestamp()});});}
export async function watchLearnedRequests(uid,onValue,onError){const {sdk,db}=await client();if(auth.currentUser?.uid!==uid)throw Error('Student session changed.');return sdk.storeSdk.onSnapshot(sdk.storeSdk.doc(db,'studentPortalViews',uid,'learning','requests'),snap=>onValue(snap.exists()?snap.data():null),onError);}
export async function saveLearnedRequests(uid,programs){const {sdk,db}=await client();if(auth.currentUser?.uid!==uid)throw Error('Student session changed.');if(!Array.isArray(programs)||programs.length>12||new Set(programs).size!==programs.length||programs.some(program=>!stages.includes(program)))throw Error('Choose approved programs.');await sdk.storeSdk.setDoc(sdk.storeSdk.doc(db,'studentPortalViews',uid,'learning','requests'),{programs,updatedAt:sdk.storeSdk.serverTimestamp()});}
