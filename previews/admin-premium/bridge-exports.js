// Appended to the original admin module by the local preview launcher only.
// Read-only snapshots and existing UI entry points; no new write implementation.
export const previewAdminBridge = Object.freeze({
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
