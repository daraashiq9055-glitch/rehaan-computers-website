// Appended to the original admin module by the local preview launcher only.
// Original UI entry points plus isolated, transaction-guarded preview services.
export const previewAdminBridge = Object.freeze({
  refresh() {return loadApplications();},
  identity() {return verifiedAdminUid?{uid:verifiedAdminUid,email:auth.currentUser?.email||''}:null;},
  topics(id) {const data=adminState.apps.find(entry=>entry.id===id)?.data;const course=courses.find(item=>item.title===(data?.coursePreference||data?.course));return structuredClone(course?.learn?.length?course.learn:['Computer fundamentals','Practical coursework','Course assessment']);},
  async lifecycle(id,input) {requireAdmin();const uid=verifiedAdminUid;const result=await saveLifecycle({...input,db,ref:doc(db,'applications',id),runTransaction,actor:uid,assertSession:()=>{requireAdmin();if(verifiedAdminUid!==uid)throw Error('Your session changed.');}});await loadApplications();return result;},
  async progress(id,input) {requireAdmin();const uid=verifiedAdminUid;const result=await saveProgress({...input,db,ref:doc(db,'applications',id),runTransaction,actor:uid,assertSession:()=>{requireAdmin();if(verifiedAdminUid!==uid)throw Error('Your session changed.');}});await loadApplications();return result;},
  snapshot() {
    return {ready: Boolean(verifiedAdminUid && recordsLoaded), records: verifiedAdminUid && recordsLoaded ? structuredClone(adminState.apps) : []};
  },
  fees(id) {
    if (!verifiedAdminUid || !recordsLoaded) return null;
    const data = adminState.apps.find(entry => entry.id === id)?.data;
    return data ? {current: tuitionPeriod(data), overdue: overdueMonthlyTuition(data), reminder: actionableFeeReminder(data)} : null;
  },
  photo(image, id) {
    requireAdmin();const entry=adminState.apps.find(item=>item.id===id);
    if(entry && isSafePhoto(entry.data.photo)) displayAdminPhoto(image,entry.data.photo);
  },
  details(id, edit = false) {
    requireAdmin();openAdminDetails(id);
    if (edit) document.querySelector('#adminDetailsModal .admin-toggle-edit')?.click();
  },
  payment(id) {
    requireAdmin();const entry = adminState.apps.find(item => item.id === id);
    if (entry) recordMonthlyTuition(id, entry.data);
  },
  marks(id) {
    requireAdmin();selectSection('marks');
    const input = document.getElementById('rcMarkStudent');
    if (input) {input.value = id;input.dispatchEvent(new Event('change', {bubbles: true}));}
  },
  receipt(id, receiptId) {
    requireAdmin();const receipt = adminState.apps.find(item => item.id === id)?.data.feeReceipts?.[receiptId];
    if (receipt) openReceipt(structuredClone(receipt));
  },
  feeStudent(id) {
    requireAdmin();selectSection('fees');const entry=adminState.apps.find(row=>row.id===id);if(!entry)return;
    const list=document.getElementById('applicationsList');renderFeeManagement(list,[entry]);receiptTools(list,adminState.apps);
    const note=document.createElement('p');note.className='ops-footnote';note.textContent='Showing only '+(entry.data.fullName||'this student')+'. Changing filters or refreshing returns to the full register.';list.prepend(note);
  },
  feeQueue(filter = 'all') {
    requireAdmin();selectSection('fees');adminState.feeFilter = filter;renderAdminList();
  },
  backup() {requireAdmin();selectSection('reports');document.getElementById('reportJson')?.click();}
});

// The preview uses the same original transaction function with a richer form.
import {createPaymentUI} from '/previews/admin-premium/payment-ui.js';
recordMonthlyTuition = createPaymentUI({
  tuitionPeriod,overdueMonthlyTuition,requireAdmin,createModal:adminCreateModal,
  closeModal:closeAdminModal,uid:()=>verifiedAdminUid,saveMonthlyPayment,
  db,doc,runTransaction,refresh:loadApplications,openReceipt
});

import {saveLifecycle,saveProgress} from '/previews/admin-premium/journey-service.js';
