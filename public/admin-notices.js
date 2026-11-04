import {whatsappURL} from './admin-receipt-image.js?v=20261102-settings-1';
import {escapeHTML as e} from './admin-feature-model.js?v=20261102-settings-1';
export function cancellation(entry,reason,enrolled=true){
 reason=String(reason||'').trim();if(reason.length<3||reason.length>200)throw Error('Enter a clear reason between 3 and 200 characters.');
 const name=String(entry.data.fullName||'Student'),phone=String(entry.data.phone||'');
 const message=['*REHAAN COMPUTERS*','*Important Notice*','','Hello '+name+',',enrolled?'Your admission has been cancelled.':'Your admission application has been withdrawn.','*Reason:* '+reason,'','Please contact the institute if you need clarification.'].join('\n');
 return {name,phone,message};
}
export function showCancellation(notice,session){
 const uid=session();if(!uid)return;
 document.querySelector('#nextCancellation')?.remove();const d=document.createElement('dialog');d.id='nextCancellation';d.className='next-dialog';d.setAttribute('aria-label','Cancellation notice');
 d.innerHTML=`<h2>Record deleted. Notice ready.</h2><p>For ${e(notice.name)} · ${e(notice.phone||'No saved mobile number')}</p><pre>${e(notice.message)}</pre><div class="next-actions"><button data-notice-action="copy">Copy message</button><button data-notice-action="whatsapp" ${/^(?:91)?[6-9]\d{9}$/.test(notice.phone.replace(/\D/g,''))?'':'disabled'}>Open student’s WhatsApp</button><button data-notice-action="close">Close</button></div><p role="status">Record deleted. No message has been sent. Keep this notice open until you have copied or sent it.</p>`;
 document.body.append(d);d.showModal();d.onclose=()=>d.remove();d.onclick=async event=>{const b=event.target.closest('[data-notice-action]');if(!b)return;const status=d.querySelector('[role=status]');if(b.dataset.noticeAction==='close'){d.close();return;}if(session()!==uid){d.close();return;}if(b.dataset.noticeAction==='whatsapp'){const url=whatsappURL(notice.phone,notice.message);if(!url){status.textContent='No valid mobile number saved. Copy the message instead.';return;}const opened=window.open(url,'_blank');if(opened)opened.opener=null;status.textContent=opened?'WhatsApp opened. Review and press Send yourself. Delivery is not confirmed.':'Pop-up blocked. Allow WhatsApp pop-ups and try again.';return;}try{await navigator.clipboard.writeText(notice.message);status.textContent='Message copied. No message was sent.';}catch{status.textContent='Copy is unavailable here. Select and copy the displayed message.';}};
}
export async function noticePNG(message){
 await Promise.race([document.fonts.load('400 42px Inter').catch(()=>[]),new Promise(r=>setTimeout(r,2000))]);
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=1600;
 ctx.font='400 42px Inter,Arial,sans-serif';const rows=[];
 for(const paragraph of message.replace(/\*/g,'').split('\n').slice(2)){
  if(!paragraph.trim()){rows.push('');continue;}
  let line='';for(const char of paragraph){if(ctx.measureText(line+char).width>1360){rows.push(line);line='';}line+=char;}if(line)rows.push(line);
 }
 canvas.height=420+rows.length*65;ctx.fillStyle='#fcf8ee';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#142d43';ctx.fillRect(0,0,1600,235);
 ctx.fillStyle='#f5d99d';ctx.font='700 54px Inter,Arial,sans-serif';ctx.fillText('REHAAN COMPUTERS',110,100);ctx.fillStyle='#eef4f8';ctx.font='500 32px Inter,Arial,sans-serif';ctx.fillText('IMPORTANT NOTICE',110,166);
 let y=310;for(const line of rows){ctx.fillStyle='#20394e';ctx.font=(/^[1-4]\.|Please reply/.test(line)?'600':'400')+' 42px Inter,Arial,sans-serif';ctx.fillText(line,110,y);y+=65;}
 ctx.strokeStyle='#c2a469';ctx.lineWidth=2;ctx.strokeRect(45,260,1510,canvas.height-305);
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare image.')),'image/png'));
}
export function addFollowupImage(){
 const dialog=document.querySelector('#classFollowupDialog');if(!dialog||dialog.querySelector('#followupImageTools'))return;
 const tools=document.createElement('div');tools.id='followupImageTools';tools.className='next-actions';tools.innerHTML='<button type="button" data-followup-image="preview">Preview notice image</button><button type="button" data-followup-image="download">Download notice · PNG</button><p role="status">Attach the downloaded image in the student’s WhatsApp chat. Nothing is sent automatically.</p><div class="followup-image-stage"></div>';dialog.append(tools);let url;
 dialog.addEventListener('close',()=>{if(url)URL.revokeObjectURL(url);});
 tools.onclick=async event=>{const b=event.target.closest('[data-followup-image]');if(!b)return;const status=tools.querySelector('[role=status]');b.disabled=true;status.textContent='Preparing full notice…';try{const blob=await noticePNG(dialog.querySelector('.attendance-message').textContent);if(!dialog.isConnected)return;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);if(b.dataset.followupImage==='download'){const link=document.createElement('a');link.href=url;link.download='Rehaan-Class-Follow-Up.png';link.click();status.textContent='Image downloaded. Attach it manually in WhatsApp.';}else{const img=document.createElement('img');img.src=url;img.alt='Complete class follow-up notice';tools.querySelector('.followup-image-stage').replaceChildren(img);status.textContent='Image ready with all four reply options and the 24-hour notice.';}}catch(error){status.textContent=error.message;}finally{b.disabled=false;}};
}

document.addEventListener('admin-session-cleared',()=>{for(const dialog of document.querySelectorAll('#nextCancellation,#classFollowupDialog')){dialog.close?.();dialog.remove();}});
