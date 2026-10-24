import {indiaDay, paymentDetails, saveDetailedPayment} from './payment-service.js';
import {receiptPNG} from '/public/admin-receipt-image.js?v=20261018-login-fix-1';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=amount=>'₹'+Number(amount).toLocaleString('en-IN',{maximumFractionDigits:2});
export function createPaymentUI(services) {
 return async function recordPayment(id,data) {
  services.requireAdmin();
  const upcoming=services.tuitionPeriod(data),overdue=services.overdueMonthlyTuition(data);
  const bill=overdue?{key:overdue.key,paid:999-overdue.balance}:upcoming;
  if(!bill){alert('Set a valid admission date before recording monthly fees.');return;}
  const existing=Math.max(0,Number(bill.paid)||0), remaining=Math.max(0,999-existing),uid=services.uid(),receiptId=crypto.randomUUID().replaceAll('-','');
  const modal=services.createModal('rcTuitionModal',`<div class="admin-modal-card rc-payment-modal payment-modern"><button type="button" class="admin-modal-close" aria-label="Close">×</button><p class="rc-pay-eyebrow">REHAAN COMPUTERS · MONTHLY TUITION</p><h3>A clear record of every payment.</h3><div class="payment-student"><span>${e(String(data.fullName||'?').split(/\s+/).slice(0,2).map(word=>word[0]).join(''))}</span><div><strong>${e(data.fullName||'Student')}</strong><small>ADM ${e(data.admissionNumber)} · ${e(data.coursePreference||data.course||'')}</small></div></div><div class="rc-pay-stats"><div><span>Monthly fee</span><strong>₹999</strong></div><div><span>Already received</span><strong>${money(existing)}</strong></div><div><span>Outstanding</span><strong>${money(remaining)}</strong></div></div><form id="rcPaymentForm" class="rc-payment-form"><div class="payment-input-grid"><label class="payment-amount-label">Receiving now (₹)<input id="rcPaymentAmount" type="number" min="0.01" max="${remaining}" step="0.01" value="${remaining}" required></label><label>Payment method<select id="rcPaymentMethod" required><option value="">Choose method</option><option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Manually recorded</option></select></label><label>Received date<input id="rcPaymentDate" type="date" value="${indiaDay()}" max="${indiaDay()}" required></label><label>Reference (optional)<input id="rcPaymentReference" maxlength="60" placeholder="UPI / bank reference or cash note"></label><label class="payment-note-label">Receipt note (optional)<input id="rcPaymentNote" maxlength="90" placeholder="A short note to print on the receipt"></label></div><div class="payment-review"><span>PAYMENT REVIEW</span><div><small>Fee period</small><b>${e(bill.key)}</b></div><div><small>Receiving now</small><b id="paymentReviewAmount">${money(remaining)}</b></div><div><small>Method / received</small><b id="paymentReviewMethod">Choose method</b></div><div><small>Remaining after saving</small><b id="rcPaymentBalance">₹0 remaining</b></div></div><button class="admin-save-btn" type="submit" ${remaining===0?'disabled':''}>Confirm & Record Payment</button><p class="admin-modal-msg" id="rcPaymentMessage" role="status" hidden></p></form><p class="rc-pay-help">This records money already received. ₹100 admission is separate. Saving does not charge a card, initiate UPI or verify a bank transfer.</p></div>`);
  const $=selector=>modal.querySelector(selector),form=$('#rcPaymentForm'),submit=form.querySelector('[type=submit]'),status=$('#rcPaymentMessage');
  const fields=[...form.querySelectorAll('input,select')];
  const update=()=>{const amount=Number($('#rcPaymentAmount').value)||0;$('#paymentReviewAmount').textContent=money(amount);$('#rcPaymentBalance').textContent=money(Math.max(0,remaining-amount))+' remaining';$('#paymentReviewMethod').textContent=[$('#rcPaymentMethod').value||'Choose method',$('#rcPaymentDate').value].join(' · ');};
  fields.forEach(input=>input.addEventListener('input',update));update();
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(form.dataset.saved==='true'||form.dataset.pending==='true')return;
    const value=$('#rcPaymentAmount').value,amount=Number(value);
    let input={method:$('#rcPaymentMethod').value,date:$('#rcPaymentDate').value,reference:$('#rcPaymentReference').value,note:$('#rcPaymentNote').value};
    try {if(!Number.isFinite(amount)||amount<=0||amount>remaining||!/^\d+(?:\.\d{1,2})?$/.test(value))throw Error('Enter a payment between ₹0.01 and '+money(remaining)+'.');paymentDetails(input);}
    catch(error){status.hidden=false;status.className='admin-modal-msg err';status.textContent=error.message;return;}
    if(!confirm(`Record ${money(amount)} received from ${data.fullName||'student'}?\nFee due: ${bill.key}\nReceived: ${input.date} · ${input.method}\nRemaining: ${money(remaining-amount)}`))return;
    form.dataset.pending='true';submit.disabled=true;fields.forEach(input=>input.disabled=true);modal._canClose=false;modal.querySelector('.admin-modal-close').disabled=true;
    let receipt;
    try {
      receipt=await saveDetailedPayment(services.saveMonthlyPayment,{db:services.db,ref:services.doc(services.db,'applications',id),counterRef:services.doc(services.db,'receiptCounters','tuition'),runTransaction:services.runTransaction,
        assertSession:()=>{services.requireAdmin();if(services.uid()!==uid)throw Error('Your session changed. Sign in and refresh before recording payment.');},
        actor:uid,id,due:bill.key,amount,expectedPaid:existing,expectedAdmission:data.admissionNumber,expectedJoined:data.admissionDate||data.approvedAt||'',receiptId},input);
    }catch(error){status.hidden=false;status.className='admin-modal-msg err';status.textContent='Payment not confirmed: '+error.message+'. Keep this form open to retry, or refresh and check saved receipts.';form.dataset.pending='false';submit.disabled=false;fields.forEach(input=>input.disabled=false);modal._canClose=true;modal.querySelector('.admin-modal-close').disabled=false;return;}
    // A confirmed save must never become a second payment because refresh/printing failed.
    form.dataset.saved='true';form.dataset.pending='false';modal._canClose=true;modal.querySelector('.admin-modal-close').disabled=false;
    if(services.uid()!==uid||!modal.isConnected)return;
    status.hidden=false;status.className='admin-modal-msg ok';status.textContent=`Payment saved. Total received ${money(receipt.receivedAtIssue/100)}, remaining ${money(receipt.balanceAtIssue/100)}. ${receipt.method} · ${receipt.date}`;
    const actions=document.createElement('div');actions.className='payment-saved-actions';actions.innerHTML='<button type="button" class="admin-save-btn" id="rcOpenSavedReceipt">Print / WhatsApp receipt</button><button type="button" id="paymentDownloadImage">↓ Receipt image</button>';
    actions.querySelector('#rcOpenSavedReceipt').onclick=()=>{services.closeModal(modal);services.openReceipt(receipt);};
    actions.querySelector('#paymentDownloadImage').onclick=async()=>{const button=actions.querySelector('#paymentDownloadImage');button.disabled=true;try{const blob=await receiptPNG(receipt),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=receipt.number+'.png';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{status.textContent+=' Image unavailable; open the saved receipt to print.';}finally{button.disabled=false;}};
    form.append(actions);
    try{await services.refresh();}catch{status.textContent+=' Saved successfully; refresh the register before recording another payment.';}
  });
 };
}
