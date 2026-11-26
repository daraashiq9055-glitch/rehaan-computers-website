// Appended to the original admin module by the local preview launcher only.
// Original UI entry points plus isolated, transaction-guarded preview services.
export const previewAdminBridge = Object.freeze({
  portalRows(){return verifiedAdminUid?structuredClone(portalStudentRows):[];},
  async portalProgram(id,program){
    requireAdmin();const actor=verifiedAdminUid,entry=adminState.apps.find(row=>row.id===id),uid=entry?.data.studentPortalAccount?.uid;
    if(!uid)throw Error('Create portal access first.');
    const sdk=await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js');requireAdmin();if(actor!==verifiedAdminUid)throw Error('Session changed.');
    await sdk.setDoc(doc(db,'studentPortalViews',uid,'learning','current'),{program,updatedAt:sdk.serverTimestamp()});
  },
  portalAction(id,action){requireAdmin();openAdminDetails(id);const selectors={access:'.admin-portal-toggle,.admin-portal-create',updates:'.admin-student-updates',messages:'.admin-student-messages',learning:'.admin-student-learning'};setTimeout(()=>document.querySelector(selectors[action]||'.admin-student-updates')?.scrollIntoView({block:'center',behavior:'smooth'}),80);},
  refresh() {return loadApplications();},
  identity() {return verifiedAdminUid?{uid:verifiedAdminUid,email:auth.currentUser?.email||''}:null;},
  async idToken() {requireAdmin();return 'local-preview-only';},
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
  statement(id) {requireAdmin();return openStudentStatement(id);},
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
  async growthList(kind) {
    requireAdmin();const uid=verifiedAdminUid,names={prospect:'growthProspects',income:'growthIncome',league:'growthLeagues'};if(!names[kind])throw Error('Unknown workspace record type.');
    const snapshot=await getDocs(collection(db,names[kind]));requireAdmin();if(uid!==verifiedAdminUid)throw Error('Your session changed.');const rows=[];snapshot.forEach(item=>rows.push({id:item.id,data:item.data()}));return rows;
  },
  async growthSave(kind,id,input,expected) {
    requireAdmin();const uid=verifiedAdminUid,names={prospect:'growthProspects',income:'growthIncome',league:'growthLeagues'};if(!names[kind]||!/^[A-Za-z0-9-]{8,80}$/.test(id))throw Error('Invalid workspace entry.');
    const {saveGrowthRecord}=await import('/previews/admin-premium/growth-store.js');return saveGrowthRecord({db,ref:doc(db,names[kind],id),runTransaction,assertSession:()=>{requireAdmin();if(uid!==verifiedAdminUid)throw Error('Your session changed.');},actor:uid,kind,input,expected});
  },
  async feePinStatus() {requireAdmin();const uid=verifiedAdminUid,snap=await getDoc(doc(db,'instituteSettings','feeApprovalPin'));requireAdmin();if(uid!==verifiedAdminUid)throw Error('Your session changed.');return snap.exists();},
  async setFeePin(pin,current='') {
    requireAdmin();const uid=verifiedAdminUid;if(!/^\d{4,8}$/.test(pin))throw Error('Choose a 4–8 digit approval PIN.');const ref=doc(db,'instituteSettings','feeApprovalPin'),encode=async(value,salt)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
    return runTransaction(db,async tx=>{const snap=await tx.get(ref);requireAdmin();if(uid!==verifiedAdminUid)throw Error('Your session changed.');if(snap.exists()){const old=snap.data();if(!/^\d{4,8}$/.test(current)||await encode(current,old.salt)!==old.hash)throw Error('Current approval PIN is incorrect.');}const salt=crypto.randomUUID(),saved={salt,hash:await encode(pin,salt),updatedAt:new Date().toISOString(),updatedBy:uid};tx.set(ref,saved);return true;});
  },
  async concession(id,input,expectedPaid) {
    requireAdmin();const uid=verifiedAdminUid,entry=adminState.apps.find(row=>row.id===id);if(!entry)throw Error('Student record was not found.');const control=await getDoc(doc(db,'instituteSettings','feeApprovalPin'));requireAdmin();if(uid!==verifiedAdminUid)throw Error('Your session changed.');if(!control.exists())throw Error('Set the fee approval PIN first.');const pin=String(input.pin||''),stored=control.data(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stored.salt+':'+pin)))).map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==stored.hash)throw Error('Approval PIN is incorrect.');
    const {saveConcession}=await import('/previews/admin-premium/growth-store.js');const saved=await saveConcession({db,ref:doc(db,'applications',id),runTransaction,assertSession:()=>{requireAdmin();if(uid!==verifiedAdminUid)throw Error('Your session changed.');},actor:uid,id,input,expectedPaid});await loadApplications();return saved;
  },
  admitProspect(id,data) {requireAdmin();openAddStudentModal({prospectId:id,name:data.name,phone:data.phone,course:data.course,note:'Converted from provisional registry. '+(data.notes||'')});},
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
