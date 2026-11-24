import {studentLoginEmail} from './student-portal-access.js';

// Uses a separate in-memory Firebase Auth instance, so the administrator's
// primary sign-in never changes while creating a student credential.
export async function createStudentAuthUser(config,username,password){
 if(typeof password!=='string'||password.length<10||password.length>72)throw Error('Choose a temporary password of 10–72 characters.');
 const [{initializeApp,deleteApp},{getAuth,setPersistence,inMemoryPersistence,createUserWithEmailAndPassword,deleteUser,signOut}]=await Promise.all([
  import('https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js')
 ]);
 const app=initializeApp(config,'student-provision-'+crypto.randomUUID()),secondary=getAuth(app);
 let user=null;
 try{
  await setPersistence(secondary,inMemoryPersistence);
  ({user}=await createUserWithEmailAndPassword(secondary,studentLoginEmail(username),password));
  return {
   uid:user.uid,
   async rollback(){if(user){await deleteUser(user);user=null;}},
   async close(){try{await signOut(secondary);}finally{await deleteApp(app);}}
  };
 }catch(error){await deleteApp(app).catch(()=>{});throw error;}
}
