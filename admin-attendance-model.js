import {customMessage} from './admin-settings-state.js?v=20261102-settings-1';
import {renderSettingsTemplate} from './admin-settings-model.js?v=20261102-settings-1';
import {indiaDate,monthLabel} from './admin-feature-model.js?v=20261102-settings-1';
import {canonicalRecord} from './admin-records.js?v=20261102-settings-1';
export function attendanceValue(month,input,today=indiaDate()){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month>today.slice(0,7)||month<'2000-01')throw Error('Choose a valid current or past month.');
 const max=month===today.slice(0,7)?Number(today.slice(8)):new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 if(!/^\d{1,2}$/.test(String(input.days??''))||Number(input.days)>max)throw Error('For '+monthLabel(month)+', enter a whole number from 0 to '+max+'. '+(month===today.slice(0,7)?'Only '+max+' calendar days have elapsed. For last month’s register, select Previous month.':'Use the total from this month’s register.'));
 if(typeof input.note!=='string'||input.note.trim().length>300)throw Error('Keep the notice within 300 characters.');
 const total=input.totalDays===undefined||input.totalDays===''||input.totalDays===null?null:Number(input.totalDays);
 if(total!==null&&(!Number.isInteger(total)||total<Number(input.days)||total<1||total>max))throw Error('Classes held must be a whole number from '+Math.max(1,Number(input.days))+' to '+max+' for '+monthLabel(month)+'. Do not enter planned future classes.');
 return {days:Number(input.days),totalDays:total,note:input.note.trim()};
}
export function attendanceMessage(entry,month,value){
 const configured=customMessage('attendance',{name:entry.data.fullName,month:monthLabel(month),classes:value.totalDays||null,attended:value.days,percentage:value.totalDays?Math.round(value.days/value.totalDays*100):null,notice:value.note});
 if(configured)return renderSettingsTemplate(configured.template,configured.values);
 const lines=['*REHAAN COMPUTERS*','*Monthly Attendance — '+monthLabel(month)+'*','','Hello '+entry.data.fullName+', here is your attendance summary:',''];
 if(value.totalDays)lines.push('• Classes held: *'+value.totalDays+' days*');
 lines.push('• Days attended: *'+value.days+' days*');
 if(value.totalDays)lines.push('• Attendance: *'+Math.round(value.days/value.totalDays*100)+'%*');
 if(value.note)lines.push('','*Note:* '+value.note);
 return lines.join('\n');
}
export function followupMessage(name){return '*REHAAN COMPUTERS*\n*Important Notice*\n\nHello '+name+', you haven’t attended classes recently. Please let us know whether you will continue your course.\n\n*1.* I will return to classes. I will tell you my joining date.\n*2.* I need a break. I will tell you when I can return.\n*3.* Please call me to discuss.\n*4.* I cannot continue. Please cancel my admission.\n\n*Please reply with 1, 2, 3 or 4 within 24 hours. If we do not receive a reply, we may cancel your admission.*';}
export async function saveAttendance({db,ref,runTransaction,assertSession,actor,month,input,expected}){
 const clean=attendanceValue(month,input);if(!actor)throw Error('Sign in again.');
 return runTransaction(db,async tx=>{assertSession();const snap=await tx.get(ref);assertSession();if(!snap.exists())throw Error('Student no longer exists.');const data=snap.data(),map=data.monthlyAttendance;
 if(map!==undefined&&(!map||typeof map!=='object'||Array.isArray(map)))throw Error('Stored attendance needs review.');
 if(data.admissionDate&&month<String(data.admissionDate).slice(0,7))throw Error('Choose the admission month or a later month.');
 if(canonicalRecord(map?.[month]??null)!==canonicalRecord(expected??null))throw Error('Attendance changed in another session. Refresh and review before saving.');
 const value={...clean,updatedAt:new Date().toISOString(),updatedBy:actor};tx.update(ref,{['monthlyAttendance.'+month]:value});return value;});
}

export function suggestedNotice(value){
 if(value.totalDays===null||value.totalDays===undefined)return 'You attended '+value.days+' days this month. Please attend your scheduled classes regularly and contact us if you need help.';
 const ratio=value.days/value.totalDays;
 return ratio>=.9?'Your attendance has been very good. Keep attending regularly.':ratio>=.75?'Please attend regularly and try not to miss your classes.':ratio>=.5?'You have missed several classes this month. Please attend regularly and contact us if you need help.':'You have attended very few classes this month. Please contact us to discuss continuing your classes.';
}
