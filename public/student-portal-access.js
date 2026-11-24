import {studentViewFromApplication} from './student-view-model.js';

const uidOkay=value=>typeof value==='string'&&/^[A-Za-z0-9:_-]{8,128}$/.test(value);
export function normalizeStudentUsername(value){const username=String(value||'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9._-]{3,23}$/.test(username))throw Error('Choose a username of 4–24 letters, numbers, dots, dashes or underscores.');return username;}
export function studentLoginEmail(username){return normalizeStudentUsername(username)+'@students.rehaan-computers.web.app';}
function portalView(applicationId,uid,data,enabled,updatedAt){return {uid,applicationId,enabled,...studentViewFromApplication(data,applicationId),updatedAt};}
function equalPayload(existing,next){if(!existing)return false;const {updatedAt:_old,...before}=existing,{updatedAt:_new,...after}=next;return JSON.stringify(before)===JSON.stringify(after);}

export async function linkStudentPortal({db,doc,runTransaction,assertAdmin,applicationId,uid,username,now=new Date().toISOString()}){
 if(!uidOkay(uid))throw Error('The new student account ID is invalid.');
 username=normalizeStudentUsername(username);
 assertAdmin();
 const appRef=doc(db,'applications',applicationId),viewRef=doc(db,'studentPortalViews',uid);
 return runTransaction(db,async tx=>{
  assertAdmin();const [appSnap,viewSnap]=await Promise.all([tx.get(appRef),tx.get(viewRef)]);assertAdmin();
  if(!appSnap.exists())throw Error('Student record no longer exists.');
  if(viewSnap.exists())throw Error('This login already has a student view. Review before linking.');
  const data=appSnap.data();if(data.status!=='Approved'||data.enrolmentStatus==='Cancelled'||!data.admissionNumber)throw Error('Only an active enrolled student can receive a login.');
  if(data.studentPortalAccount)throw Error('This student already has portal access. Refresh the record.');
  const account={uid,username,enabled:true,createdAt:now};
  tx.update(appRef,{studentPortalAccount:account,updatedAt:now});
  tx.set(viewRef,portalView(applicationId,uid,data,true,now));
  return account;
 });
}

export async function syncStudentPortal({db,doc,runTransaction,assertAdmin,applicationId,now=new Date().toISOString()}){
 assertAdmin();const appRef=doc(db,'applications',applicationId);
 return runTransaction(db,async tx=>{
  assertAdmin();const appSnap=await tx.get(appRef);assertAdmin();if(!appSnap.exists())throw Error('Student record no longer exists.');
  const data=appSnap.data(),account=data.studentPortalAccount;if(!uidOkay(account?.uid))return false;
  const viewRef=doc(db,'studentPortalViews',account.uid),viewSnap=await tx.get(viewRef);assertAdmin();
  const enabled=account.enabled===true&&data.status==='Approved'&&data.enrolmentStatus!=='Cancelled';
  if(!enabled){if(viewSnap.exists()&&viewSnap.data().enabled!==false)tx.update(viewRef,{enabled:false,updatedAt:now});return false;}
  const next=portalView(applicationId,account.uid,data,true,now);
  if(!equalPayload(viewSnap.exists()?viewSnap.data():null,next)){tx.set(viewRef,next);return true;}
  return false;
 });
}

export async function setStudentPortalEnabled({db,doc,runTransaction,assertAdmin,applicationId,enabled,now=new Date().toISOString()}){
 if(typeof enabled!=='boolean')throw Error('Choose an access state.');
 assertAdmin();const appRef=doc(db,'applications',applicationId);
 return runTransaction(db,async tx=>{
  assertAdmin();const appSnap=await tx.get(appRef);assertAdmin();if(!appSnap.exists())throw Error('Student record no longer exists.');
  const data=appSnap.data(),account=data.studentPortalAccount;if(!uidOkay(account?.uid))throw Error('This student has no portal login.');
  if(enabled&&(data.status!=='Approved'||data.enrolmentStatus==='Cancelled'))throw Error('Only active enrolled students can regain access.');
  const viewRef=doc(db,'studentPortalViews',account.uid),viewSnap=await tx.get(viewRef);assertAdmin();
  if(!viewSnap.exists())throw Error('Student view is missing. Refresh and review this account.');
  tx.update(appRef,{studentPortalAccount:{...account,enabled},updatedAt:now});
  tx.update(viewRef,{enabled,updatedAt:now});return enabled;
 });
}
