// Appended to the original admin module by the local preview launcher only.
// Original UI entry points plus isolated, transaction-guarded preview services.
export const previewAdminBridge = Object.freeze({
  refresh() {return loadApplications();},
  identity() {return verifiedAdminUid?{uid:verifiedAdminUid,email:auth.currentUser?.email||''}:null;},
  async androidRelease(){
    requireAdmin();const uid=verifiedAdminUid;let value=null;await runTransaction(db,async tx=>{const snapshot=await tx.get(doc(db,'rcLearnPublic','androidRelease'));value=snapshot.exists()?snapshot.data():null;});requireAdmin();if(uid!==verifiedAdminUid)throw Error('Your session changed.');return value;
  },
  async publishAndroidRelease(input){
    requireAdmin();const uid=verifiedAdminUid;
    const clean={versionCode:Number(input.versionCode),versionName:String(input.versionName||'').trim(),title:String(input.title||'').trim(),message:String(input.message||'').trim(),apkUrl:String(input.apkUrl||'').trim(),required:input.required===true||input.required==='on',publishedAt:new Date().toISOString()};
    if(!Number.isInteger(clean.versionCode)||clean.versionCode<1||clean.versionCode>1000000||clean.versionName.length<1||clean.versionName.length>30||clean.title.length<2||clean.title.length>100||clean.message.length<2||clean.message.length>500||!/^https:\/\//.test(clean.apkUrl)||clean.apkUrl.length>500)throw Error('Review the version and secure APK download link.');
    await runTransaction(db,async tx=>{requireAdmin();if(uid!==verifiedAdminUid)throw Error('Your session changed.');tx.set(doc(db,'rcLearnPublic','androidRelease'),clean);});return clean;
  },
  async mobileUpdates(){
    requireAdmin();const uid=verifiedAdminUid,snapshot=await getDocs(collection(db,'rcLearnUpdates'));requireAdmin();if(uid!==verifiedAdminUid)throw Error('Your session changed.');
    return snapshot.docs.map(item=>({id:item.id,...item.data()})).sort((a,b)=>String(b.createdAt||b.day||'').localeCompare(String(a.createdAt||a.day||'')));
  },
  async publishMobileUpdate(input){
    requireAdmin();const uid=verifiedAdminUid,kinds=['Class notes','Homework','Notice','Exam'];
    const clean={kind:String(input.kind||''),title:String(input.title||'').trim(),body:String(input.body||'').trim(),day:String(input.day||''),batch:String(input.batch||'').trim(),examDay:input.examDay?String(input.examDay):'',photo:String(input.photo||''),published:true,createdAt:new Date().toISOString(),createdBy:uid};
    if(!kinds.includes(clean.kind)||clean.title.length<2||clean.title.length>140||clean.body.length<2||clean.body.length>4000||!/^\d{4}-\d{2}-\d{2}$/.test(clean.day)||clean.batch.length>80||clean.photo.length>500000)throw Error('Review the update details and image size.');
    if(clean.kind==='Exam'&&clean.examDay&&!/^\d{4}-\d{2}-\d{2}$/.test(clean.examDay))throw Error('Choose a valid exam date.');
    const id=crypto.randomUUID();await runTransaction(db,async tx=>{requireAdmin();if(uid!==verifiedAdminUid)throw Error('Your session changed.');tx.set(doc(db,'rcLearnUpdates',id),clean);});return id;
  },
  async setMobileUpdatePublished(id,published){
    requireAdmin();const uid=verifiedAdminUid;if(!/^[a-f0-9-]{36}$/.test(id)||typeof published!=='boolean')throw Error('This update reference is invalid.');
    await runTransaction(db,async tx=>{requireAdmin();const ref=doc(db,'rcLearnUpdates',id),snap=await tx.get(ref);requireAdmin();if(uid!==verifiedAdminUid||!snap.exists())throw Error('Update no longer exists.');tx.update(ref,{published,updatedAt:new Date().toISOString(),updatedBy:uid});});
  },
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
