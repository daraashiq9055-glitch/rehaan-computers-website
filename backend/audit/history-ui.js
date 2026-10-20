// Read-only, paginated audit view for the dashboard release candidate.
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=value=>value&&Number.isFinite(new Date(value).getTime())?new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Kolkata',timeZoneName:'short'}).format(new Date(value)):'Not recorded';
const money=value=>'₹'+Number(value).toLocaleString('en-IN',{maximumFractionDigits:2});
function text(snapshot,field){
  if(snapshot?.present===false)return 'Not recorded';if(snapshot?.redacted)return 'Private value omitted';
  const value=snapshot?.value??snapshot;
  if(value?.omitted)return 'Value omitted: '+value.reason;
  if(field==='photo')return snapshot?.hasPhoto?'Photograph recorded (image content is not logged)':'No photograph';
  if(field.startsWith('monthlyFees.')&&typeof value==='number')return money(value);
  if(field.startsWith('feeReceipts.')&&value&&typeof value==='object')return [value.number,'Student: '+(value.student?.name||''),'Received date: '+(value.date||''),'Amount: '+money(value.amount/100),'Method: '+(value.method||'Unspecified'),'Remaining at issue: '+money(value.balanceAtIssue/100),value.note||'',value.amendments?.length?'Saved corrections: '+value.amendments.length:''].filter(Boolean).join('\n');
  if(field==='studentLifecycle'&&value?.stage)return 'Stage: '+value.stage+'\n'+(value.events?.at(-1)?.reason||'');
  if(field==='learningProgress'&&value?.byCourse)return Object.values(value.byCourse).map(course=>(course.course||'Course')+'\n'+(course.topics||[]).map(topic=>(topic.done?'✓ ':'○ ')+topic.title).join('\n')).join('\n\n');
  if(field==='payment'&&value&&typeof value==='object')return 'Admission payment: '+(value.status||'Unspecified')+(typeof value.amount==='number'?'\nAmount: '+money(value.amount):'');
  return typeof value==='object'?JSON.stringify(value,null,2):String(value);
}
const fieldLabel=field=>field.startsWith('monthlyFees.')?'Monthly tuition · '+field.slice(12):field.startsWith('feeReceipts.')?'Payment receipt':({studentLifecycle:'Student lifecycle',learningProgress:'Learning checklist',fullName:'Student name',parentName:'Parent / guardian',payment:'Admission payment',photo:'Photograph',adminNote:'Private admin note'})[field]||field.replace(/([a-z])([A-Z])/g,'$1 $2');
export function createHistoryView({host,readPage,records,identity,enabled,isActive=()=>true}) {
  let generation=0,events=[],cursor=null,more=false,student='',loading=false,loaded=false,error='';
  function clear(){generation++;events=[];cursor=null;more=false;student='';loading=false;loaded=false;error='';document.querySelectorAll('.history-dialog').forEach(dialog=>{dialog.close();dialog.remove();});}
  function draw(){
    const rows=records(),names=new Map(rows.map(row=>[row.id,row.data.fullName||'Student']));
    for(const item of events){const name=(item.changes||[]).find(change=>change.field==='fullName');const saved=name?.after?.value||name?.before?.value;if(!names.has(item.applicationId)&&typeof saved==='string')names.set(item.applicationId,saved);}
    host.innerHTML=`<div class="journey-intro"><span class="records-kicker">SERVER-RECORDED CHANGE HISTORY</span><h2>Understand what changed.</h2><p>Read-only history of student record changes. Events can arrive after the original save. Older changes from before logging was enabled are unavailable.</p></div>${!enabled?'<p class="workbench-notice" role="status">Secure history is not enabled yet. Existing student and payment tools remain available.</p>':`<div class="history-controls"><label>Student<select id="secureHistoryStudent"><option value="">All records, including deleted students</option>${rows.slice().sort((a,b)=>String(a.data.fullName||'').localeCompare(String(b.data.fullName||''))).map(row=>`<option value="${escape(row.id)}" ${row.id===student?'selected':''}>${escape(row.data.fullName||'Student')} · ${escape(row.data.admissionNumber||row.id)}</option>`).join('')}</select></label><button type="button" id="secureHistoryRefresh" ${loading?'disabled':''}>Refresh history</button><button type="button" id="secureHistoryExport" ${!events.length||loading?'disabled':''}>Export loaded history</button></div><p class="workbench-notice" role="status">${escape(error||(loading?'Loading secure history…':events.length+' event(s) loaded. Identity is the server principal; unavailable identity is never guessed.'))}</p><div class="history-events">${events.map(item=>`<button type="button" data-secure-event="${escape(item.id)}"><span><strong>${escape(names.get(item.applicationId)||'Deleted or unavailable student')}</strong><small>${escape(item.applicationId)}</small></span><span><b>Record ${escape(item.operation)}</b><small>${escape(time(item.occurredAt))} · ${escape(item.actor?.principal||'Identity unavailable')} (${escape(item.actor?.type||'unknown')})</small></span><span>${item.changedFieldCount} fields ↗</span></button>`).join('')||(!loading&&!error?'<p>No history entries were found. Read-only browsing does not create an event.</p>':'')}</div><button type="button" id="secureHistoryMore" ${!more||loading?'disabled':''}>Load older events</button>`}`;
    if(!enabled)return;
    host.querySelector('#secureHistoryStudent').disabled=loading;
    host.querySelector('#secureHistoryStudent').onchange=event=>{student=event.target.value;load(true);};
    host.querySelector('#secureHistoryRefresh').onclick=()=>load(true);
    host.querySelector('#secureHistoryMore').onclick=()=>load(false);
    host.querySelector('#secureHistoryExport').onclick=()=>{
      if(!identity())return;
      const body={exportedAt:new Date().toISOString(),scope:'loaded pages only',applicationId:student||null,events};
      const url=URL.createObjectURL(new Blob([JSON.stringify(body,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='rehaan-private-change-history.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    host.querySelectorAll('[data-secure-event]').forEach(button=>button.onclick=()=>{
      const item=events.find(event=>event.id===button.dataset.secureEvent);if(!item||!identity())return;
      const dialog=document.createElement('dialog');dialog.className='history-dialog';dialog.setAttribute('aria-label','Secure change details');
      dialog.innerHTML=`<div class="history-dialog-head"><div><span class="records-kicker">SERVER-RECORDED CHANGE</span><h2>Record ${escape(item.operation)}</h2><p>${escape(item.actor?.principal||'Identity unavailable')} · ${escape(time(item.occurredAt))}</p></div><button type="button" aria-label="Close history details">×</button></div>${item.limited?'<p>Some large or private values are omitted. This is a change log, not a restorable student backup.</p>':''}${(item.changes||[]).map(change=>`<section><h3>${escape(fieldLabel(change.field))}</h3>${change.omitted?'<p>Value omitted: '+escape(change.reason)+'</p>':`<div><label>Before<pre>${escape(text(change.before,change.field))}</pre></label><label>After<pre>${escape(text(change.after,change.field))}</pre></label></div>`}</section>`).join('')}`;
      document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();dialog.showModal();
    });
  }
  async function load(reset){
    if(loading||!identity()||!enabled)return;
    const request=++generation;loading=true;error='';if(reset){events=[];cursor=null;more=false;}draw();
    try {const page=await readPage({applicationId:student||null,after:cursor});if(request!==generation||!identity())return;const seen=new Set(events.map(event=>event.id));events.push(...page.entries.filter(event=>!seen.has(event.id)));cursor=page.cursor;more=page.hasMore;loaded=true;}
    catch(cause){if(request!==generation)return;error='History could not load. No student records were changed. '+cause.message;}
    finally {if(request===generation){loading=false;if(!host.hidden&&isActive())draw();}}
  }
  return {render(){draw();if(enabled&&!loaded&&!loading&&!error)void load(true);},clear};
}
