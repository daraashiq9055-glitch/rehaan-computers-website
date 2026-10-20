import {indiaDay,validDay} from './payment-service.js';
export function dayOf(value) {
  if(typeof value==='string'&&validDay(value))return value;
  if(value&&typeof value==='object'&&Number.isFinite(value.seconds))value=value.seconds*1000;
  if(value===null||value===undefined||value==='')return null;
  const date=new Date(value);return Number.isFinite(date.getTime())?indiaDay(date):null;
}
export function methodGroup(value) {
  const method=String(value||'').trim().toLowerCase();
  if(method==='cash')return 'Cash';
  if(method==='upi')return 'UPI';
  if(['bank','bank transfer','bank_transfer'].includes(method))return 'Bank transfer';
  if(['online','razorpay','card'].includes(method))return 'Online / other';
  return 'Unspecified';
}
function rupeeCents(value) {
  if((typeof value!=='number'&&typeof value!=='string')||value==='')return null;
  const n=Number(value),c=Math.round(n*100);return Number.isFinite(n)&&n>=0&&Number.isSafeInteger(c)&&Math.abs(n*100-c)<.00001?c:null;
}
export function accounts(entries) {
  const rows=[],warnings=[],legacy=[],receiptIds=new Map();
  for(const entry of entries)for(const r of Object.values(entry.data.feeReceipts||{}))if(r&&r.id&&r.studentId===entry.id)receiptIds.set(r.id,(receiptIds.get(r.id)||0)+1);
  for(const {id,data:d} of entries) {
    if(d.payment?.status==='paid') {
      const amount=rupeeCents(d.payment.amount),explicit=d.payment.receivedDate;
      const choices=explicit?[['Received date',explicit]]:[['Saved payment date',d.payment.paidAt||d.payment.verifiedAt||d.payment.updatedAt],['Record-created date fallback',d.createdAt]];
      const dated=choices.map(([basis,value])=>({basis,date:dayOf(value)})).find(item=>item.date);
      if(amount!==null&&amount>0&&dated)rows.push({key:id+':admission',studentId:id,name:String(d.fullName||'Student'),admission:d.admissionNumber||'',kind:'Admission',amount,date:dated.date,dateBasis:dated.basis,method:methodGroup(d.payment.mode||d.payment.method||d.payment.provider),reference:String(d.payment.reference||d.payment.providerId||''),receiptId:'',corrected:false});
      else warnings.push({id,message:'Paid admission entry needs a valid amount and saved date.'});
    }
    const receipted=new Map();
    for(const [key,r] of Object.entries(d.feeReceipts||{})) {
      if(!r||r.studentId!==id||r.id!==key||!/^[a-f0-9]{32}$/.test(r.id)||!Number.isSafeInteger(r.amount)||r.amount<=0||!validDay(r.due)||!validDay(r.date)||receiptIds.get(r.id)!==1){warnings.push({id,message:'A saved receipt needs review before it can be included.'});continue;}
      receipted.set(r.due,(receipted.get(r.due)||0)+r.amount);
      rows.push({key:id+':'+r.id,studentId:id,name:String(d.fullName||r.student?.name||'Student'),admission:d.admissionNumber||r.student?.admission||'',kind:'Tuition',amount:r.amount,date:r.date,dateBasis:'Receipt received date',method:methodGroup(r.method),reference:r.note||'',receiptId:r.id,receiptNumber:r.number||r.id,corrected:Boolean(r.amendments?.length)});
    }
    for(const [due,value] of Object.entries(d.monthlyFees||{})) {
      const amount=rupeeCents(value);
      if(amount===null){warnings.push({id,message:'A monthly ledger value needs review.'});continue;}
      const difference=amount-(receipted.get(due)||0);
      if(difference>0)legacy.push({studentId:id,name:String(d.fullName||'Student'),due,amount:difference});
      if(difference<0)warnings.push({id,message:'Saved receipts exceed the monthly ledger for '+due+'.'});
    }
  }
  rows.sort((a,b)=>b.date.localeCompare(a.date)||a.name.localeCompare(b.name));
  return {rows,warnings,legacy};
}
export function accountView(report,{from,to,method='',kind=''}={}) {
  if(!validDay(from)||!validDay(to)||from>to)throw Error('Choose a valid date range. The start must be on or before the end.');
  const rows=report.rows.filter(row=>row.date>=from&&row.date<=to&&(!method||row.method===method)&&(!kind||row.kind===kind));
  const summary={total:0,Admission:0,Tuition:0,methods:{Cash:0,UPI:0,'Bank transfer':0,'Online / other':0,Unspecified:0}};
  for(const row of rows){summary.total+=row.amount;summary[row.kind]+=row.amount;summary.methods[row.method]+=row.amount;if(!Number.isSafeInteger(summary.total))throw Error('Recorded totals exceed the supported monetary range. Review the entries.');}
  return {rows,summary};
}
