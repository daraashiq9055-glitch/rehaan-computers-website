import {mergeSelectedProgram,topicProgram} from '../../public/student-learning-path.js';
import {studentPrograms} from '../../public/student-programs.js';
import {studentViewFromApplication} from '../../public/student-view-model.js';
const stamp=value=>value?.toMillis?.()||0;
const copy=value=>value instanceof Date?new Date(value):typeof value?.toMillis==='function'?value:Array.isArray(value)?value.map(copy):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,copy(v)])):value;
const ordered=value=>Array.isArray(value)?value.map(ordered):typeof value?.toMillis==='function'?{timestamp:value._firestoreTimestamp||value.toMillis()}:value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])])):value;
const same=(a,b)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
export async function syncOfficialJourney(store,uid,input=null,now=new Date()){
 const {sdk,db}=store,viewRef=sdk.doc(db,'studentPortalViews',uid);
 return sdk.runTransaction(db,async tx=>{
  const view=await tx.get(viewRef);if(!view.exists()||view.data().enabled!==true||view.data().uid!==uid)throw Error('Student access is disabled.');
  const id=view.data().applicationId;if(!/^[A-Za-z0-9_-]+$/.test(id||''))throw Error('Student link needs review.');
  const appRef=sdk.doc(db,'applications',id),selectionRef=sdk.doc(db,'studentPortalViews',uid,'learning','current'),requestsRef=sdk.doc(db,'studentPortalViews',uid,'learning','requests');
  const [app,selection,requests]=await Promise.all([tx.get(appRef),tx.get(selectionRef),tx.get(requestsRef)]);
  if(!app.exists())throw Error('Student record missing.');const data=app.data();
  if(data.status!=='Approved'||data.enrolmentStatus==='Cancelled'||data.studentPortalAccount?.uid!==uid||data.studentPortalAccount.enabled!==true)throw Error('Student link is inactive.');
  let program=selection.data()?.program,version=stamp(selection.data()?.updatedAt),requested=requests.data()?.programs||[],requestVersion=stamp(requests.data()?.updatedAt);
  if(input){
   if(Object.keys(input).some(key=>!['program','learned'].includes(key)))throw Error('Unsupported learning selection.');
   if(input.program!==undefined){if(!studentPrograms.includes(input.program))throw Error('Choose approved software.');program=input.program;version=now.getTime();}
   if(input.learned!==undefined){if(!Array.isArray(input.learned)||input.learned.length>12||new Set(input.learned).size!==input.learned.length||input.learned.some(item=>!studentPrograms.includes(item)))throw Error('Choose approved learned software.');requested=input.learned;requestVersion=now.getTime();}
  }
  if(!program)throw Error('Select current software first.');
  const progress=copy(mergeSelectedProgram(data,program,version)),entry=progress.byCourse[encodeURIComponent(data.coursePreference||data.course)];
  for(const topic of entry.topics){if(requested.includes(topicProgram(topic))&&!topic.done&&topic.requestVersion!==requestVersion){topic.requestStatus='requested';topic.requestVersion=requestVersion;}else if(!requested.includes(topicProgram(topic))&&topic.requestStatus==='requested'){delete topic.requestStatus;delete topic.requestVersion;}}
  const journey=studentViewFromApplication({...data,learningProgress:progress},id).journey;
  if(!same(progress,data.learningProgress))tx.update(appRef,{learningProgress:progress});
  if(!same(journey,view.data().journey))tx.update(viewRef,{journey,updatedAt:now.toISOString()});
  if(input?.program!==undefined)tx.set(selectionRef,{program,updatedAt:now});
  if(input?.learned!==undefined)tx.set(requestsRef,{programs:requested,updatedAt:now});
  return {synced:true,currentProgram:program,journey};
 });
}
export async function reviewOfficialJourney(store,uid,input,now=new Date()){
 const {sdk,db}=store;
 return sdk.runTransaction(db,async tx=>{
  const viewRef=`studentPortalViews/${uid}`,view=await tx.get(viewRef),id=view.data()?.applicationId;
  if(!id)throw Error('Student link missing.');const appRef=`applications/${id}`,requestRef=`studentPortalViews/${uid}/learning/requests`;
  const [app,request]=await Promise.all([tx.get(appRef),tx.get(requestRef)]);
  if(!app.exists()||app.data().studentPortalAccount?.uid!==uid||!request.exists()||stamp(request.data().updatedAt)!==input.version)throw Error('Learning request changed. Reload the review.');
  const requested=request.data().programs;if(!Array.isArray(input.approved)||input.approved.some(p=>!requested.includes(p)))throw Error('Review only requested software.');
  const data=app.data(),progress=copy(data.learningProgress),course=progress?.byCourse?.[encodeURIComponent(data.coursePreference||data.course)];if(!course)throw Error('Wait for the current software to sync first.');
  course.topics=course.topics.map(topic=>requested.includes(topicProgram(topic))?{...topic,...(input.approved.includes(topicProgram(topic))?{done:true,manual:true}:{}),requestStatus:input.approved.includes(topicProgram(topic))?'confirmed':'needs-practice',requestVersion:input.version}:topic);
  tx.update(appRef,{learningProgress:progress});tx.update(viewRef,{journey:studentViewFromApplication({...data,learningProgress:progress},id).journey,updatedAt:now.toISOString()});return {saved:true};
 });
}
