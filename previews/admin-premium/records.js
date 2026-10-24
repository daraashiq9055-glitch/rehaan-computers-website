import {previewAdminBridge as app} from '/public/admin-app.js?v=20261018-login-fix-1';
import {csvCell, isSafePhoto} from '/public/admin-records.js';
import {validateCard, cardResult} from '/public/admin-feature-model.js?v=20261018-login-fix-1';
import {reviewRecords, filterRecords, sortRecords, savedActivity, courseOf} from './records-model.js';

function initRecords() {
const $ = selector => document.querySelector(selector);
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => Number.isFinite(Number(value)) && value !== null && value !== '' ? '₹' + Number(value).toLocaleString('en-IN', {maximumFractionDigits: 2}) : 'Needs review';
const date = value => value && Number.isFinite(new Date(value).getTime()) ? new Intl.DateTimeFormat('en-IN', {day:'numeric', month:'short', year:'numeric', timeZone:'Asia/Kolkata'}).format(new Date(value)) : 'Not recorded';
const defaults = () => ({query:'', course:'', batch:'', status:'', queue:'all', sort:'admission'});
let rows = [], filters = defaults(), saved = [], page = 1, active = false, profileId = '', profileTab = 'overview';
let renderQueued = false;
const size = 15;

const nav = document.createElement('button');nav.type = 'button';nav.disabled = true;nav.dataset.recordsCentre = '';
nav.innerHTML = '<i aria-hidden="true"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 5V3h8v2M7 11h10M7 15h6"/></svg></i>Records centre<span class="new-feature">NEW</span>';
$('.nav [data-section=overview]').after(nav);
const hub = document.createElement('section');hub.id = 'recordsCentre';hub.className = 'records-centre';hub.hidden = true;hub.setAttribute('aria-label','Student records centre');
$('#workspaceSummary').before(hub);
const profile = document.createElement('dialog');profile.id = 'studentProfile';profile.className = 'student-profile';profile.setAttribute('aria-labelledby', 'profileName');document.body.append(profile);

function refreshData() {
  const snapshot = app.snapshot();
  rows = snapshot.ready ? reviewRecords(snapshot.records) : [];
  return snapshot.ready;
}
function leaveHub() {
  active = false;hub.hidden = true;document.body.classList.remove('records-centre-open');nav.classList.remove('active');nav.removeAttribute('aria-current');
}
function enterHub() {
  if (!refreshData()) return;
  if (!active) $('.nav [data-section=overview]').click();
  active = true;hub.hidden = false;document.body.classList.add('records-centre-open');
  $('.nav .active')?.classList.remove('active');$('.nav [aria-current]')?.removeAttribute('aria-current');nav.classList.add('active');nav.setAttribute('aria-current','page');
  $('#workspaceHeading').textContent = 'Every student. Every detail.';$('#workspaceBreadcrumb').textContent = 'Records centre';
  document.body.classList.remove('nav-open');$('#menuToggle').setAttribute('aria-expanded','false');
  renderHub();
}
nav.addEventListener('click', enterHub);
document.addEventListener('click', event => {if(event.target.closest('[data-section], [data-summary]')) leaveHub();}, true);

function feeSummary() {
  return rows.reduce((result, row) => {
    const fees = app.fees(row.id);
    if (fees?.overdue) result.overdue++;
    if (fees?.reminder) result.reminders++;
    if (row.data.status === 'Approved' && !fees?.current) result.dates++;
    return result;
  }, {overdue:0, reminders:0, dates:0});
}
function fieldSelect(id, label, value, options) {
  return `<label>${label}<select id="${id}">${options.map(([key,name])=>`<option value="${e(key)}" ${key===value?'selected':''}>${e(name)}</option>`).join('')}</select></label>`;
}
function renderHub() {
  $('#workspaceHeading').textContent='Every student. Every detail.';$('#workspaceBreadcrumb').textContent='Records centre';
  document.querySelectorAll('.nav [data-section]').forEach(button=>{button.classList.remove('active');button.removeAttribute('aria-current');});
  nav.classList.add('active');nav.setAttribute('aria-current','page');
  const fees = feeSummary(), review = rows.filter(row=>row.review.essential.length).length;
  const duplicates = rows.filter(row=>row.review.possibleDuplicates.length).length;
  const photos = rows.filter(row=>!row.review.photoSaved).length;
  hub.innerHTML = `<div class="records-intro"><div><span class="records-kicker">YOUR STUDENT RECORDS, ORGANISED</span><h2>A clearer view of what needs you.</h2><p>Find records, review details and open the right action. Every existing student stays in the register.</p></div><button type="button" class="records-backup" id="recordsBackup">↓ Private backup</button></div>
  <div class="records-metrics"><button data-record-queue="all"><small>All records</small><strong>${rows.length}</strong><span>Online + offline</span></button><button data-record-queue="review"><small>Details to review</small><strong>${review}</strong><span>Names, contacts or admission details</span></button><button data-record-queue="duplicates"><small>Possible duplicates</small><strong>${duplicates}</strong><span>Review shared numbers carefully</span></button><button data-record-queue="photos"><small>Without a saved photo</small><strong>${photos}</strong><span>Optional · never blocks payment</span></button></div>
  <div class="records-workbench"><section class="records-directory"><div class="records-section-heading"><div><span class="records-kicker">THE COMPLETE REGISTER</span><h2>Find your student.</h2></div><button type="button" id="recordsExport">Export this view ↓</button></div>
  <div class="records-search-wrap"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><label class="sr-only" for="recordsSearch">Search student records</label><input id="recordsSearch" type="search" autocomplete="off" placeholder="Name, student or guardian phone, admission number…" value="${e(filters.query)}"><kbd>/</kbd></div>
  <div class="records-filters">${fieldSelect('recordsStatus','Status',filters.status,[['','All statuses'],['Approved','Enrolled'],['pending','Awaiting approval'],['Cancelled','Cancelled']])}${fieldSelect('recordsCourse','Course',filters.course,[['','All courses'],...[...new Set(rows.map(row=>courseOf(row.data)).filter(Boolean))].sort().map(x=>[x,x])])}${fieldSelect('recordsBatch','Batch',filters.batch,[['','All batches'],...[...new Set(rows.map(row=>row.data.batch).filter(Boolean))].sort().map(x=>[x,x])])}${fieldSelect('recordsSort','Sort',filters.sort,[['name','Name A–Z'],['admission','Admission number'],['review','Needs review first']])}</div>
  <div class="records-view-tools"><span id="recordsResultCount" role="status"></span><button type="button" id="recordsClear">Clear filters</button><button type="button" id="recordsSaveView">☆ Save view</button></div><div id="recordsSavedViews" class="records-saved-views"></div><div id="recordsRows" class="records-rows"></div><div class="records-pagination"><button type="button" id="recordsPrevious">← Previous</button><span id="recordsPage"></span><button type="button" id="recordsNext">Next →</button></div></section>
  <aside class="records-aside"><section class="records-followups"><span class="records-kicker">FEE FOLLOW-UPS</span><h2>The next useful action.</h2><p>Uses the current fee register and its existing billing rules.</p><button data-fee-queue="overdue"><span><b>${fees.overdue}</b> Students with overdue fees</span><i>↗</i></button><button data-fee-queue="reminders"><span><b>${fees.reminders}</b> Reminders ready to review</span><i>↗</i></button><button data-fee-queue="partial"><span>Review partial payments</span><i>↗</i></button><small>Reminder messages open only when you choose. Nothing is sent automatically.</small></section><section class="records-guidance"><span class="records-kicker">RECORD REVIEW</span><h3>Your decisions stay yours.</h3><p>Shared phone numbers can belong to families. Review matching records before deciding whether anything needs changing.</p><p>Missing photos and other optional details are suggestions. They do not change admission or fee status.</p><button type="button" id="recordsReviewOpen">Open review queue →</button></section><section class="records-saved-note"><span>PRIVATE BY DESIGN</span><p>Saved views last for this session. Your downloaded backup keeps the full stored fields and document IDs.</p></section></aside></div>`;
  $('#recordsSearch').addEventListener('input', event=>{filters.query=event.target.value;page=1;renderRows();});
  for (const [id, key] of [['recordsStatus','status'],['recordsCourse','course'],['recordsBatch','batch'],['recordsSort','sort']]) $('#'+id).onchange=event=>{filters[key]=event.target.value;page=1;renderRows();};
  hub.querySelectorAll('[data-record-queue]').forEach(button=>button.onclick=()=>{filters.queue=button.dataset.recordQueue;page=1;renderRows();});
  hub.querySelectorAll('[data-fee-queue]').forEach(button=>button.onclick=()=>{leaveHub();app.feeQueue(button.dataset.feeQueue);});
  $('#recordsReviewOpen').onclick=()=>{filters.queue='review';page=1;renderRows();$('#recordsRows').scrollIntoView({block:'start'});};
  $('#recordsClear').onclick=()=>{filters=defaults();page=1;renderHub();};
  $('#recordsBackup').onclick=()=>{leaveHub();app.backup();};
  $('#recordsExport').onclick=exportView;
  $('#recordsSaveView').onclick=openSaveView;
  $('#recordsPrevious').onclick=()=>{page--;renderRows();};$('#recordsNext').onclick=()=>{page++;renderRows();};
  renderRows();renderSaved();
}
function visibleRows(){return sortRecords(filterRecords(rows,filters),filters.sort);}
function renderRows() {
  const visible = visibleRows(), pages = Math.max(1,Math.ceil(visible.length/size));page=Math.min(pages,Math.max(1,page));
  $('#recordsResultCount').textContent=`${visible.length} of ${rows.length} records${filters.queue!=='all'?' · '+({review:'Details to review',photos:'No saved photo',duplicates:'Possible duplicates'}[filters.queue]):''}`;
  hub.querySelectorAll('[data-record-queue]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.recordQueue===filters.queue)));
  $('#recordsRows').innerHTML=visible.length?visible.slice((page-1)*size,page*size).map(row=>{
    const d=row.data, r=row.review, flags=r.essential.length+r.possibleDuplicates.length;
    const initials=String(d.fullName||'?').trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('');
    return `<article class="records-row"><span class="records-avatar" aria-hidden="true">${e(initials)}</span><div class="records-identity"><button type="button" data-open-profile="${e(row.id)}">${e(d.fullName||'Unnamed student')}</button><p>${e(d.admissionNumber?'ADM '+d.admissionNumber:'Admission not assigned')} · ${e(d.phone||'Phone not recorded')}</p><small>${e(courseOf(d)||'Course not recorded')} · ${e(d.batch||'Batch not assigned')}</small></div><div class="records-row-status"><span class="records-status ${d.status==='Approved'?'is-enrolled':''}">${e(d.status==='Approved'?'Enrolled':d.status||'Unspecified')}</span><small class="${flags?'records-review-flag':''}">${flags?flags+' review item'+(flags===1?'':'s'):r.photoSaved?'Photo reference saved':'Optional photo not added'}</small></div><button type="button" class="records-open" data-open-profile="${e(row.id)}" aria-label="Open profile for ${e(d.fullName||'unnamed student')}">View profile ↗</button></article>`;
  }).join(''):'<div class="records-empty"><strong>No records match this view.</strong><p>Try another name, course or review filter. Your records have not been removed.</p></div>';
  $('#recordsRows').querySelectorAll('[data-open-profile]').forEach(button=>button.onclick=()=>openProfile(button.dataset.openProfile));
  $('#recordsPage').textContent=`Page ${page} of ${pages}`;$('#recordsPrevious').disabled=page===1;$('#recordsNext').disabled=page===pages;
}
function download(text, name, type) {
  const url=URL.createObjectURL(new Blob([text],{type})), link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportView() {
  const fields=['Document ID','Student','Admission','Phone','Course','Batch','Status','Review items'];
  const lines=visibleRows().map(row=>[row.id,row.data.fullName,row.data.admissionNumber,row.data.phone,courseOf(row.data),row.data.batch,row.data.status,[...row.review.essential,...row.review.possibleDuplicates.map(item=>item.label)].join('; ')]);
  download('\ufeff'+[fields,...lines].map(line=>line.map(csvCell).join(',')).join('\r\n'),'rehaan-record-view.csv','text/csv;charset=utf-8');
}
function openSaveView() {
  if(saved.length>=6){$('#recordsResultCount').textContent='You can keep up to six views in this session. Remove a saved view to add another.';return;}
  const dialog=document.createElement('dialog');dialog.className='records-save-dialog';dialog.setAttribute('aria-labelledby','saveViewTitle');
  dialog.innerHTML='<form id="recordsSaveForm"><h2 id="saveViewTitle">Keep this view within reach.</h2><p>Save the current search and filters for this session.</p><label>View name<input name="viewName" maxlength="40" required placeholder="e.g. Morning diploma students"></label><div><button type="button" id="recordsSaveCancel">Cancel</button><button type="submit" class="primary">Save view</button></div></form>';
  document.body.append(dialog);$('#recordsSaveCancel').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();
  $('#recordsSaveForm').onsubmit=event=>{event.preventDefault();const name=new FormData(event.target).get('viewName').trim();if(!name)return;saved.push({name,filters:structuredClone(filters)});dialog.close();renderSaved();};dialog.showModal();dialog.querySelector('input').focus();
}
function renderSaved() {
  const host=$('#recordsSavedViews');host.replaceChildren();
  for(const [index, view] of saved.entries()) {
    const group=document.createElement('span'), open=document.createElement('button'), remove=document.createElement('button');group.className='records-saved-chip';
    open.type=remove.type='button';open.textContent=view.name;open.onclick=()=>{filters=structuredClone(view.filters);page=1;renderHub();};
    remove.textContent='×';remove.setAttribute('aria-label','Remove saved view '+view.name);remove.onclick=()=>{saved.splice(index,1);renderSaved();};group.append(open,remove);host.append(group);
  }
}
function field(label,value){return `<div><dt>${label}</dt><dd>${e(value||'Not recorded')}</dd></div>`;}
function openProfile(id, tab='overview') {
  if(!refreshData())return;const entry=rows.find(row=>row.id===id);if(!entry)return;
  profileId=id;profileTab=tab;renderProfile(entry);if(!profile.open)profile.showModal();
}
function renderProfile(entry) {
  const d=entry.data, fees=app.fees(entry.id), r=entry.review;
  profile.innerHTML=`<div class="profile-heading"><div><span class="records-kicker">STUDENT RECORD</span><h2 id="profileName">${e(d.fullName||'Unnamed student')}</h2><p>${e(d.admissionNumber?'ADM '+d.admissionNumber:'Admission not assigned')} · ${e(courseOf(d)||'Course not recorded')}</p></div><button type="button" class="profile-close" aria-label="Close student profile">×</button></div><div class="profile-tabs" role="tablist" aria-label="Student record sections">${[['overview','Overview'],['fees','Fees & receipts'],['marks','Mark card'],['activity','Saved activity']].map(([key,label])=>`<button id="profile-tab-${key}" type="button" role="tab" data-profile-tab="${key}" aria-selected="${profileTab===key}" tabindex="${profileTab===key?0:-1}" aria-controls="profileContent">${label}</button>`).join('')}</div><section id="profileContent" class="profile-content" role="tabpanel" aria-labelledby="profile-tab-${profileTab}"></section><div class="profile-footer"><button type="button" id="profileExport">↓ Export private student record</button><span>Document ID: ${e(entry.id)}</span></div>`;
  profile.querySelector('.profile-close').onclick=()=>profile.close();
  profile.querySelectorAll('[data-profile-tab]').forEach(button=>{
    button.onclick=()=>{profileTab=button.dataset.profileTab;renderProfile(entry);profile.querySelector('[aria-selected=true]').focus();};
    button.onkeydown=event=>{const keys=['overview','fees','marks','activity'], index=keys.indexOf(profileTab), next=event.key==='ArrowRight'?(index+1)%4:event.key==='ArrowLeft'?(index+3)%4:event.key==='Home'?0:event.key==='End'?3:-1;if(next>=0){event.preventDefault();profileTab=keys[next];renderProfile(entry);profile.querySelector('[aria-selected=true]').focus();}};
  });
  $('#profileExport').onclick=()=>download(JSON.stringify({exportedAt:new Date().toISOString(),collection:'applications',records:[{id:entry.id,data:d}]},null,2),'rehaan-student-'+entry.id.replace(/[^a-zA-Z0-9_-]/g,'_')+'.json','application/json');
  const content=$('#profileContent');
  if(profileTab==='overview') {
    content.innerHTML=`<div class="profile-overview"><section><div class="profile-identity"><span class="profile-avatar">${isSafePhoto(d.photo)?'<img id="profileStudentPhoto" alt="Student photograph">':e(String(d.fullName||'?').split(/\s+/).slice(0,2).map(x=>x[0]).join(''))}</span><div><span class="records-status ${d.status==='Approved'?'is-enrolled':''}">${e(d.status==='Approved'?'Enrolled':d.status||'Unspecified')}</span><p>${r.photoSaved?'Photo reference saved · open original details to view':'No saved photo · optional'}</p></div></div><h3>Personal & admission details</h3><dl class="profile-fields">${field('Student phone',d.phone)}${field('Guardian phone',d.guardianPhone)}${field('Parent / guardian',d.parentName)}${field('Email',d.email)}${field('Date of birth',d.dob)}${field('Gender',({'male':'Male','female':'Female','other':'Other','prefer_not_to_say':'Prefer not to say'})[d.gender]||'Not specified')}${field('Qualification',d.qualification)}${field('Batch',d.batch)}${field('Admission date',d.admissionDate||d.approvedAt?.slice(0,10))}${field('Roll number',d.rollNumber)}${field('Address',d.address)}${field('Source',d.source)}${field('Private admin note',d.adminNote)}${field('Application message',d.message)}</dl><div class="profile-action-row"><button type="button" class="primary" id="profileEdit">Edit student details ↗</button><button type="button" id="profileOriginal">Open full original details</button></div></section><aside class="profile-review"><span class="records-kicker">RECORD REVIEW</span><h3>${r.essential.length?'A few details need review.':'Core details are recorded.'}</h3>${r.essential.length?'<ul>'+r.essential.map(item=>`<li>${e(item)}</li>`).join('')+'</ul>':'<p>Name, phone, course and applicable admission details have been checked for completeness.</p>'}${r.possibleDuplicates.length?'<h4>Possible matches</h4>'+r.possibleDuplicates.map(item=>`<div class="profile-match"><p>${e(item.label)}</p>${item.ids.map(id=>`<button type="button" data-profile-match="${e(id)}">Compare with ${e(rows.find(row=>row.id===id)?.data.fullName||'other record')} ↗</button>`).join('')}</div>`).join(''):''}<h4>Optional profile details</h4><p>${r.suggestions.length?e(r.suggestions.join(' · ')):'All suggested profile details are recorded.'}</p><small>These checks do not verify identity, photo access or payment authenticity. Nothing is changed automatically.</small></aside></div>`;
    if($('#profileStudentPhoto')) app.photo($('#profileStudentPhoto'),entry.id);
    $('#profileEdit').onclick=()=>{profile.close();app.details(entry.id,true);};$('#profileOriginal').onclick=()=>{profile.close();app.details(entry.id);};
    content.querySelectorAll('[data-profile-match]').forEach(button=>button.onclick=()=>openProfile(button.dataset.profileMatch));
  } else if(profileTab==='fees') {
    const due=fees?.overdue?.key||fees?.current?.key, balance=fees?.overdue?.balance??fees?.current?.remaining;
    const receipts=Object.values(d.feeReceipts||{}).filter(item=>item&&item.studentId===entry.id&&/^[a-f0-9]{32}$/.test(item.id||''));
    content.innerHTML=`<div class="profile-fee-summary"><div><small>Admission fee · separate</small><strong>${d.payment?.status==='paid'?money(d.payment.amount):e(d.payment?.status||'Not recorded')}</strong><span>${e(d.payment?.status||'Not recorded')}</span></div><div><small>First open monthly due</small><strong>${due?money(balance):'Date needed'}</strong><span>${due?e(due):'Review admission details'}</span></div><div><small>Saved receipts</small><strong>${receipts.length}</strong><span>Includes correction history</span></div></div><div class="profile-action-row"><button type="button" class="primary" id="profileRecordPayment" ${fees?.current&&balance>0?'':'disabled'}>Record monthly payment</button><button type="button" id="profileFeeStatement">Monthly fee statement</button><button type="button" id="profileFeeRegister">Open full fee register ↗</button></div><p class="profile-note">Monthly amounts use the current fee register. The due shown is one billing period, not the total lifetime balance. Payment actions use the existing confirmation form.</p><h3>Recorded monthly ledger</h3><div class="profile-ledger">${Object.entries(d.monthlyFees||{}).sort(([a],[b])=>b.localeCompare(a)).map(([key,amount])=>`<div><span>${e(key)}</span><strong>${money(amount)}</strong></div>`).join('')||'<p>No monthly payments recorded.</p>'}</div><h3>Receipts & corrections</h3><div class="profile-receipts">${receipts.map(item=>`<button type="button" data-profile-receipt="${e(item.id)}"><span><strong>${e(item.number)}</strong><small>${date(item.date)} · ${item.amendments?.length||0} correction(s)</small></span><b>${money(Number(item.amount)/100)} ↗</b></button>`).join('')||'<p>No saved receipts yet. Payments recorded before receipts were introduced remain in the monthly ledger.</p>'}</div>`;
    $('#profileRecordPayment').onclick=()=>{profile.close();leaveHub();app.feeQueue('all');app.payment(entry.id);};$('#profileFeeRegister').onclick=()=>{profile.close();leaveHub();app.feeQueue('all');};
    content.querySelector('#profileFeeStatement').onclick=()=>{profile.close();app.statement(entry.id);};
    content.querySelectorAll('[data-profile-receipt]').forEach(button=>button.onclick=()=>{profile.close();app.receipt(entry.id,button.dataset.profileReceipt);});
  } else if(profileTab==='marks') {
    let result;try{if(d.markCard)result=cardResult(validateCard(d.markCard));}catch{}
    content.innerHTML=`<div class="profile-marks-summary"><span class="records-kicker">ACADEMIC RECORD</span><h3>${e(d.markCard?.title||'A mark card, ready when you are.')}</h3><p>${result?result.complete?'Saved result: '+result.percentage+'% · '+result.grade+' · '+(result.passed?'Pass':'Not passed'):'This saved assessment has unmarked subjects.':d.markCard?'Saved marks need review in Mark Cards.':'Enter subjects and results in the existing Mark Cards workspace.'}</p>${result?'<div class="profile-ledger">'+d.markCard.subjects.map(subject=>`<div><span>${e(subject.name)}</span><strong>${subject.marks??'Unmarked'} / ${subject.max}</strong></div>`).join('')+'</div>':''}<button type="button" class="primary" id="profileMarks">Open this student’s mark card ↗</button></div>`;
    $('#profileMarks').onclick=()=>{profile.close();leaveHub();app.marks(entry.id);};
  } else {
    const events=savedActivity(entry);
    content.innerHTML=`<h3>What is recorded so far.</h3><p class="profile-note">Available saved events are shown below. Older edits may not have individual history entries.</p><ol class="profile-timeline">${events.map(item=>`<li><span>${date(item.date)}</span><strong>${e(item.title)}</strong><p>${e(item.detail)}</p></li>`).join('')||'<li>No dated activity is recorded.</li>'}</ol>`;
  }
}
profile.addEventListener('close',()=>{profileId='';profile.replaceChildren();});
profile.addEventListener('click',event=>{if(event.target===profile){const r=profile.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)profile.close();}});
function sync() {
  renderQueued=false;
  if($('#adminDashboard').style.display==='none'){
    leaveHub();rows=[];saved=[];filters=defaults();hub.replaceChildren();if(profile.open)profile.close();return;
  }
  const ready=refreshData();nav.disabled=!ready;
  if(!ready)return;
  for(const card of document.querySelectorAll('.application-card[data-application-id]')) {
    if(card.querySelector('[data-record-profile]'))continue;
    const button=document.createElement('button');button.type='button';button.dataset.recordProfile=card.dataset.applicationId;button.textContent='Student profile ↗';button.className='records-profile-button';
    button.onclick=()=>openProfile(card.dataset.applicationId);card.querySelector('.row-actions')?.prepend(button);
  }
  if(active)renderHub();
}
function scheduleSync(){if(!renderQueued){renderQueued=true;requestAnimationFrame(sync);}}
for(const id of ['workspaceSummary','applicationsList'])new MutationObserver(scheduleSync).observe($('#'+id),{childList:true});
new MutationObserver(scheduleSync).observe($('#adminDashboard'),{attributes:true,attributeFilter:['style']});
document.addEventListener('keydown',event=>{if(event.key==='/'&&active&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();$('#recordsSearch').focus();}});
// The command menu gets a link after its original UI has been created.
const findObserver=new MutationObserver(()=>{
  const host=$('#finderResults');if(host&&!host.querySelector('[data-open-records-centre]')){
    const button=document.createElement('button');button.type='button';button.dataset.openRecordsCentre='';button.textContent='Records centre';button.onclick=()=>{$('.workspace-finder').close();enterHub();};host.append(button);
  }
});
findObserver.observe($('.workspace-finder'),{childList:true,subtree:true});
scheduleSync();

}
if (document.querySelector('.workspace-finder')) initRecords();
else document.addEventListener('DOMContentLoaded', initRecords, {once: true});
