import {attendanceValue} from './admin-attendance-model.js?v=20261105-follow-3';
import {feeStatement} from './admin-fee-statement-model.js?v=20261102-settings-1';
import {indiaDate} from './admin-feature-model.js?v=20261102-settings-1';
export function admissionMonth(data){
 if(!data.admissionNumber)return '';
 const date=String(data.admissionDate||data.approvedAt||'').slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)return '';
 return date.slice(0,7);
}
export function monthlyReport(entries,month,today=indiaDate()){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month>today.slice(0,7))throw Error('Choose a current or past month.');
 const admissions=entries.filter(e=>admissionMonth(e.data)===month);
 const result={month,admissions,active:0,received:0,receiptCount:0,feePaid:0,feeBalance:0,feeDue:0,paidStudents:0,partialStudents:0,unpaidStudents:0,review:0,legacy:0,attendanceRecorded:0,attended:0,classes:0,attendanceCount:0,followup:0,courses:{},batches:{}};
 for(const e of entries){const d=e.data;
  if(d.status==='Approved'&&d.enrolmentStatus!=='Cancelled')result.active++;
  if(d.status!=='Approved'&&!d.admissionNumber)continue;
  const statement=feeStatement(e,today);
  if(!statement.reliable){result.review++;continue;}
  const row=statement.rows.find(r=>r.month===month);
  if(row){result.feePaid+=row.paid;result.feeBalance+=row.balance;if(!row.upcoming)result.feeDue+=row.balance;result.legacy+=row.legacyPaid;if(row.balance===0)result.paidStudents++;else if(row.paid>0)result.partialStudents++;else result.unpaidStudents++;}
  for(const r of Object.values(d.feeReceipts||{})){if(r.date?.slice(0,7)===month){result.received+=r.amount;result.receiptCount++;}}
 }
 for(const {data:d} of entries){const a=d.monthlyAttendance?.[month];if(!a)continue;try{attendanceValue(month,{days:a.days,totalDays:a.totalDays,note:typeof a.note==='string'?a.note:''},today);}catch{continue;}result.attendanceRecorded++;if(Number.isInteger(a.totalDays)&&a.totalDays>0&&a.days<=a.totalDays){result.attendanceCount++;result.attended+=a.days;result.classes+=a.totalDays;if(a.days/a.totalDays<.75)result.followup++;}}
 for(const {data:d} of admissions){const course=String(d.coursePreference||d.course||'Not recorded'),batch=String(d.batch||'Not recorded');result.courses[course]=(result.courses[course]||0)+1;result.batches[batch]=(result.batches[batch]||0)+1;}
 result.attendancePercent=result.classes?Math.round(result.attended/result.classes*100):null;
 return result;
}
export function reportDetails(entries,month,kind,today=indiaDate()){
 const report=monthlyReport(entries,month,today),rows=[];
 const add=(entry,label,value='')=>rows.push({id:entry.id,name:String(entry.data.fullName||'Unnamed student'),admission:String(entry.data.admissionNumber||'—'),course:String(entry.data.coursePreference||entry.data.course||'Not recorded'),label,value});
 if(kind==='admissions')for(const entry of report.admissions)add(entry,'Joined '+String(entry.data.admissionDate||entry.data.approvedAt||'').slice(0,10),entry.data.batch||'Batch not recorded');
 if(kind==='active')for(const entry of entries.filter(row=>row.data.status==='Approved'&&row.data.enrolmentStatus!=='Cancelled'))add(entry,'Active enrolment',entry.data.batch||'Batch not recorded');
 for(const entry of entries){
  const data=entry.data;if(data.status!=='Approved'&&!data.admissionNumber)continue;
  let statement;try{statement=feeStatement(entry,today);}catch{continue;}if(!statement.reliable)continue;
  const period=statement.rows.find(row=>row.month===month);
  const receipts=Object.values(data.feeReceipts||{}).filter(receipt=>receipt?.date?.slice(0,7)===month&&Number.isSafeInteger(receipt.amount));
  if(kind==='payments'||kind==='receipts')for(const receipt of receipts)add(entry,'Receipt '+String(receipt.number||'—')+' · '+String(receipt.date),String(receipt.amount));
  if(!period)continue;
  if(kind==='feeReceived'&&period.paid>0)add(entry,period.label,String(period.paid));
  if(kind==='feeDue'&&!period.upcoming&&period.balance>0)add(entry,period.label,String(period.balance));
  if(kind==='paid'&&period.balance===0)add(entry,period.label,String(period.paid));
  if(kind==='partial'&&period.paid>0&&period.balance>0)add(entry,period.label,String(period.balance));
  if(kind==='unpaid'&&period.paid===0&&period.balance>0)add(entry,period.upcoming?'Upcoming '+period.label:period.label,String(period.balance));
 }
 if(kind==='attendance'||kind==='attendanceRate'||kind==='followup')for(const entry of entries){
  const value=entry.data.monthlyAttendance?.[month];if(!value)continue;
  try{attendanceValue(month,{days:value.days,totalDays:value.totalDays,note:typeof value.note==='string'?value.note:''},today);}catch{continue;}
  const percent=Number.isInteger(value.totalDays)&&value.totalDays>0?Math.round(value.days/value.totalDays*100):null;
  if(kind==='followup'&&(percent===null||percent>=75))continue;
  if(kind==='attendanceRate'&&percent===null)continue;
  add(entry,value.days+' days attended',percent===null?'Class-day total not recorded':value.totalDays+' classes · '+percent+'%');
 }
 return {kind,month,rows};
}
