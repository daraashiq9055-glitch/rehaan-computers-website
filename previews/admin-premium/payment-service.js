// Extends the existing atomic receipt write with its existing method/date/note fields.
// No second metadata write and no replacement of the one-time admission payment.
export function indiaDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function validDay(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function paymentDetails(input, today=indiaDay()) {
  if(!['Cash','UPI','Bank transfer','Manually recorded'].includes(input.method))throw Error('Choose how the payment was received.');
  if(!validDay(input.date)||input.date>today)throw Error('Choose a valid received date that is not in the future.');
  const reference=String(input.reference||'').trim(), note=String(input.note||'').trim();
  if(reference.length>60||note.length>90)throw Error('Keep the reference within 60 characters and the note within 90 characters.');
  return {method:input.method,date:input.date,note:[reference?'Ref: '+reference:'',note].filter(Boolean).join(' · ')};
}
export async function saveDetailedPayment(saveMonthlyPayment, options, input) {
  const details=paymentDetails(input);
  const originalTransaction=options.runTransaction;
  return saveMonthlyPayment({...options,runTransaction:(db,callback)=>originalTransaction(db,transaction=>callback({
    get:ref=>transaction.get(ref),
    set:(ref,data)=>transaction.set(ref,data),
    update:(ref,patch)=>{
      // The original save function returns this same new receipt after staging it.
      const receipt=patch['feeReceipts.'+options.receiptId];
      if(receipt)Object.assign(receipt,details);
      transaction.update(ref,patch);
    }
  }))});
}
