import {school,money,dateText,amountWords} from './admin-receipt-layout.js?v=20261024-admin-10';
// Same paper layout, drawn directly at 3200px. No screenshots or image uploads.
export async function receiptImage(r,{blank=false,numbered=true}={}){
    await Promise.all([document.fonts.load('700 48px Caveat'),document.fonts.load('700 54px Playfair'),document.fonts.load('600 31px Playfair')]);await document.fonts.ready;
    const canvas=document.createElement('canvas');canvas.width=3200;canvas.height=2240;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image rendering is unavailable. Try Print receipt.');ctx.scale(2,2);
    const ink='#20374c',muted='#596778',gold='#a58a50',left=65,right=1535,width=1470;
    ctx.fillStyle='#fffcf2';ctx.fillRect(0,0,1600,1120);ctx.lineWidth=2;ctx.strokeStyle=gold;ctx.strokeRect(24,24,1552,1072);ctx.strokeStyle='#ddcfac';ctx.lineWidth=1;ctx.strokeRect(32,32,1536,1056);
    function text(value,x,y,size=26,color=ink,weight=500,font='Inter',limit=right-x){ctx.font=`${weight} ${size}px ${font},Arial,sans-serif`;while(ctx.measureText(String(value)).width>limit&&size>16){size--;ctx.font=`${weight} ${size}px ${font},Arial,sans-serif`;}ctx.fillStyle=color;ctx.textBaseline='top';const content=String(value);if(ctx.measureText(content).width<=limit){ctx.fillText(content,x,y);return;}let row='',line=0;for(const char of content){if(ctx.measureText(row+char).width>limit&&row){ctx.fillText(row,x,y+line*19);row='';line++;}row+=char;}if(row)ctx.fillText(row,x,y+line*19);}
    function rule(y,x=left,end=right,dotted=false){ctx.strokeStyle=dotted?'#b6ab8d':gold;ctx.lineWidth=1.5;ctx.setLineDash(dotted?[2,5]:[]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(end,y);ctx.stroke();ctx.setLineDash([]);}
    const draw=value=>blank?'':value;
    text('Email: '+school.email,left,60,21);text('Cell: '+school.cells,990,60,21);
    ctx.font='700 54px Playfair,Georgia,serif';const headingWidth=ctx.measureText(school.name).width;text(school.name,(1600-headingWidth)/2,110,54,ink,700,'Playfair');
    rule(184);ctx.font='500 23px Inter,Arial,sans-serif';const addressWidth=ctx.measureText(school.address).width;text(school.address,(1600-addressWidth)/2,204,23,muted);rule(249);
    text('FEE RECEIPT',695,333,22,gold,700);
    text('RECEIPT NO.',left,330,24,ink,700);
    if(!blank||numbered){ctx.save();ctx.translate(285,309);ctx.rotate(-.045);text(r.number,0,0,70,ink,700,'Caveat',420);ctx.restore();}else rule(370,280,570,true);
    text('DATE',1120,330,24,ink,700);text(draw(dateText(r.date)),1230,327,28,ink,650);rule(367,1225,right,true);
    function field(label,value,y,x=left,end=right,labelWidth=220){text(label,x,y,25,muted);text(draw(value),x+labelWidth,y-2,30,ink,600,'Inter',end-x-labelWidth);rule(y+38,x+labelWidth,end,true);}
    field('Received from',r.student.name,410);field('Address',r.student.address,475);
    field('Admission no.',r.student.admission,540,left,550,220);field('Course',r.student.course,540,610,right,115);
    field('Fee month',r.month,610,left,650,170);field('Due date',dateText(r.due),610,700,1125,140);field('Mode',r.method,610,1180,right,100);
    text('Amount in words',left,685,25,muted);text(draw(amountWords(r.amount)),340,674,42,ink,700,'Caveat',1195);rule(725,335,right,true);
    const y=770;ctx.fillStyle='#f5e6b8';ctx.fillRect(left,y,width,132);ctx.strokeStyle='#c7b27b';ctx.strokeRect(left,y,width,132);
    [['AMOUNT RECEIVED',r.amount],[r.balanceBasis==='correction'?'TOTAL AT CORRECTION':'RECEIVED FOR THIS MONTH',r.receivedAtIssue],[r.balanceBasis==='correction'?'BALANCE AT CORRECTION':'BALANCE AFTER PAYMENT',r.balanceAtIssue]].forEach(([label,value],i)=>{const x=left+i*490;if(i){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+132);ctx.stroke();}text(label,x+24,y+22,20,muted,600);if(blank){text('₹',x+24,y+65,40,ink,650);rule(y+110,x+80,x+465,true);}else text(money(value),x+24,y+60,51,ink,750);});
    text(r.balanceBasis==='correction'?'Balance at correction: '+dateText(r.balanceRecordedAt?.slice(0,10)):'Please retain this receipt for your records.',left,932,20,muted);if(!blank&&r.note)text('Note: '+r.note,left,967,17,muted,400,'Inter',1060);rule(970,1190,right);text('AUTHORISED SIGNATURE',1197,989,18,muted);rule(1040);
    text('LEARN · PRACTISE · GROW',left,1065,18,gold,600);ctx.font='600 31px Playfair,Georgia,serif';text(school.website,right-ctx.measureText(school.website).width,1055,31,'#36546c',600,'Playfair');
    const data=canvas.toDataURL('image/png');if(!data.startsWith('data:image/png;base64,'))throw Error('Could not create the receipt image.');const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));return new Blob([bytes],{type:'image/png'});
}
