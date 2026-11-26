// One scoped unread query per linked student; no access to unrelated collections.
export function watchAdminStudentInbox({sdk,db,students,isCurrent,onChange}) {
 const rows=new Map(),stops=[];let stopped=false;
 const emit=()=>{if(!stopped&&isCurrent())onChange([...rows.values()]);};
 for(const student of students){
  const uid=student.data.studentPortalAccount?.uid;if(!uid||rows.has(uid))continue;
  const base={uid,id:student.id,name:student.data.fullName||'Student',unread:0,error:false};
  rows.set(uid,base);
  const ref=sdk.query(sdk.collection(db,'studentPortalViews',uid,'messages'),sdk.where('readByAdmin','==',false));
  stops.push(sdk.onSnapshot(ref,snapshot=>{
   if(stopped||!isCurrent())return;
   rows.set(uid,{...base,unread:snapshot.docs.filter(item=>item.data().sender==='student').length});emit();
  },()=>{if(stopped||!isCurrent())return;rows.set(uid,{...base,error:true});emit();}));
 }
 emit();
 return ()=>{stopped=true;for(const stop of stops)stop();rows.clear();};
}
