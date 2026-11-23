// A narrow projection of an admin application for a future student-owned view.
// This module does not publish records or grant access to applications.
const text=value=>typeof value==='string'?value.trim():'';
const money=value=>Number.isFinite(Number(value))&&Number(value)>=0?Math.round(Number(value)*100)/100:0;
const dateKey=value=>/^\d{4}-\d{2}(-\d{2})?$/.test(value||'')?value:'';

export function studentViewFromApplication(data){
 if(!data||data.status!=='Approved'||!text(data.admissionNumber))throw Error('Only approved students with admission numbers can have a student view.');
 const feePeriods=Object.entries(data.monthlyFees||{}).filter(([due])=>/^\d{4}-\d{2}-\d{2}$/.test(due)).map(([due,settled])=>{
  const concession=data.feeConcessions?.[due],waived=money((Number(concession?.concession)||0)/100);
  return {due,received:Math.max(0,money(settled)-waived),concession:waived};
 }).sort((a,b)=>b.due.localeCompare(a.due));
 const deleted=new Set(Object.keys(data.feeReceiptDeletions||{}));
 const receipts=Object.entries(data.feeReceipts||{}).filter(([id])=>!deleted.has(id)).map(([id,receipt])=>({id,number:text(receipt.number),date:dateKey(receipt.date),due:dateKey(receipt.due),amount:money((Number(receipt.amount)||0)/100)})).sort((a,b)=>b.date.localeCompare(a.date));
 const attendance=Object.entries(data.monthlyAttendance||{}).filter(([month])=>/^\d{4}-\d{2}$/.test(month)).map(([month,value])=>({month,attended:Number(value.days)||0,classes:Number(value.totalDays)||0,note:text(value.note)})).sort((a,b)=>b.month.localeCompare(a.month));
 const course=text(data.coursePreference||data.course),byCourse=data.learningProgress?.byCourse||{},saved=byCourse[encodeURIComponent(course)]||{};
 const topics=Array.isArray(saved.topics)?saved.topics.filter(item=>item&&typeof item.title==='string').map(item=>({title:text(item.title),done:item.done===true})):[];
 return {
  profile:{name:text(data.fullName),admissionNumber:text(data.admissionNumber),dob:dateKey(data.dob),guardian:text(data.parentName),studentPhone:text(data.phone),guardianPhone:text(data.guardianPhone),course,batch:text(data.batch),joined:dateKey(data.admissionDate||data.approvedAt),status:text(data.studentLifecycle?.stage||'Active')},
  fees:{admissionStatus:text(data.payment?.status),admissionAmount:money(data.payment?.amount),periods:feePeriods,receipts},
  attendance,
  journey:{course,topics}
 };
}
