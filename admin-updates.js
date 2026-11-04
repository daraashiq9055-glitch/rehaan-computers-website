import {updatesConfig as config} from './updates-config.js';
export function mountUpdates(host,app){
 host.innerHTML='<h3>Website followers & updates</h3><p>Count subscribed browsers/devices and send institute announcements. Counts are not unique people; notification delivery or reading cannot be guaranteed.</p><button id="updatesStats">Load follower count</button><button id="updatesTest" type="button">Test on this browser</button><p id="updatesTestStatus" role="status">Follow the homepage on this browser first, then send yourself a test. Other followers will not receive it.</p><p id="updatesCount" role="status">Count not loaded.</p><form id="updatesForm"><div class="next-controls"><label>Notification title<input name="title" required maxlength="100" value="Rehaan Computers"></label><label>Website path<input name="path" required maxlength="200" value="/"></label></div><label>Short announcement<textarea name="body" required maxlength="240" rows="3" placeholder="New evening batch starts Monday. Visit our website for details."></textarea></label><p id="updatesPreview"></p><button type="submit" disabled>Review & send update</button><p id="updatesSendStatus" role="status"></p></form>';
 const $=s=>host.querySelector(s),form=$('#updatesForm');let id=null,fingerprint=null,busy=false;
 async function request(path,data){const uid=app.identity()?.uid;if(!uid)throw Error('Sign in again.');const token=await app.idToken();if(app.identity()?.uid!==uid)throw Error('Session changed.');const response=await fetch(config.endpoint+path,{method:data?'POST':'GET',headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(120000)});const result=await response.json();if(app.identity()?.uid!==uid||!host.isConnected)throw Error('Session changed.');if(!response.ok)throw Error(result.error||'Update service unavailable.');return result;}
 $('#updatesStats').onclick=async()=>{const b=$('#updatesStats');b.disabled=true;try{const r=await request('/admin/stats');$('#updatesCount').textContent=r.subscribedBrowsers+' subscribed browsers/devices · checked '+new Date(r.asOf).toLocaleString('en-IN');form.querySelector('[type=submit]').disabled=false;}catch(error){$('#updatesCount').textContent=error.message;}finally{b.disabled=false;}};
 $('#updatesTest').onclick=async()=>{
  const button=$('#updatesTest'),status=$('#updatesTestStatus'),uid=app.identity()?.uid;let stored;
  try{stored=JSON.parse(localStorage.getItem('rehaan-browser-updates-v1')||'null');}catch{}
  if(!uid||!stored?.subscribed||!stored.token||!stored.secret){status.textContent='Open the homepage in this browser and choose Follow for updates first, then return here.';return;}
  button.disabled=true;let unsubscribe=()=>{},received=false;const testId=crypto.randomUUID();
  try{
   status.textContent='Preparing your private browser test…';
   const [{initializeApp,getApps},{getMessaging,isSupported,onMessage}]=await Promise.all([import('https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging.js')]);
   if(!await isSupported())throw Error('This browser does not support notifications.');
   if(app.identity()?.uid!==uid||!host.isConnected)throw Error('Session changed.');
   const client=getApps().find(a=>a.name==='website-updates')||initializeApp(config.firebase,'website-updates');
   unsubscribe=onMessage(getMessaging(client),payload=>{if(payload.data?.testId===testId&&app.identity()?.uid===uid&&host.isConnected){received=true;status.textContent='Success: the test update arrived in this browser. No other follower was contacted.';}});
   await request('/admin/test',{token:stored.token,secret:stored.secret,testId});
   if(!received)status.textContent='Test accepted for this browser only. Waiting for arrival; also check your device notifications. Acceptance alone does not confirm delivery.';
   setTimeout(unsubscribe,60000);
  }catch(error){unsubscribe();status.textContent=error.message;}finally{button.disabled=false;}
 };
 form.oninput=()=>{if(busy)return;id=null;fingerprint=null;form.querySelector('[type=submit]').textContent='Review & send update';$('#updatesPreview').textContent=form.elements.title.value+' — '+form.elements.body.value;};
 form.onsubmit=async event=>{event.preventDefault();if(busy)return;const fields={title:form.elements.title.value.trim(),body:form.elements.body.value.trim(),path:form.elements.path.value.trim()},value=JSON.stringify(fields),status=$('#updatesSendStatus');let url;try{url=new URL(fields.path,location.origin);}catch{status.textContent='Enter a path on this website, such as /#courses.';return;}if(!fields.path.startsWith('/')||fields.path.startsWith('//')||url.origin!==location.origin){status.textContent='Only paths on this website are allowed.';return;}
 if(!confirm('Send this institute update to subscribed browsers?\n\n'+fields.title+'\n'+fields.body+'\n'+fields.path+'\n\nThis sends a real notification and cannot be recalled.'))return;
 if(!id||fingerprint!==value){id=crypto.randomUUID();fingerprint=value;}
 busy=true;for(const input of form.elements)input.disabled=true;status.textContent='Sending a batch of up to 10 subscriptions…';
 try{const r=await request('/admin/send',{id,...fields});status.textContent=r.accepted+' accepted by the notification provider; '+r.unknown+' uncertain in this batch ('+r.uncertainTotal+' uncertain overall); '+r.expired+' expired; '+r.remaining+' remaining. Acceptance is not proof of delivery or reading.';if(r.remaining){form.querySelector('[type=submit]').textContent='Review & send next batch';}else{form.querySelector('[type=submit]').textContent='Update processed';form.dataset.complete='true';}}
 catch(error){status.textContent=error.message+' Retry uses the same update ID to avoid repeating completed sends.';}
 finally{busy=false;for(const input of form.elements)input.disabled=false;if(form.dataset.complete==='true'){form.querySelector('[type=submit]').disabled=true;delete form.dataset.complete;}}
 };
 form.addEventListener('input',()=>{if(!busy)form.querySelector('[type=submit]').disabled=false;});
}
