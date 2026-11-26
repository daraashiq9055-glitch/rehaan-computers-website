export const programs=['Computer basics','Notepad','WordPad','MS Word','MS Excel','PowerPoint','MS Access','Outlook','Marg ERP','Tally Prime','Photoshop','InPage'];

export function indiaDay(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}
export function cycleStart(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Invalid quiz date.');
 const date=new Date(day+'T00:00:00Z');if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==day)throw Error('Invalid quiz date.');
 const monday=new Date(date.getTime()-((date.getUTCDay()+6)%7)*86400000);return monday.toISOString().slice(0,10);
}
export function lastClosedCycle(day){
 const monday=new Date(cycleStart(day)+'T00:00:00Z');
 monday.setUTCDate(monday.getUTCDate()-7);
 return monday.toISOString().slice(0,10);
}
const hash=value=>{let number=2166136261;for(const char of value){number^=char.charCodeAt(0);number=Math.imul(number,16777619);}return number>>>0;};
const normalized=value=>value.normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase();
export function questionOkay(row){
 if(!row||!/^[A-Za-z0-9_-]{8,80}$/.test(row.id||'')||!programs.includes(row.program))return false;
 if(typeof row.question!=='string'||row.question.trim().length<10||row.question.length>300)return false;
 if(!Array.isArray(row.options)||row.options.length!==4||!row.options.every(option=>typeof option==='string'&&option.trim()&&option.length<=160))return false;
 return new Set(row.options.map(normalized)).size===4&&Number.isInteger(row.answer)&&row.answer>=0&&row.answer<=3;
}

export function planQuiz({uid,day,program,bank,usedIds=[],usedQuestions=[]}){
 if(!/^[A-Za-z0-9:_-]{8,128}$/.test(uid||'')||!programs.includes(program))throw Error('Student or learning program is invalid.');
 cycleStart(day);
 const used=new Set(usedIds),seen=new Set(),questionTexts=new Set(usedQuestions.map(normalized));
 const valid=bank.filter(row=>questionOkay(row)&&row.active!==false&&row.active!==0&&!used.has(row.id));
 const index=programs.indexOf(program),rank=rows=>rows.sort((a,b)=>hash(`${uid}:${day}:${a.id}`)-hash(`${uid}:${day}:${b.id}`)||a.id.localeCompare(b.id));
 function pick(rows,limit){
  const selected=[];
  for(const row of rank(rows)){
   const key=normalized(row.question);
   if(seen.has(row.id)||questionTexts.has(key))continue;
   seen.add(row.id);questionTexts.add(key);selected.push(row);
   if(selected.length===limit)break;
  }
  return selected;
 }
 const current=pick(valid.filter(row=>row.program===program),index?4:10);
 const previous=index?pick(valid.filter(row=>programs.indexOf(row.program)<index),6):[];
 if(previous.length!==(index?6:0)||current.length!==(index?4:10))throw Error('Not enough unused published questions for this seven-day cycle. Ask the centre to add questions.');
 return [...previous,...current].map(row=>({id:row.id,program:row.program,question:row.question,options:[...row.options],answer:row.answer}));
}
export function publicQuestions(questions){return questions.map(({id,program,question,options})=>({id,program,question,options}));}
export function scoreQuiz(questions,answers){
 if(!Array.isArray(questions)||questions.length!==10||!Array.isArray(answers)||answers.length!==10||answers.some(answer=>!Number.isInteger(answer)||answer<0||answer>3))throw Error('Submit one answer from 0 to 3 for each of the 10 questions.');
 return answers.reduce((score,answer,index)=>score+(answer===questions[index].answer?1:0),0);
}
export function verifiedAwards({score,consecutiveDays}){
 if(!Number.isInteger(score)||score<0||score>10||!Number.isInteger(consecutiveDays)||consecutiveDays<1)throw Error('Verified result is invalid.');
 return {points:score*10,badges:[...(score===10?['Perfect Quiz']:[]),...(consecutiveDays>=7?['Seven Day Streak']:consecutiveDays>=3?['Three Day Streak']:[])]};
}
