import {canonicalRecord} from '../../public/admin-records.js';
export const stages=['Active','On hold','Completed','Archived'];
export function stageOf(data){return stages.includes(data.studentLifecycle?.stage)?data.studentLifecycle.stage:data.status==='Approved'?'Active':'Not enrolled';}
export function courseKey(course){return encodeURIComponent(String(course||''));}
export function progressOf(data,course,topics){
 const map=data.learningProgress?.byCourse,key=courseKey(course);
 const saved=map&&Object.hasOwn(map,key)?map[key]:null;
 return saved||{course,topics:topics.map((title,index)=>({id:'topic-'+index,title,done:false}))};
}
export async function saveLifecycle({runTransaction,db,ref,assertSession,actor,expected,stage,reason,now=new Date().toISOString()}){
 if(!stages.includes(stage))throw Error('Choose a student stage.');
 reason=String(reason||'').trim();if(reason.length<5||reason.length>500)throw Error('Add a reason between 5 and 500 characters.');
 return runTransaction(db,async tx=>{
  assertSession();const snapshot=await tx.get(ref);assertSession();if(!snapshot.exists())throw Error('Student record no longer exists.');const data=snapshot.data();
  if(data.status!=='Approved')throw Error('Only enrolled students can change lifecycle stage.');
  if(canonicalRecord(data.studentLifecycle??null)!==canonicalRecord(expected??null))throw Error('Another administrator changed this stage. Refresh before saving.');
  const old=data.studentLifecycle||{},before=stageOf(data);
  if(typeof old!=='object'||Array.isArray(old))throw Error('Stored lifecycle data needs review.');
  if(stage===before)throw Error('Choose a different stage.');
  if(old.events!==undefined&&!Array.isArray(old.events))throw Error('Stored lifecycle history needs review.');
  if((old.events||[]).length>=100)throw Error('This lifecycle history needs administrator review before adding more events.');
  const next={...old,stage,previousStage:before,updatedAt:now,updatedBy:actor,events:[...(old.events||[]),{from:before,to:stage,reason,at:now,by:actor}]};
  tx.update(ref,{studentLifecycle:next,updatedAt:now,updatedBy:actor});return next;
 });
}
export async function saveProgress({runTransaction,db,ref,assertSession,actor,expected,course,topics,now=new Date().toISOString()}){
 if(typeof course!=='string'||!course.trim()||course.length>120)throw Error('A valid assigned course is required.');
 if(!Array.isArray(topics)||!topics.length||topics.length>100)throw Error('Use between 1 and 100 course topics.');
 const ids=new Set();const clean=topics.map(topic=>{if(typeof topic.id!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(topic.id)||ids.has(topic.id)||typeof topic.title!=='string'||!topic.title.trim()||topic.title.length>180||typeof topic.done!=='boolean')throw Error('Review the checklist topics before saving.');ids.add(topic.id);return {id:topic.id,title:topic.title.trim(),done:topic.done};});
 return runTransaction(db,async tx=>{
  assertSession();const snapshot=await tx.get(ref);assertSession();if(!snapshot.exists())throw Error('Student record no longer exists.');const data=snapshot.data();
  if(data.status!=='Approved')throw Error('Only enrolled students can save course progress.');
  if((data.coursePreference||data.course||'')!==course)throw Error('The assigned course changed. Refresh before saving this checklist.');
  if(canonicalRecord(data.learningProgress??null)!==canonicalRecord(expected??null))throw Error('Another administrator changed course progress. Refresh before saving.');
  const old=data.learningProgress||{};if(typeof old!=='object'||Array.isArray(old)||(old.byCourse!==undefined&&(!old.byCourse||typeof old.byCourse!=='object'||Array.isArray(old.byCourse))))throw Error('Stored learning progress needs review.');const next={...old,byCourse:{...(old.byCourse||{}),[courseKey(course)]:{course,topics:clean,updatedAt:now,updatedBy:actor}}};
  tx.update(ref,{learningProgress:next,updatedAt:now,updatedBy:actor});return next;
 });
}
export const preferenceDefaults={start:'overview',density:'comfortable',layout:'list',motion:'system',favourites:['students','fees']};
export function cleanPreferences(value={}){
 const choices={start:['overview','today','students','fees','records','accounts','journeys'],density:['comfortable','compact'],layout:['list','cards'],motion:['system','reduced']};const result={};
 for(const [key,allowed]of Object.entries(choices))result[key]=allowed.includes(value[key])?value[key]:preferenceDefaults[key];
 result.favourites=Array.isArray(value.favourites)?[...new Set(value.favourites.filter(item=>choices.start.includes(item)))].slice(0,4):[...preferenceDefaults.favourites];return result;
}
