import {customMessage} from './admin-settings-state.js?v=20261102-settings-1';
import {renderSettingsTemplate} from './admin-settings-model.js?v=20261102-settings-1';
import {feeStatement} from './admin-fee-statement-model.js?v=20261102-settings-1';
import {monthLabel,money} from './admin-feature-model.js?v=20261102-settings-1';
export function reminderAvailable(data,asOf){
 return data?.status==='Approved'&&Boolean(data.admissionNumber)&&data.enrolmentStatus!=='Cancelled'&&/^\d{4}-\d{2}-\d{2}$/.test(asOf)&&Number(asOf.slice(8,10))>=25;
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
 const lines=['*REHAAN COMPUTERS*','*MONTHLY FEE REMINDER*','','Dear '+statement.student.name+',','Admission No.: '+statement.student.admission,'','*CURRENT MONTH: '+label+'*'];
 if(current)lines.push(current.balance>0?'Remaining fee: *'+money(current.balance)+'* (recorded due date: '+current.key+')':'Fee already paid. Thank you!');
 else lines.push('Kindly submit this month’s course fee by month-end, if it has not already been paid.');
 if(previous.length)lines.push('','*PREVIOUS MONTHS — PENDING FEES*',...previous.map(r=>'• '+r.label+': *'+money(r.balance)+'* ('+r.status+', '+r.key+')'));
 if(reliable&&rows.length)lines.push('','*TOTAL REMAINING: '+money(total)+'*','Due as of '+statement.asOf+': '+money(overdue)+'. Upcoming fees are included as an advance reminder, not overdue.','Kindly submit the current month’s fee by month-end if unpaid, and clear any previous pending fees.');
 if(reliable&&!rows.length&&current)lines.push('','No pending balance through '+label+'.');
 if(!reliable)lines.push('','Please contact the accounts team to confirm your fee balance.');
 lines.push('','If you have already paid, kindly disregard the relevant reminder.','*Accounts Department*','Rehaan Computers');
 if(total>0)lines.push('','*FEE PAYMENT*','Pay to: *6006433125*','Please share your payment confirmation after paying.');
 const configured=reliable&&previous.length&&current?.balance===0?customMessage('fee',{name:statement.student.name,month:previous.map(r=>r.label).join(', '),amount:money(total),admission:statement.student.admission,due:previous[0].key,status:'Pending'}):null;
 const message=(configured?renderSettingsTemplate(configured.template,configured.values)+'\n\n':'')+lines.join('\n');
 const canShare=reminderAvailable(entry.data,statement.asOf);
 return {statement:{...statement,reliable},rows,total,overdue,message,canShare,canImage:canShare&&reliable&&total>0};
}
