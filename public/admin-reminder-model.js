import {feeStatement} from './admin-fee-statement-model.js?v=20261102-settings-1';
import {monthLabel,money} from './admin-feature-model.js?v=20261102-settings-1';
export function reminderAvailable(data,asOf){
 return data?.status==='Approved'&&Boolean(data.admissionNumber)&&data.enrolmentStatus!=='Cancelled';
}
export function reminder(entry,asOf){
 const statement=feeStatement(entry,asOf);
 const month=statement.asOf.slice(0,7),label=monthLabel(month);
 const [year,number]=month.split('-').map(Number);
 // Read-only projection includes the current learning month even before its billing anniversary.
 const nextMonth=new Date(Date.UTC(year,number,1)).toISOString().slice(0,10);
 const projection=statement.reliable?feeStatement(entry,nextMonth):statement;
 const reliable=statement.reliable&&projection.reliable;
 const periods=reliable?projection.rows.filter(r=>r.month<=month).map(r=>({...r,upcoming:r.key>statement.asOf,status:r.balance===0?'Paid':r.key<statement.asOf?'Overdue':r.key===statement.asOf?'Due today':'Upcoming'})):[];
 const current=periods.find(r=>r.month===month),previous=periods.filter(r=>r.month<month&&r.balance>0);
 const rows=periods.filter(r=>r.balance>0),total=rows.reduce((sum,r)=>sum+r.balance,0);
 const overdue=rows.filter(r=>!r.upcoming).reduce((sum,r)=>sum+r.balance,0);
 const lines=['*REHAAN COMPUTERS*','','🔔 *MONTHLY FEE REMINDER*','','Dear '+statement.student.name+',','','Admission No.: '+statement.student.admission,''];
 if(!reliable){
  lines.push('Kindly review your monthly fee status with Rehaan Computers. If already paid, please share your payment confirmation.');
 }else if(total>0){
  lines.push(previous.length?'Kindly clear your pending course fees.':'Kindly submit your monthly course fee.');
  if(current?.balance>0)lines.push('','*CURRENT MONTH*','• '+label+': '+money(current.balance));
  if(previous.length)lines.push('','*PREVIOUS DUES*',...previous.map(r=>'• '+r.label+': '+money(r.balance)));
  lines.push('','──────────────────','','*TOTAL TO PAY: '+money(total)+'*','','📌 *IMPORTANT NOTICE*','','Kindly ensure timely payment of your monthly fees to avoid pending balances.','','──────────────────','','*FEE PAYMENT*','','Pay to: *6006433125*','','If already paid, kindly share your payment confirmation.');
 }else if(current?.balance===0){
  lines.push('Your '+label+' fee is already paid. Thank you!','','No pending balance through '+label+'.');
 }else{
  lines.push('Kindly review your '+label+' monthly fee status with Rehaan Computers. If already paid, please share your payment confirmation.');
 }
 lines.push('','*Regards,*','','Rehaan Computers');
 const message=lines.join('\n');
 const canShare=reminderAvailable(entry.data,statement.asOf);
 return {statement:{...statement,reliable},rows,total,overdue,message,canShare,canImage:canShare&&reliable&&total>0};
}
