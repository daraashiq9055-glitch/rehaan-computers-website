// Read-only monthly ledger projection. Amounts use integer paise; no persistence.
import {indiaDate,monthLabel,money} from './admin-feature-model.js?v=20261021-admin-5';
import {whatsappURL} from './admin-receipt-image.js?v=20261021-admin-5';
const MONTHLY=99900;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
function cents(value){
    if(typeof value!=='number'&&!(typeof value==='string'&&/^\d+(?:\.\d{1,2})?$/.test(value)))return null;
    const number=Number(value),rounded=Math.round(number*100);
    return Number.isFinite(number)&&number>=0&&Number.isSafeInteger(rounded)&&Math.abs(number*100-rounded)<.00001?rounded:null;
}
function dueDate(year,month,day){return new Date(Date.UTC(year,month,Math.min(day,new Date(Date.UTC(year,month+1,0)).getUTCDate()))).toISOString().slice(0,10);}
function learningMonth(key){const [year,month]=key.split('-').map(Number);return new Date(Date.UTC(year,month-2,1)).toISOString().slice(0,7);}
export function feeStatement(entry,asOf=indiaDate()){
    if(!validDate(asOf))throw Error('The statement date is invalid.');
    const data=entry.data||{},warnings=[],unmatched=[],rows=[];
    let reliable=true;
    const issue=text=>{warnings.push(text);reliable=false;};
    const joined=String(data.admissionDate||data.approvedAt||'').slice(0,10);
    const eligible=data.status==='Approved'&&Boolean(data.admissionNumber)&&data.enrolmentStatus!=='Cancelled';
    if(!eligible)issue('Monthly billing needs review: this record is not an active approved admission.');
    if(!validDate(joined)||joined>asOf)issue('A valid admission date is needed before a complete balance can be calculated.');
    const ledger=data.monthlyFees??{};
    const isMap=ledger&&typeof ledger==='object'&&!Array.isArray(ledger);
    if(!isMap)issue('The stored monthly ledger needs review.');
    const keys=new Set();
    let year,month,day,stopped=false;
    if(eligible&&validDate(joined)&&joined<=asOf){
        [year,month,day]=joined.split('-').map(Number);
        for(let step=1;step<=240;step++){
            const key=dueDate(year,month-1+step,day);keys.add(key);
            if(key>=asOf){stopped=true;break;}
        }
        if(!stopped)issue('The history exceeds 240 billing periods. Review is required before sharing a total.');
    }
    for(const [key,value] of Object.entries(isMap?ledger:{})){
        const paid=cents(value),[ky,km]=String(key).split('-').map(Number),step=(ky-year)*12+(km-month);
        if(!eligible||!validDate(joined)||joined>asOf||!validDate(key)||!Number.isInteger(step)||step<1||step>240||dueDate(year,month-1+step,day)!==key||paid===null){
            unmatched.push({key,amount:paid,stored:String(typeof value==='object'?'Invalid amount':value)});issue('An unmatched or invalid ledger entry needs review: '+key+'.');continue;
        }
        keys.add(key);
    }
    const storedReceipts=data.feeReceipts??{};
    const receipts=storedReceipts&&typeof storedReceipts==='object'&&!Array.isArray(storedReceipts)?Object.values(storedReceipts):[];
    if(!storedReceipts||typeof storedReceipts!=='object'||Array.isArray(storedReceipts))issue('Saved receipt metadata needs review.');
    const validReceipts=[],seen=new Set();
    for(const receipt of receipts){
        if(!receipt||receipt.studentId!==entry.id||!/^[a-f0-9]{32}$/.test(receipt.id||'')||seen.has(receipt.id)||!validDate(receipt.due)||!validDate(receipt.date)||receipt.date>asOf||!Number.isSafeInteger(receipt.amount)||receipt.amount<=0){issue('A saved receipt needs review; it was not added to ledger totals.');continue;}
        seen.add(receipt.id);validReceipts.push(receipt);
        if(!keys.has(receipt.due))issue('A receipt has no matching monthly ledger period: '+receipt.due+'.');
    }
    for(const key of [...keys].sort()){
        const paid=cents(isMap&&Object.hasOwn(ledger,key)?ledger[key]:0);
        if(paid===null){issue('The amount for '+key+' needs review.');continue;}
        const balance=Math.max(0,MONTHLY-paid),credit=Math.max(0,paid-MONTHLY),matched=validReceipts.filter(r=>r.due===key),receipted=matched.reduce((total,r)=>total+r.amount,0);
        if(receipted>paid)issue('Receipt totals exceed the recorded monthly payment for '+key+'.');
        if(credit)warnings.push('Overpayment of '+money(credit)+' for '+key+' is shown separately and is not applied to other months.');
        rows.push({key,month:learningMonth(key),label:monthLabel(learningMonth(key)),billed:MONTHLY,paid,balance,credit,upcoming:key>asOf,status:balance===0?'Paid':key<asOf?'Overdue':key===asOf?'Due today':'Upcoming',receiptCount:matched.length,legacyPaid:Math.max(0,paid-receipted)});
    }
    const dueRows=rows.filter(row=>!row.upcoming),oldest=rows.find(row=>row.balance>0&&!row.upcoming)||null;
    const totals={billed:dueRows.reduce((s,r)=>s+r.billed,0),received:rows.reduce((s,r)=>s+r.paid,0),due:dueRows.reduce((s,r)=>s+r.balance,0),upcoming:rows.filter(r=>r.upcoming).reduce((s,r)=>s+r.balance,0),credit:rows.reduce((s,r)=>s+r.credit,0),legacy:rows.reduce((s,r)=>s+r.legacyPaid,0)};
    if(!Object.values(totals).every(Number.isSafeInteger))issue('Stored totals exceed the supported amount range.');
    return {lastReceiptDate:validReceipts.map(r=>r.date).sort().at(-1)||null,studentId:entry.id,student:{name:String(data.fullName||'Unnamed student'),admission:String(data.admissionNumber||'Not assigned'),course:String(data.coursePreference||data.course||'Not recorded'),phone:String(data.phone||'')},joined,asOf,rows,totals,oldest,warnings:[...new Set(warnings)],unmatched,reliable,admission:{status:String(data.payment?.status||'Not recorded'),amount:cents(data.payment?.amount)}};
}
export function statementWhatsApp(statement){
    if(!statement.reliable)return null;
    return whatsappURL(statement.student.phone,["*REHAAN COMPUTERS*","*MONTHLY FEE STATEMENT*","",'Student: '+statement.student.name,'Admission: '+statement.student.admission,'Statement date: '+statement.asOf,'','*TOTAL DUE: '+money(statement.totals.due)+'*',statement.oldest?'Oldest unpaid month: '+statement.oldest.label+' · '+money(statement.oldest.balance):'No unpaid fees are due as of this statement.',statement.totals.upcoming?'Upcoming fees (separate from total due): '+money(statement.totals.upcoming):'',...statement.rows.filter(row=>row.balance>0&&!row.upcoming).slice(0,12).map(row=>row.label+': '+money(row.balance)+' · due '+row.key),statement.rows.filter(row=>row.balance>0&&!row.upcoming).length>12?'More unpaid months are listed in the full statement.':'','','Based on recorded monthly payments. Admission fee is separate.','The full statement image shows every listed month.'].filter(line=>line!==null).join('\n'));
}
