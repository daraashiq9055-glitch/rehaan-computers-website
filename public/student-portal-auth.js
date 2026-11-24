import {studentLoginEmail} from './student-portal-access.js';

const config={apiKey:'AIzaSyBXRQvUZBPP_E3Q0SZBYTsOc6sfzAEiqpE',authDomain:'rehaan-computers.firebaseapp.com',projectId:'rehaan-computers',storageBucket:'rehaan-computers.firebasestorage.app',messagingSenderId:'292017935720',appId:'1:292017935720:web:d767adbf23823fbf5c72dd'};
let sdk=null,auth=null,db=null;
async function client(){
 if(sdk)return {sdk,auth,db};
 const [appSdk,authSdk,storeSdk]=await Promise.all([
  import('https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js')
 ]);
 const app=appSdk.getApps().find(value=>value.name==='rc-learn-student')||appSdk.initializeApp(config,'rc-learn-student');
 auth=authSdk.getAuth(app);db=storeSdk.getFirestore(app);await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);
 sdk={authSdk,storeSdk};return {sdk,auth,db};
}
async function privateView(user){const {sdk,db}=await client();const ref=sdk.storeSdk.doc(db,'studentPortalViews',user.uid),snapshot=await sdk.storeSdk.getDoc(ref);if(!snapshot.exists()||snapshot.data().enabled!==true||snapshot.data().uid!==user.uid)throw Error('Your student access is not active. Contact the centre.');return {view:snapshot.data(),ref};}
export async function signInStudent(username,password){const {sdk,auth}=await client();const {user}=await sdk.authSdk.signInWithEmailAndPassword(auth,studentLoginEmail(username),password);try{return {user,...await privateView(user)};}catch(error){await sdk.authSdk.signOut(auth).catch(()=>{});throw error;}}
export async function restoreStudent(){const {auth}=await client();await auth.authStateReady();return auth.currentUser?{user:auth.currentUser,...await privateView(auth.currentUser)}:null;}
export async function watchStudent(ref,onValue,onError){const {sdk,db}=await client();return sdk.storeSdk.onSnapshot(ref,snapshot=>{if(snapshot.exists()&&snapshot.data().enabled===true)onValue(snapshot.data());else onError(Error('Student access is disabled. Contact the centre.'));},onError);}
export async function signOutStudent(){if(!auth)return;const {sdk}=await client();await sdk.authSdk.signOut(auth);}
