import {stages,dailyQuestions,practiceQuestions} from './student-quiz.js';
import {learningGroups,sampleUpdates,updateFilters} from './student-portal-data.js';

const $=selector=>document.querySelector(selector);
const form=$('#studentLoginForm'),status=$('#loginStatus'),onboarding=$('#demoOnboarding'),interior=$('#demoInterior'),publicPage=$('.portal-dashboard');
const storageKey='rehaan-student-demo-v2';
const today=new Date();
const dayOfWeek=today.getDay()||7;
const dateKey=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
const sample={name:'Aamir',admission:'RC-DEMO-001',rank:12,feeDue:499,feeMonth:today.toLocaleDateString('en-IN',{month:'long',year:'numeric'}),present:18,classes:20};
const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function readState(){try{const value=JSON.parse(localStorage.getItem(storageKey)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}}
let state=readState(),currentStage='',mainQuestions=[],practiceBank=[],practiceIndex=0,practiceAnswered=false,mainAnswered=false,homeMode='dashboard',activeTab='home',updateFilter='All';
let liveView=null,liveSession=false,stopLiveWatch=null,loginBusy=false;
function saveState(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{/* Preview still works without browser storage, but an attempt may not survive reload. */}}
function attempt(){const entry=state.attempts?.[dateKey];return entry?.stage===currentStage&&Array.isArray(entry.answers)?entry:null;}
function ensureAttempt(){if(!state.attempts||typeof state.attempts!=='object')state.attempts={};if(!attempt()){state.attempts[dateKey]={stage:currentStage,answers:[]};saveState();}return state.attempts[dateKey];}
function setActiveTab(name){document.querySelectorAll('[data-demo-tab]').forEach(button=>{const active=button.dataset.demoTab===name;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');});}
function refreshBell(){const read=Array.isArray(state.readUpdates)?state.readUpdates:[];$('#studentBell i').hidden=sampleUpdates.every(item=>read.includes(item.id));}
function showFollowStep(){
 $('#onboardingTitle').textContent='Follow Rehaan Computers';
 $('#onboardingDescription').textContent='Get class and exam updates before entering your student space.';
 $('#onboardingStep').innerHTML='<button class="gold-button" type="button" id="demoFollow">Follow and continue</button><p>This preview simulates following. Real notifications require browser permission on the published website.</p>';
 $('#demoFollow').addEventListener('click',()=>{state.followed=true;saveState();chooseStage();});
}
function enterSetup(){publicPage.hidden=true;document.body.classList.add('demo-active');interior.hidden=true;showFollowStep();onboarding.hidden=false;window.scrollTo(0,0);}
function chooseStage(){
 $('#onboardingTitle').textContent='What are you learning now?';
 $('#onboardingDescription').textContent='Select your current subject. Earlier subjects are included in your learning journey.';
 const savedAttempt=state.attempts?.[dateKey],lockedStage=Array.isArray(savedAttempt?.answers)&&savedAttempt.answers.length&&stages.includes(savedAttempt.stage)?savedAttempt.stage:'';
 $('#onboardingStep').innerHTML=`<div class="stage-list">${stages.map((stage,index)=>`<button type="button" data-stage="${escapeText(stage)}" ${lockedStage&&lockedStage!==stage?'disabled':''}><span>${String(index+1).padStart(2,'0')}</span>${escapeText(stage)}<b>${lockedStage===stage?'Current':'→'}</b></button>`).join('')}</div><p>${lockedStage?`Today's scored attempt belongs to ${escapeText(lockedStage)}. You can choose another subject tomorrow.`:'Demo selection only. A secure student account is needed before this can update the live admin Student Journey.'}</p>`;
 $('#onboardingStep').querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>openAccount(button.dataset.stage)));
}
function openAccount(stage){
 currentStage=stage;state.stage=stage;saveState();
 mainQuestions=dailyQuestions(stage,dayOfWeek);practiceBank=practiceQuestions(stage,mainQuestions,dayOfWeek);
 publicPage.hidden=true;document.body.classList.add('demo-active');homeMode='dashboard';onboarding.hidden=true;interior.hidden=false;refreshBell();showPanel('home');history.pushState({portal:'home'},'','#student-home');window.scrollTo(0,0);
}
$('#togglePassword')?.addEventListener('click',event=>{const input=$('#studentPassword'),show=input.type==='password';input.type=show?'text':'password';event.currentTarget.setAttribute('aria-label',show?'Hide password':'Show password');});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(loginBusy)return;
 const username=form.elements.studentId.value.trim(),password=form.elements.password.value;
 if(username.toUpperCase()==='DEMO001'){
  if(password!=='Rehaan2026'){status.textContent='Check the demo password and try again.';return;}
  liveSession=false;liveView=null;enterSetup();return;
 }
 loginBusy=true;form.querySelector('[type=submit]').disabled=true;status.textContent='Checking your student account…';
 try{
  const auth=await import('./student-portal-auth.js?v=20261124-portal-1');
  const session=await auth.signInStudent(username,password);
  startLiveSession(session,auth);
 }catch(error){status.textContent=error?.code==='auth/invalid-credential'?'Student ID or password is incorrect.':error?.message||'Login is unavailable. Please try again.';}
 finally{loginBusy=false;form.querySelector('[type=submit]').disabled=false;form.elements.password.value='';}
});
async function logout(){
 if(stopLiveWatch){stopLiveWatch();stopLiveWatch=null;}
 const wasLive=liveSession;liveSession=false;liveView=null;
 interior.hidden=true;onboarding.hidden=true;document.body.classList.remove('demo-active');publicPage.hidden=false;form.reset();status.textContent='Demo account: DEMO001 / Rehaan2026';history.replaceState({portal:'login'},'','student.html#login');window.scrollTo(0,0);
 if(wasLive)try{const auth=await import('./student-portal-auth.js?v=20261124-portal-1');await auth.signOutStudent();}catch{status.textContent='Signed out of this screen. Check your connection before using another account.';}
}
async function startLiveSession(session,auth){
 if(stopLiveWatch)stopLiveWatch();
 liveSession=true;liveView=session.view;publicPage.hidden=true;onboarding.hidden=true;interior.hidden=false;document.body.classList.add('demo-active');
 updateLiveHeader();showPanel('home');history.replaceState({portal:'home'},'','#student-home');window.scrollTo(0,0);
 stopLiveWatch=await auth.watchStudent(session.ref,view=>{if(!liveSession)return;liveView=view;updateLiveHeader();showPanel(activeTab);},()=>{if(liveSession){void logout();status.textContent='Student access was changed or the connection failed. Please sign in again.';}});
}
function updateLiveHeader(){
 const profile=liveView?.profile||{},name=profile.name||'Student';
 $('.demo-head .student-head-avatar').textContent=name.charAt(0).toUpperCase();
 $('.demo-head small').textContent='RC LEARN · STUDENT';
 $('.demo-head h1').textContent='Hello, '+name;
 $('.demo-head p').textContent=`ADM ${profile.admissionNumber||'—'} · ${profile.batch||'Batch not assigned'}`;
 $('#studentBell i').hidden=true;
}
void (async()=>{try{const auth=await import('./student-portal-auth.js?v=20261124-portal-1');const session=await auth.restoreStudent();if(session&&!liveSession&&!loginBusy&&publicPage.hidden!==true)await startLiveSession(session,auth);}catch{/* Keep public login available if offline or a saved session is inactive. */}})();
$('#studentBell').addEventListener('click',()=>navigate('updates'));

