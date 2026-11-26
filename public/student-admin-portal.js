import {syncLearningPath} from './student-learning-path.js';

export function watchPortalStudents({db,sdk,students,isCurrent,onChange}){
 let stopped=false;const stops=[],rows=new Map();
 const emit=()=>{if(!stopped&&isCurrent())onChange([...rows.values()]);};
 for(const student of students){
  const uid=student.data.studentPortalAccount?.uid;if(!uid)continue;
  rows.set(student.id,{id:student.id,uid,program:student.data.learningProgress?.byCourse?.[encodeURIComponent(student.data.coursePreference||student.data.course||'')]?.currentProgram||'',unread:0,view:null,error:''});
  const set=patch=>{if(stopped||!isCurrent())return;rows.set(student.id,{...rows.get(student.id),...patch});emit();};
  const fail=()=>set({error:'Could not load portal data. Refresh to retry.'});
  stops.push(sdk.onSnapshot(sdk.doc(db,'studentPortalViews',uid),snap=>set({view:snap.exists()?snap.data():null}),fail));
  stops.push(sdk.onSnapshot(sdk.query(sdk.collection(db,'studentPortalViews',uid,'messages'),sdk.where('readByAdmin','==',false)),snap=>set({unread:snap.docs.filter(item=>item.data().sender==='student').length}),fail));
  stops.push(sdk.onSnapshot(sdk.doc(db,'studentPortalViews',uid,'learning','current'),snap=>{
   if(stopped||!isCurrent())return;
   set({program:snap.exists()?snap.data().program:''});
   if(snap.exists())void syncLearningPath({db,sdk,applicationId:student.id,uid,assertAdmin:()=>{if(stopped||!isCurrent())throw Error('Admin session changed.');}}).then(learningProgress=>{if(learningProgress)set({learningProgress});}).catch(()=>set({error:'Learning projection could not sync. Refresh to retry.'}));
  },fail));
 }
 emit();return ()=>{stopped=true;stops.forEach(stop=>stop());rows.clear();};
}
