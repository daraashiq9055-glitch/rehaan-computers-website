import {validateCard} from './admin-feature-model.js?v=20261102-settings-1';
import {validateInstitute} from './admin-settings-model.js?v=20261102-settings-1';
import {assessmentKey,groupResults} from './admin-group-marks-model.js?v=20261108-1';
export const SHEET_LABELS=Object.freeze({serial:'S.NO.',student:'STUDENT / ADMISSION',total:'TOTAL',percentage:'PERCENTAGE',grade:'GRADE',result:'RESULT',speed:'SPEED · WPM',accuracy:'ACCURACY · %',heading:'EXAMINATION RESULT',summary:'RESULT SUMMARY',performance:'SUBJECT PERFORMANCE',highlights:'PERFORMANCE HIGHLIGHTS',guidance:'INDIVIDUAL GUIDANCE'});
export function applyGroupDraft(records,key,ids,draft){
 const original=groupResults(records,key,ids),labels={};for(const [k,defaultValue]of Object.entries(SHEET_LABELS)){const value=String(draft.labels?.[k]??defaultValue).trim();if(!value||value.length>70)throw Error('Keep each heading between 1 and 70 characters.');labels[k]=value;}
 const changed=original.rows.map(row=>{const input=draft.students?.[row.id]||{},card=validateCard({...row.card,title:draft.title,date:draft.date,subjects:row.card.subjects.map((subject,i)=>({...subject,name:draft.subjects[i].name,max:draft.subjects[i].max,marks:input.marks?.[i]??subject.marks,...(subject.typing?{typing:input.typing?.[i]||subject.typing}:{})})),manualGrade:input.grade??row.card.manualGrade});
 const name=String(input.name??row.name).trim(),admission=String(input.admission??row.admission).trim(),serial=String(input.serial??original.rows.indexOf(row)+1).trim();if(!name||name.length>120||admission.length>40||!serial||serial.length>12)throw Error('Check student name, admission and serial number.');return {id:row.id,data:{fullName:name,admissionNumber:admission,batch:row.batch,markCard:card},serial,note:input.note};});
 const result=groupResults(changed,assessmentKey(changed[0].data.markCard),ids);for(const row of result.rows){const edit=changed.find(c=>c.id===row.id);row.serial=edit.serial;if(edit.note!==undefined&&edit.note!==''){if(String(edit.note).length>600)throw Error('Keep guidance under 600 characters per student.');row.note=String(edit.note);}}
 // Selection order is the saved admission order, even when draft admission labels change.
 result.rows.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));return {result,profile:validateInstitute(draft.profile),labels};
}
