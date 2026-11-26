import {stages} from './student-quiz.js';
export function learningPath(program){
 const index=stages.indexOf(program);
 return {program:index<0?'':program,completed:index<0?[]:stages.slice(0,index),percent:index<0?0:Math.round(index/stages.length*100),steps:stages.map((name,i)=>({name,status:index<0?'upcoming':i<index?'learned':i===index?'current':'upcoming'}))};
}
// Only the administrator writes this projection. Never edit teacher assessment.
export async function syncLearningPath({db,sdk,applicationId,uid,assertAdmin}){
 return sdk.runTransaction(db,async tx=>{
  assertAdmin();const ref=sdk.doc(db,'applications',applicationId),selectionRef=sdk.doc(db,'studentPortalViews',uid,'learning','current');
  const [record,selection]=await Promise.all([tx.get(ref),tx.get(selectionRef)]);assertAdmin();
  if(!record.exists()||record.data().studentPortalAccount?.uid!==uid||!selection.exists())return null;
  const data=selection.data(),path=learningPath(data.program);if(!path.program)return null;
  const next={program:path.program,completed:path.completed,percent:path.percent,selectedAt:data.updatedAt?.toMillis?.()||0,source:'student-portal'};
  if(JSON.stringify(record.data().portalLearning||null)!==JSON.stringify(next))tx.update(ref,{portalLearning:next});
  return next;
 });
}
