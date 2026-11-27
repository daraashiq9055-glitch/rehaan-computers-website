import {basicsExercises,approveQuestions} from './weekly-bank.js';
import {reviewRequest} from '/public/student-review-service.js';
import {studentPrograms} from '/public/student-programs.js';
import {prepareStudentUpdateImage} from '/public/student-portal-updates.js';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const download=(name,value)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function client(host,app){const actor=app.identity()?.uid;return async(path,options)=>{if(!host.isConnected||app.identity()?.uid!==actor)throw Error('Admin session changed.');const result=await reviewRequest(path,await app.idToken(),options);if(!host.isConnected||app.identity()?.uid!==actor)throw Error('Admin session changed.');return result;};}
export function renderReviewQuiz(host,app){
 const api=client(host,app);let rows=[],edit=null,readiness=[];
 host.innerHTML=`<p class="portal-disabled-banner">PRIVATE REVIEW · Public official quiz remains disabled</p><div class="portal-drawer-actions"><button id="bankRefresh">Refresh bank</button><button id="bankExport">Export bank</button><button id="bankTemplate">Import template</button><button id="bankSeed">Load teacher-review drafts</button><label>Import draft JSON<input type="file" id="bankImport" accept="application/json"></label></div><p id="reviewBankStatus" role="status"></p><div id="bankReadiness"></div><form id="reviewQuestionForm"><label>Software<select name="program">${studentPrograms.map(p=>`<option>${e(p)}</option>`).join('')}</select></label><label>Difficulty<select name="difficulty"><option>Foundation</option><option>Intermediate</option><option>Advanced</option></select></label><label>Question<textarea name="question" minlength="10" maxlength="300" required></textarea></label>${[0,1,2,3].map(i=>`<label>Option ${'ABCD'[i]}<input name="option${i}" maxlength="160" required></label>`).join('')}<label>Correct answer<select name="answer">${[0,1,2,3].map(i=>`<option value="${i}">${'ABCD'[i]}</option>`).join('')}</select></label><label>Explanation<textarea name="explanation" minlength="5" maxlength="1500" required></textarea></label><label>Status<select name="status"><option>Draft</option><option>Review</option><option>Archived</option></select></label><button type="submit">Save for teacher review</button><button type="button" id="bankNew">New question</button></form><div class="portal-form-pair"><label>Search<input id="bankSearch" type="search"></label><label>Status<select id="bankFilter"><option>All</option><option>Draft</option><option>Review</option><option>Approved</option><option>Archived</option></select></label></div><label>Software filter<select id="bankProgram"><option>All</option>${studentPrograms.map(p=>`<option>${e(p)}</option>`).join('')}</select></label><div id="bankList"></div><details class="quiz-activation-checklist"><summary>Weekly schedule and private attempts</summary><p>Only allowlisted review accounts can participate. Approved supply must cover seven days without repeating questions.</p><label>Review software<select id="activateProgram">${studentPrograms.map(p=>`<option>${e(p)}</option>`).join('')}</select></label><p id="scheduleReadiness" role="status"></p><button id="activateReview" disabled>Enable private review attempts</button><button id="disableReview">Disable review attempts</button></details><details class="quiz-activation-checklist"><summary>Review weekly / overall results</summary><select id="reviewPeriod"><option value="weekly">Weekly</option><option value="overall">Overall</option></select><label>Week starting Monday<input id="reviewCycle" type="date"></label><button id="previewResults">Preview results</button><div id="resultsPreview"></div></details>`;
 const status=host.querySelector('#reviewBankStatus'),form=host.querySelector('form');
 const bank=document.createElement('section');bank.hidden=true;bank.id='reviewBankWorkspace';
 const bankControls=host.querySelector('.portal-drawer-actions');bank.append(bankControls);
 for(const node of [...host.children])if(node===form||node.classList.contains('portal-form-pair')||node.matches('label,#bankList'))bank.append(node);
 host.append(bank);
 const tools=document.createElement('details');
 tools.innerHTML='<summary>Manage individual questions and imports</summary>';
 while(bank.firstChild)tools.append(bank.firstChild);
 bank.append(tools);
 const week=document.createElement('section');
 week.className='weekly-approval';
 week.innerHTML='<h3>Prepare a quiz week</h3><p>Students get 10 questions a day for seven days.</p><label>Programme <select id="weekProgram">'+studentPrograms.map(p=>'<option>'+e(p)+'</option>').join('')+'</select></label><p id="weekCount" role="status">Loading question bank…</p><button type="button" id="approveWeek" disabled>Approve week</button>';
 bank.prepend(week);
 const weekProgram=week.querySelector('select'),approveWeek=week.querySelector('button');
 function candidates(){
  const entry=readiness.find(row=>row.program===weekProgram.value);
  if(!entry)return [];
  const earlier=studentPrograms.slice(0,studentPrograms.indexOf(entry.program));
  const key=row=>row.question.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
  const used=new Set(rows.filter(row=>row.status==='Approved'&&row.program===entry.program).map(key));
  const earlierApproved=new Set(rows.filter(row=>row.status==='Approved'&&earlier.includes(row.program)).map(key));
  const eligible=rows.filter(row=>['Draft','Review'].includes(row.status));
  const take=(matches,count)=>{
   const selected=[];
   for(const row of eligible){
    if(selected.length===count)break;
    if(matches(row)&&!used.has(key(row))){used.add(key(row));selected.push(row);}
   }
   return selected;
  };
  return [...take(row=>row.program===entry.program&&!earlierApproved.has(key(row)),entry.missingCurrent),
   ...take(row=>earlier.includes(row.program)&&!earlierApproved.has(key(row)),entry.missingPrevious)];
 }
 function displayWeek(){
  const row=readiness.find(item=>item.program===weekProgram.value);
  const count=candidates().length;
  const missing=row?row.missingCurrent+row.missingPrevious:0;
  approveWeek.disabled=!row||!missing||count<missing;
  approveWeek.textContent=row?.ready?'Week approved':'Approve '+count+' questions for the week';
  week.querySelector('#weekCount').textContent=!row?'Loading question bank…':row.ready?'Ready for seven days. Open Weekly Schedule to enable private attempts.':
   count<missing?'Need '+(missing-count)+' more distinct drafts. Add or import questions under Manage individual questions and imports.':
   count+' questions are ready for your approval. You can inspect answers under Manage individual questions and imports.';
 }
 weekProgram.onchange=displayWeek;
 approveWeek.onclick=()=>task(async()=>{
  const selected=candidates();
  if(!selected.length)return;
  weekProgram.disabled=true;approveWeek.disabled=true;
  try{
   await approveQuestions(api,selected,(done,total)=>{status.textContent='Approving '+done+' of '+total+'…';});
  }finally{
   try{await refresh();}finally{weekProgram.disabled=false;}
  }
 });

 const routes=document.createElement('div');routes.className='quiz-centre-actions';routes.innerHTML='<button data-review-route="bank">Question Bank</button><button data-review-route="schedule">Weekly Schedule</button><button data-review-route="results">Leaderboard &amp; Results</button>';status.before(routes);
 const sections=[...host.querySelectorAll('details.quiz-activation-checklist')];sections.forEach(node=>node.hidden=true);
 routes.onclick=event=>{const route=event.target.dataset.reviewRoute;if(!route)return;for(const button of routes.children)button.setAttribute('aria-pressed',String(button.dataset.reviewRoute===route));bank.hidden=route!=='bank';sections.forEach((node,index)=>{node.hidden=route!==(index===0?'schedule':'results');node.open=!node.hidden;});};
 let busy=false;const task=async fn=>{if(busy)return;busy=true;form.inert=true;host.setAttribute('aria-busy','true');status.textContent='Working…';try{await fn();}catch(error){status.textContent=error.message;}finally{busy=false;form.inert=false;host.removeAttribute('aria-busy');}};
 const list=()=>{const search=host.querySelector('#bankSearch').value.toLowerCase(),filter=host.querySelector('#bankFilter').value,program=host.querySelector('#bankProgram').value;host.querySelector('#bankList').innerHTML=rows.filter(row=>(filter==='All'||row.status===filter)&&(program==='All'||row.program===program)&&[row.question,row.program].join(' ').toLowerCase().includes(search)).map(row=>`<article class="quiz-draft"><small>${e(row.program)} · ${e(row.difficulty)} · ${e(row.status)}</small><strong>${e(row.question)}</strong><ol type="A">${row.options.map((v,i)=>`<li>${e(v)}${i===row.answer?' ✓':''}</li>`).join('')}</ol><p>${e(row.explanation)}</p><button data-edit="${e(row.id)}">Edit</button>${row.status==='Review'?`<button data-approve="${e(row.id)}">Teacher approve</button>`:''}</article>`).join('')||'<p>No questions match.</p>';host.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>{edit=rows.find(row=>row.id===button.dataset.edit);for(const key of ['program','difficulty','question','answer','explanation'])form.elements[key].value=edit[key];form.elements.status.value=edit.status==='Approved'?'Draft':edit.status;edit.options.forEach((v,i)=>form.elements['option'+i].value=v);form.scrollIntoView({block:'start'});});host.querySelectorAll('[data-approve]').forEach(button=>button.onclick=()=>task(async()=>{if(!confirm('Confirm the question, all four options, explanation and correct answer are accurate?'))return;await api('/admin/questions',{method:'POST',body:{...rows.find(row=>row.id===button.dataset.approve),expectedUpdatedAt:rows.find(row=>row.id===button.dataset.approve).updated_at,status:'Approved'}});await refresh();status.textContent='Teacher approval saved. Public quiz remains disabled.';}));};
 const programSelect=host.querySelector('#activateProgram');
 function showSchedule(){
  const entry=readiness.find(row=>row.program===programSelect.value);
  host.querySelector('#activateReview').disabled=!entry?.ready;
  const schedule=host.querySelector('#scheduleReadiness');
  if(!entry){schedule.textContent='Readiness unavailable. Open Question Bank and refresh the bank.';return;}
  const daily=entry.previousNeeded?'4 current and 6 earlier questions':'10 current questions';
  schedule.textContent='Each day for seven days: '+daily+'. '+(entry.ready?'The bank is ready. Enable private review attempts for this programme.':
   'Need '+entry.missingCurrent+' current and '+entry.missingPrevious+' earlier approved questions. Open Question Bank, choose the programme, then select Approve questions for the week.');
 }
 programSelect.onchange=showSchedule;
 async function refresh(){readiness=[];showSchedule();const data=await api('/admin/questions');rows=data.questions;readiness=data.readiness;displayWeek();showSchedule();host.querySelector('#bankReadiness').innerHTML=`<details class="quiz-activation-checklist"><summary>Question bank · ${rows.length} loaded · ${rows.filter(r=>r.status==='Approved').length} approved</summary><p>${rows.filter(r=>r.status==='Draft').length} drafts · ${rows.filter(r=>r.status==='Review').length} awaiting teacher approval. Use the weekly approval button to approve the required questions together.</p>${data.readiness.map(row=>`<p><b>${e(row.program)}</b>: ${row.approvedCurrent}/${row.currentNeeded} current + ${row.approvedPrevious}/${row.previousNeeded} earlier approved. ${row.ready?'Ready for review attempts':`Need ${row.missingCurrent} current and ${row.missingPrevious} earlier.`}</p>`).join('')}</details>`;list();status.textContent='Bank loaded from private review service.';}
 form.onsubmit=event=>{event.preventDefault();void task(async()=>{const fields=new FormData(form);await api('/admin/questions',{method:'POST',body:{...(edit?{id:edit.id,revision:edit.revision,expectedUpdatedAt:edit.updated_at}:{}),program:fields.get('program'),difficulty:fields.get('difficulty'),question:fields.get('question'),options:[0,1,2,3].map(i=>fields.get('option'+i)),answer:Number(fields.get('answer')),explanation:fields.get('explanation'),status:fields.get('status')}});edit=null;form.reset();await refresh();status.textContent='Question saved.';});};
 host.querySelector('#bankNew').onclick=()=>{edit=null;form.reset();};host.querySelector('#bankRefresh').onclick=()=>task(refresh);['bankSearch','bankFilter','bankProgram'].forEach(id=>host.querySelector('#'+id).oninput=list);
 host.querySelector('#bankExport').onclick=()=>download('rc-learn-question-bank.json',{version:1,questions:rows});host.querySelector('#bankTemplate').onclick=()=>download('rc-learn-import-template.json',{version:1,questions:[{program:'Computer basics',difficulty:'Foundation',question:'Which device is used to enter text?',options:['Keyboard','Monitor','Speaker','Projector'],answer:0,explanation:'A keyboard enters letters and numbers.',status:'Draft'}]});
 const importRows=async data=>{
  if(data.version!==1||!Array.isArray(data.questions)||!data.questions.length)throw Error('Use the version 1 import template with at least one question.');
  const bank=await api('/admin/questions');
  const ids=new Set(bank.questions.map(row=>row.id));
  const texts=new Set(bank.questions.map(row=>row.question.trim().toLowerCase()));
  const pending=data.questions.filter(row=>!ids.has(row.id)&&!texts.has(String(row.question).trim().toLowerCase()));
  if(pending.length)await api('/admin/questions/import',{method:'POST',body:{questions:pending}});
  await refresh();
  status.textContent=pending.length+' imported as Draft. '+(data.questions.length-pending.length)+' already in the bank. Use the weekly approval button above.';
 };
 host.querySelector('#bankImport').onchange=event=>task(async()=>{const file=event.target.files[0];if(!file||file.size>700000)throw Error('Choose JSON under 700 KB.');await importRows(JSON.parse(await file.text()));});
 host.querySelector('#bankSeed').onclick=()=>task(async()=>{await importRows(await api('/admin/questions/drafts'));});
 for(const [id,enabled] of [['activateReview',true],['disableReview',false]])host.querySelector('#'+id).onclick=()=>task(async()=>{await api('/admin/activation',{method:'POST',body:{enabled,programs:[host.querySelector('#activateProgram').value]}});status.textContent=enabled?'Private review attempts enabled for the selected software only.':'Private review attempts disabled.';});
 host.querySelector('#previewResults').onclick=()=>task(async()=>{const input={period:host.querySelector('#reviewPeriod').value,cycle:host.querySelector('#reviewCycle').value||undefined},result=await api('/admin/results/preview',{method:'POST',body:input});const container=host.querySelector('#resultsPreview');container.innerHTML=`<ol>${result.students.map(row=>`<li>${e(row.display_name)} · ${row.score} · ${row.quiz_days} quiz days</li>`).join('')}</ol><p>Weekly top three awards: 50 / 30 / 20 points. Review all scores before publishing.</p><button id="publishReviewedResults">Publish reviewed results privately</button>`;container.querySelector('button').onclick=()=>task(async()=>{await api('/admin/publish',{method:'POST',body:{...input,reviewToken:result.reviewToken}});container.replaceChildren();status.textContent='Private reviewed results published.';});});
 routes.querySelector('[data-review-route="bank"]').click();
 void task(async()=>{
  await refresh();
  const first=studentPrograms[0];
  const need=70-new Set(rows.filter(row=>row.program===first&&row.status!=='Archived').map(row=>row.question.trim().toLowerCase())).size;
  if(need<=0)return;
  const seed=await api('/admin/questions/drafts');
  const known=new Set(rows.map(row=>row.question.trim().toLowerCase()));
  const ids=new Set(rows.map(row=>row.id));
  const additions=[...seed.questions.filter(row=>row.program===first),...basicsExercises()].filter(row=>!ids.has(row.id)&&!known.has(row.question.trim().toLowerCase())).slice(0,need);
  if(additions.length)await importRows({version:1,questions:additions});
  status.textContent='Weekly bank prepared.';
 });
}
export function renderReviewPublishing(host,app){
 const api=client(host,app);let editing=null,reviewed=null,rows=[];
 const records=app.snapshot().records,batches=[...new Set(records.map(row=>row.data.batch).filter(Boolean))];
 host.innerHTML=`<p class="portal-disabled-banner">Private review publishing · Only allowlisted test students receive these items.</p><form id="reviewPublicationForm"><label>Target<select name="target"><option value="all">All students</option><option value="batch">Selected batch</option><option value="boys">Boys only</option><option value="girls">Girls only</option><option value="selected">Selected students</option></select></label><label>Batch<select name="batch">${batches.map(v=>`<option>${e(v)}</option>`).join('')}</select></label><fieldset><legend>Students (for Selected students target)</legend>${records.filter(row=>row.data.studentPortalAccount?.uid).map(row=>`<label><input type="checkbox" name="students" value="${e(row.id)}">${e(row.data.fullName)} · ${e(row.data.admissionNumber)}</label>`).join('')}</fieldset><label>Category<select name="category"><option value="Announcements">Centre notice / General announcement</option><option>Homework</option><option>Class notes</option><option>Exams</option><option>Results</option><option>Holidays</option></select></label><label>Title<input name="title" required minlength="2" maxlength="120"></label><label>Details<textarea name="details" required maxlength="5000"></textarea></label><label>Author<input name="author" value="Rehaan Computers" required maxlength="100"></label><label>Publish date / time (your device timezone; leave empty for now)<input type="datetime-local" name="scheduledAt"></label><label>Class image<input type="file" name="image" accept="image/png,image/jpeg,image/webp"></label><button type="submit">Preview publication</button><button type="button" id="newReviewPublication">New publication</button></form><p role="status" id="reviewPublishingStatus"></p><div id="reviewPublicationPreview"></div><button id="refreshReviewPublications">Refresh published / scheduled items</button><div id="reviewPublicationList"></div>`;
 const form=host.querySelector('form'),status=host.querySelector('[role=status]'),preview=host.querySelector('#reviewPublicationPreview');
 let busy=false;const task=async fn=>{if(busy)return;busy=true;form.inert=true;status.textContent='Working…';try{await fn();}catch(error){status.textContent=error.message;}finally{busy=false;form.inert=false;}};
 form.oninput=()=>{reviewed=null;preview.replaceChildren();};
 async function refresh(){const result=await api('/admin/publications');rows=result.publications;host.querySelector('#reviewPublicationList').innerHTML=rows.map(row=>`<article class="quiz-draft"><small>${e(row.state)} · ${e(new Date(row.scheduled_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}))} IST</small><strong>${e(row.payload.title)}</strong><p>${e(row.payload.author)} · ${row.recipients.length} recipients</p>${row.error?`<p role="alert">${e(row.error)}</p>`:''}<button data-publication-edit="${e(row.id)}" ${row.state==='deleted'?'disabled':''}>Edit</button><button data-publication-delete="${e(row.id)}" ${row.state==='deleted'?'disabled':''}>Delete</button><button data-publication-reads="${e(row.id)}">Read / unread status</button><div data-reads-for="${e(row.id)}"></div></article>`).join('')||'<p>No centre publications yet.</p>';
 host.querySelectorAll('[data-publication-edit]').forEach(button=>button.onclick=()=>{editing=rows.find(row=>row.id===button.dataset.publicationEdit);for(const key of ['category','title','details','author'])form.elements[key].value=editing.payload[key];form.elements.target.value=editing.target.kind;form.elements.batch.value=editing.target.batch||'';form.querySelectorAll('[name=students]').forEach(box=>box.checked=editing.target.ids?.includes(box.value));form.elements.scheduledAt.value='';reviewed=null;preview.replaceChildren();form.scrollIntoView({block:'start'});});
 host.querySelectorAll('[data-publication-delete]').forEach(button=>button.onclick=()=>task(async()=>{const row=rows.find(row=>row.id===button.dataset.publicationDelete);if(!confirm('Delete this centre item from every recipient feed?'))return;await api('/admin/publications/'+row.id,{method:'DELETE',body:{revision:row.revision}});await refresh();status.textContent='Deletion queued. The server removes all delivered copies; refresh to check completion.';}));
 host.querySelectorAll('[data-publication-reads]').forEach(button=>button.onclick=()=>task(async()=>{const data=await api('/admin/publications/'+button.dataset.publicationReads+'/reads');host.querySelector(`[data-reads-for="${button.dataset.publicationReads}"]`).innerHTML=data.students.map(row=>`<p>${e(row.name)}: ${row.read?'Read':row.delivered?'Unread':'Not delivered'}</p>`).join('');status.textContent='Read states refreshed.';}));
 }
 form.onsubmit=event=>{event.preventDefault();void task(async()=>{const fields=new FormData(form),image=form.elements.image.files[0]?await prepareStudentUpdateImage(form.elements.image.files[0]):editing?.payload.image||'';const input={target:{kind:fields.get('target'),batch:fields.get('batch'),ids:fields.getAll('students')},payload:{category:fields.get('category'),title:fields.get('title'),details:fields.get('details'),author:fields.get('author'),image},scheduledAt:fields.get('scheduledAt')?new Date(fields.get('scheduledAt')).toISOString():new Date().toISOString()};const result=await api('/admin/publications/preview',{method:'POST',body:input});reviewed={...input,publicationId:result.publicationId,reviewedIds:result.recipients.map(row=>row.id),...(editing?{id:editing.id,revision:editing.revision}:{})};preview.innerHTML=`<article class="publication-preview"><small>${e(new Date(result.scheduledAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}))} IST · ${e(result.payload.author)}</small><h3>${e(result.payload.title)}</h3><p>${e(result.payload.details)}</p>${image?`<img src="${image}" alt="Class image preview">`:''}<ul>${result.recipients.map(row=>`<li>${e(row.name)} · ${e(row.admissionNumber)}</li>`).join('')}</ul><button id="confirmReviewPublication">Confirm reviewed publication</button></article>`;status.textContent='Review the exact audience, content and schedule.';preview.querySelector('button').onclick=()=>task(async()=>{if(!reviewed)throw Error('Preview again.');await api('/admin/publications',{method:'POST',body:reviewed});reviewed=null;editing=null;preview.replaceChildren();form.reset();await refresh();status.textContent='Saved. The server delivers at the scheduled time without an admin browser.';});});};
 host.querySelector('#newReviewPublication').onclick=()=>{editing=null;reviewed=null;form.reset();preview.replaceChildren();};host.querySelector('#refreshReviewPublications').onclick=()=>task(refresh);void task(refresh);
}

