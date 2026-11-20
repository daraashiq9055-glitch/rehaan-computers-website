import {validateSignatureSet} from './admin-mark-signatures.js?v=20261102-settings-1';
import {escapeHTML, dateLabel} from './admin-feature-model.js?v=20261102-settings-1';
import {SHEET_LABELS} from './admin-group-draft.js?v=20261120-4';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const number = value => finite(value) ? String(Math.round(value * 100) / 100) : '—';
const percent = value => finite(value) ? `${number(value)}%` : '—';
const units = value => Array.from(String(value)).reduce((sum,char)=>sum+(/[W@%]/u.test(char)?1.8:/[Mmw]/u.test(char)?1.6:/[ilI.,'’]/u.test(char)?.5:/\s/u.test(char)?.6:/[A-Z&]/u.test(char)?1.3:/[0-9]/u.test(char)?1.05:/[^\x00-\x7F]/u.test(char)?1.8:1),0);

// Missing marks and typing measurements are never treated as zero.
export function groupInsights(result) {
  const complete = result.rows.filter(row => row.result.complete);
  return {
    completed: complete.length,
    average: mean(complete.map(row => row.result.total / row.result.maximum * 100)),
    passRate: complete.length ? result.summary.passed / complete.length * 100 : null,
    highest: complete.length ? Math.max(...complete.map(row => row.result.percentage)) : null,
    subjects: result.card.subjects.map((subject, index) => {
      const values = result.rows.map(row => row.card.subjects[index]);
      const marks = values.map(value => value.marks).filter(finite);
      const speeds = values.map(value => value.typing?.speed).filter(finite);
      const accuracy = values.map(value => value.typing?.accuracy).filter(finite);
      return {name: subject.name, maximum: subject.max, recorded: marks.length,
        average: mean(marks), percentage: marks.length ? mean(marks) / subject.max * 100 : null,
        speed: mean(speeds), speedCount: speeds.length, accuracy: mean(accuracy), accuracyCount: accuracy.length};
    })
  };
}

export function groupRankings(result) {
 const complete=result.rows.filter(row=>row.result.complete);
 const score=row=>row.result.total/row.result.maximum;
 // Stable admission order resolves equal scores; a tie never becomes a different score.
 return {top:[...complete].sort((a,b)=>score(b)-score(a)).slice(0,3),
 lowest:[...complete].sort((a,b)=>score(a)-score(b)).slice(0,3)};
}

function wrap(value, limit) {
  const lines = []; let line = '';
  for (const word of String(value ?? '—').split(/\s+/)) {
    const parts=[];let part='';
    for(const char of word){if(part&&units(part+char)>limit){parts.push(part);part='';}part+=char;}
    if(part)parts.push(part);
    for (const part of parts) {
      if (units((line + ' ' + part).trim()) > limit && line) {lines.push(line); line = '';}
      line = (line + ' ' + part).trim();
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ['—'];
}

export function groupSVG(result, label, profile, labels = SHEET_LABELS, signatures = {}) {
  const {rows, summary, card} = result;
  if (!rows.length) throw Error('Select at least one student.');
  const cleanSignatures=validateSignatureSet(signatures);
  const navy = '#102a42', muted = '#607181', gold = '#a9843d', line = '#d8dfdf';
  const columns = [
    {label:labels.serial, width:76, get:(row,index)=>row.serial || index + 1},
    {label:labels.student, width:310, align:'start', get:row=>`${row.name}\nADM ${row.admission}${row.batch && row.batch !== 'Not recorded' ? '\n'+row.batch : ''}`}
  ];
  card.subjects.forEach((subject,index) => {
    if (subject.typing) columns.push(
      {label:subject.name+' · '+labels.speed, width:126, get:row=>number(row.card.subjects[index].typing?.speed)},
      {label:subject.name+' · '+labels.accuracy, width:144, get:row=>percent(row.card.subjects[index].typing?.accuracy)}
    );
    columns.push({label:subject.name+' · MARKS / '+subject.max, width:142, get:row=>number(row.card.subjects[index].marks)+' / '+subject.max});
  });
  columns.push(
    {label:labels.total+' / '+rows[0].result.maximum, width:126, get:row=>number(row.result.total)+' / '+row.result.maximum},
    {label:labels.percentage || 'PERCENTAGE', width:135, get:row=>percent(row.result.percentage)},
    {label:labels.grade, width:110, get:row=>row.result.complete ? row.result.grade : '—'},
    {label:labels.result, width:164, get:row=>!row.result.complete ? 'INCOMPLETE' : row.result.passed ? 'PASS' : 'FAIL'}
  );
  const width = Math.max(1920, columns.reduce((sum,col)=>sum+col.width,0)+112);
  const margin = 56, inner = width - margin*2;
  const ratio = inner / columns.reduce((sum,col)=>sum+col.width,0);
  columns.forEach(col=>col.width *= ratio);
  const sectionChars = Math.floor(inner / 13);
  const nameLines = wrap(profile.name, Math.floor((inner-240)/29));
  const addressLines = wrap(profile.address, Math.floor((inner-240)/13));
  const titleLines = wrap(card.title, Math.floor(inner/23));
  const labelLines = label ? wrap(label, Math.floor(inner/14)) : [];
  const brandHeight = Math.max(178, 80+nameLines.length*54+addressLines.length*27);
  const titleHeight = 76+titleLines.length*47+labelLines.length*29;
  const metaTop = margin + brandHeight + titleHeight;
  const tableTop = metaTop + 96;
  const tableHead = Math.max(92,...columns.map(col=>wrap(col.label,Math.floor((col.width-20)/10)).length*25+38));
  const tableRows = rows.map((row,index) => {
    const cells = columns.map((col,colIndex)=>String(col.get(row,index)).split('\n').flatMap(value=>colIndex===columns.length-1?[value]:wrap(value,Math.floor((col.width-30)/(col.align ? 12.5 : 13)))));
    return {row,cells,height:Math.max(86,...cells.map(lines=>lines.length*29+26))};
  });
  const tableBottom = tableTop+tableHead+tableRows.reduce((sum,row)=>sum+row.height,0);
  const ranking=groupRankings(result);
  const ranked=(items,improve)=>items.map((row,index)=>({row,
   name:wrap(`${index+1}. ${row.name}`,27),admission:wrap('ADM '+row.admission,34),
   note:wrap(`${number(row.result.total)} / ${row.result.maximum} marks · ${percent(row.result.percentage)} · Grade ${row.result.grade} · ${row.result.passed?'PASS':'FAIL'}${improve?' — '+row.note:''}`,Math.floor((inner-445)/12))}));
  const highlights=ranked(ranking.top,false),guidance=ranked(ranking.lowest,true);
  const rowHeight=item=>Math.max(item.name.length+item.admission.length,item.note.length)*29+30;
  const highlightTop=tableBottom+28;
  const highlightHeight=110+Math.max(65,highlights.reduce((sum,item)=>sum+rowHeight(item),0));
  const guidanceTop=highlightTop+highlightHeight+28;
  const guidanceHeight=110+Math.max(65,guidance.reduce((sum,item)=>sum+rowHeight(item),0));
  const footerTop = guidanceTop+guidanceHeight+30;
  const policy = [
    'Pass requires at least 33% in every subject. Saved manual grades are respected; unmarked subjects remain incomplete.',
    'Typing practice guidance: 25 WPM and 90% accuracy. These targets do not change saved marks or results.',
    'Sheet-only draft edits do not update stored student records. Review this report before sharing or printing.'
  ].flatMap(value=>wrap(value,sectionChars));
  const contacts = [profile.phone,profile.phone2,profile.email].filter(Boolean).join('  ·  ');
  const contactLines = wrap(contacts,sectionChars);
  const websiteLines=wrap(String(profile.website || '').replace(/^https?:\/\//,''),sectionChars);
  const height = footerTop + 216 + policy.length*26 + contactLines.length*26 + websiteLines.length*26 + 94;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Group examination result"><defs><linearGradient id="groupNavy" x2="1" y2="1"><stop stop-color="#173954"/><stop offset="1" stop-color="#0a1e33"/></linearGradient><linearGradient id="groupGold"><stop stop-color="#dbc58e"/><stop offset="1" stop-color="#a9843d"/></linearGradient></defs><rect width="${width}" height="${height}" fill="#fbf8f0"/><rect x="20" y="20" width="${width-40}" height="${height-40}" rx="12" fill="none" stroke="${gold}" stroke-width="2"/><rect x="28" y="28" width="${width-56}" height="${height-56}" rx="8" fill="none" stroke="#dfd4b9"/>`];
  const rect = (x,y,w,h,fill,stroke='none',radius=0)=>out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`);
  const text = (value,x,y,size=23,fill=navy,weight=500,anchor='start')=>out.push(`<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escapeHTML(value)}</text>`);
  const rule = (x,y,w,color=line)=>out.push(`<path d="M${x} ${y}h${w}" stroke="${color}"/>`);
  const heading = (title,kicker,y)=>{
    rect(margin,y,inner,58,'url(#groupNavy)','none',7);
    text(title,margin+24,y+38,Math.min(25,inner*.62/Math.max(1,units(title)*.6)),'#f1dca5',700);
    if(kicker)text(kicker,width-margin-24,y+37,18,'#d0dbe5',500,'end');
  };
  // Restrained institute masthead with a small monogram and fine gold rules.
  rect(margin,margin,inner,brandHeight,'url(#groupNavy)','none',10);
  rect(margin+26,margin+30,128,128,'none','#c8ab69',16);
  text('RC',margin+90,margin+112,54,'#e8d29b',700,'middle');
  text('ACADEMIC RECORDS',margin+185,margin+37,17,'#ccb981',700);
  let y=margin+95;
  nameLines.forEach(value=>{text(value,margin+185,y,48,'#fff7e6',700);y+=54;});
  addressLines.forEach(value=>{text(value,margin+185,y,23,'#cad7e2');y+=27;});
  const titleTop=margin+brandHeight+36;
  text(labels.heading,margin,titleTop,19,gold,700);
  y=titleTop+51;
  titleLines.forEach(value=>{text(value,margin,y,40,navy,700);y+=47;});
  labelLines.forEach(value=>{text(value,margin,y,25,muted);y+=29;});
  const meta=[['EXAMINATION DATE',dateLabel(card.date)],['STUDENTS INCLUDED',summary.students],['SUBJECTS',card.subjects.length],['MAXIMUM MARKS',rows[0].result.maximum]];
  meta.forEach(([label,value],index)=>{const x=margin+index*inner/4;rect(x,metaTop,inner/4,76,'#f0ede4',line);text(label,x+20,metaTop+27,16,muted,700);text(value,x+20,metaTop+57,25,navy,700);});
  let x=margin;rect(margin,tableTop,inner,tableHead,'url(#groupNavy)','none',7);
  columns.forEach(col=>{wrap(col.label,Math.floor((col.width-20)/10)).forEach((value,index)=>text(value,x+col.width/2,tableTop+34+index*25,19,'#f9f5e8',700,'middle'));x+=col.width;});
  y=tableTop+tableHead;
  tableRows.forEach((item,index)=>{
    rect(margin,y,inner,item.height,index%2 ? '#f0f3f2' : '#fffef9',line);x=margin;
    item.cells.forEach((values,colIndex)=>{
      const col=columns[colIndex],last=colIndex===columns.length-1;
      const ink=last ? '#ffffff' : navy;
      if(last)rect(x+10,y+item.height/2-27,col.width-20,54,!item.row.result.complete?'#825d16':item.row.result.passed?'#176343':'#a92c35','none',7);
      values.forEach((value,j)=>text(value,col.align?x+17:x+col.width/2,col.align?y+34+j*29:y+item.height/2+8+(j-(values.length-1)/2)*29,last?Math.min(28,(col.width-30)/Math.max(1,units(value)*.6)):j>0&&col.align?18:22,j>0&&col.align?muted:ink,last||j===0&&col.align?700:500,col.align?'start':'middle'));
      out.push(`<path d="M${x} ${y}v${item.height}" stroke="${line}"/>`);x+=col.width;
    });y+=item.height;
  });
  const rankPanel=(items,top,height,title,kicker,improve)=>{
    rect(margin,top,inner,height,improve?'#fffaf4':'#fffdf5',improve?'#dfcdb8':'#d8c590',9);
    heading(title,kicker,top);let ry=top+70;
    if(!items.length)text('No complete results yet. Missing marks are not treated as zero.',margin+26,ry+32,22,muted);
    items.forEach((item,index)=>{const h=rowHeight(item);rect(margin+10,ry,inner-20,h,index%2?'#ffffff':improve?'#f6eee3':'#f2ecd9','none',6);
      rect(margin+10,ry+12,4,h-24,improve?'#b27b4d':'#b9994d');
      item.name.forEach((value,j)=>text(value,margin+26,ry+30+j*29,23,navy,700));
      item.admission.forEach((value,j)=>text(value,margin+26,ry+30+(item.name.length+j)*29,18,muted));
      item.note.forEach((value,j)=>text(value,margin+425,ry+30+j*29,21,muted));ry+=h;
    });
    text('Complete results only · Equal scores use the student list order · Up to three students',margin+26,top+height-15,17,muted);
  };
  rankPanel(highlights,highlightTop,highlightHeight,'TOP 3 STUDENTS','Highest overall scores',false);
  rankPanel(guidance,guidanceTop,guidanceHeight,'TOP 3 IMPROVEMENT PRIORITIES','Lowest overall scores · Focus for the next assessment',true);
  [['examiner','EXAMINER / ASSESSOR'],['authorized','AUTHORIZED SIGNATORY']].forEach(([key,label],index)=>{
    const x=margin+index*inner/2,w=inner/2;
    if(cleanSignatures[key])out.push(`<image href="${escapeHTML(cleanSignatures[key])}" x="${x+40}" y="${footerTop+8}" width="${w-110}" height="130" preserveAspectRatio="xMidYMid meet"/>`);
    rule(x+32,footerTop+150,w-96,'#b5b5a8');text(label,x+w/2,footerTop+180,19,muted,700,'middle');
  });
  y=footerTop+216;policy.forEach(value=>{text(value,margin,y,18,muted);y+=26;});
  rule(margin,y+12,inner,'#c5b17e');y+=48;
  contactLines.forEach(value=>{text(value,width/2,y,20,navy,600,'middle');y+=26;});
  websiteLines.forEach((value,index)=>text(value,width/2,y+6+index*26,20,gold,600,'middle'));
  out.push('</svg>');return out.join('');
}
