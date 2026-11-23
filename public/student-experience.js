import {stages,dailyQuestions,practiceQuestions} from './student-quiz.js';

const $=selector=>document.querySelector(selector);
const form=$('#studentLoginForm'),status=$('#loginStatus'),onboarding=$('#demoOnboarding'),interior=$('#demoInterior'),publicPage=$('.portal-dashboard');
const storageKey='rehaan-student-demo-v2';
const today=new Date();
const dayOfWeek=today.getDay()||7;
const dateKey=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
const sample={name:'Aamir',admission:'RC-DEMO-001',rank:12,feeDue:499,feeMonth:today.toLocaleDateString('en-IN',{month:'long',year:'numeric'}),present:18,classes:20};
const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function readState(){try{const value=JSON.parse(localStorage.getItem(storageKey)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}}
let state=readState(),currentStage='',mainQuestions=[],practiceBank=[],practiceIndex=0,practiceAnswered=false,mainAnswered=false,homeMode='dashboard';
function saveState(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{/* Preview still works without browser storage, but an attempt may not survive reload. */}}
function attempt(){const entry=state.attempts?.[dateKey];return entry?.stage===currentStage&&Array.isArray(entry.answers)?entry:null;}
function ensureAttempt(){if(!state.attempts||typeof state.attempts!=='object')state.attempts={};if(!attempt()){state.attempts[dateKey]={stage:currentStage,answers:[]};saveState();}return state.attempts[dateKey];}
function setActiveTab(name){document.querySelectorAll('[data-demo-tab]').forEach(button=>{const active=button.dataset.demoTab===name;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');});}
function enterSetup(){publicPage.hidden=true;$('.portal-bottom-nav').hidden=true;document.body.classList.add('demo-active');onboarding.hidden=false;interior.hidden=true;window.scrollTo(0,0);if(state.followed)chooseStage();}
function chooseStage(){
 $('#onboardingTitle').textContent='What are you learning now?';
 $('#onboardingDescription').textContent='Select your current subject. Earlier subjects are included in your learning journey.';
 $('#onboardingStep').innerHTML=`<div class="stage-list">${stages.map((stage,index)=>`<button type="button" data-stage="${escapeText(stage)}"><span>${String(index+1).padStart(2,'0')}</span>${escapeText(stage)}<b>→</b></button>`).join('')}</div><p>Demo selection only. A secure student account is needed before this can update the live admin Student Journey.</p>`;
 $('#onboardingStep').querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>openAccount(button.dataset.stage)));
}
function openAccount(stage){
 currentStage=stage;state.stage=stage;saveState();
 mainQuestions=dailyQuestions(stage,dayOfWeek);practiceBank=practiceQuestions(stage,mainQuestions,dayOfWeek);
 homeMode='dashboard';onboarding.hidden=true;interior.hidden=false;showPanel('home');window.scrollTo(0,0);
}
$('#togglePassword')?.addEventListener('click',event=>{const input=$('#studentPassword'),show=input.type==='password';input.type=show?'text':'password';event.currentTarget.setAttribute('aria-label',show?'Hide password':'Show password');});
form.addEventListener('submit',event=>{event.preventDefault();if(form.elements.studentId.value.trim().toUpperCase()!=='DEMO001'||form.elements.password.value!=='Rehaan2026'){status.textContent='For the demo, enter DEMO001 and Rehaan2026.';return;}if(state.followed&&stages.includes(state.stage))openAccount(state.stage);else enterSetup();});
$('#demoFollow').addEventListener('click',()=>{state.followed=true;saveState();chooseStage();});
$('#demoLogout').addEventListener('click',()=>{interior.hidden=true;onboarding.hidden=true;document.body.classList.remove('demo-active');publicPage.hidden=false;$('.portal-bottom-nav').hidden=false;form.reset();status.textContent='Demo account: DEMO001 / Rehaan2026';window.scrollTo(0,0);});

function showPanel(name){setActiveTab(name);if(name==='home'){renderHome();return;}if(name==='account'){renderAccount();return;}if(name==='updates'){renderUpdates();return;}if(name==='journey'){renderJourney();return;}renderProfile();}
function renderHome(){
 if(homeMode==='main'){renderMain();return;}
 if(homeMode==='practice'){renderPractice();return;}
 const record=attempt(),done=record?.answers.length===10;
 $('#demoContent').innerHTML=`<section class="student-home">
  <div class="student-home-title"><span class="eyebrow">YOUR STUDENT SPACE · DEMO</span><h2>Ready for today, ${sample.name}?</h2><p>Learning now · ${escapeText(currentStage)}</p></div>
  <div class="student-rank"><div><small>WEEKLY LEAGUE · SAMPLE RANK</small><strong>#${sample.rank}</strong><p>Official results appear after the weekly review.</p></div><span aria-hidden="true">♛</span></div>
  <article class="student-quiz-entry demo-panel"><div class="student-quiz-icon" aria-hidden="true">✦</div><div><small>DAILY CHALLENGE · DAY ${dayOfWeek} OF 7</small><h3>${done?'Today’s quiz completed':'10 questions. One scored attempt.'}</h3><p>6 from earlier learning · 4 from ${escapeText(currentStage)}.</p></div><button class="gold-button" type="button" id="mainQuizButton">${done?'View result':record?'Continue quiz':'Participate in quiz'} <span aria-hidden="true">→</span></button></article>
  <article class="student-practice demo-panel"><div><small>EXTRA PRACTICE</small><h3>Learn with other questions</h3><p>Practice answers do not count towards the league.</p></div><button type="button" id="practiceButton">Open practice →</button></article>
  <div class="student-home-bottom"><div><span>Daily quiz</span><b>${done?'Completed':record?`${record.answers.length} / 10 answered`:'Not started'}</b></div><div><span>Weekly points</span><b>After results</b></div></div>
  <p class="demo-disclosure">This account, rank and quiz are preview data. No live student records are changed.</p>
 </section>`;
 $('#mainQuizButton').addEventListener('click',()=>{ensureAttempt();homeMode='main';renderMain();window.scrollTo({top:0,behavior:'smooth'});});
 $('#practiceButton').addEventListener('click',()=>{practiceIndex=0;homeMode='practice';renderPractice();window.scrollTo({top:0,behavior:'smooth'});});
}
function renderAccount(){
 $('#demoContent').innerHTML=`<section class="student-section"><div class="student-section-title"><span class="eyebrow">MY ACCOUNT · SAMPLE DATA</span><h2>Fees & attendance</h2><p>Important details at a glance.</p></div>
 <div class="student-account-grid"><article class="student-metric fee"><small>PENDING TUITION · ${sample.feeMonth.toUpperCase()}</small><strong>₹${sample.feeDue}</strong><span>Sample outstanding balance</span></article><article class="student-metric attendance"><small>CLASS ATTENDANCE</small><strong>${sample.present} / ${sample.classes}</strong><span>${Math.round(sample.present/sample.classes*100)}% present · sample record</span></article></div>
 <article class="demo-panel student-detail-card"><div><span>Admission number</span><b>${sample.admission}</b></div><div><span>Current subject</span><b>${escapeText(currentStage)}</b></div><div><span>Fee ledger</span><b>Connect after secure login</b></div><div><span>Attendance register</span><b>Connect after secure login</b></div></article>
 <p class="demo-disclosure">Amounts and attendance here are illustrative. The live admin ledger is private and is not connected to this demo account.</p></section>`;
}
function renderUpdates(){
 $('#demoContent').innerHTML=`<section class="student-section"><div class="student-section-title"><span class="eyebrow">FROM YOUR CENTRE · PREVIEW</span><h2>Updates & notes</h2><p>Centre notices, study notes and photo updates will appear here.</p></div>
 <article class="student-update-feature"><img src="assets/learning-classroom-young.webp" alt="Students learning in a computer classroom"><div><small>CLASS NOTICE · SAMPLE</small><h3>Weekly skills practice</h3><p>Check your centre timetable for the confirmed exam day and reporting time.</p></div></article>
 <div class="student-update-grid"><article class="demo-panel"><img src="assets/excel-desk.jpg" alt="Computer showing spreadsheet work"><small>LEARNING UPDATE · SAMPLE</small><h3>Keep practising ${escapeText(currentStage)}</h3><p>Review your current topic before the next class.</p></article><article class="demo-panel"><small>CLASS NOTES</small><h3>No notes uploaded yet</h3><p>Your teacher’s files will appear here when student access and uploads are connected.</p><span class="student-empty-icon" aria-hidden="true">▤</span></article></div>
 <p class="demo-disclosure">These images illustrate the layout. No private centre update or uploaded file is being shown.</p></section>`;
}
function renderJourney(){
 $('#demoContent').innerHTML=`<section class="student-section"><div class="student-section-title"><span class="eyebrow">STUDENT JOURNEY · DEMO</span><h2>Your learning path</h2><p>Selected subject: ${escapeText(currentStage)}</p></div><div class="demo-panel"><div class="stage-progress">${stages.map((stage,index)=>`<div class="${index<stages.indexOf(currentStage)?'done':index===stages.indexOf(currentStage)?'now':''}"><span>${index<stages.indexOf(currentStage)?'✓':String(index+1).padStart(2,'0')}</span><b>${escapeText(stage)}</b><small>${index<stages.indexOf(currentStage)?'Learned':index===stages.indexOf(currentStage)?'Learning now':'Next'}</small></div>`).join('')}</div></div><p class="demo-disclosure">Admin progress will update only after secure student identity and write permissions are built.</p></section>`;
}
function renderProfile(){
 $('#demoContent').innerHTML=`<section class="student-section"><div class="student-section-title"><span class="eyebrow">MY PROFILE · DEMO</span><h2>Student details</h2><p>Private details will be shown here after verified login.</p></div><div class="student-profile-avatar">A</div><div class="demo-panel student-bio">${[['Full name',sample.name],['Admission number',sample.admission],['Student ID','DEMO001'],['Current subject',currentStage],['Batch','Sample afternoon batch'],['Admission date','Sample record'],['Date of birth','Not provided in demo'],['Guardian','Not provided in demo'],['Contact','Not provided in demo'],['Address','Not provided in demo']].map(([label,value])=>`<div><small>${escapeText(label)}</small><strong>${escapeText(value)}</strong></div>`).join('')}</div><div class="demo-panel student-settings"><small>PAGE SETTINGS</small><label class="setting-switch"><span>Reduce animations</span><input type="checkbox" id="reduceMotion" ${state.reduceMotion?'checked':''}></label><button type="button" id="changeSubject">Change current subject</button><p>Changing subjects after starting today’s scored quiz will be available the next day.</p></div><p class="demo-disclosure">No real biodata is exposed in the preview.</p></section>`;
 $('#reduceMotion').addEventListener('change',event=>{state.reduceMotion=event.target.checked;document.body.classList.toggle('reduce-motion',state.reduceMotion);saveState();});
 $('#changeSubject').addEventListener('click',()=>{if(attempt()?.answers.length){alert('Finish today’s scored quiz before changing the learning subject in this demo.');return;}interior.hidden=true;onboarding.hidden=false;chooseStage();window.scrollTo(0,0);});
}
function resultScore(record){return record.answers.reduce((sum,answer,index)=>sum+(answer===mainQuestions[index].answer?1:0),0);}
function renderMain(){
 const record=ensureAttempt(),index=record.answers.length;
 if(index>=10){$('#demoContent').innerHTML=`<section class="student-section"><button class="student-back" type="button" id="backHome">← Home</button><div class="quiz-finish demo-panel"><span class="eyebrow">TODAY’S SCORED QUIZ · COMPLETE</span><h2>${resultScore(record)} / 10 correct</h2><p>Your scored attempt is saved in this browser for today. The weekly league is published after results are reviewed.</p><div class="quiz-result-split"><span>Previous subjects <b>6 questions</b></span><span>Current subject <b>4 questions</b></span></div><p>Want more practice? It is separate and never changes this result.</p><button class="gold-button" type="button" id="goPractice">Open practice →</button></div></section>`;$('#backHome').addEventListener('click',backHome);$('#goPractice').addEventListener('click',()=>{practiceIndex=0;homeMode='practice';renderPractice();});return;}
 renderQuestion(mainQuestions[index],index,'main');
}
function renderPractice(){if(!practiceBank.length){$('#demoContent').innerHTML='<div class="demo-panel"><h2>No extra practice questions are available today.</h2></div>';return;}if(practiceIndex>=practiceBank.length){$('#demoContent').innerHTML='<section class="student-section"><button class="student-back" type="button" id="backHome">← Home</button><div class="quiz-finish demo-panel"><span class="eyebrow">PRACTICE FINISHED</span><h2>Well done.</h2><p>Practice answers never count towards your weekly rank. Return tomorrow for another daily challenge.</p></div></section>';$('#backHome').addEventListener('click',backHome);return;}renderQuestion(practiceBank[practiceIndex],practiceIndex,'practice');}
function backHome(){homeMode='dashboard';renderHome();window.scrollTo({top:0,behavior:'smooth'});}
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
document.querySelectorAll('[data-demo-tab]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.demoTab==='home')homeMode='dashboard';showPanel(button.dataset.demoTab);window.scrollTo({top:0,behavior:'smooth'});}));
document.body.classList.toggle('reduce-motion',Boolean(state.reduceMotion));

// Only an explicitly published public leaderboard replaces the sample results.
async function refreshLeaderboard(){try{const response=await fetch('student-leaderboard.json',{cache:'no-store'});if(!response.ok)return;const data=await response.json();if(data.published!==true||!Array.isArray(data.students))return;const students=data.students.filter(row=>row&&typeof row.name==='string'&&row.name.trim()&&Number.isFinite(Number(row.percentage))&&Number(row.percentage)>=0&&Number(row.percentage)<=100).slice(0,10);if(!students.length)return;const top=document.querySelectorAll('.podium');for(const [index,position] of [1,0,2].entries()){const element=top[index],row=students[position];if(!element)continue;element.querySelector('small').textContent=row?.name||'—';element.querySelector('b').textContent=row?`${Number(row.percentage).toFixed(1)}%`:'—';element.querySelector('.avatar').textContent=row?.name?.trim().charAt(0).toUpperCase()||'✦';}$('.demo-ranks').innerHTML=students.slice(3).map((row,index)=>`<li><span>${String(index+4).padStart(2,'0')}</span><b>${escapeText(row.name)}</b><strong>${Number(row.percentage).toFixed(1)}%</strong></li>`).join('');$('.league-section .eyebrow').textContent='PUBLISHED RESULTS';$('.league-section .live-tag').textContent='Updated standings';$('.league-footnote').textContent='Standings refresh automatically every minute while this page is open.';}catch{/* Keep visible results when offline. */}}
refreshLeaderboard();setInterval(refreshLeaderboard,60_000);