export function renderReviewStatus(host,app){
 const api=client(host,app);host.innerHTML='<p class="portal-disabled-banner">Private review system status</p><p role="status">Checking server…</p><div id="reviewSystemStatus"></div>';
 void api('/admin/status').then(data=>{host.querySelector('[role=status]').textContent=data.serverSyncConfigured?'Server credential configured. Check successful sync times below.':'Server credential missing. Complete setup before testing Journey.';host.querySelector('#reviewSystemStatus').innerHTML=`<p>${data.students} allowlisted student accounts. The server synchronizes selections immediately and runs scheduled recovery without an admin browser.</p>${data.sync.map(row=>{const value=JSON.parse(row.value);return `<article class="quiz-draft"><strong>${e(row.id.slice(5))}</strong><p>${value.ok?'Synced':'Needs attention'} · ${e(value.at)}</p>${value.error?`<p>${e(value.error)}</p>`:''}</article>`;}).join('')||'<p>Waiting for the first scheduled run. Reopen this panel after a minute.</p>'}<p>Review attempts: ${data.quizEnabled?.enabled?'Enabled for '+e(data.quizEnabled.programs.join(', ')):'Disabled'}. Public official quiz remains disabled.</p>`;}).catch(error=>{if(host.isConnected)host.querySelector('[role=status]').textContent=error.message;});
}
