// Local HD PNG. No screenshots, uploads, external fonts or financial operations.
import {validateCard,cardResult,dateLabel,indiaDate} from './admin-feature-model.js?v=20261018-login-fix-1';

export async function markCardPNG(entry,input){
  const card=validateCard(input),result=cardResult(card),data=entry.data;
  await document.fonts.ready;
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image rendering is unavailable. You can still print the saved mark card.');
  const ink='#233a2c',muted='#586b51',gold='#a58a50',left=90,right=1510,width=1420;
  function lines(value,maxWidth,size){
    ctx.font=`500 ${size}px Inter, Arial, sans-serif`;
    const output=[];let line='';
    for(const word of String(value||'—').split(/\s+/)){
      if(ctx.measureText(word).width>maxWidth){
        if(line){output.push(line);line='';}
        for(const char of Array.from(word)){if(line&&ctx.measureText(line+char).width>maxWidth){output.push(line);line='';}line+=char;}
      }else if(line&&ctx.measureText(line+' '+word).width>maxWidth){output.push(line);line=word;}else line=line?line+' '+word:word;
    }
    if(line)output.push(line);return output;
  }
  const subtitle=lines(card.title,width,44);
  const details=[['STUDENT NAME',data.fullName],['ADMISSION NUMBER',data.admissionNumber||'Not assigned'],['PARENT / GUARDIAN',data.parentName],['ROLL NUMBER',data.rollNumber],['COURSE',data.coursePreference||data.course],['BATCH',data.batch],['ASSESSMENT DATE',dateLabel(card.date)],['PREPARED ON',dateLabel(indiaDate())]].map(([label,value])=>({label,lines:lines(value,650,48)}));
  let y=360+subtitle.length*57;
  const detailRows=[];
  for(let i=0;i<details.length;i+=2){const height=70+Math.max(details[i].lines.length,details[i+1].lines.length)*62;detailRows.push({top:y,fields:details.slice(i,i+2)});y+=height;}
  const tableTop=y+30; y=tableTop+90;
  const tableRows=card.subjects.map(subject=>{
    const name=lines(subject.name,650,48),verdict=subject.marks===null?'Unmarked':subject.marks/subject.max>=.33?'Pass':'Below pass mark',status=lines(verdict,270,40);
    const row={top:y,height:Math.max(name.length*61,status.length*52,61)+40,name,status,subject};y+=row.height;return row;
  });
  const totalTop=y; y+=100;
  const resultTop=y+45; y=resultTop+190;
  const policy=lines('Grading: at least 33% in each component. A+ ≥ 90%, A ≥ 75%, B ≥ 60%, C ≥ 45%, D ≥ 33%, subject to passing each component.',width,30);
  const policyTop=y+38;y=policyTop+policy.length*45;
  canvas.height=Math.max(2260,Math.ceil(y+260));
  ctx.fillStyle='#fffefa';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.strokeRect(30,30,1540,canvas.height-60);ctx.strokeStyle='#ded6bf';ctx.lineWidth=1;ctx.strokeRect(44,44,1512,canvas.height-88);
  function text(value,x,top,size=42,color=ink,weight=500){ctx.fillStyle=color;ctx.font=`${weight} ${size}px Inter, Arial, sans-serif`;ctx.textBaseline='top';ctx.fillText(String(value),x,top);}
  function rule(top,x=left,end=right,color='#d5dfcd'){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(end,top);ctx.stroke();}
  function block(values,x,top,size,color=ink){values.forEach((line,index)=>text(line,x,top+index*size*1.3,size,color));}
  text('Rehaan Computers',left,92,82,ink,600);text('CHARANGAM · BEERWAH · KASHMIR',left,198,28,muted);text('ACADEMIC RECORD',1110,119,28,muted);rule(267,left,right,gold);
  text('Statement of Marks',left,302,66,ink,600);block(subtitle,left,390,44,muted);
  detailRows.forEach(row=>row.fields.forEach((field,index)=>{const x=left+index*740;text(field.label,x,row.top+26,30,muted);block(field.lines,x,row.top+78,48);}));
  ctx.fillStyle='#edf2e6';ctx.fillRect(left,tableTop,width,90);
  const xs=[left+15,790,1000,1200];['SUBJECT / COMPONENT','MAX.','MARKS','RESULT'].forEach((label,i)=>text(label,xs[i],tableTop+28,30,muted,600));
  tableRows.forEach(row=>{block(row.name,xs[0],row.top+22,48);text(row.subject.max,xs[1],row.top+22,46);text(row.subject.marks??'—',xs[2],row.top+22,46);block(row.status,xs[3],row.top+24,40);rule(row.top+row.height);});
  text('TOTAL',xs[0],totalTop+28,42,ink,600);text(result.maximum,xs[1],totalTop+28,46);text(result.total??'—',xs[2],totalTop+28,46);rule(totalTop+100);
  ctx.fillStyle='#eff4e9';ctx.fillRect(left,resultTop,width,190);
  [['PERCENTAGE',result.percentage===null?'—':result.percentage+'%'],['GRADE',result.grade],['RESULT',!result.complete?'Incomplete':result.passed?'Pass':'Not passed']].forEach(([label,value],index)=>{const x=left+index*(width/3)+25;text(label,x,resultTop+28,30,muted);text(value,x,resultTop+88,52,ink,600);});
  block(policy,left,policyTop,30,muted);
  const signatureTop=canvas.height-170;rule(signatureTop,left,left+530,gold);rule(signatureTop,right-530,right,gold);text('EXAMINER / ASSESSOR',left,signatureTop+22,27,muted);text('AUTHORIZED SIGNATORY',right-530,signatureTop+22,27,muted);
  text('REHAAN COMPUTERS · STUDENT ACADEMIC RECORD',left,canvas.height-77,23,muted);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not create the mark-card image. Please retry.')),'image/png'));
}