function showPanel(name){activeTab=name;setActiveTab(name);if(liveSession){renderLivePanel(name);return;}if(name==='home'){renderHome();return;}if(name==='account'){renderAccount();return;}if(name==='updates'){renderUpdates();return;}renderJourney();}
function navigate(name,push=true){if(!['home','account','updates','journey'].includes(name))return;if(name==='home')homeMode='dashboard';showPanel(name);if(push)history.pushState({portal:name},'',`#student-${name}`);window.scrollTo({top:0,behavior:'smooth'});}
window.addEventListener('popstate',event=>{const page=event.state?.portal;if(interior.hidden)return;if(page&&['home','account','updates','journey'].includes(page))navigate(page,false);else logout();});
function liveRows(items){return items.map(([label,value])=>`<div class="account-row"><span>${escapeText(label)}</span><b>${escapeText(value||'Not recorded')}</b></div>`).join('');}
function liveMoney(value){return `₹${Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;}
function renderLivePanel(name){
 const view=liveView||{},profile=view.profile||{},fees=view.fees||{},attendance=Array.isArray(view.attendance)?view.attendance:[],journey=view.journey||{};
 const latest=attendance[0],periods=Array.isArray(fees.periods)?fees.periods:[],receipts=Array.isArray(fees.receipts)?fees.receipts:[],topics=Array.isArray(journey.topics)?journey.topics:[];
 const done=topics.filter(topic=>topic.done===true).length,progress=topics.length?Math.round(done/topics.length*100):0;
 const course=profile.course||'Course not recorded',batch=profile.batch||'Batch not assigned';
 if(name==='home'){
  $('#demoContent').innerHTML=`<section class="student-home"><div class="student-home-title"><span class="eyebrow">RC LEARN · YOUR DASHBOARD</span><h2>${escapeText(profile.name||'Your student space')}</h2><p>ADM ${escapeText(profile.admissionNumber||'—')} · ${escapeText(batch)}</p></div>
   <div class="student-hero"><div><small>CURRENT COURSE</small><strong>${escapeText(course)}</strong><p>Your teacher's recorded learning journey appears below.</p></div><span class="learning-motif" aria-hidden="true"><i class="laptop-screen"></i><i class="laptop-base"></i><i class="book book-one"></i><i class="book book-two"></i></span></div>
   <div class="student-quick-grid"><div><small>FEE DUE</small><b>${fees.statement?liveMoney(fees.statement.due):'Awaiting review'}</b></div><div><small>LATEST ATTENDANCE</small><b>${latest?`${Number(latest.attended)||0} / ${Number(latest.classes)||0}`:'Awaiting record'}</b></div><div><small>LEARNING TOPICS</small><b>${done} / ${topics.length}</b></div><div><small>WEEKLY RANK</small><b>Awaiting results</b></div></div>
   <article class="student-quiz-entry demo-panel"><div class="student-quiz-icon" aria-hidden="true">✦</div><div><small>WEEKLY QUIZ</small><h3>${escapeText(course)}</h3><p>The scored quiz opens after your teacher publishes it for your account.</p></div><button class="gold-button" type="button" disabled aria-disabled="true">Quiz not published</button></article>
   <article class="student-practice demo-panel"><div><small>EXTRA PRACTICE</small><h3>Keep learning</h3><p>Practice questions will open when your learning program is assigned.</p></div></article>
   <div class="student-home-pair"><article class="student-rank"><div><small>SKILLS LEAGUE</small><strong>—</strong><p>Your rank appears after reviewed results are published.</p></div><span aria-hidden="true">♛</span></article><article class="student-latest"><small>CENTRE UPDATE</small><strong>Awaiting a notice</strong><p>Your centre has not published a student notice yet.</p><button type="button" id="openLatest">See updates →</button></article></div></section>`;
  $('#openLatest').addEventListener('click',()=>navigate('updates'));return;
 }
 if(name==='account'){
  $('#demoContent').innerHTML=`<section class="student-section"><div class="student-section-title"><span class="eyebrow">MY ACCOUNT</span><h2>Your records</h2><p>Details published from your admission record.</p></div>
   <div class="student-account-grid"><article class="student-metric fee"><small>PENDING TUITION</small><strong>${fees.statement?liveMoney(fees.statement.due):'—'}</strong><span>${fees.statement?`As of ${escapeText(fees.statement.asOf)}`:'Fee statement needs centre review'}</span></article><article class="student-metric attendance"><small>LATEST ATTENDANCE</small><strong>${latest?`${Number(latest.attended)||0} / ${Number(latest.classes)||0}`:'—'}</strong><span>${latest?escapeText(latest.month):'No record published'}</span></article></div>
   <details class="account-section" open><summary>Personal & admission details <span>⌄</span></summary><div class="account-section-body">${liveRows([['Full name',profile.name],['Admission number',profile.admissionNumber],['Date of birth',profile.dob],['Parent / guardian',profile.guardian],['Student phone',profile.studentPhone],['Guardian phone',profile.guardianPhone],['Course',course],['Batch',batch],['Joining date',profile.joined],['Account status',profile.status]])}</div></details>
   <details class="account-section"><summary>Fees & receipts <span>⌄</span></summary><div class="account-section-body">${liveRows([['Admission fee status',fees.admissionStatus],['Admission fee recorded',liveMoney(fees.admissionAmount)],['Monthly tuition',fees.statement?liveMoney(fees.statement.monthlyTuition):'Awaiting review'],['Total monthly received',fees.statement?liveMoney(fees.statement.received):'Awaiting review'],['Pending monthly amount',fees.statement?liveMoney(fees.statement.due):'Awaiting review']])}${periods.map(item=>liveRows([[item.due,`${liveMoney(item.received)} received · ${liveMoney(item.concession)} concession`]])).join('')||'<div class="account-empty"><b>No monthly fee periods recorded</b><p>Ask the centre if you expected a payment here.</p></div>'}${receipts.length?`<h3>Receipts</h3>${receipts.map(item=>liveRows([[item.number||item.id,`${liveMoney(item.amount)} · ${item.date||'Date not recorded'}`]])).join('')}`:'<div class="account-empty"><b>No receipts published</b></div>'}<p class="demo-disclosure">Pending amounts appear only when the admin fee ledger passes validation.</p></div></details>
   <details class="account-section"><summary>Attendance & timetable <span>⌄</span></summary><div class="account-section-body">${attendance.map(item=>liveRows([[item.month,`${Number(item.attended)||0} of ${Number(item.classes)||0} classes`]])).join('')||'<div class="account-empty"><b>No attendance recorded yet</b></div>'}${liveRows([['Batch',batch],['Timetable','Not published']])}</div></details>
   <details class="account-section"><summary>Messages & groups <span>⌄</span></summary><div class="account-section-body"><div class="account-empty"><b>Centre contact is not published yet</b><p>Teacher messages and group links will appear here when enabled by the centre.</p></div></div></details>
   <details class="account-section"><summary>Settings & security <span>⌄</span></summary><div class="account-section-body"><label class="setting-switch"><span>Reduce animations</span><input type="checkbox" id="reduceMotion" ${state.reduceMotion?'checked':''}></label><button class="account-action logout" type="button" id="demoLogout">Sign out</button></div></details></section>`;
  $('#reduceMotion').addEventListener('change',event=>{state.reduceMotion=event.target.checked;document.body.classList.toggle('reduce-motion',state.reduceMotion);saveState();});
  $('#demoLogout').addEventListener('click',logout);return;
 }
 if(name==='updates'){$('#demoContent').innerHTML=`<section class="student-section"><div class="student-section-title"><span class="eyebrow">CENTRE UPDATES</span><h2>Notes & announcements</h2><p>Posts from your centre will appear here.</p></div><div class="update-filters" role="group" aria-label="Update categories">${updateFilters.map(filter=>`<button type="button" data-update-filter="${escapeText(filter)}" aria-pressed="${filter===updateFilter}">${escapeText(filter)}</button>`).join('')}</div><div class="account-empty"><b>No ${escapeText(updateFilter==='All'?'updates':updateFilter.toLowerCase())} published yet</b><p>Check again after the centre posts an update.</p></div></section>`;$('#demoContent').querySelectorAll('[data-update-filter]').forEach(button=>button.addEventListener('click',()=>{updateFilter=button.dataset.updateFilter;renderLivePanel('updates');}));return;}
 $('#demoContent').innerHTML=`<section class="student-section"><div class="student-section-title"><span class="eyebrow">YOUR LEARNING JOURNEY</span><h2>One skill at a time</h2><p>${escapeText(journey.course||course)}</p></div><article class="journey-overview"><div><small>TEACHER ASSESSED TOPICS</small><strong>${progress}%</strong><p>${done} of ${topics.length} topics completed</p></div><div class="journey-progress"><span style="width:${progress}%"></span></div></article><div class="journey-timeline">${topics.map((topic,index)=>`<div class="journey-step ${topic.done?'done':'later'}"><span>${topic.done?'✓':String(index+1).padStart(2,'0')}</span><div><b>${escapeText(topic.title)}</b><small>${topic.done?'Completed':'In progress or upcoming'}</small></div></div>`).join('')||'<div class="account-empty"><b>No topics assessed yet</b><p>Your teacher can add them in the admin learning checklist.</p></div>'}</div><article class="demo-panel journey-class"><small>DAILY CLASS LEARNING</small><h3>Awaiting a class note</h3><p>Your teacher has not published a note or image.</p></article></section>`;
}
function renderHome(){
 if(homeMode==='main'){renderMain();return;}
 if(homeMode==='practice'){renderPractice();return;}
 const record=attempt(),done=record?.answers.length===10;
 $('#demoContent').innerHTML=`<section class="student-home">
  <div class="student-home-title"><span class="eyebrow">RC LEARN · YOUR DASHBOARD</span><h2>Ready to keep learning?</h2><p>${escapeText(currentStage)} · Afternoon batch</p></div>
  <div class="student-hero"><div><small>CURRENT LEARNING PROGRAM</small><strong>${escapeText(currentStage)}</strong><p>Review today’s lesson, then take the weekly quiz.</p></div><span class="learning-motif" aria-hidden="true"><i class="laptop-screen"></i><i class="laptop-base"></i><i class="book book-one"></i><i class="book book-two"></i></span></div>
  <div class="student-quick-grid"><div><small>VISIT STREAK · DEMO</small><b>7 days</b></div><div><small>CURRENT BADGE · DEMO</small><b>Weekly learner</b></div><div><small>FEE DUE · DEMO</small><b>₹${sample.feeDue}</b></div><div><small>ATTENDANCE · DEMO</small><b>${Math.round(sample.present/sample.classes*100)}%</b></div></div>
  <article class="student-quiz-entry demo-panel"><div class="student-quiz-icon" aria-hidden="true">✦</div><div><small>WEEKLY QUIZ · DAY ${dayOfWeek} OF 7</small><h3>${escapeText(currentStage)} · Weekly Quiz</h3><p>10 scored questions. ${done?'Today’s attempt is complete.':'One attempt today.'} Six earlier skills and four current skills.</p></div><button class="gold-button" type="button" id="mainQuizButton">${done?'View result':record?'Continue quiz':'Participate in quiz'} <span aria-hidden="true">→</span></button></article>
  <article class="student-practice demo-panel"><div><small>EXTRA PRACTICE</small><h3>Questions for learning</h3><p>Practice does not affect your score or rank.</p></div><button type="button" id="practiceButton">Open practice →</button></article>
  <div class="student-home-pair"><article class="student-rank"><div><small>OVERALL LEADERBOARD · DEMO</small><strong>#${sample.rank}</strong><p>Your sample rank · official results follow review.</p></div><span aria-hidden="true">♛</span></article><article class="student-latest"><small>LATEST TUITION UPDATE · SAMPLE</small><strong>Class practice</strong><p>Review ${escapeText(currentStage)} before the next session.</p><button type="button" id="openLatest">See updates →</button></article></div>
  <article class="student-today demo-panel"><small>TODAY’S CLASS · SAMPLE</small><h3>Continue your current topic</h3><p>The actual teacher note and class image will appear after admin uploads are connected.</p></article>
  <p class="demo-disclosure">Preview account: fee, attendance, streak, rank, badge and updates are sample values.</p>
 </section>`;
 $('#mainQuizButton').addEventListener('click',()=>{ensureAttempt();homeMode='main';renderMain();history.pushState({portal:'home'},'','#student-quiz');window.scrollTo({top:0,behavior:'smooth'});});
 $('#practiceButton').addEventListener('click',()=>{practiceIndex=0;homeMode='practice';renderPractice();history.pushState({portal:'home'},'','#student-practice');window.scrollTo({top:0,behavior:'smooth'});});
 $('#openLatest').addEventListener('click',()=>navigate('updates'));
}
function renderAccount(){
 const rows=items=>items.map(([label,value])=>`<div class="account-row"><span>${escapeText(label)}</span><b>${escapeText(value)}</b></div>`).join('');
 $('#demoContent').innerHTML=`<section class="student-section"><div class="student-section-title"><span class="eyebrow">MY ACCOUNT · DEMO</span><h2>Your records</h2><p>Personal details, payments, attendance and settings.</p></div>
 <div class="student-account-grid"><article class="student-metric fee"><small>PENDING TUITION · ${sample.feeMonth.toUpperCase()}</small><strong>₹${sample.feeDue}</strong><span>Sample balance</span></article><article class="student-metric attendance"><small>CLASS ATTENDANCE</small><strong>${sample.present} / ${sample.classes}</strong><span>${Math.round(sample.present/sample.classes*100)}% present · sample</span></article></div>
 <details class="account-section" open><summary>Personal details <span>⌄</span></summary><div class="account-section-body">${rows([['Full name',sample.name],['Admission number',sample.admission],['Date of birth','Not provided in demo'],['Parent or guardian','Not provided in demo'],['Contact','Not provided in demo'],['Course','Computer skills'],['Batch','Afternoon · sample'],['Joining date','Not provided in demo'],['Course validity','Not provided in demo'],['Account status','Preview account']])}</div></details>
 <details class="account-section"><summary>Fees & payment history <span>⌄</span></summary><div class="account-section-body">${rows([['Admission fee','₹100 · sample'],['Monthly tuition','₹999 · sample'],['Paid this month','₹500 · sample'],['Pending amount',`₹${sample.feeDue} · sample`],['Overdue amount','₹0 · sample']])}<div class="account-empty"><b>No real receipts connected</b><p>Receipt numbers, dates and payment history will come from the existing admin fee register after secure account linking.</p></div></div></details>
 <details class="account-section"><summary>Attendance & timetable <span>⌄</span></summary><div class="account-section-body">${rows([['Attendance',`${sample.present} of ${sample.classes} classes · sample`],['Batch timing','Not published'],['Timetable','Not published']])}<div class="account-empty"><b>Waiting for a published timetable</b><p>Class times and attendance records will be shown here when linked to this student.</p></div></div></details>
 <details class="account-section"><summary>Messages & groups <span>⌄</span></summary><div class="account-section-body"><div class="account-empty"><b>Teacher messaging is not connected yet</b><p>A verified teacher contact and your batch’s WhatsApp group link will appear here once the centre adds them.</p></div>${rows([['Teacher message','Not available in preview'],['Boys / girls group','Not assigned']])}</div></details>
 <details class="account-section"><summary>Settings & security <span>⌄</span></summary><div class="account-section-body"><div class="account-row"><span>Notification updates</span><b>${state.followed?'Following · demo':'Not followed'}</b></div><label class="setting-switch"><span>Reduce animations</span><input type="checkbox" id="reduceMotion" ${state.reduceMotion?'checked':''}></label><button class="account-action" type="button" id="changeSubject">Change current subject</button><button class="account-action logout" type="button" id="demoLogout">Sign out</button></div></details>
 <p class="demo-disclosure">Private details here are placeholders or clearly marked samples. The live admin ledger is not readable from this demo account.</p></section>`;
 $('#reduceMotion').addEventListener('change',event=>{state.reduceMotion=event.target.checked;document.body.classList.toggle('reduce-motion',state.reduceMotion);saveState();});
 $('#changeSubject').addEventListener('click',()=>{if(attempt()?.answers.length){alert('Finish today’s scored quiz before changing the learning subject in this demo.');return;}interior.hidden=true;onboarding.hidden=false;chooseStage();window.scrollTo(0,0);});
 $('#demoLogout').addEventListener('click',logout);
}
function renderUpdates(){
 const saved=Array.isArray(state.savedUpdates)?state.savedUpdates:[],read=Array.isArray(state.readUpdates)?state.readUpdates:[];
 const visible=sampleUpdates.filter(item=>updateFilter==='All'||updateFilter==='Saved'&&saved.includes(item.id)||item.category===updateFilter);
 $('#demoContent').innerHTML=`<section class="student-section"><div class="student-section-title"><span class="eyebrow">CENTRE UPDATES · DEMO</span><h2>Notes & announcements</h2><p>Filter notices, open details and save what matters.</p></div>
 <div class="update-filters" role="group" aria-label="Filter centre updates">${updateFilters.map(filter=>`<button type="button" data-update-filter="${escapeText(filter)}" aria-pressed="${filter===updateFilter}">${escapeText(filter)}</button>`).join('')}</div>
 <div class="student-update-feed">${visible.map(item=>`<article class="student-feed-card ${read.includes(item.id)?'is-read':'is-unread'}"><div class="feed-meta"><span>${escapeText(item.category)} · SAMPLE</span><span>${escapeText(item.date)}</span></div>${item.image?`<button class="feed-image" type="button" data-view-image="${escapeText(item.id)}" aria-label="View image for ${escapeText(item.title)}"><img src="${escapeText(item.image)}" alt="${escapeText(item.title)} update image"></button>`:''}<div class="feed-body"><h3>${escapeText(item.title)}</h3><p>${escapeText(item.details)}</p><small>From ${escapeText(item.author)}</small></div><div class="feed-actions"><button type="button" data-open-update="${escapeText(item.id)}">Read details →</button><button type="button" data-save-update="${escapeText(item.id)}" aria-pressed="${saved.includes(item.id)}">${saved.includes(item.id)?'Saved ✓':'Save'}</button></div></article>`).join('')||'<div class="account-empty"><b>No updates in this category</b><p>Choose another filter or wait for the centre to publish a new item.</p></div>'}</div>
 <p class="demo-disclosure">These are sample updates and images. Teacher uploads and private messages are not connected yet.</p></section>`;
 $('#demoContent').querySelectorAll('[data-update-filter]').forEach(button=>button.addEventListener('click',()=>{updateFilter=button.dataset.updateFilter;renderUpdates();}));
 $('#demoContent').querySelectorAll('[data-save-update]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.saveUpdate;state.savedUpdates=saved.includes(id)?saved.filter(value=>value!==id):[...saved,id];saveState();renderUpdates();}));
 $('#demoContent').querySelectorAll('[data-open-update]').forEach(button=>button.addEventListener('click',()=>{const item=sampleUpdates.find(value=>value.id===button.dataset.openUpdate);if(!item)return;state.readUpdates=[...new Set([...read,item.id])];saveState();refreshBell();$('#studentUpdateDetails').innerHTML=`<small>${escapeText(item.category)} · ${escapeText(item.date)} · ${escapeText(item.author)}</small><h2>${escapeText(item.title)}</h2>${item.image?`<img src="${escapeText(item.image)}" alt="${escapeText(item.title)}">`:''}<p>${escapeText(item.details)}</p>`;$('#studentUpdateDialog').showModal();renderUpdates();}));
 $('#demoContent').querySelectorAll('[data-view-image]').forEach(button=>button.addEventListener('click',()=>{const item=sampleUpdates.find(value=>value.id===button.dataset.viewImage);if(!item?.image)return;const image=$('#studentImageDialog img');image.src=item.image;image.alt=item.title;$('#studentImageDialog').showModal();}));
}
$('#closeStudentImage').addEventListener('click',()=>$('#studentImageDialog').close());
$('#closeStudentUpdate').addEventListener('click',()=>$('#studentUpdateDialog').close());
function renderJourney(){
 const sequence=learningGroups.flatMap(group=>group.programs),index=sequence.indexOf(currentStage),completed=Math.max(0,index),percent=Math.round(completed/sequence.length*100);
 $('#demoContent').innerHTML=`<section class="student-section"><div class="student-section-title"><span class="eyebrow">YOUR LEARNING JOURNEY · DEMO</span><h2>One skill at a time</h2><p>Current program · ${escapeText(currentStage)}</p></div>
 <article class="journey-overview"><div><small>PROGRAM COMPLETION · SAMPLE PATH</small><strong>${percent}%</strong><p>${completed} earlier programs · ${sequence.length} in this learning map</p></div><div class="journey-progress"><span style="width:${percent}%"></span></div></article>
 <div class="journey-topic-grid"><article class="demo-panel"><small>COMPLETED TOPICS</small><h3>${completed} earlier programs</h3><p>Individual skills await teacher assessment.</p></article><article class="demo-panel"><small>CURRENT TOPIC</small><h3>${escapeText(currentStage)}</h3><p>Your teacher can publish the exact lesson here.</p></article><article class="demo-panel"><small>NEXT RECOMMENDED</small><h3>${escapeText(sequence[index+1]||'Keep practising')}</h3><p>Continue when your teacher marks this program ready.</p></article></div>
 <article class="demo-panel journey-class"><small>DAILY CLASS LEARNING</small><h3>No class note published yet</h3><p>Your teacher’s notes and class image will appear here when uploads are connected.</p></article>
 <div class="journey-timeline">${learningGroups.map(group=>`<section><h3>${escapeText(group.name)}</h3>${group.programs.map(program=>{const position=sequence.indexOf(program),status=position<index?'done':position===index?'now':'later';return `<div class="journey-step ${status}"><span>${status==='done'?'✓':String(position+1).padStart(2,'0')}</span><div><b>${escapeText(program)}</b><small>${status==='done'?'Earlier learning':status==='now'?'Learning now':'Upcoming'}</small></div></div>`;}).join('')}</section>`).join('')}</div>
 <article class="demo-panel journey-badges"><small>BADGES & ACHIEVEMENTS</small><h3>Weekly learner · demo</h3><p>Real achievements will follow published quiz and class results.</p></article>
 <p class="demo-disclosure">Earlier programs are inferred from the selected program for this preview. Admin progress remains the source of truth when secure linking is built.</p></section>`;
}
function resultScore(record){return record.answers.reduce((sum,answer,index)=>sum+(answer===mainQuestions[index].answer?1:0),0);}
function renderMain(){
 const record=ensureAttempt(),index=record.answers.length;
 if(index>=10){$('#demoContent').innerHTML=`<section class="student-section"><button class="student-back" type="button" id="backHome">← Home</button><div class="quiz-finish demo-panel"><span class="eyebrow">TODAY’S SCORED QUIZ · COMPLETE</span><h2>${resultScore(record)} / 10 correct</h2><p>Your scored attempt is saved in this browser for today. The weekly league is published after results are reviewed.</p><div class="quiz-result-split"><span>Previous subjects <b>6 questions</b></span><span>Current subject <b>4 questions</b></span></div><p>Want more practice? It is separate and never changes this result.</p><button class="gold-button" type="button" id="goPractice">Open practice →</button></div></section>`;$('#backHome').addEventListener('click',backHome);$('#goPractice').addEventListener('click',()=>{practiceIndex=0;homeMode='practice';renderPractice();});return;}
 renderQuestion(mainQuestions[index],index,'main');
}
function renderPractice(){if(!practiceBank.length){$('#demoContent').innerHTML='<div class="demo-panel"><h2>No extra practice questions are available today.</h2></div>';return;}if(practiceIndex>=practiceBank.length){$('#demoContent').innerHTML='<section class="student-section"><button class="student-back" type="button" id="backHome">← Home</button><div class="quiz-finish demo-panel"><span class="eyebrow">PRACTICE FINISHED</span><h2>Well done.</h2><p>Practice answers never count towards your weekly rank. Return tomorrow for another daily challenge.</p></div></section>';$('#backHome').addEventListener('click',backHome);return;}renderQuestion(practiceBank[practiceIndex],practiceIndex,'practice');}
function backHome(){navigate('home');}
function renderQuestion(item,index,mode){
 const isMain=mode==='main';if(isMain)mainAnswered=false;else practiceAnswered=false;
 $('#demoContent').innerHTML=`<section class="student-section"><button class="student-back" type="button" id="backHome">← Home</button><div class="quiz-card demo-panel" aria-label="${isMain?'Scored daily quiz':'Unscored practice'} question"><div class="quiz-meta"><span>${isMain?`SCORED · DAY ${dayOfWeek} OF 7`:'PRACTICE · NO POINTS'}</span><strong>${index+1} / ${isMain?10:practiceBank.length}</strong></div><div class="quiz-track"><span style="width:${index*(100/(isMain?10:practiceBank.length))}%"></span></div><p class="quiz-topic">${isMain?(index<6?'PREVIOUSLY LEARNED':'LEARNING NOW'):'EXTRA PRACTICE'} · ${escapeText(item.stage)}</p><h2>${escapeText(item.question)}</h2><div class="quiz-options">${item.options.map((option,optionIndex)=>`<button type="button" data-option="${optionIndex}"><span>${'ABCD'[optionIndex]}</span><b>${escapeText(option)}</b><i aria-hidden="true"></i></button>`).join('')}</div><p class="quiz-feedback" id="quizFeedback" role="status">Choose one answer.</p><button class="quiz-next" type="button" id="quizNext" hidden>${isMain&&index===9?'See result':!isMain&&index===practiceBank.length-1?'Finish practice':'Next question'} →</button></div></section>`;
 $('#backHome').addEventListener('click',backHome);
 $('#demoContent').querySelectorAll('[data-option]').forEach(button=>button.addEventListener('click',()=>{
  if(isMain?mainAnswered:practiceAnswered)return;
  if(isMain){mainAnswered=true;const record=ensureAttempt();if(record.answers.length!==index)return;record.answers.push(Number(button.dataset.option));saveState();}else practiceAnswered=true;
  const selected=Number(button.dataset.option),correct=item.answer;
  $('#demoContent').querySelectorAll('[data-option]').forEach(option=>{option.disabled=true;const optionIndex=Number(option.dataset.option);if(optionIndex===correct){option.classList.add('correct');option.querySelector('i').textContent='✓';}else if(optionIndex===selected){option.classList.add('incorrect');option.querySelector('i').textContent='×';}});
  $('#quizFeedback').textContent=selected===correct?'Correct answer.':`Correct answer: ${item.options[correct]}.`;
  $('#quizNext').hidden=false;
 }));
 $('#quizNext').addEventListener('click',()=>{if(isMain)renderMain();else{practiceIndex++;renderPractice();}window.scrollTo({top:0,behavior:'smooth'});});
}
document.querySelectorAll('[data-demo-tab]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.demoTab)));
document.body.classList.toggle('reduce-motion',Boolean(state.reduceMotion));

// Only an explicitly published public leaderboard replaces the sample results.
async function refreshLeaderboard(){try{const response=await fetch('student-leaderboard.json',{cache:'no-store'});if(!response.ok)return;const data=await response.json();if(data.published!==true||!Array.isArray(data.students))return;const students=data.students.filter(row=>row&&typeof row.name==='string'&&row.name.trim()&&Number.isFinite(Number(row.percentage))&&Number(row.percentage)>=0&&Number(row.percentage)<=100).slice(0,10);if(!students.length)return;const top=document.querySelectorAll('.podium');for(const [index,position] of [1,0,2].entries()){const element=top[index],row=students[position];if(!element)continue;element.querySelector('small').textContent=row?.name||'—';element.querySelector('b').textContent=row?`${Number(row.percentage).toFixed(1)}%`:'—';element.querySelector('.avatar').textContent=row?.name?.trim().charAt(0).toUpperCase()||'✦';}$('.demo-ranks').innerHTML=students.slice(3).map((row,index)=>`<li><span>${String(index+4).padStart(2,'0')}</span><b>${escapeText(row.name)}</b><strong>${Number(row.percentage).toFixed(1)}%</strong></li>`).join('');$('.league-section .eyebrow').textContent='PUBLISHED RESULTS';$('.league-section .live-tag').textContent='Updated standings';$('.league-footnote').textContent='Standings refresh automatically every minute while this page is open.';}catch{/* Keep visible results when offline. */}}
refreshLeaderboard();setInterval(refreshLeaderboard,60_000);
