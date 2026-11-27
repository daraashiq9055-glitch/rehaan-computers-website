import {indiaDate,escapeHTML as e,monthLabel} from './admin-feature-model.js?v=20261102-settings-1';
import {attendanceValue,attendanceMessage,followupMessage,suggestedNotice} from './admin-attendance-model.js?v=20261105-follow-6';
import {whatsappURL} from './admin-receipt-image.js?v=20261102-settings-1';
export function openFollowup(entry){
 document.querySelector('#classFollowupDialog')?.remove();const dialog=document.createElement('dialog');dialog.id='classFollowupDialog';dialog.className='rc-feature-dialog';
 const message=followupMessage(entry.data.fullName||'Student'),url=whatsappURL(entry.data.phone,message);
 dialog.innerHTML=`<h2>Class follow-up</h2><p>${e(entry.data.fullName)} · ${e(entry.data.phone||'No mobile number saved')}</p><pre class="attendance-message">${e(message)}</pre>${url?`<a class="admin-save-btn" href="${e(url)}" target="_blank" rel="noopener noreferrer">Open WhatsApp</a>`:'<p>Save a valid student mobile number in Details first.</p>'}<p>The 24 hours starts when you send the message. Cancellation is always manual; this panel does not cancel an admission.</p><button type="button">Close</button>`;
 dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
}
export function mountAttendance({host,getRecords,save,assertSession}){
 const records=()=>{assertSession();return getRecords().filter(a=>a.data.status==='Approved'||a.data.admissionNumber);};let selected='',expected=null,busy=false;
 host.innerHTML=`<section class="workspace-card attendance-workspace"><header class="attendance-hero"><span class="attendance-eyebrow">REHAAN COMPUTERS · STUDENT CARE</span><h2>Monthly attendance</h2><p>Record attendance from your class register.</p></header><div class="attendance-summary" id="attendanceSummary"></div><p class="attendance-help">Enter days attended from your paper register. Blank means not recorded, not absent.</p><div class="attendance-controls"><label>Month<input id="attendanceMonth" type="month" value="${indiaDate().slice(0,7)}" max="${indiaDate().slice(0,7)}"></label><label>Find student<input id="attendanceSearch" type="search" placeholder="Name or admission number"></label></div><div class="attendance-layout"><div class="attendance-directory"><label>Batch<select id="attendanceBatch"><option value="">All batches</option></select></label><div class="attendance-filters"><button type="button" data-filter="all" aria-pressed="true">All students</button><button type="button" data-filter="missing" aria-pressed="false">Not recorded</button><button type="button" data-filter="followup" aria-pressed="false">Needs follow-up</button></div><p class="attendance-help">Follow-up: below 75% of entered class days.</p><div id="attendanceList"></div></div><div><form id="attendanceForm"><h3 id="attendanceStudent">Choose a student</h3><div id="attendanceProgress"></div><label>Days attended<input name="days" type="number" min="0" step="1" required></label><label>Class days held for this student (optional)<input name="totalDays" type="number" min="1" step="1"></label><button type="button" id="attendanceSuggest">Suggest notice</button><label>Notice to student (optional)<textarea name="note" maxlength="300" rows="3" placeholder="Please attend classes regularly."></textarea></label><div class="attendance-presets"><button type="button" data-notice="encourage">Encouragement</button><button type="button" data-notice="concern">Attendance concern</button><button type="button" data-notice="custom">Custom notice</button></div><button type="submit" class="admin-save-btn">Save monthly attendance</button><p id="attendanceStatus" role="status"></p></form><div class="rc-feature-actions"><button id="attendanceShare" type="button">Preview WhatsApp summary</button><button id="attendanceFollowup" type="button">Class follow-up</button></div><div id="attendanceSharePreview"></div></div></div></section>`;
 const $=s=>host.querySelector(s),form=$('#attendanceForm'),month=()=>$('#attendanceMonth').value,current=()=>records().find(a=>a.id===selected);
 let filter='all';
 const percent=v=>v&&Number.isInteger(v.days)&&Number.isInteger(v.totalDays)&&v.totalDays>0&&v.days<=v.totalDays?Math.round(v.days/v.totalDays*100):null;
 const needs=v=>percent(v)!==null&&v.days/v.totalDays<.75;
 const batches=[...new Set(records().map(a=>a.data.batch).filter(v=>typeof v==='string'&&v.trim()))].sort();
 $('#attendanceBatch').innerHTML=batches.reduce((html,b)=>html+`<option value="${e(b)}">${e(b)}</option>`,'<option value="">All batches</option>');
 function progress(){const v={days:Number(form.elements.days.value),totalDays:form.elements.totalDays.value?Number(form.elements.totalDays.value):null},pct=form.elements.days.value===''?null:percent(v);$('#attendanceProgress').innerHTML=pct===null?'<span>Enter class days to see an attendance percentage.</span>':`<div class="attendance-ring" style="--attendance-progress:${pct}%"><strong>${pct}%</strong></div><div><strong>${v.days} of ${v.totalDays}</strong><br>class days attended</div>`;}
 function list(){const all=records(),recorded=all.filter(a=>a.data.monthlyAttendance?.[month()]!==undefined).length;$('#attendanceSummary').innerHTML=[['Students',all.length],['Recorded',recorded],['Not recorded',all.length-recorded],['Need follow-up',all.filter(a=>needs(a.data.monthlyAttendance?.[month()])).length]].map(([label,count])=>`<div><span class="attendance-metric-icon">${label==='Recorded'?'✓':label==='Need follow-up'?'!':'▦'}</span><div><strong>${count}</strong><small>${label}</small></div></div>`).join('');const q=$('#attendanceSearch').value.trim().toLowerCase(),batch=$('#attendanceBatch').value;$('#attendanceList').innerHTML=all.filter(a=>[a.data.fullName,a.data.admissionNumber].join(' ').toLowerCase().includes(q)&&(!batch||a.data.batch===batch)&&(filter==='all'||(filter==='missing'?a.data.monthlyAttendance?.[month()]===undefined:needs(a.data.monthlyAttendance?.[month()])))).map(a=>{const v=a.data.monthlyAttendance?.[month()],pct=percent(v),initials=(a.data.fullName||'Student').split(/\s+/).slice(0,2).map(n=>n[0]).join('');return `<button type="button" data-attendance-student="${e(a.id)}" aria-pressed="${a.id===selected}"><span class="attendance-avatar">${e(initials)}</span><span class="attendance-person"><strong>${e(a.data.fullName)}</strong><small>ADM ${e(a.data.admissionNumber||'—')}</small></span><span class="attendance-days">${v===undefined?'Not recorded':Number.isInteger(v.days)?v.days+(pct!==null?' / '+v.totalDays:' days'):'Needs review'}${pct!==null?`<small>${pct}%</small><progress max="100" value="${pct}" aria-label="Attendance percentage"></progress>`:''}</span><span aria-hidden="true">›</span></button>`;}).join('')||'<p class="attendance-empty">No students match these filters.</p>';host.querySelectorAll('[data-attendance-student]').forEach(b=>b.onclick=()=>{if(busy)return;selected=b.dataset.attendanceStudent;load();});}
 $('#attendanceBatch').onchange=list;
 host.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;host.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));list();});
 host.querySelectorAll('[data-notice]').forEach(b=>b.onclick=()=>{if(b.dataset.notice==='custom'){form.elements.note.focus();return;}form.elements.note.value=b.dataset.notice==='encourage'?'Keep attending your classes regularly. We appreciate your effort.':'Please attend your classes regularly. If you need any help, contact us.';form.dispatchEvent(new Event('input'));});
 function load(){const entry=current();expected=structuredClone(entry?.data.monthlyAttendance?.[month()]??null);form.elements.days.value=expected?.days??'';form.elements.note.value=expected?.note??'';form.elements.totalDays.value=expected?.totalDays??'';$('#attendanceStudent').textContent=entry?entry.data.fullName+' · '+monthLabel(month()):'Choose a student';$('#attendanceStatus').textContent='';$('#attendanceSharePreview').replaceChildren();for(const control of form.elements)control.disabled=!entry;$('#attendanceShare').disabled=!entry||!expected;$('#attendanceFollowup').disabled=!entry;progress();list();}
 $('#attendanceSearch').oninput=list;$('#attendanceMonth').onchange=()=>{if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month()))return;load();};
 form.oninput=()=>{progress();$('#attendanceShare').disabled=true;$('#attendanceSharePreview').replaceChildren();$('#attendanceStatus').textContent='Save changes before sharing.';};
 $('#attendanceSuggest').onclick=()=>{try{const value=attendanceValue(month(),{days:form.elements.days.value,totalDays:form.elements.totalDays.value,note:''});form.elements.note.value=suggestedNotice(value);form.dispatchEvent(new Event('input'));}catch(error){$('#attendanceStatus').textContent=error.message;}};
 form.onsubmit=async event=>{event.preventDefault();if(busy||!current())return;const entry=current(),key=month();try{const input=attendanceValue(key,{days:form.elements.days.value,totalDays:form.elements.totalDays.value,note:form.elements.note.value});busy=true;host.querySelectorAll('input,textarea,button,select').forEach(c=>c.disabled=true);$('#attendanceStatus').textContent='Saving…';const saved=await save(entry.id,key,input,expected);if(!form.isConnected||host.hidden)return;assertSession();expected=saved;$('#attendanceStatus').textContent='Attendance saved for '+monthLabel(key)+'.';host.dispatchEvent(new Event('rc-attendance-updated'));}catch(error){if(form.isConnected&&!host.hidden)$('#attendanceStatus').textContent=error.message;}finally{busy=false;if(form.isConnected&&!host.hidden){host.querySelectorAll('input,textarea,button,select').forEach(c=>c.disabled=false);$('#attendanceShare').disabled=!expected;list();}}};
 $('#attendanceFollowup').onclick=()=>{if(current())openFollowup(current());};
 $('#attendanceShare').onclick=()=>{try{const entry=current(),stored=entry?.data.monthlyAttendance?.[month()];if(!stored||JSON.stringify(stored)!==JSON.stringify(expected))throw Error('Refresh attendance before sharing.');const value=attendanceValue(month(),stored),draft=attendanceValue(month(),{days:form.elements.days.value,totalDays:form.elements.totalDays.value,note:form.elements.note.value});if(JSON.stringify(value)!==JSON.stringify(draft))throw Error('Save changes before sharing.');const message=attendanceMessage(entry,month(),value),url=whatsappURL(entry.data.phone,message);$('#attendanceSharePreview').innerHTML=`<pre class="attendance-message">${e(message)}</pre>${url?`<a class="admin-save-btn" href="${e(url)}" target="_blank" rel="noopener noreferrer">Open student’s WhatsApp</a>`:'<p>Save a valid student mobile number in Details first.</p>'}<p>Review the message, then press Send in WhatsApp.</p>`;}catch(error){$('#attendanceStatus').textContent=error.message;}};
 selected=records()[0]?.id||'';load();mountPremiumAttendanceLists({host,getRecords,assertSession,clearSelection:()=>{selected='';expected=null;load();}});
}

