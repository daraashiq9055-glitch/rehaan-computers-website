const DAY=/^\d{4}-\d{2}-\d{2}$/;
const PHONE=/^[0-9]{10}$/;
const CONTROL=/[\u0000-\u001f\u007f]/;
const money=value=>{const n=Number(value),c=Math.round(n*100);if(!Number.isFinite(n)||n<0||!Number.isSafeInteger(c)||Math.abs(n*100-c)>.00001)throw Error('Enter a valid amount.');return c;};
const text=(value,label,min,max)=>{const out=String(value??'').trim();if(out.length<min||out.length>max||CONTROL.test(out))throw Error(`${label} must be ${min}–${max} characters.`);return out;};
export const prospectStatuses=Object.freeze(['Interested','Joining','Follow up later','No response','Not joining','Admitted']);
export function validateProspect(input){
 const status=prospectStatuses.includes(input.status)?input.status:'Interested',phone=String(input.phone||'').replace(/\D/g,'');
 if(!PHONE.test(phone))throw Error('Enter a 10-digit phone number.');
 const visit=String(input.visitDate||''),follow=String(input.followUpDate||'');if(!DAY.test(visit)||follow&&!DAY.test(follow))throw Error('Choose valid visit and follow-up dates.');
 return {name:text(input.name,'Student name',2,120),phone,course:text(input.course,'Interested course',1,140),visitDate:visit,followUpDate:follow,status,source:text(input.source||'Walk-in','Source',2,80),notes:text(input.notes||'','Notes',0,800)};
}
export function prospectMessage(row,kind='reminder'){
 const name=row.name||'Student',course=row.course||'your selected course';
 if(kind==='followup')return `*REHAAN COMPUTERS*\n*Class Follow-Up Notice*\n\nHello ${name},\nYou had enquired about *${course}*. Please reply with the class or batch you want to join, or tell us if you need fee, timing or course guidance.\n\nIf you wish to continue, please reply to this message so we can confirm your next step.`;
 if(kind==='cancel')return `*REHAAN COMPUTERS*\n*Important Notice*\n\nHello ${name},\nYour provisional admission enquiry for *${course}* has been closed.\n*Reason:* No reply received after the follow-up notice.\n\nNo admission record was created. Please contact the institute if you need clarification or wish to enquire again.`;
 return `Hello ${name}, you recently visited Rehaan Computers regarding ${course}. Please let us know whether you would like to continue with admission, need more information, or prefer us to close this enquiry.`;
}
export function validateIncome(input){
 const date=String(input.date||'');if(!DAY.test(date))throw Error('Choose a valid received date.');
 const method=['Cash','UPI','Bank transfer','Online / other'].includes(input.method)?input.method:'Cash';
 return {date,amount:money(input.amount),category:text(input.category,'Income category',2,80),method,reference:text(input.reference||'','Reference',0,120),note:text(input.note||'','Note',0,500)};
}
export function validateConcession(input,{monthly=999,paid=0}={}){
 const due=String(input.due||''),type=['Full concession','Partial concession','Half-month fee'].includes(input.type)?input.type:'';
 if(!DAY.test(due)||!type)throw Error('Choose a fee month and concession type.');
 const fee=money(monthly),received=money(paid),concession=money(input.concession);if(!concession)throw Error('Enter the approved concession amount.');
 if(received+concession!==fee)throw Error('Payment plus concession must exactly settle the monthly fee.');
 return {due,type,monthly:fee,paidBefore:received,concession,reason:text(input.reason,'Approval reason',5,500)};
}
export function leagueRankings(rows,count=3){
 const limit=Math.max(3,Math.min(20,Number(count)||3)),complete=rows.filter(row=>row.result?.complete&&Number.isFinite(row.result.percentage));
 const score=row=>row.result.percentage;
 return {top:[...complete].sort((a,b)=>score(b)-score(a)||String(a.name).localeCompare(String(b.name))).slice(0,limit),improve:[...complete].sort((a,b)=>score(a)-score(b)||String(a.name).localeCompare(String(b.name))).slice(0,limit)};
}
export function genderLeagueRankings(rows,gender,count=3){
 if(!['male','female'].includes(gender))throw Error('Choose Boys or Girls for this leaderboard.');
 return leagueRankings(rows.filter(row=>String(row.gender||'').toLowerCase()===gender),count);
}
export function selectedLeagueRankings(rows,gender,count=3,topIds=[],improveIds=[]){
 const automatic=genderLeagueRankings(rows,gender,count),eligible=rows.filter(row=>String(row.gender||'').toLowerCase()===gender&&row.result?.complete&&Number.isFinite(row.result.percentage)),byId=new Map(eligible.map(row=>[String(row.id),row])),limit=Math.max(1,Math.min(20,Number(count)||3));
 const select=(ids,fallback)=>{const picked=[];for(const id of ids){const row=byId.get(String(id));if(row&&!picked.includes(row)&&picked.length<limit)picked.push(row);}return picked.length?picked:fallback;},score=row=>row.result.percentage;
 return {top:select(topIds,automatic.top).sort((a,b)=>score(b)-score(a)||String(a.name).localeCompare(String(b.name))),improve:select(improveIds,automatic.improve).sort((a,b)=>score(a)-score(b)||String(a.name).localeCompare(String(b.name)))};
}
export function improvementMessage(row){
 const weak=(row.card?.subjects||[]).filter(s=>Number.isFinite(s.marks)&&s.marks/s.max<.75).sort((a,b)=>a.marks/a.max-b.marks/b.max)[0];
 const typing=(row.card?.subjects||[]).find(s=>s.typing&&(Number(s.typing.speed)<25||Number(s.typing.accuracy)<90));
 if(typing&&Number(typing.typing?.accuracy)<90)return `${row.name}, focus on typing accuracy first. Slow down slightly, practise daily, and aim for at least 90% accuracy before increasing speed.`;
 if(typing&&Number(typing.typing?.speed)<25)return `${row.name}, your accuracy is developing; now practise short timed passages daily to build speed towards 25 WPM.`;
 if(weak)return `${row.name}, revise ${weak.name} and complete two guided practical exercises before the next weekly assessment.`;
 return `${row.name}, review this assessment with your teacher and practise the lowest-scoring questions before the next test.`;
}
