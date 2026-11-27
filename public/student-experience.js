import {studentPrograms,programLabel} from './student-programs.js';
import {stages,dailyQuestions,practiceQuestions} from './student-quiz.js';
import {learningGroups,sampleUpdates,updateFilters} from './student-portal-data.js';
import {quizRequest,quizServiceConfig,publicLeaderboard} from './student-quiz-service.js';

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
let learnedRequests=null,stopLearnedRequests=null;
let liveView=null,liveUid='',liveUpdates=[],liveMessages=[],liveSelection=null,selectionReady=false,followedHere=false,liveQuiz=null,liveStats=null,liveQuizAnswers=[],liveQuizIndex=0,liveUpdateError='',liveMessageError='',liveSelectionError='',liveSession=false,stopLiveWatch=null,stopLiveUpdates=null,stopLiveMessages=null,stopLiveSelection=null,loginBusy=false;
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
 loginBusy=true;form.querySelector('[type=submit]').disabled=true;status.textContent='Checking your student account…';
 try{
  const auth=await import('./student-portal-auth.js?v=20261127-portal-9');
  const session=await auth.signInStudent(username,password);
  await startLiveSession(session,auth);
 }catch(error){status.textContent=error?.code==='auth/invalid-credential'?'Student ID or password is incorrect.':error?.message||'Login is unavailable. Please try again.';}
 finally{loginBusy=false;form.querySelector('[type=submit]').disabled=false;form.elements.password.value='';}
});
async function logout(){
 stopLearnedRequests?.();stopLearnedRequests=null;learnedRequests=null;
 if(stopLiveWatch){stopLiveWatch();stopLiveWatch=null;}
 if(stopLiveUpdates){stopLiveUpdates();stopLiveUpdates=null;}
 if(stopLiveMessages){stopLiveMessages();stopLiveMessages=null;}
 if(stopLiveSelection){stopLiveSelection();stopLiveSelection=null;}
 const wasLive=liveSession;liveSession=false;liveView=null;liveUid='';liveUpdates=[];liveMessages=[];liveSelection=null;liveQuiz=null;liveStats=null;liveQuizAnswers=[];
 $('#studentImageDialog').close();$('#studentImageDialog img').removeAttribute('src');
 $('#studentUpdateDialog').close();$('#studentUpdateDetails').replaceChildren();
 $('#demoContent').replaceChildren();
 $('.demo-head .student-head-avatar').textContent='A';$('.demo-head small').textContent='RC LEARN · STUDENT DEMO';
 $('.demo-head h1').textContent='Hello, Aamir';$('.demo-head p').textContent='ADM RC-DEMO-001 · Afternoon batch';
 interior.hidden=true;onboarding.hidden=true;document.body.classList.remove('demo-active');publicPage.hidden=false;form.reset();status.textContent='Use the student username provided by your centre.';history.replaceState({portal:'login'},'','student.html#login');window.scrollTo(0,0);
 if(wasLive)try{const auth=await import('./student-portal-auth.js?v=20261127-portal-9');await auth.signOutStudent();}catch{status.textContent='Signed out of this screen. Check your connection before using another account.';}
}
async function startLiveSession(session,auth){
 stopLearnedRequests?.();stopLearnedRequests=null;learnedRequests=null;
 if(stopLiveWatch)stopLiveWatch();
 if(stopLiveUpdates)stopLiveUpdates();
 if(stopLiveMessages)stopLiveMessages();
 if(stopLiveSelection)stopLiveSelection();
 selectionReady=false;followedHere=false;liveSession=true;liveUid=session.user.uid;liveView=session.view;liveUpdates=[];liveMessages=[];liveSelection=null;liveQuiz=null;liveStats=null;liveQuizAnswers=[];liveUpdateError='';liveMessageError='';liveSelectionError='';publicPage.hidden=true;onboarding.hidden=true;interior.hidden=true;document.body.classList.add('demo-active');
 onboarding.hidden=false;$('#onboardingTitle').textContent='Opening your student space';$('#onboardingDescription').textContent='Checking your saved account setup…';$('#onboardingStep').innerHTML='<div class="portal-skeleton" aria-label="Loading account"><span></span><span></span><span></span></div>';try{const setup=await auth.readStudentOnboarding(liveUid);followedHere=setup?.followed===true;}catch(error){await logout();throw Error('Account setup cannot load. This preview needs its reviewed onboarding rules before real-account testing.');}
 updateLiveHeader();showPanel('home');history.replaceState({portal:'home'},'','#student-home');window.scrollTo(0,0);
 const uid=liveUid,keep=unsubscribe=>{if(!liveSession||liveUid!==uid){unsubscribe?.();return false;}return true;};
 const viewWatch=await auth.watchStudent(session.ref,view=>{if(!liveSession||liveUid!==uid)return;liveView=view;updateLiveHeader();showPanel(activeTab);},()=>{if(liveSession&&liveUid===uid){void logout();status.textContent='Student access was changed or the connection failed. Please sign in again.';}});if(!keep(viewWatch))return;stopLiveWatch=viewWatch;
 if(typeof auth.watchStudentUpdates==='function'){const watcher=await auth.watchStudentUpdates(uid,rows=>{if(!liveSession||liveUid!==uid)return;liveUpdates=rows;liveUpdateError='';refreshLiveBell();if(['updates','home','journey'].includes(activeTab))showPanel(activeTab);},error=>{liveUpdateError=error?.message||'Updates could not load.';if(activeTab==='updates')showPanel('updates');});if(!keep(watcher))return;stopLiveUpdates=watcher;}
 if(typeof auth.watchStudentMessages==='function'){const watcher=await auth.watchStudentMessages(uid,rows=>{if(!liveSession||liveUid!==uid)return;liveMessages=rows;liveMessageError='';refreshLiveBell();if(activeTab==='account'||activeTab==='updates')showPanel(activeTab);},error=>{liveMessageError=error?.message||'Messages could not load.';if(activeTab==='account')showPanel('account');});if(!keep(watcher))return;stopLiveMessages=watcher;}
 if(typeof auth.watchStudentSelection==='function'){const watcher=await auth.watchStudentSelection(uid,selection=>{if(!liveSession||liveUid!==uid)return;liveSelection=selection;selectionReady=true;liveSelectionError='';liveSetup();if(activeTab==='journey'||activeTab==='home')showPanel(activeTab);},error=>{liveSelectionError=error?.message||'Learning selection could not load.';liveSetup();if(activeTab==='journey')showPanel('journey');});if(!keep(watcher))return;stopLiveSelection=watcher;}
 const requestsWatch=await auth.watchLearnedRequests(uid,value=>{if(liveUid!==uid||!liveSession)return;learnedRequests=value;if(activeTab==='journey')showPanel('journey');},error=>{liveSelectionError=error.message;});if(!keep(requestsWatch))return;stopLearnedRequests=requestsWatch;
 liveSetup();if(quizServiceConfig.enabled)void refreshLiveStats();
}
function liveSetup(){
 if(!liveSession)return;
 if(followedHere&&selectionReady&&stages.includes(liveSelection?.program)){onboarding.hidden=true;interior.hidden=false;return;}
 interior.hidden=true;onboarding.hidden=false;onboarding.querySelector('.eyebrow').textContent='STUDENT SETUP';
 const uid=liveUid;
 if(!followedHere){
  $('#onboardingTitle').textContent='Follow centre updates';$('#onboardingDescription').textContent='Keep your class notes, homework and centre replies together.';
  $('#onboardingStep').innerHTML='<button class="gold-button" id="followCentre" type="button">Follow centre updates</button><p>This saves your Follow acknowledgement to your student account. Browser notifications are separate and optional.</p><a class="account-action" href="follow.html" target="_blank" rel="noopener">Enable browser notifications ↗</a><button class="account-action" id="setupLogout" type="button">Sign out</button>';
  $('#followCentre').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{const auth=await import('./student-portal-auth.js?v=20261127-portal-9');await auth.completeStudentOnboarding(uid);if(liveUid!==uid)return;followedHere=true;liveSetup();}catch(error){$('#onboardingDescription').textContent='Follow could not be saved: '+error.message;button.disabled=false;}};$('#setupLogout').onclick=logout;return;
 }
 $('#onboardingTitle').textContent='What are you learning now?';$('#onboardingDescription').textContent='Choose your current software. Completed software can be submitted for teacher confirmation in Journey.';
 $('#onboardingStep').innerHTML=selectionReady?`<form id="setupLearning"><label for="setupProgram">Current program</label><select id="setupProgram" required><option value="">Choose your program</option>${studentPrograms.map(stage=>`<option>${escapeText(stage)}</option>`).join('')}</select><button class="gold-button" type="submit">Save and open my dashboard</button><p role="status"></p></form>`:`<p role="status">${escapeText(liveSelectionError||'Loading your saved learning program…')}</p><button type="button" id="setupLogout">Sign out and retry</button>`;
 $('#setupLogout')?.addEventListener('click',logout);
 $('#setupLearning')?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;try{const auth=await import('./student-portal-auth.js?v=20261127-portal-9');if(liveUid!==uid)return;await auth.setStudentSelection(uid,$('#setupProgram').value);}catch(error){form.querySelector('[role=status]').textContent=error.message;}finally{button.disabled=false;}});
}
async function refreshLiveStats(){
 if(!liveSession||!quizServiceConfig.enabled)return;
 const uid=liveUid;
 try{
  const auth=await import('./student-portal-auth.js?v=20261127-portal-9');
  const stats=await quizRequest('/quiz/me',{token:await auth.studentIdToken(uid)});
  if(!liveSession||liveUid!==uid)return;
  liveStats=stats;
  if(activeTab==='home'&&homeMode==='dashboard')showPanel('home');
 }catch{/* Keep verified stats unavailable if the service is offline. */}
}
function refreshLiveBell(){const count=liveUpdates.filter(item=>item.readByStudent!==true).length+liveMessages.filter(item=>item.sender==='admin'&&item.readByStudent!==true).length;const badge=$('#studentBell i');badge.hidden=count===0;badge.textContent=count>99?'99+':String(count);$('#studentBell').setAttribute('aria-label',`Notifications, ${count} unread`);}