/* REHAAN COMPUTERS / Premium attendance register V3.
   Read-only presentation extension: no Firestore writes, no automatic sharing. */
function rcAttendanceNumber(value){return Number.isInteger(value)&&value>=0?value:null;}
function rcAttendanceRow(entry,month){
 const data=entry.data||{},saved=data.monthlyAttendance?.[month];
 const days=rcAttendanceNumber(saved?.days),total=rcAttendanceNumber(saved?.totalDays);
 const hasVerified=days!==null&&total!==null&&total>=1&&days<=total;
 return {id:entry.id,name:String(data.fullName||'Unnamed student'),admission:String(data.admissionNumber||'—'),gender:String(data.gender||'').toLowerCase(),batch:String(data.batch||''),days,held:hasVerified?total:null,pct:hasVerified?Math.round(days/total*100):null,recorded:saved!==undefined};
}
function rcAttendanceGrade(pct){
 return pct===null?{label:'Not verified',className:'muted'}:pct>=90?{label:'Excellent',className:'good'}:pct>=75?{label:'Satisfactory',className:'okay'}:pct>=50?{label:'Improve attendance',className:'warn'}:{label:'Follow-up needed',className:'critical'};
}
function rcAttendanceStats(rows){
 const verified=rows.filter(row=>row.pct!==null);
 return {total:rows.length,verified:verified.length,average:verified.length?Math.round(verified.reduce((s,r)=>s+r.pct,0)/verified.length):null,below75:verified.filter(row=>row.pct<75).length,unverified:rows.length-verified.length};
}
function rcAttendanceGroupNotice(rows){
 const s=rcAttendanceStats(rows);
 if(!s.verified)return 'Attendance percentages are unavailable until both days held and days attended are recorded.';
 let message=s.average>=90?'Overall attendance is excellent. Keep up the consistent participation.':s.average>=75?'Overall attendance is satisfactory. Encourage regular participation.':s.average>=50?'Attendance needs improvement. Encourage more regular classes and offer support.':'Attendance requires attention. Follow up with students and families to support regular attendance.';
 if(s.below75)message+=' '+s.below75+' student'+(s.below75===1?' is':'s are')+' below 75%.';
 if(s.unverified)message+=' '+s.unverified+' student'+(s.unverified===1?' has':'s have')+' no verified percentage.';
 return message;
}
function rcAttendanceSplit(rows,requested){
 const total=rows.length;
 if(!total)return [];
 if(!Number.isInteger(requested)||requested<1||requested>total)throw Error('Enter a number of lists from 1 to '+total+'.');
 const groups=[],base=Math.floor(total/requested),remainder=total%requested;
 let offset=0;
 for(let i=0;i<requested;i++){
  const take=base+(i<remainder?1:0);
  groups.push(rows.slice(offset,offset+take));offset+=take;
 }
 return groups;
}
function rcAttendanceReportData(entries,month,batch=''){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Choose a valid report month.');
 const eligible=entries.filter(entry=>entry?.data?.status==='Approved'&&entry.data.enrolmentStatus!=='Cancelled'&&entry.data.admissionNumber&&(!batch||entry.data.batch===batch));
 const rows=eligible.map(entry=>rcAttendanceRow(entry,month));
 const groups={male:rows.filter(row=>row.gender==='male'),female:rows.filter(row=>row.gender==='female')};
 const collator=new Intl.Collator('en-IN',{numeric:true,sensitivity:'base'});
 for(const list of Object.values(groups))list.sort((a,b)=>collator.compare(a.admission,b.admission)||collator.compare(a.name,b.name));
 return {groups,unclassified:rows.filter(row=>!['male','female'].includes(row.gender)).length,total:rows.length,month,batch};
}
async function rcAttendancePoster(rows,month,gender,batch,page,pageCount,allRows=rows,listNumber=1,totalLists=1){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=1600;
 await Promise.race([document.fonts.load('600 32px Inter').catch(()=>[]),new Promise(resolve=>setTimeout(resolve,1600))]);
 const C={navy:'#102b44',ink:'#15324c',grey:'#5c7287',surface:'#f4f7fb',line:'#dce5ee',white:'#ffffff',teal:'#087764',red:'#a3333e',amber:'#a46c25',muted:'#728294',accent:'#c7a36c'};
 const stats=rcAttendanceStats(allRows),notice=rcAttendanceGroupNotice(allRows);
 function setFont(sz=30,w=500){ctx.font=w+' '+sz+'px Inter,Arial,sans-serif';}
 function wrap(value,maxWidth,size=28,weight=500){setFont(size,weight);const lines=[];let current='';for(const word of String(value).split(/\s+/)){const next=current?current+' '+word:word;if(current&&ctx.measureText(next).width>maxWidth){lines.push(current);current=word;}else current=next;}if(current)lines.push(current);return lines;}
 function fit(value,maxWidth,size=30,weight=600){setFont(size,weight);let s=String(value);while(s.length>1&&ctx.measureText(s).width>maxWidth)s=s.slice(0,-2)+'…';return s;}
 const noticeLines=wrap(notice,1330,28,500),n=rows.length;
 const tableStart=520,rowHeight=94,tableEnd=tableStart+n*rowHeight;
 const noteTop=tableEnd+36,noteHeight=100+Math.max(1,noticeLines.length)*37;
 const footer=noteTop+noteHeight+45;canvas.height=footer+85;
 function rect(x,y,w,h,color,r=0){ctx.fillStyle=color;if(r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}else ctx.fillRect(x,y,w,h);}
 function text(s,x,y,size=29,color=C.ink,weight=500,align='left'){ctx.fillStyle=color;setFont(size,weight);ctx.textAlign=align;ctx.fillText(String(s),x,y);}
 function bar(x,y,w,h,pct){rect(x,y,w,h,'#e2e9f0',h/2);if(pct!==null&&pct>0)rect(x,y,Math.max(7,Math.round(w*pct/100)),h,pct<75?'#d36c67':'#1b9983',h/2);}
 rect(0,0,1600,canvas.height,C.surface);rect(0,0,1600,185,C.navy);rect(0,181,1600,4,C.accent);
 rect(78,44,92,92,'#264b68',19);text('RC',124,108,43,C.white,750,'center');text('REHAAN COMPUTERS',199,100,55,C.white,750);text('MONTHLY ATTENDANCE REGISTER · PRIVATE',199,143,24,'#d3e4f0',550);
 text(gender==='male'?'BOYS ATTENDANCE':'GIRLS ATTENDANCE',80,253,54,C.navy,750);
 rect(1198,205,322,67,'#dfeaf2',15);text('LIST '+listNumber+' OF '+totalLists,1359,250,31,C.navy,750,'center');
 text(monthLabel(month)+(batch?'   /   Batch '+fit(batch,340,29):'   /   All batches'),80,300,30,C.grey,500);
 const cardY=326,cardH=108,cardW=341,gap=30;
 for(const [i,label,val,color] of [[0,'ENROLLED',String(stats.total),C.ink],[1,'VERIFIED',String(stats.verified)+'/'+stats.total,C.ink],[2,'AVERAGE*',stats.average===null?'—':stats.average+'%',C.teal],[3,'BELOW 75%',String(stats.below75),stats.below75?C.red:C.ink]]){
  const x=80+i*(cardW+gap);rect(x,cardY,cardW,cardH,C.white,13);text(label,x+24,cardY+38,21,C.grey,700);text(val,x+24,cardY+85,42,color,750);
 }
 const cols={name:104,admission:605,held:893,attended:1062,pct:1232,status:1420};
 rect(78,453,1444,67,C.navy,12);
 text('STUDENT NAME',cols.name,496,23,C.white,700);text('ADMISSION',cols.admission,496,23,C.white,700);text('HELD',cols.held,496,23,C.white,700,'center');text('ATTENDED',cols.attended,496,23,C.white,700,'center');text('%',cols.pct,496,23,C.white,700,'center');text('STATUS',cols.status,496,23,C.white,700,'center');
 for(let i=0;i<n;i++){
  const r=rows[i],y=tableStart+i*rowHeight,grade=rcAttendanceGrade(r.pct),tone=r.pct===null?C.muted:r.pct<75?C.red:C.teal;
  rect(78,y+5,1444,rowHeight-10,i%2===0?C.white:'#eaf0f6',9);
  text(fit(r.name,465,30,650),cols.name,y+58,30,C.ink,650);
  text(fit(r.admission,218,28,550),cols.admission,y+58,28,C.grey,550);
  text(r.held===null?'—':r.held,cols.held,y+58,32,C.ink,650,'center');text(r.days===null?'—':r.days,cols.attended,y+58,32,C.ink,650,'center');
  text(r.pct===null?'—':r.pct+'%',cols.pct,y+48,34,tone,750,'center');bar(cols.pct-58,y+62,116,7,r.pct);
  const statusShort=r.pct===null?'Not verified':r.pct>=90?'Excellent':r.pct>=75?'Good':r.pct>=50?'Improve':'Follow up';
  text(statusShort,cols.status,y+56,22,tone,650,'center');
 }
 rect(78,noteTop,1444,noteHeight,'#e6eef5',14);
 rect(78,noteTop,8,noteHeight,C.accent,4);
 text('RECOMMENDED ATTENDANCE NOTICE',107,noteTop+43,26,C.navy,750);
 noticeLines.forEach((line,i)=>text(line,107,noteTop+86+i*37,28,C.ink,500));
 text('*Average uses only verified percentages. Missing entries are not absences.',80,footer+1,23,C.grey,450);
 text('Private report  •  List '+listNumber+' of '+totalLists+'  •  Page '+page+' of '+pageCount,1518,footer+39,22,C.grey,450,'right');
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not generate PNG image.')),'image/png'));
}
// ZIP STORE archive: a single download for any number of numbered PNG lists.
// PNGs are compressed already; no external library or data upload is required.
async function rcAttendanceZip(files){
 if(!files.length||files.length>65535)throw Error('Invalid number of report images.');
 const bytes=[],central=[];let offset=0,centralSize=0;
 const enc=new TextEncoder();
 const crc32=data=>{let crc=-1;for(const b of data){crc^=b;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xEDB88320:0);}return (crc^(-1))>>>0;};
 const part=(size)=>{const buffer=new ArrayBuffer(size);return {data:new Uint8Array(buffer),view:new DataView(buffer)};};
 for(const file of files){
  const data=new Uint8Array(await file.blob.arrayBuffer()),name=enc.encode(file.name);
  if(data.length>=0xffffffff||name.length>65535)throw Error('Report image exceeds ZIP limits.');
  const crc=crc32(data),local=part(30+name.length),v=local.view;
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(8,0,true);
  v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);
  local.data.set(name,30);bytes.push(local.data,data);
  const directory=part(46+name.length),c=directory.view;
  c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);
  c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);
  c.setUint16(28,name.length,true);c.setUint32(42,offset,true);directory.data.set(name,46);
  central.push(directory.data);centralSize+=directory.data.length;offset+=local.data.length+data.length;
  if(offset>=0xffffffff||centralSize>=0xffffffff)throw Error('Total ZIP is too large.');
 }
 const end=part(22),v=end.view;v.setUint32(0,0x06054b50,true);
 v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);
 v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
 return new Blob([...bytes,...central,end.data],{type:'application/zip'});
}
function rcAttendanceDownload(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
}
function mountPremiumAttendanceLists({host,getRecords,assertSession,clearSelection}){
 if(host.querySelector('#rcAttendanceExports'))return;
 const styleId='rcAttendanceExportStyles';
 if(!document.getElementById(styleId)){
  const style=document.createElement('style');style.id=styleId;style.textContent=`
  .rc-att-report{margin:24px 0;padding:24px;border:1px solid #dce5ee;border-radius:20px;background:#f5f8fb;box-shadow:0 10px 35px rgba(18,43,68,.05);color:#142f47}
  .rc-att-report *{box-sizing:border-box}
  .rc-att-report h3{font-size:clamp(1.3rem,2.4vw,1.85rem);line-height:1.2;margin:5px 0 6px;color:#102b44}
  .rc-att-report p{margin:7px 0 10px;line-height:1.5;color:#597188}
  .rc-att-report-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .rc-att-kicker{font-size:.72rem;color:#3b6884;letter-spacing:.12em;font-weight:800}
  .rc-att-report .rc-att-report-head em{font-style:normal;font-weight:700;color:#176e6b;background:#e2f4f0;border:1px solid #c3e3dc;border-radius:30px;padding:7px 11px;font-size:.77rem}
  .rc-att-cards{display:flex;flex-direction:column;gap:18px;margin-top:20px}
  .rc-att-card{background:white;border:1px solid #dce5ee;border-radius:18px;overflow:hidden;box-shadow:0 7px 20px rgba(15,42,65,.035)}
  .rc-att-card>header{background:#102b44;color:white;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:17px 23px}
  .rc-att-card>header strong{font-size:1.25rem;letter-spacing:-.025em;color:white}
  .rc-att-card>header small{display:block;margin-top:3px;font-size:.79rem;color:#bcd3e5}
  .rc-att-head-side{font-size:.8rem;color:#deecf7;background:#24465f;border:1px solid #3a5a70;padding:7px 11px;border-radius:30px;white-space:nowrap}
  .rc-att-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:15px 22px;background:#f9fbfd;border-bottom:1px solid #e1eaf1}
  .rc-att-stats span{display:flex;flex-direction:column;gap:4px;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.045em;color:#60778a}
  .rc-att-stats b{font-size:1.35rem;line-height:1.2;color:#102b44;letter-spacing:-.03em}
  .rc-att-stats b.alert{color:#a3333e}
  .rc-att-count-controls{display:flex;gap:10px;align-items:end;flex-wrap:wrap;padding:18px 22px;background:#f1f6fa;border-bottom:1px solid #d9e5ee}
  .rc-att-count-controls label{display:flex;flex-direction:column;gap:6px;font-size:.76rem;color:#445e74;font-weight:800}
  .rc-att-count-controls input{width:118px;height:41px;padding:8px 12px;border:1px solid #bbcddd;border-radius:9px;font:700 1rem Inter,Arial,sans-serif;color:#142f47;background:white}
  .rc-att-count-controls button,.rc-att-actions button,.rc-att-preview-toolbar button,.rc-att-clear{border:1px solid #102b44;border-radius:9px;background:#102b44;color:white;font-size:.83rem;font-weight:750;padding:10px 15px;cursor:pointer;min-height:40px}
  .rc-att-count-controls button.secondary,.rc-att-actions button.secondary,.rc-att-preview-toolbar button,.rc-att-clear{background:white;color:#173c58;border-color:#c9d7e3}
  .rc-att-count-controls button:disabled,.rc-att-actions button:disabled{opacity:.45;cursor:not-allowed}
  .rc-att-count-description{flex:1;min-width:165px;font-size:.76rem;color:#647a8c;line-height:1.5}
  .rc-att-numbered{padding:16px 22px 5px;display:flex;flex-direction:column;gap:16px}
  .rc-att-sublist{overflow:hidden;border:1px solid #d9e4ed;border-radius:13px;background:white}
  .rc-att-sublist>header{display:flex;justify-content:space-between;gap:10px;align-items:center;background:#e8f0f7;border-bottom:1px solid #d5e2ee;padding:13px 16px}
  .rc-att-sublist>header strong{display:block;font-size:1.06rem;color:#153b56;line-height:1.4}
  .rc-att-sublist>header small{display:block;font-size:.74rem;color:#60788a;margin-top:2px}
  .rc-att-list-badge{display:inline-flex;background:#143753;color:#fff;border-radius:7px;padding:6px 9px;font-size:.74rem;font-weight:800;white-space:nowrap}
  .rc-att-tablebox{overflow:auto;max-height:455px;overscroll-behavior-x:contain}
  .rc-att-scroll-hint{display:none;padding:8px 15px;font-size:.75rem;color:#597188;background:#f7fafc}
  .rc-att-table{width:100%;min-width:730px;border-collapse:collapse;font-size:.94rem}
  .rc-att-table th{position:sticky;top:0;background:#f4f7fa;color:#34516a;z-index:1;text-align:left;text-transform:uppercase;letter-spacing:.05em;font-size:.68rem;font-weight:800;padding:13px 16px;white-space:nowrap}
  .rc-att-table td{padding:13px 16px;color:#203a50;border-bottom:1px solid #eef2f6;white-space:nowrap}
  .rc-att-table tbody tr:nth-child(even){background:#f9fbfd}
  .rc-att-table .rc-att-student{font-weight:700;max-width:290px;white-space:normal;line-height:1.3}
  .rc-att-table .rc-att-admission{color:#647d92;font-size:.84rem}
  .rc-att-table .rc-att-pct{font-weight:800;font-size:1.02rem}
  .rc-att-table .good,.rc-att-table .okay{color:#087764}.rc-att-table .warn,.rc-att-table .critical{color:#a3333e}.rc-att-table .muted{color:#7a8894}
  .rc-att-status{font-size:.74rem;font-weight:750;border-radius:30px;padding:5px 9px;background:#edf3f8;color:#556b7c;white-space:nowrap;display:inline-block}
  .rc-att-status.good,.rc-att-status.okay{background:#e7f6f2;color:#087764}.rc-att-status.warn,.rc-att-status.critical{background:#fff0ee;color:#a3333e}
  .rc-att-pctbar{width:68px;height:4px;border-radius:4px;background:#dfe7ee;overflow:hidden;margin-top:6px}.rc-att-pctbar i{display:block;height:100%;background:#087764}.rc-att-pctbar.low i{background:#b95353}
  .rc-att-note{display:flex;gap:14px;padding:14px 16px;background:#eaf1f7;border-top:1px solid #d9e5ef;color:#435a70;font-size:.82rem;line-height:1.6}
  .rc-att-notice-accent{background:#c7a36c;width:4px;border-radius:4px;flex:none}.rc-att-note b{display:block;color:#153b56;margin-bottom:3px;font-size:.79rem}
  .rc-att-actions{display:flex;flex-wrap:wrap;gap:9px;align-items:center;padding:12px 16px}
  .rc-att-group-actions{padding:12px 22px 19px;display:flex;flex-wrap:wrap;align-items:center;gap:12px}
  .rc-att-group-actions button{border:1px solid #102b44;border-radius:9px;background:#102b44;color:white;font-size:.82rem;font-weight:750;padding:11px 15px;cursor:pointer}
  .rc-att-actions button:hover:not(:disabled),.rc-att-count-controls button:hover:not(:disabled){filter:brightness(1.07)}
  .rc-att-export-info{font-size:.79rem!important;margin:15px 0 4px!important}
  .rc-att-report [role=status]{margin:14px 0 5px;min-height:1.4em;font-size:.83rem;color:#335b75}
  .rc-att-image-preview[hidden]{display:none}.rc-att-image-preview{margin:18px auto 0;max-width:820px;border:1px solid #d9e4ed;border-radius:15px;background:white;padding:14px}
  .rc-att-preview-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:10px;color:#183b56;font-weight:750}
  .rc-att-preview-toolbar .rc-att-preview-nav{display:flex;gap:7px}
  .rc-att-preview-toolbar button:disabled{opacity:.4;cursor:not-allowed}
  .rc-att-image-preview img{display:block;width:100%;height:auto;max-height:75vh;object-fit:contain;background:#f6f9fb}
  .rc-att-clear{margin:4px 0 10px;font-size:.78rem;padding:7px 12px;min-height:34px}
  .rc-att-clear:focus-visible,.rc-att-count-controls button:focus-visible,.rc-att-count-controls input:focus-visible,.rc-att-preview-toolbar button:focus-visible,.rc-att-actions button:focus-visible,.rc-att-group-actions button:focus-visible{outline:3px solid #e1b45e;outline-offset:3px}
  @media(max-width:700px){.rc-att-scroll-hint{display:block}.rc-att-report{padding:14px}.rc-att-stats{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px}.rc-att-card>header{padding:14px 15px}.rc-att-actions,.rc-att-count-controls{padding:12px 15px}.rc-att-numbered{padding:12px}.rc-att-group-actions{padding:12px 15px}}
  `;document.head.append(style);
 }
 const panel=document.createElement('section');panel.className='rc-att-report';panel.id='rcAttendanceExports';
 panel.innerHTML='<div class="rc-att-report-head"><div><span class="rc-att-kicker">PRIVATE MONTHLY REPORTS</span><h3>Boys & Girls Attendance Registers</h3><p>Create any number of numbered lists, preview each one, and download premium PNG reports.</p></div><em>Read-only reports</em></div><div class="rc-att-cards"></div><p class="rc-att-export-info">“—” means the value is not verified, not absent. Results use saved attendance. Other or unspecified genders are excluded. Creating lists does not modify student records.</p><p role="status" aria-live="polite"></p><div class="rc-att-image-preview" hidden></div>';
 const anchor=host.querySelector('.attendance-controls');if(anchor)anchor.insertAdjacentElement('afterend',panel);else host.prepend(panel);
 const selectedTitle=host.querySelector('#attendanceStudent'),clear=document.createElement('button');
 clear.type='button';clear.className='rc-att-clear';clear.textContent='Cancel student selection';clear.setAttribute('aria-label','Cancel selected student without changing attendance');
 selectedTitle?.insertAdjacentElement('afterend',clear);
 const monthInput=host.querySelector('#attendanceMonth'),batchInput=host.querySelector('#attendanceBatch'),cards=panel.querySelector('.rc-att-cards'),status=panel.querySelector('[role=status]'),preview=panel.querySelector('.rc-att-image-preview');
 const listCounts={male:1,female:1};let currentPreview=null,previewToken=0,busy=false;
 function revoke(){if(currentPreview){URL.revokeObjectURL(currentPreview);currentPreview=null;}preview.replaceChildren();preview.hidden=true;}
 function closePreview(){previewToken++;revoke();status.textContent='Image preview closed. No records were changed.';}
 function report(){assertSession();return rcAttendanceReportData(getRecords(),monthInput.value,batchInput.value);}
 function grouped(data,gender){const rows=data.groups[gender];return rcAttendanceSplit(rows,Math.min(listCounts[gender],Math.max(1,rows.length)));}
 function table(rows){return `<div class="rc-att-tablebox"><table class="rc-att-table"><thead><tr><th>Student</th><th>Admission</th><th>Days held</th><th>Attended</th><th>Attendance</th><th>Status</th></tr></thead><tbody>${rows.map(r=>{const g=rcAttendanceGrade(r.pct);return `<tr><td class="rc-att-student" title="${e(r.name)}">${e(r.name)}</td><td class="rc-att-admission">${e(r.admission)}</td><td>${r.held===null?'—':r.held}</td><td>${r.days===null?'—':r.days}</td><td class="rc-att-pct ${g.className}">${r.pct===null?'—':r.pct+'%'}<div class="rc-att-pctbar ${r.pct!==null&&r.pct<75?'low':''}"><i style="width:${r.pct===null?0:r.pct}%"></i></div></td><td><span class="rc-att-status ${g.className}">${g.label}</span></td></tr>`;}).join('')||'<tr><td colspan="6">No active enrolled students in this group.</td></tr>'}</tbody></table></div><div class="rc-att-scroll-hint">Swipe the table sideways to view all columns →</div>`;}
 function render(){if(!panel.isConnected)return;const data=report();previewToken++;revoke();
  const titles=[['male','Boys'],['female','Girls']];cards.innerHTML=titles.map(([gender,label])=>{
   const rows=data.groups[gender],s=rcAttendanceStats(rows);
   listCounts[gender]=Math.max(1,Math.min(listCounts[gender],Math.max(1,rows.length)));
   const lists=grouped(data,gender);
   return `<article class="rc-att-card" data-att-gender="${gender}"><header><div><strong>${label} Attendance Register</strong><small>${e(monthLabel(data.month))}${data.batch?' · Batch '+e(data.batch):' · All batches'}</small></div><span class="rc-att-head-side">${s.total} students</span></header>
    <div class="rc-att-stats"><span>Students<b>${s.total}</b></span><span>Verified<b>${s.verified}/${s.total}</b></span><span>Average*<b>${s.average===null?'—':s.average+'%'}</b></span><span>Below 75%<b class="${s.below75?'alert':''}">${s.below75}</b></span></div>
    <div class="rc-att-count-controls"><label for="rc-att-count-${gender}">Number of ${label} lists<input id="rc-att-count-${gender}" type="number" inputmode="numeric" min="1" max="${Math.max(1,rows.length)}" step="1" value="${listCounts[gender]}" ${rows.length?'':'disabled'}></label><button type="button" data-att-create="${gender}" ${rows.length?'':'disabled'}>Create lists</button><button type="button" class="secondary" data-att-reset="${gender}" ${listCounts[gender]===1?'disabled':''}>Reset to 1 list</button><span class="rc-att-count-description">Choose 1–${Math.max(1,rows.length)}. Students are split evenly in admission-number order. Each list receives its own number and PNG image.</span></div>
    <div class="rc-att-numbered">${lists.map((list,i)=>{const listStats=rcAttendanceStats(list);return `<section class="rc-att-sublist"><header><div><strong>${label} Attendance — List ${i+1}</strong><small>${list.length} student${list.length===1?'':'s'} · ${listStats.verified} with verified attendance</small></div><span class="rc-att-list-badge">LIST ${i+1} / ${lists.length}</span></header>
      ${table(list)}<div class="rc-att-note"><span class="rc-att-notice-accent"></span><div><b>List ${i+1} · Recommended attendance notice</b>${e(rcAttendanceGroupNotice(list))}</div></div>
      <div class="rc-att-actions"><button type="button" class="secondary" data-att-preview="${gender}" data-list="${i}">Preview List ${i+1} PNG</button><button type="button" data-att-download="${gender}" data-list="${i}">Download List ${i+1} PNG${list.length>18?'s (ZIP)':''}</button></div></section>`;}).join('')||'<p class="rc-att-export-info">No active enrolled students in this group.</p>'}</div>
    <div class="rc-att-group-actions"><button type="button" data-att-download-all="${gender}" ${rows.length?'':'disabled'}>Download all ${label} lists (ZIP)</button><span class="rc-att-count-description">${lists.length} numbered list${lists.length===1?'':'s'} · Original records unchanged</span></div></article>`;
  }).join('');status.textContent=data.unclassified?data.unclassified+' active student(s) with another or unspecified gender are not included in these two registers.':'Numbered reports ready. Nothing is sent automatically.';
 }
 async function output(gender,index,mode,pageIndex=0){if(busy)return;const token=++previewToken;busy=true;try{
  const data=report(),lists=grouped(data,gender),label=gender==='male'?'Boys':'Girls';
  if(!lists.length)throw Error('No enrolled students in this group.');
  if(mode!=='all'&&(!Number.isInteger(index)||index<0||index>=lists.length))throw Error('Invalid numbered list selected.');
  const jobs=[];for(const [i,rows] of lists.entries()){
   if(mode!=='all'&&i!==index)continue;
   const count=Math.ceil(rows.length/18);
   for(let p=0;p<count;p++){
    if(mode==='preview'&&p!==pageIndex)continue;
    const name='RC-Attendance-'+label+'-'+data.month+'-List-'+(i+1)+'-of-'+lists.length+'-Page-'+(p+1)+'-of-'+count+'.png';
    jobs.push({i,p,rows:rows.slice(p*18,(p+1)*18),allRows:rows,pageCount:count,name});
   }
  }
  if(!jobs.length)throw Error('Invalid image page.');
  const creations=[];status.textContent='Preparing '+label+' '+(mode==='all'?'all numbered lists':'List '+(index+1))+'…';if(mode==='preview')revoke();
  for(const job of jobs){
   const blob=await rcAttendancePoster(job.rows,data.month,gender,data.batch,job.p+1,job.pageCount,job.allRows,job.i+1,lists.length);assertSession();
   if(!panel.isConnected||token!==previewToken||data.month!==monthInput.value||data.batch!==batchInput.value||listCounts[gender]!==lists.length)throw Error('Report cancelled or attendance filters changed.');
   creations.push({blob,name:job.name});
  }
  if(mode==='preview'){
   const file=creations[0],url=URL.createObjectURL(file.blob),number=pageIndex+1,pages=Math.ceil(lists[index].length/18);
   currentPreview=url;preview.hidden=false;
   preview.innerHTML=`<div class="rc-att-preview-toolbar"><span>${label} · List ${index+1} of ${lists.length} · Page ${number} of ${pages}</span><div class="rc-att-preview-nav"><button type="button" data-att-page="${gender}" data-list="${index}" data-page="${pageIndex-1}" ${pageIndex===0?'disabled':''}>Previous</button><button type="button" data-att-page="${gender}" data-list="${index}" data-page="${pageIndex+1}" ${pageIndex+1===pages?'disabled':''}>Next</button><button type="button" data-att-close-preview>Close preview ×</button></div></div>`;
   const img=document.createElement('img');img.src=url;img.alt=label+' monthly attendance List '+(index+1)+' page '+number;preview.append(img);preview.scrollIntoView({block:'nearest',behavior:'smooth'});
   status.textContent='Image preview ready. Close preview to remove it without changing attendance.';
  }else if(mode==='all'||creations.length>1){
   const zip=await rcAttendanceZip(creations);assertSession();if(token!==previewToken)throw Error('Report cancelled.');
   rcAttendanceDownload(zip,'RC-Attendance-'+label+'-'+data.month+(mode==='all'?'-All-Lists':'-List-'+(index+1)) + '.zip');
   status.textContent=creations.length+' PNG image(s) packaged in one ZIP. Nothing was sent.';
  }else{
   rcAttendanceDownload(creations[0].blob,creations[0].name);
   status.textContent='List '+(index+1)+' PNG downloaded. Review before sharing.';
  }
 }catch(error){status.textContent=error.message;}finally{busy=false;}}
 panel.addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-att-close-preview')){closePreview();return;}
  const gender=b.dataset.attCreate||b.dataset.attReset;
  if(gender){
   if(b.hasAttribute('data-att-reset')){listCounts[gender]=1;render();return;}
   const input=panel.querySelector('#rc-att-count-'+gender),raw=input.value,rows=report().groups[gender];
   if(!/^[1-9]\d*$/.test(raw)||Number(raw)>rows.length){input.setCustomValidity('Choose a whole number from 1 to '+rows.length);input.reportValidity();return;}
   input.setCustomValidity('');listCounts[gender]=Number(raw);render();status.textContent=(gender==='male'?'Boys':'Girls')+' divided into '+listCounts[gender]+' numbered list(s). No attendance records were changed.';return;
  }
  const nav=b.dataset.attPage;if(nav){output(nav,Number(b.dataset.list),'preview',Number(b.dataset.page));return;}
  if(b.dataset.attPreview){output(b.dataset.attPreview,Number(b.dataset.list),'preview');return;}
  if(b.dataset.attDownload){output(b.dataset.attDownload,Number(b.dataset.list),'single');return;}
  if(b.dataset.attDownloadAll){output(b.dataset.attDownloadAll,0,'all');return;}
 });
 clear.onclick=()=>{clearSelection();closePreview();status.textContent='Student selection cancelled. No attendance record changed.';};
 monthInput.addEventListener('change',render);batchInput.addEventListener('change',render);host.addEventListener('rc-attendance-updated',render);
 document.addEventListener('admin-session-cleared',()=>{previewToken++;revoke();},{once:true});render();
}

