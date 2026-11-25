import {customMessage} from './admin-settings-state.js?v=20261102-settings-1';
import {renderSettingsTemplate} from './admin-settings-model.js?v=20261102-settings-1';
import {feeStatement} from './admin-fee-statement-model.js?v=20261102-settings-1';
import {monthLabel,money} from './admin-feature-model.js?v=20261102-settings-1';
export function reminderAvailable(data,asOf){
 return data?.status==='Approved'&&Boolean(data.admissionNumber)&&data.enrolmentStatus!=='Cancelled'&&/^\d{4}-\d{2}-\d{2}$/.test(asOf)&&Number(asOf.slice(8,10))>=25;
}
export function reminder(entry,asOf){
 const statement=feeStatement(entry,asOf);
 const rows=statement.rows.filter(r=>!r.upcoming&&r.balance>0);
 const total=rows.reduce((sum,r)=>sum+r.balance,0);
 let message=['*REHAAN COMPUTERS*','*Monthly Fee Reminder*','','Hello '+statement.student.name+',','Please clear the following pending course fees:','',...rows.map(r=>'• *'+r.label+'*: '+money(r.balance)),'','*TOTAL TO PAY: '+money(total)+'*','','If you have already paid, please share your payment confirmation.','','*FEE PAYMENT*','Pay to: *6006433125*'].join('\n');
 const configured=statement.reliable&&total>0?customMessage('fee',{name:statement.student.name,month:rows.map(r=>r.label).join(', '),amount:money(total),admission:statement.student.admission,due:rows[0]?.key||'',status:'Due'}):null;
 if(configured)message=renderSettingsTemplate(configured.template,configured.values)+'\n\n*PENDING MONTHS*\n'+rows.map(r=>'• *'+r.label+'*: '+money(r.balance)).join('\n')+'\n\n*TOTAL TO PAY: '+money(total)+'*\n\n*FEE PAYMENT*\nPay to: *6006433125*\nPlease share your payment confirmation after paying.';
 const month=monthLabel(statement.asOf.slice(0,7));
 if(!statement.reliable||total===0)message=['*REHAAN COMPUTERS*','*MONTHLY FEE REMINDER*','','Dear '+statement.student.name+',','This is a general fee reminder for '+month+'.','Kindly submit this month’s course fee by the end of the month, if it has not already been paid.','If you have already paid, please disregard this reminder.','','*Accounts Department*','Rehaan Computers'].join('\n');
 else message+='\n\nKindly also ensure that your '+month+' course fee is submitted by month-end, if not already paid.';
 const canShare=reminderAvailable(entry.data,statement.asOf);
 return {statement,rows,total,message,canShare,canImage:canShare&&statement.reliable&&total>0};
}
