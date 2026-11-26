import {stages} from './student-quiz.js';
import {studentViewFromApplication} from './student-view-model.js';
const normal=value=>String(value||'').toLowerCase().replace(/microsoft/g,'ms').replace(/[^a-z0-9]/g,'');
export function topicProgram(topic){return stages.find(stage=>normal(stage)===normal(topic.program||topic.title))||'';}
export function mergeSelectedProgram(data,program,selectionAt){
 if(!stages.includes(program))throw Error('Choose an approved software program.');
 const course=data.coursePreference||data.course||'',key=encodeURIComponent(course),old=data.learningProgress||{};
 if(!course||typeof old!=='object'||Array.isArray(old)||old.byCourse&&(typeof old.byCourse!=='object'||Array.isArray(old.byCourse)))throw Error('Existing learning record needs review.');
 const saved=old.byCourse?.[key];
 if(saved?.selectionAt===selectionAt&&saved?.currentProgram===program)return old;
 if(saved?.topics!==undefined&&!Array.isArray(saved.topics))throw Error('Existing checklist needs review.');
 const topics=(saved?.topics||[]).map((topic,index)=>({...topic,id:topic.id||'legacy-topic-'+index}));
 // Old teacher-saved values take precedence. Only generated/unassessed entries
 // are inferred; no existing topic is removed, renamed, or reset.
 for(const topic of topics){if(!topic||typeof topic.title!=='string')throw Error('Existing checklist needs review.');if(topic.origin!=='selection')topic.manual=true;}
 for(const [index,stage] of stages.entries()){
  const matches=topics.filter(topic=>topicProgram(topic)===stage);
  if(!matches.length){let id='software-'+index,suffix=0;while(topics.some(topic=>topic.id===id))id='software-'+index+'-'+(++suffix);topics.push({id,title:stage,program:stage,done:index<stages.indexOf(program),origin:'selection',manual:false});}
  else for(const topic of matches){topic.program=stage;if(!topic.manual)topic.done=index<stages.indexOf(program);}
 }
 if(topics.length>100)throw Error('The existing checklist is full. Ask an administrator to review it.');
 return {...old,byCourse:{...(old.byCourse||{}),[key]:{...saved,course,topics,currentProgram:program,selectionAt}}};
}
export async function syncLearningPath({db,sdk,applicationId,uid,assertAdmin}){
 return sdk.runTransaction(db,async tx=>{
  assertAdmin();const ref=sdk.doc(db,'applications',applicationId),selectionRef=sdk.doc(db,'studentPortalViews',uid,'learning','current'),viewRef=sdk.doc(db,'studentPortalViews',uid);
  const [record,selection,view]=await Promise.all([tx.get(ref),tx.get(selectionRef),tx.get(viewRef)]);assertAdmin();
  if(!record.exists()||record.data().studentPortalAccount?.uid!==uid||!selection.exists())return null;
  const data=record.data();if(data.status!=='Approved'||data.enrolmentStatus==='Cancelled')return null;
  const selected=selection.data(),version=selected.updatedAt?.toMillis?.()||0;
  const learningProgress=mergeSelectedProgram(data,selected.program,version);
  if(learningProgress!==data.learningProgress){
   tx.update(ref,{learningProgress,...(data.portalLearning&&sdk.deleteField?{portalLearning:sdk.deleteField()}:{})});
   if(view.exists())tx.update(viewRef,{journey:studentViewFromApplication({...data,learningProgress},applicationId).journey,updatedAt:new Date().toISOString()});
  }
  return learningProgress;
 });
}