function updateLiveHeader(){
 const profile=liveView?.profile||{},name=profile.name||'Student';
 $('.demo-head .student-head-avatar').textContent=name.charAt(0).toUpperCase();
 $('.demo-head small').textContent='RC LEARN · STUDENT';
 $('.demo-head h1').textContent='Hello, '+name;
 $('.demo-head p').textContent=`ADM ${profile.admissionNumber||'—'} · ${profile.batch||'Batch not assigned'}`;
 refreshLiveBell();
}
void (async()=>{try{const auth=await import('./student-portal-auth.js?v=20261127-portal-9');const session=await auth.restoreStudent();if(session&&!liveSession&&!loginBusy&&publicPage.hidden!==true)await startLiveSession(session,auth);}catch{/* Keep public login available if offline or a saved session is inactive. */}})();
$('#studentBell').addEventListener('click',()=>navigate(liveSession&&liveMessages.some(item=>item.sender==='admin'&&!item.readByStudent)?'account':'updates'));

function showPanel(name){const preserve=liveSession&&name==='account'&&activeTab==='account'&&$('#studentMessagesSection')?{opened:[...$('#demoContent').querySelectorAll('.account-section')].map(section=>section.open),draft:$('#studentMessageText')?.value||''}:null;activeTab=name;setActiveTab(name);if(liveSession){renderLivePanel(name);if(preserve){$('#demoContent').querySelectorAll('.account-section').forEach((section,index)=>{section.open=preserve.opened[index]||false;});if($('#studentMessageText'))$('#studentMessageText').value=preserve.draft;}return;}if(name==='home'){renderHome();return;}if(name==='account'){renderAccount();return;}if(name==='updates'){renderUpdates();return;}renderJourney();}
function navigate(name,push=true){if(!['home','account','updates','journey'].includes(name))return;if(name==='home')homeMode='dashboard';showPanel(name);if(push)history.pushState({portal:name},'',`#student-${name}`);requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));}
window.addEventListener('popstate',event=>{const page=event.state?.portal;if(interior.hidden)return;if(page&&['home','account','updates','journey'].includes(page))navigate(page,false);else logout();});
function liveRows(items){return items.map(([label,value])=>`<div class="account-row"><span>${escapeText(label)}</span><b>${escapeText(value||'Not recorded')}</b></div>`).join('');}
function liveMoney(value){return `₹${Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;}
function requestLabel(program,topics){const topic=topics.find(item=>(item.program||item.title)===program);if(topic?.done)return 'Teacher confirmed';if(!(learnedRequests?.programs||[]).includes(program))return 'Not requested';const version=learnedRequests?.version||learnedRequests?.updatedAt?.toMillis?.()||learnedRequests?.updatedAt?.seconds*1000||0;return topic?.requestVersion===version&&topic?.requestStatus==='needs-practice'?'Needs more practice':'Awaiting teacher confirmation';}
function renderLivePanel(name){
 if(name==='home'&&homeMode==='liveQuiz'){renderLiveQuiz();return;}
 if(name==='home'&&homeMode==='livePractice'){renderPractice();return;}
 const view=liveView||{},profile=view.profile||{},fees=view.fees||{},attendance=Array.isArray(view.attendance)?view.attendance:[],journey=view.journey||{};
 const latest=attendance[0],periods=Array.isArray(fees.periods)?fees.periods:[],receipts=Array.isArray(fees.receipts)?fees.receipts:[],topics=Array.isArray(journey.topics)?journey.topics:[];
 const done=topics.filter(topic=>topic.done===true).length,progress=topics.length?Math.round(done/topics.length*100):0;
 const course=profile.course||'Course not recorded',batch=profile.batch||'Batch not assigned';
 if(name==='home'){
  const quizAvailable=quizServiceConfig.enabled&&(!quizServiceConfig.reviewOnly||liveStats?.quizReady===true);
  const verified=quizAvailable&&liveStats,earned=verified&&Array.isArray(liveStats.badges)?liveStats.badges:[];
  $('#demoContent').innerHTML=`<section class="student-home"><article class="learn-welcome"><span class="eyebrow">YOUR LEARNING SPACE</span><h2>Welcome back, ${escapeText((profile.name||'Student').split(' ')[0])}</h2><p>ADM ${escapeText(profile.admissionNumber||'—')} · ${escapeText(batch)}</p><div class="current-pill"><span>Currently learning</span><b>${escapeText(programLabel(journey.currentProgram||liveSelection?.program||course))}</b></div></article>${verified?`<div class="reward-strip"><article><small>STREAK</small><strong>${Number(liveStats.streak)||0} days</strong></article><article><small>POINTS</small><strong>${Number(liveStats.points)||0}</strong></article><article><small>LEAGUE RANK</small><strong>${liveStats.ranks?.weekly?.rank?'#'+Number(liveStats.ranks.weekly.rank):'—'}</strong></article></div>`:''}<article class="learn-badges"><div><small>ACHIEVEMENTS</small><span>${earned.length?'Verified achievements':'Locked until the official quiz opens'}</span></div><div class="badge-levels">${['Learner','Bronze','Silver','Gold','Platinum','Diamond'].map(level=>`<span class="badge-level ${earned.includes(level)?'earned':''}"><i aria-hidden="true">◇</i>${level}${earned.includes(level)?' ✓':''}</span>`).join('')}</div>${earned.filter(level=>!['Learner','Bronze','Silver','Gold','Platinum','Diamond'].includes(level)).map(level=>`<span class="verified-award">${escapeText(level)}</span>`).join('')}</article><article class="student-latest"><small>TODAY AT RC LEARN</small><strong>${escapeText(liveUpdates[0]?.title||'You are up to date')}</strong><p>${escapeText(liveUpdates[0]?.details?.slice(0,130)||'Your published class updates will appear here.')}</p><button type="button" id="openLatest">Open Updates →</button></article><div class="student-quick-grid learn-summary"><div><small>FEE PENDING</small><b>${fees.statement?liveMoney(fees.statement.due):'Awaiting review'}</b></div><div><small>ATTENDANCE</small><b>${latest?`${latest.attended} / ${latest.classes||'—'} classes`:'Not recorded'}</b></div></div><article class="student-quiz-entry demo-panel"><div class="student-quiz-icon" aria-hidden="true">✦</div><div><small>OFFICIAL WEEKLY QUIZ</small><h3>${quizAvailable?'Your next challenge':'Quiz will open after teacher approval'}</h3><p>${quizAvailable?'10 reviewed questions. One final submission.':'Your centre will announce the first reviewed weekly quiz.'}</p></div><button class="gold-button" type="button" id="liveQuizButton" ${quizAvailable&&liveSelection?.program?'':'disabled'}>${quizAvailable?'Participate in quiz':'Locked'}</button></article></section>`;
  const notice=liveUpdates.find(item=>['Announcements','Holidays','Exams'].includes(item.category));
  const noticeCard=document.createElement('button');noticeCard.type='button';noticeCard.className='home-centre-notice';noticeCard.innerHTML=`<small>LATEST CENTRE NOTICE</small><strong>${escapeText(notice?.title||'No centre notice published yet')}</strong><span>View updates →</span>`;noticeCard.onclick=()=>navigate('updates');$('.student-quick-grid').after(noticeCard);
  $('#openLatest').onclick=()=>navigate('updates');$('#liveQuizButton').onclick=()=>{if(quizAvailable&&liveSelection?.program)void startOfficialQuiz();};return;
 }
 if(name==='account'){
  $('#demoContent').innerHTML=`<section class="student-section"><div class="student-section-title"><span class="eyebrow">MY ACCOUNT</span><h2>Your records</h2><p>Details published from your admission record.</p></div>
   <div class="student-account-grid"><article class="student-metric fee"><small>PENDING TUITION</small><strong>${fees.statement?liveMoney(fees.statement.due):'—'}</strong><span>${fees.statement?`As of ${escapeText(fees.statement.asOf)}`:'Fee statement needs centre review'}</span></article><article class="student-metric attendance"><small>LATEST ATTENDANCE</small><strong>${latest?`${Number(latest.attended)||0} / ${Number(latest.classes)||0}`:'—'}</strong><span>${latest?escapeText(latest.month):'No record published'}</span></article></div>
   <details class="account-section" open><summary>Personal & admission details <span>⌄</span></summary><div class="account-section-body">${liveRows([['Full name',profile.name],['Admission number',profile.admissionNumber],['Date of birth',profile.dob],['Gender',profile.gender],['Email',profile.email],['Address',profile.address],['Qualification',profile.qualification],['Parent / guardian',profile.guardian],['Student phone',profile.studentPhone],['Guardian phone',profile.guardianPhone],['Course',course],['Batch',batch],['Joining date',profile.joined],['Account status',profile.status]])}</div></details>
   <details class="account-section"><summary>Fees & receipts <span>⌄</span></summary><div class="account-section-body">${liveRows([['Admission fee status',fees.admissionStatus],['Admission fee recorded',liveMoney(fees.admissionAmount)],['Monthly tuition',fees.statement?liveMoney(fees.statement.monthlyTuition):'Awaiting review'],['Total monthly received',fees.statement?liveMoney(fees.statement.received):'Awaiting review'],['Pending monthly amount',fees.statement?liveMoney(fees.statement.due):'Awaiting review']])}${periods.map(item=>liveRows([[item.due,`${liveMoney(item.received)} received · ${liveMoney(item.concession)} concession`]])).join('')||'<div class="account-empty"><b>No monthly fee periods recorded</b><p>Ask the centre if you expected a payment here.</p></div>'}${receipts.length?`<h3>Receipts</h3>${receipts.map(item=>liveRows([[item.number||item.id,`${liveMoney(item.amount)} · ${item.date||'Date not recorded'}`]])).join('')}`:'<div class="account-empty"><b>No receipts published</b></div>'}<p class="demo-disclosure">Pending amounts appear only when the admin fee ledger passes validation.</p></div></details>
   <details class="account-section"><summary>Attendance & timetable <span>⌄</span></summary><div class="account-section-body">${attendance.map(item=>liveRows([[item.month,`${Number(item.attended)||0} of ${Number(item.classes)||0} classes`]])).join('')||'<div class="account-empty"><b>No attendance recorded yet</b></div>'}${liveRows([['Batch',batch],['Timetable','Not published']])}</div></details>
   <details class="account-section" id="studentMessagesSection" ${liveMessages.some(item=>item.sender==='admin'&&!item.readByStudent)?'open':''}><summary>Messages ${liveMessages.some(item=>item.sender==='admin'&&!item.readByStudent)?'· New reply':''}<span>⌄</span></summary><div class="account-section-body"><div class="student-message-thread">${liveMessages.map(item=>`<article class="student-message ${item.sender==='student'?'mine':'from-centre'}"><small>${item.sender==='student'?'You':'Centre'} · ${item.createdAt?.seconds?new Date(item.createdAt.seconds*1000).toLocaleDateString('en-IN'):'Sending…'}</small><p>${escapeText(item.text||'')}</p></article>`).join('')||'<div class="account-empty"><b>No messages yet</b><p>Send a question to the centre below.</p></div>'}</div><form id="studentMessageForm"><label for="studentMessageText">Message the centre</label><textarea id="studentMessageText" maxlength="1500" rows="3" required placeholder="Write your question"></textarea><button class="account-action" type="submit">Send message</button></form><p id="studentMessageStatus" role="status">${escapeText(liveMessageError)}</p></div></details>
   <p class="notification-preference">Notifications: ${typeof Notification==='undefined'?'not supported in this browser':Notification.permission==='denied'?'browser notifications blocked; in-portal updates remain available':Notification.permission==='granted'?'browser permission allowed; push delivery is not verified here':'browser permission not enabled'}. Follow acknowledgement is saved to your student account.</p><button class="account-action logout" type="button" id="demoLogout">Logout</button></section>`;
  const messageSection=$('#studentMessagesSection');
  const markReplies=()=>{if(!messageSection.open)return;for(const item of liveMessages.filter(row=>row.sender==='admin'&&!row.readByStudent))void import('./student-portal-auth.js?v=20261127-portal-9').then(auth=>auth.markStudentMessageRead(liveUid,item.id)).catch(error=>{$('#studentMessageStatus').textContent=error?.message||'Could not mark the reply read.';});};
  messageSection.addEventListener('toggle',markReplies);if(messageSection.open)markReplies();
  $('#studentMessageForm').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button'),input=$('#studentMessageText');button.disabled=true;$('#studentMessageStatus').textContent='Sending…';try{const auth=await import('./student-portal-auth.js?v=20261127-portal-9');await auth.sendStudentMessage(liveUid,input.value);input.value='';$('#studentMessageStatus').textContent='Message sent.';}catch(error){$('#studentMessageStatus').textContent='Message was not sent: '+(error?.message||'Try again.');}finally{button.disabled=false;}});
  $('#demoLogout').addEventListener('click',logout);return;
 }
 if(name==='updates'){renderLiveUpdates();return;}
 const selected=liveSelection?.program||'',selectedIndex=stages.indexOf(selected),classNote=liveUpdates.find(item=>item.category==='Class notes');
 $('#demoContent').innerHTML=`<section class="student-section"><div class="student-section-title"><span class="eyebrow">YOUR LEARNING JOURNEY</span><h2>One skill at a time</h2><p>${escapeText(journey.course||course)}</p></div>
 <article class="demo-panel journey-class"><small>WHAT I AM LEARNING NOW</small><h3>${escapeText(selected||'Choose what you are learning')}</h3><form id="studentLearningForm"><label for="studentLearningProgram">Learning now</label><select id="studentLearningProgram" required><option value="">Select your program</option>${studentPrograms.map(stage=>`<option value="${escapeText(stage)}" ${stage===selected?'selected':''}>${escapeText(stage)}</option>`).join('')}</select><button class="account-action" type="submit">Save program</button></form><p id="studentLearningStatus" role="status">${escapeText(liveSelectionError|| (selected&&selected!==journey.currentProgram?'Selection saved. Awaiting the admin checklist sync.':''))}</p></article>

 <article class="demo-panel journey-class"><h3>What I have learned</h3><p>Choose completed software for teacher confirmation. Confirmed progress appears in your official checklist.</p><form id="learnedRequestForm"><div class="learned-choices">${studentPrograms.map(program=>`<label><input type="checkbox" name="learned" value="${escapeText(program)}" ${(learnedRequests?.programs||[]).includes(program)?'checked':''}><span>${escapeText(programLabel(program))}<small>${requestLabel(program,journey.topics||[])}</small></span></label>`).join('')}</div><button type="submit" class="account-action">Send for teacher confirmation</button><p role="status"></p></form></article><article class="journey-overview"><div><small>OFFICIAL LEARNING CHECKLIST</small><strong>${progress}%</strong><p>${done} of ${topics.length} topics completed</p></div><div class="journey-progress"><span style="width:${progress}%"></span></div></article><div class="journey-timeline">${topics.map((topic,index)=>`<div class="journey-step ${topic.done?'done':(topic.program||topic.title)===journey.currentProgram?'now':'later'}"><span>${topic.done?'✓':String(index+1).padStart(2,'0')}</span><div><b>${escapeText(topic.title)}</b><small>${topic.done?'Learned · teacher confirmed':(topic.program||topic.title)===journey.currentProgram?'Currently learning':topic.requestStatus==='requested'?'Student requested · awaiting teacher':topic.requestStatus==='needs-practice'?'Teacher review · needs practice':'Upcoming / not started'}</small></div></div>`).join('')||'<div class="account-empty"><b>No topics assessed yet</b><p>Your teacher can add them in the admin learning checklist.</p></div>'}</div><article class="demo-panel journey-class"><small>DAILY CLASS LEARNING</small><h3>${escapeText(classNote?.title||'Awaiting a class note')}</h3><p>${escapeText(classNote?.details||'Your teacher has not published a note or image.')}</p>${/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(classNote?.image||'')?`<button class="feed-image" type="button" id="journeyClassImage" aria-label="View class image"><img src="${escapeText(classNote.image)}" alt="${escapeText(classNote.title||'Class note')} image"></button>`:''}</article></section>`;
 const requestUid=liveUid;
 $('#learnedRequestForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;try{const auth=await import('./student-portal-auth.js?v=20261127-portal-9');await auth.saveLearnedRequests(requestUid,[...form.querySelectorAll('input:checked')].map(input=>input.value));form.querySelector('[role=status]').textContent='Awaiting teacher confirmation';}catch(error){form.querySelector('[role=status]').textContent=error.message;}finally{button.disabled=false;}};
 $('#studentLearningForm').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button'),program=$('#studentLearningProgram').value;button.disabled=true;$('#studentLearningStatus').textContent='Saving learning program…';try{const auth=await import('./student-portal-auth.js?v=20261127-portal-9');await auth.setStudentSelection(liveUid,program);$('#studentLearningStatus').textContent='Learning program saved.';}catch(error){$('#studentLearningStatus').textContent='Could not save program: '+(error?.message||'Try again.');}finally{button.disabled=false;}});
 $('#journeyClassImage')?.addEventListener('click',()=>{const img=$('#studentImageDialog img');img.src=classNote.image;img.alt=classNote.title||'Class note';$('#studentImageDialog').showModal();});
}
function renderLiveUpdates(){
 const visible=liveUpdates.filter(item=>updateFilter==='All'||updateFilter==='Saved'&&item.savedByStudent===true||item.category===({Notes:'Class notes',Notices:'Announcements'}[updateFilter]||updateFilter)||updateFilter==='Notices'&&item.category==='Holidays');
 const safeImage=item=>/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(item.image||'')?item.image:'';
 $('#demoContent').innerHTML=`<section class="student-section"><div class="student-section-title"><span class="eyebrow">CENTRE UPDATES</span><h2>Notes & announcements</h2><p>Published for your student account.</p></div><div class="update-filters" role="group" aria-label="Update categories">${['All','Notes','Homework','Notices','Exams','Results','Saved','Teacher messages'].map(filter=>`<button type="button" data-update-filter="${escapeText(filter)}" aria-pressed="${filter===updateFilter}">${escapeText(filter)}</button>`).join('')}</div><p role="status" id="liveUpdateStatus">${escapeText(liveUpdateError)}</p><div class="student-update-feed">${visible.map(item=>`<article class="student-feed-card ${item.readByStudent?'is-read':'is-unread'}"><div class="feed-meta"><span>${escapeText(item.category||'Update')}</span><span>${escapeText(String(item.createdAt||'').slice(0,10))}</span></div>${safeImage(item)?`<button class="feed-image" type="button" data-live-image="${escapeText(item.id)}" aria-label="View image for ${escapeText(item.title)}"><img src="${escapeText(item.image)}" alt="${escapeText(item.title)} update image"></button>`:''}<div class="feed-body"><h3>${escapeText(item.title||'Update')}</h3><p>${escapeText(item.details||'')}</p><small>From ${escapeText(item.author||'Centre')}</small></div><div class="feed-actions"><button type="button" data-live-open="${escapeText(item.id)}">Read details →</button>${!item.readByStudent?`<button type="button" data-live-read="${escapeText(item.id)}">Mark read</button>`:''}<button type="button" data-live-save="${escapeText(item.id)}" aria-pressed="${item.savedByStudent===true}">${item.savedByStudent?'Saved ✓':'Save'}</button></div></article>`).join('')||`<div class="account-empty"><b>No ${escapeText(updateFilter==='All'?'updates':updateFilter.toLowerCase())} published yet</b><p>Check again after the centre posts an update.</p></div>`}</div></section>`;
 $('#demoContent').querySelectorAll('[data-update-filter]').forEach(button=>button.addEventListener('click',()=>{updateFilter=button.dataset.updateFilter;renderLiveUpdates();}));
 if(updateFilter==='Teacher messages'){
  const replies=liveMessages.filter(item=>item.sender==='admin').slice().reverse();
  $('#demoContent .student-update-feed').innerHTML=replies.map(item=>`<article class="student-feed-card ${item.readByStudent?'is-read':'is-unread'}"><div class="feed-meta"><span>CENTRE REPLY</span><span>${item.createdAt?.seconds?escapeText(new Date(item.createdAt.seconds*1000).toLocaleDateString('en-IN')):'Recent'}</span></div><div class="feed-body"><h3>Message from the centre</h3><p>${escapeText(item.text||'')}</p></div><div class="feed-actions"><button type="button" data-open-messages>Open conversation →</button></div></article>`).join('')||'<div class="account-empty"><b>No centre replies yet</b><p>Send a question from your Account tab.</p></div>';
  $('#demoContent').querySelectorAll('[data-open-messages]').forEach(button=>button.addEventListener('click',()=>{navigate('account');$('#studentMessagesSection').open=true;}));
 }
 const change=async(id,fields)=>{try{const auth=await import('./student-portal-auth.js?v=20261127-portal-9');await auth.setStudentUpdateState(liveUid,id,fields);}catch(error){$('#liveUpdateStatus').textContent='Could not save this change: '+(error?.message||'Try again.');}};
 $('#demoContent').querySelectorAll('[data-live-read]').forEach(button=>button.onclick=()=>change(button.dataset.liveRead,{readByStudent:true}));
 $('#demoContent').querySelectorAll('[data-live-save]').forEach(button=>button.addEventListener('click',()=>{const item=liveUpdates.find(row=>row.id===button.dataset.liveSave);if(item)void change(item.id,{savedByStudent:!item.savedByStudent});}));
 $('#demoContent').querySelectorAll('[data-live-open]').forEach(button=>button.addEventListener('click',()=>{const item=liveUpdates.find(row=>row.id===button.dataset.liveOpen);if(!item)return;$('#studentUpdateDetails').innerHTML=`<small>${escapeText(item.category)} · ${escapeText(String(item.createdAt||'').slice(0,10))} · ${escapeText(item.author)}</small><h2>${escapeText(item.title)}</h2>${safeImage(item)?`<img src="${escapeText(item.image)}" alt="${escapeText(item.title)}">`:''}<p>${escapeText(item.details)}</p>`;$('#studentUpdateDialog').showModal();if(!item.readByStudent)void change(item.id,{readByStudent:true});}));
 $('#demoContent').querySelectorAll('[data-live-image]').forEach(button=>button.addEventListener('click',()=>{const item=liveUpdates.find(row=>row.id===button.dataset.liveImage);if(!item||!safeImage(item))return;const img=$('#studentImageDialog img');img.src=item.image;img.alt=item.title;$('#studentImageDialog').showModal();if(!item.readByStudent)void change(item.id,{readByStudent:true});}));
}
async function startOfficialQuiz(){
 const button=$('#liveQuizButton');if(button)button.disabled=true;
 const uid=liveUid;
 try{
  const auth=await import('./student-portal-auth.js?v=20261127-portal-9'),token=await auth.studentIdToken(uid);
  const quiz=await quizRequest('/quiz/today',{token});
  if(!liveSession||liveUid!==uid||activeTab!=='home')return;
  if(!Array.isArray(quiz.questions)||quiz.questions.length!==10||quiz.questions.some(item=>!Array.isArray(item.options)||item.options.length!==4))throw Error('The published quiz is incomplete. Contact the centre.');
  liveQuiz=quiz;liveQuizAnswers=[];liveQuizIndex=0;homeMode='liveQuiz';showPanel('home');history.pushState({portal:'home'},'','#student-quiz');window.scrollTo(0,0);
 }catch(error){if(button)button.disabled=false;const card=$('.student-quiz-entry p');if(card)card.textContent=error?.message||'Quiz could not load.';}
}
function renderLiveQuiz(){
 if(!liveQuiz)return;
 if(liveQuiz.completed){
  $('#demoContent').innerHTML=`<section class="student-section"><button class="student-back" type="button" id="backHome">← Home</button><div class="quiz-finish demo-panel"><span class="eyebrow">VERIFIED DAILY QUIZ · COMPLETE</span><h2>${Number(liveQuiz.score)||0} / 10 correct</h2><p>Your result is saved by the quiz service. Points earned: ${Number(liveQuiz.points)||0}.</p></div><div class="journey-timeline">${liveQuiz.questions.map((item,index)=>{const answer=liveQuiz.selectedAnswers?.[index],correct=liveQuiz.correctAnswers?.[index];return `<article class="journey-step ${answer===correct?'done':'later'}"><span>${String(index+1).padStart(2,'0')}</span><div><b>${escapeText(item.question)}</b><small>${answer===correct?'Correct ✓':`Your answer: ${escapeText(item.options?.[answer]||'—')} · Correct: ${escapeText(item.options?.[correct]||'—')}`}</small><ol class="official-answer-review">${item.options.map((option,position)=>`<li class="${position===correct?'is-correct':position===answer?'is-wrong':''}"><span>${'ABCD'[position]}. ${escapeText(option)}</span>${position===correct?'<b>✓ Correct answer</b>':position===answer?'<b>✕ Your answer</b>':''}</li>`).join('')}</ol></div></article>`;}).join('')}</div></section>`;
  $('#backHome').addEventListener('click',backHome);return;
 }
 const index=liveQuizIndex,item=liveQuiz.questions[index];if(!item)return;
 const chosen=liveQuizAnswers[index];
 $('#demoContent').innerHTML=`<section class="student-section"><button class="student-back" type="button" id="backHome">← Home</button><div class="quiz-card demo-panel"><div class="quiz-meta"><span>OFFICIAL DAILY QUIZ</span><strong>${index+1} / 10</strong></div><div class="quiz-track"><span style="width:${index*10}%"></span></div><p class="quiz-topic">${escapeText(item.program||liveQuiz.program)}</p><h2>${escapeText(item.question)}</h2><div class="quiz-options">${item.options.map((option,position)=>`<button type="button" data-official-option="${position}" ${chosen!==undefined?'disabled':''} class="${chosen===position?'selected':''}"><span>${'ABCD'[position]}</span><b>${escapeText(option)}</b></button>`).join('')}</div><p class="quiz-feedback" id="officialFeedback" role="status">${chosen===undefined?'Choose one answer. Your score is revealed after all ten are submitted.':'Answer saved for this question.'}</p><button class="quiz-next" type="button" id="officialNext" ${chosen===undefined?'hidden':''}>${index===9?'Submit final answers':'Next question'} →</button></div></section>`;
 $('#backHome').addEventListener('click',backHome);
 $('#demoContent').querySelectorAll('[data-official-option]').forEach(button=>button.addEventListener('click',()=>{if(liveQuizAnswers[index]!==undefined)return;liveQuizAnswers[index]=Number(button.dataset.officialOption);renderLiveQuiz();}));
 $('#officialNext').addEventListener('click',async()=>{
  if(index<9){liveQuizIndex++;renderLiveQuiz();window.scrollTo({top:0,behavior:state.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;}
  const button=$('#officialNext');button.disabled=true;$('#officialFeedback').textContent='Submitting your final answers…';
  const uid=liveUid,quizDay=liveQuiz.day;
  try{
   const auth=await import('./student-portal-auth.js?v=20261127-portal-9');
   const result=await quizRequest('/quiz/submit',{method:'POST',body:{day:quizDay,answers:liveQuizAnswers},token:await auth.studentIdToken(uid)});
   if(!liveSession||liveUid!==uid)return;
   liveQuiz=result;
   if(activeTab==='home'&&homeMode==='liveQuiz')renderLiveQuiz();
   void refreshLiveStats();
  }
  catch(error){button.disabled=false;const feedback=$('#officialFeedback');if(liveSession&&liveUid===uid&&feedback)feedback.textContent='Submission failed. Your answers are still on this screen. '+(error?.message||'Try again.');}
 });
}
function renderHome(){
 if(homeMode==='main'){renderMain();return;}
 if(homeMode==='practice'){renderPractice();return;}
 const record=attempt(),done=record?.answers.length===10;
 $('#demoContent').innerHTML=`<section class="student-home">
  <div class="student-home-title"><span class="eyebrow">RC LEARN · YOUR DASHBOARD</span><h2>Ready to keep learning?</h2><p>${escapeText(currentStage)} · Afternoon batch</p></div>
  <div class="student-hero"><div><small>WHAT I AM LEARNING NOW</small><strong>${escapeText(currentStage)}</strong><p>Review today’s lesson, then take the weekly quiz.</p></div><span class="learning-motif" aria-hidden="true"><i class="laptop-screen"></i><i class="laptop-base"></i><i class="book book-one"></i><i class="book book-two"></i></span></div>
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
 <div class="student-update-feed">${visible.map(item=>`<article class="student-feed-card ${read.includes(item.id)?'is-read':'is-unread'}"><div class="feed-meta"><span>${escapeText(item.category)} · SAMPLE</span><span>${escapeText(item.date)}</span></div>${item.image?`<button class="feed-image" type="button" data-view-image="${escapeText(item.id)}" aria-label="View image for ${escapeText(item.title)}"><img src="${escapeText(item.image)}" alt="${escapeText(item.title)} update image"></button>`:''}<div class="feed-body"><h3>${escapeText(item.title)}</h3><p>${escapeText(item.details)}</p><small>From ${escapeText(item.author)}</small></div><div class="feed-actions"><button type="button" data-open-update="${escapeText(item.id)}">Read details →</button>${!item.readByStudent?`<button type="button" data-live-read="${escapeText(item.id)}">Mark read</button>`:''}<button type="button" data-save-update="${escapeText(item.id)}" aria-pressed="${saved.includes(item.id)}">${saved.includes(item.id)?'Saved ✓':'Save'}</button></div></article>`).join('')||'<div class="account-empty"><b>No updates in this category</b><p>Choose another filter or wait for the centre to publish a new item.</p></div>'}</div>
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
let leaguePeriod='weekly',leaderboardRequest=0;
async function refreshLeaderboard(){
 const request=++leaderboardRequest;
 try{
  let students=[];
  if(quizServiceConfig.enabled){const official=await publicLeaderboard(leaguePeriod);if(request!==leaderboardRequest)return;if(official?.published)students=official.students.filter(row=>row&&typeof row.name==='string'&&Number.isFinite(Number(row.score))&&Number(row.score)>=0).slice(0,10).map(row=>({name:row.name,display:leaguePeriod==='overall'?`${Number(row.score)} pts`:`${(row.quizDays?Number(row.score)/(Number(row.quizDays)*10)*100:0).toFixed(1)}%`}));}

  if(!students.length){if(!$('.league-section').hidden){document.querySelectorAll('.podium').forEach(element=>{element.querySelector('small').textContent='—';element.querySelector('b').textContent='—';element.querySelector('.avatar').textContent='✦';});$('.demo-ranks').innerHTML='';$('.league-footnote').textContent='No results published yet.';}return;}
  $('.league-section').hidden=false;const top=document.querySelectorAll('.podium');
  for(const [index,position] of [1,0,2].entries()){const element=top[index],row=students[position];if(!element)continue;element.querySelector('small').textContent=row?.name||'—';element.querySelector('b').textContent=row?.display||'—';element.querySelector('.avatar').textContent=row?.name?.trim().charAt(0).toUpperCase()||'✦';}
  $('.demo-ranks').innerHTML=students.slice(3).map((row,index)=>`<li><span>${String(index+4).padStart(2,'0')}</span><b>${escapeText(row.name)}</b><strong>${escapeText(row.display)}</strong></li>`).join('');
  $('.league-section .eyebrow').textContent=leaguePeriod==='weekly'?'WEEKLY RESULTS':'OVERALL POINTS';$('.league-section .live-tag').textContent='Reviewed standings';$('.league-footnote').textContent='Standings refresh automatically every minute while this page is open.';
 }catch{/* Keep visible results when offline. */}
}
document.querySelectorAll('[data-league-period]').forEach(button=>button.addEventListener('click',()=>{leaguePeriod=button.dataset.leaguePeriod;document.querySelectorAll('[data-league-period]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));});void refreshLeaderboard();}));
refreshLeaderboard();setInterval(()=>{void refreshLeaderboard();void refreshLiveStats();},60_000);

// Public notices must be explicitly published; private student updates stay private.
void (async()=>{try{const response=await fetch('student-centre-updates.json',{cache:'no-store'});if(!response.ok)return;const data=await response.json();if(data.published!==true||!Array.isArray(data.updates))return;const rows=data.updates.filter(row=>typeof row.title==='string'&&typeof row.details==='string').slice(0,10);if(rows.length)$('#publicCentreUpdates').innerHTML=rows.map(row=>`<article class="update-card"><div><small>${escapeText(row.category||'CENTRE NOTICE')}</small><h3>${escapeText(row.title)}</h3><p>${escapeText(row.details)}</p></div></article>`).join('');}catch{}})();
