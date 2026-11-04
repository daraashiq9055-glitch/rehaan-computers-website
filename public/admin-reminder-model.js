import {customMessage} from './admin-settings-state.js?v=20261102-settings-1';
import {renderSettingsTemplate} from './admin-settings-model.js?v=20261102-settings-1';
import {feeStatement} from './admin-fee-statement-model.js?v=20261102-settings-1';
import {money} from './admin-feature-model.js?v=20261102-settings-1';
export function reminder(entry,asOf){
 const statement=feeStatement(entry,asOf);
 const rows=statement.rows.filter(r=>!r.upcoming&&r.balance>0);
 const total=rows.reduce((sum,r)=>sum+r.balance,0);
 let message=['*REHAAN COMPUTERS*','*Monthly Fee Reminder*','','Hello '+statement.student.name+',','Please clear the following pending course fees:','',...rows.map(r=>'• *'+r.label+'*: '+money(r.balance)),'','*TOTAL TO PAY: '+money(total)+'*','','If you have already paid, please share your payment confirmation.','','*FEE PAYMENT*','Pay to: *6006433125*'].join('\n');
 const configured=customMessage('fee',{name:statement.student.name,month:rows.map(r=>r.label).join(', '),amount:money(total),admission:statement.student.admission,due:rows[0]?.key||'',status:'Due'});
 if(configured)message=renderSettingsTemplate(configured.template,configured.values)+'\n\n*PENDING MONTHS*\n'+rows.map(r=>'• *'+r.label+'*: '+money(r.balance)).join('\n')+'\n\n*TOTAL TO PAY: '+money(total)+'*\n\n*FEE PAYMENT*\nPay to: *6006433125*\nPlease share your payment confirmation after paying.';
 return {statement,rows,total,message,canShare:statement.reliable&&total>0};
}
