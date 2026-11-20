import {previewAdminBridge as app} from '/public/admin-app.js?v=20261102-settings-1';
const $=selector=>document.querySelector(selector);
const e=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function initMobileUpdates(){
 const nav=document.createElement('button');nav.type='button';nav.disabled=true;nav.dataset.mobileUpdates='';nav.innerHTML='<i aria-hidden="true">✦</i>RC Learn updates';
 const anchor=$('.nav [data-section=attendance]')||$('.nav [data-section=overview]');anchor.after(nav);
 const host=document.createElement('section');host.id='mobileUpdates';host.className='mobile-updates';host.hidden=true;$('#workspaceSummary').before(host);
 let active=false,busy=false,notice='';
 function leave(){active=false;host.hidden=true;nav.classList.remove('active');nav.removeAttribute('aria-current');}
 async function open(){
  if(!app.snapshot().ready)return;
  $('.nav [data-section=overview]')?.click();active=true;host.hidden=false;nav.classList.add('active');nav.setAttribute('aria-current','page');
  document.body.classList.remove('nav-open');await render();
 }
 nav.onclick=open;
 document.addEventListener('click',event=>{if(event.target.closest('[data-section],[data-workbench],[data-records-centre]'))leave();},true);
 async function imageValue(file){
  if(!file?.size)return '';
  if(file.size>350000)throw Error('Choose an image smaller than 350 KB.');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Use a JPG, PNG or WebP image.');
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(Error('Image could not be read.'));reader.readAsDataURL(file);});
 }
 async function render(){
  if(!active)return;busy=true;
  try{
   const rows=await app.mobileUpdates(),records=app.snapshot().records,batches=[...new Set(records.map(row=>String(row.data.batch||'').trim()).filter(Boolean))].sort();
   host.innerHTML=`<div class="mobile-updates-head"><span>RC LEARN · LIVE STUDENT FEED</span><h2>Publish once. Reach every student.</h2><p>Share class notes, homework, announcements and exam dates. Published items appear in the Android app automatically.</p></div>
   <form id="mobileUpdateForm" class="mobile-update-form">
    <label>Update type<select name="kind"><option>Class notes</option><option>Homework</option><option>Notice</option><option>Exam</option></select></label>
    <label>Students<select name="batch"><option value="">All students</option>${batches.map(batch=>`<option>${e(batch)}</option>`).join('')}</select></label>
    <label class="wide">Title<input name="title" maxlength="140" required placeholder="What should students know?"></label>
    <label class="wide">Details<textarea name="body" maxlength="4000" required placeholder="Write a clear update…"></textarea></label>
    <label>Post date<input name="day" type="date" value="${new Date(Date.now()+19800000).toISOString().slice(0,10)}" required></label>
    <label>Exam date (optional)<input name="examDay" type="date"></label>
    <label class="wide">Optional image · up to 350 KB<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label>
    <button class="primary" type="submit">Publish to RC Learn</button><p role="status">${e(notice)}</p>
   </form>
   <div class="mobile-update-list"><h3>Recent app updates</h3>${rows.length?rows.map(row=>`<article><div><small>${e(row.kind)} · ${e(row.day)}${row.batch?' · '+e(row.batch):' · All students'}</small><h3>${e(row.title)}</h3><p>${e(row.body)}</p></div><button type="button" data-update-id="${e(row.id)}" data-published="${row.published===true}">${row.published===true?'Unpublish':'Publish again'}</button></article>`).join(''):'<p>No RC Learn updates have been created yet.</p>'}</div>`;
   $('#mobileUpdateForm').onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;const form=event.currentTarget,data=Object.fromEntries(new FormData(form));try{data.photo=await imageValue(form.elements.photo.files[0]);await app.publishMobileUpdate(data);notice='Published. Students will receive it automatically.';await render();}catch(error){notice=error.message;busy=false;await render();}};
   host.querySelectorAll('[data-update-id]').forEach(button=>button.onclick=async()=>{if(busy)return;busy=true;try{await app.setMobileUpdatePublished(button.dataset.updateId,button.dataset.published!=='true');notice=button.dataset.published==='true'?'Update unpublished.':'Update published again.';}catch(error){notice=error.message;}busy=false;await render();});
  }catch(error){host.innerHTML='<p role="alert">RC Learn updates could not load: '+e(error.message)+'</p>';}finally{busy=false;}
 }
 function sync(){const ready=app.snapshot().ready;nav.disabled=!ready;if(!ready){leave();host.replaceChildren();}}
 new MutationObserver(sync).observe($('#adminDashboard'),{attributes:true,attributeFilter:['style']});
 new MutationObserver(sync).observe($('#workspaceSummary'),{childList:true});sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initMobileUpdates,{once:true});else initMobileUpdates();
