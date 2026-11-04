import {mountReports,openAdmissionMonth} from './admin-reports-ui.js?v=20261103-desk-1';
import {addFollowupImage} from './admin-notices.js?v=20261103-desk-1';
import {canonicalRecord} from './admin-records.js?v=20261102-settings-1';
import {whatsappURL} from './admin-receipt-image.js?v=20261102-settings-1';
let app=null;
import {feeStatement} from './admin-fee-statement-model.js?v=20261102-settings-1';
import {indiaDate,monthLabel,money,escapeHTML as e} from './admin-feature-model.js?v=20261102-settings-1';
import {reminder} from './admin-reminder-model.js?v=20261103-desk-1';
const monthNow=()=>indiaDate().slice(0,7);
const previousMonth=()=>{const [y,m]=monthNow().split('-').map(Number);return new Date(Date.UTC(y,m-2,1)).toISOString().slice(0,7);};
const records=()=>app.snapshot().records;
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
export async function reminderPNG(value){
 // Do not let an unrelated dashboard font keep a reminder download waiting.
 await Promise.race([document.fonts.load('400 34px Inter').catch(()=>[]),new Promise(resolve=>setTimeout(resolve,2000))]);
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=1600;
 const lines=[];function wrap(text,width,size=34){ctx.font=`${size}px Inter,Arial,sans-serif`;let line='';const result=[];for(const word of text.split(/\s+/)){if(ctx.measureText(line+' '+word).width>width&&line){result.push(line);line='';}line+=(line?' ':'')+word;}if(line)result.push(line);return result;}
 const name=wrap(value.statement.student.name,1320,46);
 value.rows.forEach(row=>lines.push({label:row.label,amount:money(row.balance)}));
 canvas.height=850+name.length*62+lines.length*94;
 ctx.fillStyle='#fbf6e9';ctx.fillRect(0,0,1600,canvas.height);
 ctx.fillStyle='#152d43';ctx.fillRect(0,0,1600,210);
 function text(s,x,y,size=34,colour='#21394c',weight=400){ctx.fillStyle=colour;ctx.font=`${weight} ${size}px Inter,Arial,sans-serif`;ctx.fillText(s,x,y);}
 text('REHAAN COMPUTERS',100,105,54,'#f7dfaa',700);text('MONTHLY FEE REMINDER',100,162,27,'#e5edf5',500);
 let y=290;name.forEach(line=>{text(line,100,y,46,'#21394c',600);y+=62;});text('Admission '+value.statement.student.admission+'  •  As of '+value.statement.asOf,100,y,28);y+=85;
 text('UNPAID LEARNING MONTH',100,y,25,'#6d716c',600);text('REMAINING',1190,y,25,'#6d716c',600);y+=30;
 lines.forEach(row=>{ctx.strokeStyle='#d9cfb8';ctx.beginPath();ctx.moveTo(100,y);ctx.lineTo(1500,y);ctx.stroke();text(row.label,100,y+56,36);text(row.amount,1180,y+56,36,'#21394c',600);y+=94;});
 y+=30;ctx.fillStyle='#152d43';ctx.fillRect(100,y,1400,140);text('TOTAL TO PAY',135,y+54,28,'#eed7a5',500);text(money(value.total),135,y+110,48,'#fff4ce',700);y+=210;
 text('FEE PAYMENT  •  6006433125',100,y,34,'#21394c',600);y+=57;
 text('Already paid? Please share your payment confirmation.',100,y,28);y+=50;
 text('Upcoming fees are excluded. This notice is not a payment receipt.',100,y,25,'#687169');
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Image could not be created.')),'image/png'));
}
export function openReminder(entry,services=app){
 const uid=services?.identity()?.uid;if(!uid)throw Error('Sign in again.');
 const original=canonicalRecord(entry.data);
 const current=()=>services.identity()?.uid===uid&&canonicalRecord(services.snapshot().records.find(r=>r.id===entry.id)?.data)===original;

 document.querySelector('#nextReminder')?.remove();
 const value=reminder(entry),dialog=document.createElement('dialog');dialog.id='nextReminder';dialog.className='next-dialog';dialog.setAttribute('aria-label','All pending fee reminder');
 dialog.innerHTML=`<h2>One reminder. Every due month.</h2><p>${e(entry.data.fullName)} · ${e(entry.data.phone||'No saved phone')}<br>${value.rows.length} unpaid months · <strong>${money(value.total)}</strong></p>${value.canShare?`<pre>${e(value.message)}</pre>`:`<p>${value.statement.reliable?'No unpaid fees are due yet. Upcoming fees are excluded.':'This record needs review before an amount can be shared.'}</p>`}<div class="next-actions"><button data-action="download" ${value.canShare?'':'disabled'}>Download reminder image · PNG</button><button data-action="image" ${value.canShare?'':'disabled'}>Preview image</button><button data-action="whatsapp" ${value.canShare?'':'disabled'}>Open WhatsApp · filled message</button><button data-action="close">Close</button></div><p id="nextReminderStatus" role="status">Open WhatsApp to use the full message shown above. Attaching the downloaded image is optional and manual. You still need to press Send; opening a chat does not mark fees paid.</p><div id="nextReminderImage"></div>`;
 document.body.append(dialog);dialog.showModal();let imageURL;
 dialog.onclose=()=>{if(imageURL)URL.revokeObjectURL(imageURL);dialog.remove();};
 dialog.onclick=async event=>{const b=event.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,status=dialog.querySelector('#nextReminderStatus');
  if(action==='close'){dialog.close();return;}
  if(!current()){status.textContent='The record or session changed. Close and reopen this reminder.';return;}
  if(action==='whatsapp'){const url=whatsappURL(value.statement.student.phone,value.message);if(!url){status.textContent='Save a valid student mobile number first.';return;}const opened=window.open(url,'_blank');if(opened)opened.opener=null;status.textContent=opened?'WhatsApp opened. Review the message, attach the downloaded image if needed, and press Send. No delivery has been recorded.':'Pop-up blocked. Allow WhatsApp pop-ups and try again.';return;}
  b.disabled=true;status.textContent='Preparing the complete reminder image…';try{const blob=await reminderPNG(value);if(!dialog.isConnected)return;if(!current())throw Error('Record or session changed. Reopen the reminder.');
   if(action==='download'){download(blob,'Rehaan-Fee-Reminder-'+value.statement.student.admission+'.png');status.textContent='Full reminder image downloaded. No payment or reminder status was changed.';}
   else{if(imageURL)URL.revokeObjectURL(imageURL);imageURL=URL.createObjectURL(blob);const img=document.createElement('img');img.src=imageURL;img.alt='Complete fee reminder for '+value.statement.student.name;dialog.querySelector('#nextReminderImage').replaceChildren(img);status.textContent='Complete reminder image ready. Download it to attach in WhatsApp.';}
  }catch(error){status.textContent=error.message;}finally{b.disabled=false;}
 };
}
function mountMonths(host){
 const section=document.createElement('section');section.className='next-month-review';section.id='nextMonthReview';
 section.innerHTML=`<span class="workspace-eyebrow">MONTHLY PAYMENT REVIEW</span><h2>Who paid, for which month?</h2><p>Separate the month a fee belongs to from the date money was received.</p><div class="next-controls"><label>Month<input id="nextMonth" type="month" value="${previousMonth()}"></label><button id="nextCurrent">Current month</button><button id="nextPrevious">Previous month</button><label>Review by<select id="nextBasis"><option value="fee">Fee / learning month</option><option value="received">Payment received during month</option></select></label><label>Show<select id="nextState"><option value="all">Everyone</option><option value="paid">Fully paid</option><option value="partial">Partly paid</option><option value="unpaid">Unpaid & due</option><option value="upcoming">Upcoming</option></select></label><label>Find student / receipt<input id="nextSearch" type="search" placeholder="Name, admission, receipt no."></label></div><p id="nextMonthExplanation"></p><div id="nextMonthTotals" class="next-month-totals"></div><div id="nextMonthRows"></div>`;
 host.prepend(section);const $=s=>section.querySelector(s);
 function render(){const month=$('#nextMonth').value,basis=$('#nextBasis').value,filter=$('#nextState').value,q=$('#nextSearch').value.trim().toLowerCase();
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return;
  $('#nextState').disabled=basis==='received';
  $('#nextMonthExplanation').textContent=basis==='fee'?monthLabel(month)+' learning fees — paying in a later month still belongs to this fee month. Upcoming fees are labelled separately.': 'Payments dated in '+monthLabel(month)+' — each receipt shows the learning month it paid for. Older ledger entries without dated receipts cannot be assigned a payment date.';
  let rows=[];
  for(const entry of records().filter(a=>a.data.status==='Approved')){
   const statement=feeStatement(entry),row=statement.rows.find(r=>r.month===month),allReceipts=Object.values(entry.data.feeReceipts||{});
   const receipts=allReceipts.filter(r=>basis==='received'?r.date?.slice(0,7)===month:r.due===row?.key);
   if(basis==='received'?!receipts.length:!row)continue;
   if(q&&![entry.data.fullName,entry.data.admissionNumber,...receipts.map(r=>r.number)].join(' ').toLowerCase().includes(q))continue;
   if(basis==='fee'&&filter!=='all'&&!({paid:row.balance===0,partial:row.paid>0&&row.balance>0,unpaid:row.balance>0&&!row.upcoming,upcoming:row.upcoming&&row.balance>0}[filter]))continue;
   rows.push({entry,statement,row,receipts});
  }
  const received=rows.reduce((s,r)=>s+(!r.statement.reliable?0:basis==='received'?r.receipts.reduce((n,p)=>n+p.amount,0):r.row.paid),0);
  $('#nextMonthTotals').innerHTML=`<span><strong>${rows.length}</strong> students shown</span><span>Recorded payments (reviewed records) <strong>${money(received)}</strong></span>${basis==='fee'?`<span>Due now <strong>${money(rows.reduce((s,r)=>s+(r.statement.reliable&&!r.row.upcoming?r.row.balance:0),0))}</strong></span>`:''}`;
  $('#nextMonthRows').innerHTML=rows.map(({entry,statement,row,receipts})=>`<article class="next-row"><div><strong>${e(entry.data.fullName)}</strong><small>Admission ${e(entry.data.admissionNumber)}</small><small>${e(entry.data.coursePreference)}</small></div><div>${basis==='fee'?`<strong>${e(row.status)} · ${money(row.paid)} paid</strong><small>${money(row.balance)} remaining · due ${e(row.key)}</small>${row.legacyPaid?'<small>Older ledger amount has no dated receipt.</small>':''}`:`<strong>${money(receipts.reduce((s,r)=>s+r.amount,0))} received</strong><small>${receipts.length} dated receipt(s)</small>`}${statement.reliable?'':'<small>Record needs review</small>'}</div><div class="next-actions"><button data-statement="${e(entry.id)}">Full statement</button><button data-reminder="${e(entry.id)}" ${statement.reliable?'':'disabled'}>All due reminder</button></div><div class="next-receipts">${receipts.map(r=>`<button data-student="${e(entry.id)}" data-receipt="${e(r.id)}">Receipt ${e(r.number)} · ${money(r.amount)}<small>Paid ${e(r.date)} · for ${e(r.month||'recorded fee period')}</small></button>`).join('')||'<small>No saved receipt for this month. No receipt or payment date has been invented.</small>'}</div></article>`).join('')||'<p>No records match this month and filter.</p>';
 }
 section.addEventListener('input',render);section.addEventListener('change',render);
 section.onclick=event=>{const b=event.target.closest('button');if(!b)return;
  if(b.id==='nextCurrent'||b.id==='nextPrevious'){$('#nextMonth').value=b.id==='nextCurrent'?monthNow():previousMonth();render();}
  if(b.dataset.statement)app.statement(b.dataset.statement);
  if(b.dataset.reminder){const entry=records().find(r=>r.id===b.dataset.reminder);if(entry)openReminder(entry);}
  if(b.dataset.receipt)app.receipt(b.dataset.student,b.dataset.receipt);
 };
 render();
}
function attendanceHelp(){
 const form=document.querySelector('#attendanceForm'),month=document.querySelector('#attendanceMonth');if(!form||!month||document.querySelector('#nextAttendanceHelp'))return;
 const help=document.createElement('aside');help.id='nextAttendanceHelp';help.className='next-attendance-help';help.innerHTML='<strong>Which register month are you entering?</strong><p></p><button type="button" data-month="current">Current month</button><button type="button" data-month="previous">Previous month</button>';form.before(help);
 const update=()=>{if(!month.value)return;const current=month.value===monthNow(),[y,m]=month.value.split('-').map(Number),max=current?Number(indiaDate().slice(8)):new Date(y,m,0).getDate();help.querySelector('p').textContent=monthLabel(month.value)+': enter 0–'+max+' days attended. '+(current?'Only '+max+' calendar days have elapsed so far. Enter classes already held, not planned future classes.':'Use this month’s paper register; classes held must be at least days attended.')+' Example: attended 18 out of 24 classes = 75% (for a completed month).';};
 month.addEventListener('change',update);help.onclick=event=>{const b=event.target.closest('[data-month]');if(!b||month.disabled)return;month.value=b.dataset.month==='previous'?previousMonth():monthNow();month.dispatchEvent(new Event('change',{bubbles:true}));update();};update();
}
function init(){
 const top=document.querySelector('#adminDashboard .topbar'),find=document.querySelector('#workspaceFind');if(!top||!find)return;
 find.setAttribute('aria-label','Search students by name, mobile or admission number, or open a dashboard section');
 const strip=document.createElement('div');strip.className='next-brief';strip.innerHTML='<b>YOUR DESK</b><div class="next-ticker-window"><div class="next-ticker-track"></div></div><button type="button">Fee review →</button>';top.after(strip);
 const prompts=['Search a student by name…','Find an admission number…','Search a saved mobile number…','Open Fees, Attendance or Mark Cards…'];
 const tips=['Review previous-month payments in Fee Statements.','Check every due month before sharing a fee reminder.','Entering last month’s register? Select Previous month in Attendance.'];let i=0;
 const track=strip.querySelector('.next-ticker-track');
 const tickerText=tips.join('     ✦     ');track.innerHTML='<span>'+e(tickerText)+'</span><span aria-hidden="true">'+e(tickerText)+'</span>';
 function animate(){if(document.hidden||document.activeElement===find||matchMedia('(prefers-reduced-motion: reduce)').matches||document.querySelector('#adminDashboard.studio-reduced-motion'))return;
  const hint=document.createElement('span');hint.className='next-search-hint';hint.textContent=prompts[++i%prompts.length];find.querySelector('span').replaceWith(hint);
 }
 find.querySelector('span').textContent=prompts[0];setInterval(animate,5500);
 document.addEventListener('visibilitychange',()=>{track.style.animationPlayState=document.hidden?'paused':'';});
 new MutationObserver(addFollowupImage).observe(document.body,{childList:true,subtree:true});addFollowupImage();
 strip.querySelector('button').onclick=()=>document.querySelector('.nav [data-section=statements]').click();
 function mount(){const view=document.querySelector('#workspaceView');if(view?.querySelector('#reportJson'))mountReports(view,app);const hub=document.querySelector('#feeStatementsWorkspace');if(hub&&!hub.querySelector('#nextMonthReview'))mountMonths(hub);attendanceHelp();}
 document.querySelector('#adminDashboard').addEventListener('click',event=>{const bar=event.target.closest('[data-admission-month]');if(bar)openAdmissionMonth(app,bar.dataset.admissionMonth);});
 document.querySelector('#adminDashboard').addEventListener('keydown',event=>{const bar=event.target.closest('[data-admission-month]');if(bar&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openAdmissionMonth(app,bar.dataset.admissionMonth);}});
 new MutationObserver(mount).observe(document.querySelector('#adminDashboard'),{subtree:true,childList:true});mount();
}
let installed=false;
export function initDesk(bridge){app=bridge;if(installed)return;installed=true;init();}
document.addEventListener('admin-session-cleared',()=>{for(const d of document.querySelectorAll('#nextReminder,#nextCancellation,#admissionMonthDialog')){d.close?.();d.remove();}});
