import {createStudentAuthUser} from './student-portal-provision.js';
import {linkStudentPortal,setStudentPortalEnabled,syncStudentPortal} from './student-portal-access.js';
import {studentUpdatePayload,prepareStudentUpdateImage} from './student-portal-updates.js';
import {saveAttendance} from './admin-attendance-model.js';
export async function portalAdminAction({db,sdk,config,assertAdmin,actor,action,id,input={},provision=createStudentAuthUser}){
 assertAdmin();const ref=sdk.doc(db,'applications',id),snapshot=await sdk.getDoc(ref);assertAdmin();
 if(!snapshot.exists())throw Error('Student record no longer exists.');
 const data=snapshot.data(),uid=data.studentPortalAccount?.uid;
 const deps={db,doc:sdk.doc,runTransaction:sdk.runTransaction,assertAdmin,applicationId:id};
 if(action==='create'){
  if(uid)throw Error('This student already has a login.');
  if(data.status!=='Approved'||!data.admissionNumber||data.enrolmentStatus==='Cancelled')throw Error('Choose an active approved student with an admission number.');
  const credential=await provision(config,input.username,input.password);let linked=false;
  try{assertAdmin();await linkStudentPortal({...deps,uid:credential.uid,username:input.username});linked=true;return {username:input.username,enabled:true};}
  catch(error){if(!linked){try{const latest=await sdk.getDoc(ref);if(latest.data()?.studentPortalAccount?.uid!==credential.uid)await credential.rollback();else throw Error('Login may already be linked. Refresh before trying again.');}catch{throw Error('Login outcome needs review. Refresh this record and check Firebase Authentication before retrying.');}}throw error;}
  finally{await credential.close().catch(()=>{});}
 }
 if(action==='attendance'){const saved=await saveAttendance({db,ref,runTransaction:sdk.runTransaction,assertSession:assertAdmin,actor,month:input.month,input:input.value,expected:input.expected});if(uid)await syncStudentPortal(deps);return saved;}
 if(!uid)throw Error('Create student portal access first.');
 if(action==='access')return setStudentPortalEnabled({...deps,enabled:input.enabled});
 if(action==='refresh')return syncStudentPortal(deps);
 if(action==='publish'){
  const image=await prepareStudentUpdateImage(input.file);assertAdmin();const payload=studentUpdatePayload({...input,image});
  const saved=await sdk.addDoc(sdk.collection(db,'studentPortalViews',uid,'updates'),payload);return {id:saved.id};
 }
 if(action==='updates')return (await sdk.getDocs(sdk.collection(db,'studentPortalViews',uid,'updates'))).docs.map(row=>({id:row.id,...row.data()}));
 if(action==='message'){
  const text=String(input.text||'').trim();if(!text||text.length>1500)throw Error('Write a message of 1–1,500 characters.');assertAdmin();
  await sdk.addDoc(sdk.collection(db,'studentPortalViews',uid,'messages'),{sender:'admin',text,createdAt:sdk.serverTimestamp(),readByStudent:false,readByAdmin:true});return true;
 }
 if(action==='read'){assertAdmin();await sdk.updateDoc(sdk.doc(db,'studentPortalViews',uid,'messages',input.messageId),{readByAdmin:true});return true;}
 throw Error('Unsupported portal action.');
}
