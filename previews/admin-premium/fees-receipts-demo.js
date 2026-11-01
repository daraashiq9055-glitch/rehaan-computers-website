// This script is injected ONLY by preview-fees-receipts.py. No live requests.
const state=window.__adminPreview,student=state.records['demo-0'],now=new Date();
const year=now.getUTCFullYear(),month=now.getUTCMonth();
const key=offset=>new Date(Date.UTC(year,month+offset,12)).toISOString().slice(0,10);
student.admissionDate=key(-3);student.approvedAt=key(-3)+'T06:00:00Z';student.monthlyFees={[key(-2)]:999,[key(-1)]:500};
// A clearly fictional avatar is an uploaded PNG in this isolated preview.
const avatar=document.createElement('canvas');avatar.width=240;avatar.height=300;const ctx=avatar.getContext('2d');
ctx.fillStyle='#e8eff4';ctx.fillRect(0,0,240,300);ctx.fillStyle='#17364e';ctx.beginPath();ctx.arc(120,93,47,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(120,240,90,91,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e1bd73';ctx.font='600 21px Arial';ctx.textAlign='center';ctx.fillText('SAMPLE PHOTO',120,281);student.photo=avatar.toDataURL('image/png');
const id='a'.repeat(32),due=key(-1);student.feeReceipts={[id]:{id,number:'1000',studentId:'demo-0',student:{name:student.fullName,admission:student.admissionNumber,course:student.coursePreference,address:student.address,phone:student.phone},due,period:due.slice(0,7),date:due,method:'UPI',amount:50000,billed:99900,receivedAtIssue:50000,balanceAtIssue:49900,createdAt:due+'T06:00:00Z',createdBy:'preview-admin'}};state.counters={tuition:{last:1000}};
const ready=new MutationObserver(()=>{const button=document.querySelector('[data-section=fees]');if(button&&document.querySelector('#applicationsList .application-card')){ready.disconnect();button.click();}});ready.observe(document.documentElement,{subtree:true,attributes:true,childList:true});
