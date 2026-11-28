import {basicsExercises} from './weekly-bank.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function competitionDesk(host,api,onBank=()=>{}){
 const panel=document.createElement('section');
 panel.className='weekly-approval';
 panel.innerHTML='<h3>Weekly competition</h3><p role="status">Loading competition…</p><div class="competition-controls"></div>';
 host.prepend(panel);
 const controls=panel.lastElementChild,status=panel.querySelector('[role=status]');
 let busy=false,route='bank';
 function show(value){route=value;for(const group of controls.querySelectorAll('[data-panel]'))group.hidden=group.dataset.panel!==route;}
 async function task(fn){
  if(busy)return;
  busy=true;controls.inert=true;
  try{await fn();}catch(error){status.textContent=error.message;}finally{busy=false;controls.inert=false;}
 }
 const post=(path,body={})=>api(path,{method:'POST',body});
 async function render(){
  const [state,bank]=await Promise.all([api('/admin/competition'),api('/admin/questions')]);
  if(!panel.isConnected)return;
  onBank(bank.questions);
  const pending=program=>bank.questions.filter(q=>q.program===program&&['Draft','Review'].includes(q.status)&&
   (!['Notepad','WordPad','MS Word'].includes(program)||/shortcut|keystroke|ctrl\+|shift\+|alt\+/i.test(q.question)));
  status.textContent='Week of '+state.week+' · '+state.eligibleCount+' eligible students · '+(state.open?'Open':'Waiting to open');
  const groups=state.subjects.flatMap(s=>pending(s.program));
  const short=state.subjects.filter(s=>s.missing>pending(s.program).length);
  controls.innerHTML=`<div data-panel="bank"><button data-prepare-all ${short.length?'':'disabled'}>Prepare all missing drafts</button><button data-approve-all ${groups.length?'':'disabled'}>Approve all reviewed subjects (${groups.length})</button>`+state.subjects.map(s=>`<details><summary>${esc(s.program)} · ${s.approved}/${s.needed} approved · ${s.missing} needed</summary>
   <button data-prepare="${esc(s.program)}">Prepare missing drafts</button>
   <button data-approve-subject="${esc(s.program)}" ${!pending(s.program).length?'disabled':''}>Approve reviewed drafts (${pending(s.program).length})</button>
   ${pending(s.program).map(q=>`<p><b>${esc(q.question)}</b><br>${q.options.map((o,i)=>esc(o)+(i===q.answer?' ✓':'')).join(' · ')}<br>${esc(q.explanation)}</p>`).join('')}</details>`).join('')+
   `</div><div data-panel="schedule"><p>One shared competition · week of ${state.week}. Each eligible student receives ten questions per day.</p>
   ${state.subjects.map(s=>esc(s.program)+' · '+s.approved+'/'+s.needed+' approved').join('<br>')}<br>
   ${state.subjects.some(s=>s.missing)?'<p>Open Question Bank and approve the missing questions for the subjects above.</p>':!state.eligibleCount?'<p>A review student must sign in and save a current programme in Journey first.</p>':''}
   <button id="openCompetition"  ${state.open||!state.eligibleCount||state.subjects.some(s=>s.missing)?'disabled':''}>${state.open?'Competition open':'Open weekly competition'}</button>
   </div><div data-panel="results"><h3>Live standings · ${state.students.length} participants</h3><p>Equal scores are ordered by earliest last submission, then account ID.</p>
   ${state.students.map(r=>`<p>#${r.rank} · ${esc(r.name)} · ${r.score} points${r.tied?' · Tied score':''}</p>`).join('')||'<p>Awaiting the first submission.</p>'}
   ${state.completedWeeks.map(w=>`<button data-preview="${w}">Preview podium · ${w}</button>`).join('')}<div id="finalPodium"></div></div>`;
  show(route);
  controls.querySelector('#openCompetition').onclick=()=>task(async()=>{await post('/admin/competition/open');await render();});
  async function prepareSubject(program){
   const generated=await api('/admin/competition-drafts?program='+encodeURIComponent(program));
   const seeds=generated.questions.length?generated.questions:(await api('/admin/questions/drafts')).questions.filter(q=>q.program===program);
   if(program==='Computer basics')seeds.push(...basicsExercises());
   const keys=new Set(bank.questions.map(q=>q.question.trim().toLowerCase())),ids=new Set(bank.questions.map(q=>q.id));
   const missing=state.subjects.find(s=>s.program===program).missing;
   const drafts=seeds.filter(q=>!keys.has(q.question.trim().toLowerCase())&&!ids.has(q.id)).slice(0,Math.max(0,missing-pending(program).length));
   if(drafts.length)await post('/admin/questions/import',{questions:drafts});
   const remaining=Math.max(0,missing-pending(program).length-drafts.length);
   return program+' · '+drafts.length+' new drafts'+(remaining?' · add or import '+remaining+' more':'');
  }
  async function prepare(subjects){
   const messages=[];
   for(const subject of subjects){
    status.textContent='Preparing '+subject+' questions…';
    messages.push(await prepareSubject(subject));
   }
   await render();status.textContent=messages.join(' / ')+'. Expand each subject to review its questions, answers and explanations.';
  }
  controls.querySelector('[data-prepare-all]').onclick=()=>task(()=>prepare(short.map(s=>s.program)));
  for(const b of controls.querySelectorAll('[data-prepare]'))b.onclick=()=>task(()=>prepare([b.dataset.prepare]));
  for(const b of controls.querySelectorAll('[data-approve-subject]'))b.onclick=()=>task(async()=>{
   await approve(pending(b.dataset.approveSubject));
  });
  async function approve(questions){
   const result=await post('/admin/questions/approve-group',{questions:questions.map(q=>({id:q.id,revision:q.revision}))});
   await render();status.textContent=result.approved+' questions approved. Open Weekly Schedule to check readiness.';
  }
  controls.querySelector('[data-approve-all]').onclick=()=>task(()=>approve(groups));
  for(const b of controls.querySelectorAll('[data-preview]'))b.onclick=()=>task(async()=>{
   const week=b.dataset.preview,result=await post('/admin/competition/preview',{week});
   const podium=controls.querySelector('#finalPodium');podium.innerHTML='<h3>Podium · '+week+'</h3>'+result.students.slice(0,3).map(r=>'<p>#'+r.rank+' · '+esc(r.name)+' · '+r.score+' points</p>').join('')+'<button>Publish weekly results</button>';
   podium.querySelector('button').onclick=()=>task(async()=>{await post('/admin/competition/publish',{week});await render();status.textContent='Published weekly results for '+week+'.';});
  });
 }
 void task(render);return {refresh:()=>task(render),show(value){show(value);void task(render);}};
}
