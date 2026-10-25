// Full-height HD/4K rendering. Portraits and private signatures always retain their original proportions.
import {validateCard,cardResult,subjectResult,dateLabel} from './admin-feature-model.js?v=20261025-admin-12';
import {paperPalette,typingLabel} from './admin-mark-layout.js?v=20261025-admin-12';
export async function markCardPNG(entry,input,{photo=null,signatures={},outputWidth=3840}={}){
 if(![1600,3840].includes(outputWidth))throw Error('Choose HD or 4K image size.');
 const card=validateCard(input),result=cardResult(card),data=entry.data,palette=paperPalette(card.paperColor);
 await Promise.all([document.fonts.load('700 70px MarkSerif'),document.fonts.load('600 32px MarkSerif')]);await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image rendering is unavailable. You can still print the saved mark card.');
 const {ink,muted,gold}=palette,left=90,right=1510,width=1420;
 function lines(value,maxWidth,size){ctx.font=`500 ${size}px Inter,Arial,sans-serif`;const output=[];let line='';for(const word of String(value||'—').split(/\s+/)){if(ctx.measureText(word).width>maxWidth){if(line){output.push(line);line='';}for(const char of Array.from(word)){if(line&&ctx.measureText(line+char).width>maxWidth){output.push(line);line='';}line+=char;}}else if(line&&ctx.measureText(line+' '+word).width>maxWidth){output.push(line);line=word;}else line=line?line+' '+word:word;}if(line)output.push(line);return output;}
 const subtitle=lines(card.title,width,42),details=[['STUDENT NAME',data.fullName],['ADMISSION NUMBER',data.admissionNumber||'Not assigned'],['PARENT / GUARDIAN',data.parentName],['ROLL NUMBER',data.rollNumber],['COURSE',data.coursePreference||data.course],['BATCH',data.batch],['ASSESSMENT DATE',dateLabel(card.date)]].map(([label,value])=>({label,lines:lines(value,650,48)}));
 let y=635+subtitle.length*55;const detailRows=[];
 for(let i=0;i<details.length;i+=2){const fields=details.slice(i,i+2),height=75+Math.max(...fields.map(f=>f.lines.length))*63;detailRows.push({top:y,height,fields});y+=height;}
 const detailsBottom=y,tableTop=y+40;y=tableTop+90;
 const tableRows=card.subjects.map(subject=>{const name=lines(subject.name,550,46),verdict=subjectResult(subject),status=lines(verdict.label,235,38),metrics=subject.typing?lines(typingLabel(subject),550,30):[];const height=Math.max(name.length*60+metrics.length*40,status.length*50,60)+40,row={top:y,height,name,status,metrics,subject,grade:verdict.grade==='Incomplete'?'—':verdict.grade};y+=height;return row;});
 const totalTop=y;y+=100;const resultTop=y+40;y=resultTop+185;
 const policy=lines('Grading: at least 33% in each component. A+ ≥ 90%, A ≥ 75%, B ≥ 60%, C ≥ 45%, D ≥ 33%. Typing speed and accuracy are recorded separately from marks.',width,28),policyTop=y+30;y=policyTop+policy.length*40;
 const height=Math.max(2500,Math.ceil(y+440)),scale=outputWidth/1600;
 if(outputWidth*Math.ceil(height*scale)>48000000)throw Error('This card is too tall for 4K export. Choose HD to keep the full card.');
 canvas.width=outputWidth;canvas.height=Math.ceil(height*scale);ctx.scale(scale,scale);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.fillStyle=palette.paper;ctx.fillRect(0,0,1600,height);ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.strokeRect(30,30,1540,height-60);ctx.strokeStyle=palette.line;ctx.lineWidth=1;ctx.strokeRect(44,44,1512,height-88);
 function text(value,x,top,size=42,color=ink,weight=500,font='Inter'){ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${font},Arial,sans-serif`;ctx.textBaseline='top';ctx.fillText(String(value),x,top);}
 function rule(top,x=left,end=right,color=palette.line){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(end,top);ctx.stroke();}
 function block(values,x,top,size,color=ink){values.forEach((line,index)=>text(line,x,top+index*size*1.3,size,color));}
 function contain(image,x,top,w,h){if(!image?.naturalWidth||!image?.naturalHeight)return;const fit=Math.min(w/image.naturalWidth,h/image.naturalHeight),iw=image.naturalWidth*fit,ih=image.naturalHeight*fit;ctx.drawImage(image,x+(w-iw)/2,top+(h-ih)/2,iw,ih);}
 text('LEARNING · SKILLS · PROGRESS',left,90,24,muted,600);text('REHAAN COMPUTERS',left,144,70,ink,700,'MarkSerif');text('CHARANGAM',left,248,34,ink,600);text('STUDENT ACADEMIC RECORD',left,314,25,muted,600);
 const px=1265,py=84,pw=245,ph=306;ctx.fillStyle='#fff';ctx.fillRect(px,py,pw,ph);ctx.strokeStyle=gold;ctx.lineWidth=2;ctx.strokeRect(px,py,pw,ph);if(photo?.naturalWidth)contain(photo,px+10,py+10,pw-20,ph-20);else{text('STUDENT',px+43,py+115,30,'#43556a');text('PHOTO',px+61,py+159,30,'#43556a');}
 rule(425,left,right,gold);text('MAIN ROAD CHARANGAM · BEERWAH · BUDGAM · KASHMIR 193411',left,451,28,ink);rule(500,left,right,gold);
 text('Statement of Marks',left,539,64,ink,600,'MarkSerif');block(subtitle,left,625,42,muted);
 ctx.fillStyle=palette.panel;ctx.fillRect(left-12,detailRows[0].top+12,width+24,detailsBottom-detailRows[0].top-4);
 detailRows.forEach(row=>{row.fields.forEach((field,index)=>{const x=left+index*740;text(field.label,x+12,row.top+26,28,muted,600);block(field.lines,x+12,row.top+77,48);});rule(row.top+row.height);});
 ctx.fillStyle=palette.panel;ctx.fillRect(left,tableTop,width,90);const xs=[left+15,695,870,1055,1240];['SUBJECT','MAX.','MARKS','GRADE','RESULT'].forEach((label,i)=>text(label,xs[i],tableTop+28,28,ink,600));
 tableRows.forEach(row=>{block(row.name,xs[0],row.top+20,46);if(row.metrics.length)block(row.metrics,xs[0],row.top+22+row.name.length*60,30,muted);text(row.subject.max,xs[1],row.top+22,43);text(row.subject.marks??'—',xs[2],row.top+22,43);text(row.grade,xs[3],row.top+24,40,ink,600);block(row.status,xs[4],row.top+24,38);rule(row.top+row.height);});
 text('TOTAL',xs[0],totalTop+28,40,ink,600);text(result.maximum,xs[1],totalTop+28,43);text(result.total??'—',xs[2],totalTop+28,43);rule(totalTop+100);
 ctx.fillStyle=palette.panel;ctx.fillRect(left,resultTop,width,185);[['PERCENTAGE',result.percentage===null?'—':result.percentage+'%'],['GRADE',result.grade],['RESULT',!result.complete?'Incomplete':result.passed?'Pass':'Fail']].forEach(([label,value],i)=>{const x=left+i*(width/3)+25;text(label,x,resultTop+28,27,muted,600);text(value,x,resultTop+87,52,ink,600,'MarkSerif');});
 block(policy,left,policyTop,28,muted);
 const sigTop=height-360;for(const [key,x,label] of [['examiner',left,'EXAMINER / ASSESSOR'],['authorized',right-530,'AUTHORIZED SIGNATORY']]){if(signatures[key]){if(palette.ink==='#ffffff'){ctx.fillStyle='#ffffff';ctx.fillRect(x+30,sigTop,470,180);}contain(signatures[key],x+40,sigTop+5,450,165);}rule(sigTop+190,x,x+530,gold);text(label,x,sigTop+216,25,ink,600);}
 rule(height-115,left,right,gold);text('Cell: 9797205429 · 9149551258',left,height-85,29,ink,600,'MarkSerif');text('rehaan-computers.web.app',965,height-85,29,ink,600,'MarkSerif');
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not create the mark-card image. Please retry.')),'image/png'));
}
