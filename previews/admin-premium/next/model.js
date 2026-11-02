import {feeStatement} from '/public/admin-fee-statement-model.js?v=20261102-settings-1';
import {money} from '/public/admin-feature-model.js?v=20261102-settings-1';
export function reminder(entry,asOf){
 const statement=feeStatement(entry,asOf);
 const rows=statement.rows.filter(r=>!r.upcoming&&r.balance>0);
 const total=rows.reduce((sum,r)=>sum+r.balance,0);
 const message=['*REHAAN COMPUTERS*','*Monthly Fee Reminder*','','Hello '+statement.student.name+',','Please clear the following pending course fees:','',...rows.map(r=>'• *'+r.label+'*: '+money(r.balance)),'','*TOTAL TO PAY: '+money(total)+'*','','If you have already paid, please share your payment confirmation.','','*FEE PAYMENT*','Pay to: *6006433125*'].join('\n');
 return {statement,rows,total,message,canShare:statement.reliable&&total>0};
}
