import {escapeHTML, dateLabel} from './admin-feature-model.js?v=20261102-settings-1';
import {SHEET_LABELS} from './admin-group-draft.js?v=20261112-1';

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

export function groupSVG(result, label, profile, labels = SHEET_LABELS) {
  const {rows, summary, card} = result;
  if (!rows.length) throw Error('Select at least one student.');
  const insight = groupInsights(result);
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
    columns.push({label:subject.name+' / '+subject.max, width:142, get:row=>number(row.card.subjects[index].marks)});
  });
  columns.push(
    {label:labels.total+' / '+rows[0].result.maximum, width:126, get:row=>number(row.result.total)},
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
  const overviewTop = metaTop + 94;
  const tableTop = overviewTop + 174;
  const tableHead = Math.max(92,...columns.map(col=>wrap(col.label,Math.floor((col.width-20)/10)).length*25+38));
  const tableRows = rows.map((row,index) => {
    const cells = columns.map((col,colIndex)=>String(col.get(row,index)).split('\n').flatMap(value=>colIndex===columns.length-1?[value]:wrap(value,Math.floor((col.width-30)/(col.align ? 12.5 : 13)))));
    return {row,cells,height:Math.max(86,...cells.map(lines=>lines.length*29+26))};
  });
  const tableBottom = tableTop+tableHead+tableRows.reduce((sum,row)=>sum+row.height,0);
  const summaryTop = tableBottom+30;
  const gradeText = Object.entries(summary.grades).map(([grade,count])=>`${grade.toUpperCase()}: ${count}`).join('     ·     ');
  const gradeLines = wrap(gradeText,sectionChars);
  const summaryHeight = 110+gradeLines.length*28;
  const subjectTop = summaryTop+summaryHeight+28;
  const subjectRows = insight.subjects.map((subject,index)=>({subject,index,name:[...wrap(subject.name,Math.floor(inner*.25/13)),`MAXIMUM ${subject.maximum}`]}));
  const subjectHeight = 116+subjectRows.reduce((sum,row)=>sum+Math.max(64,row.name.length*29+24),0)+46;
  const highlights = [];
  const best = (title,get,unit='') => {
    const eligible = rows.filter(row=>finite(get(row)));
    if (!eligible.length) return;
    const highest = Math.max(...eligible.map(get));
    highlights.push(`${title}: ${number(highest)}${unit} · ${eligible.filter(row=>get(row)===highest).map(row=>row.name).join(', ')}`);
  };
  best('Highest total',row=>row.result.total);
  card.subjects.forEach((subject,index)=>{
    best('Highest '+subject.name+' marks',row=>row.card.subjects[index].marks);
    if (subject.typing) {
      best('Highest '+subject.name+' speed (WPM)',row=>row.card.subjects[index].typing?.speed);
      best('Highest '+subject.name+' accuracy (%)',row=>row.card.subjects[index].typing?.accuracy);
    }
  });
  const highlightTop = subjectTop+subjectHeight+28;
  const highlightLines = highlights.flatMap(value=>wrap(value,sectionChars-6));
  const highlightHeight = 86+Math.max(1,highlightLines.length)*31;
  const guidanceTop = highlightTop+highlightHeight+28;
  const guidance = rows.map(row=>({row,name:wrap(row.name,27),admission:wrap('ADM '+row.admission,34),note:wrap(row.note,Math.floor((inner-445)/12))}));
  const guidanceHeight = 80+guidance.reduce((sum,item)=>sum+Math.max(item.name.length+item.admission.length,item.note.length)*29+30,0);
  const footerTop = guidanceTop+guidanceHeight+30;
  const policy = [
    'Pass requires at least 33% in every subject. Saved manual grades are respected; unmarked subjects remain incomplete.',
    'Typing practice guidance: 25 WPM and 90% accuracy. These targets do not change saved marks or results.',
    'Sheet-only draft edits do not update stored student records. Review this report before sharing or printing.'
  ].flatMap(value=>wrap(value,sectionChars));
  const contacts = [profile.phone,profile.phone2,profile.email].filter(Boolean).join('  ·  ');
  const contactLines = wrap(contacts,sectionChars);
  const websiteLines=wrap(String(profile.website || '').replace(/^https?:\/\//,''),sectionChars);
  const height = footerTop + 150 + policy.length*26 + contactLines.length*26 + websiteLines.length*26 + 94;
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
  const overview=[['CLASS AVERAGE',percent(insight.average),`${insight.completed} complete results`],['PASS RATE',percent(insight.passRate),`${summary.passed} of ${insight.completed} complete results`],['HIGHEST SCORE',percent(insight.highest),'Complete results only'],['AWAITING MARKS',summary.incomplete,`${summary.students} students selected`]];
  overview.forEach(([label,value,note],index)=>{const x=margin+index*inner/4,w=inner/4-14;rect(x,overviewTop,w,142,'#ffffff',line,9);rect(x,overviewTop+16,3,48,'url(#groupGold)');text(label,x+22,overviewTop+30,17,muted,700);text(value,x+22,overviewTop+83,42,navy,700);text(note,x+22,overviewTop+119,19,muted);});
  let x=margin;rect(margin,tableTop,inner,tableHead,'url(#groupNavy)','none',7);
  columns.forEach(col=>{wrap(col.label,Math.floor((col.width-20)/10)).forEach((value,index)=>text(value,x+col.width/2,tableTop+34+index*25,19,'#f9f5e8',700,'middle'));x+=col.width;});
  y=tableTop+tableHead;
  tableRows.forEach((item,index)=>{
    rect(margin,y,inner,item.height,index%2 ? '#f0f3f2' : '#fffef9',line);x=margin;
    item.cells.forEach((values,colIndex)=>{
      const col=columns[colIndex],last=colIndex===columns.length-1;
      const ink=last ? !item.row.result.complete ? '#7e6021' : item.row.result.passed ? '#226447' : '#a13f3c' : navy;
      if(last)rect(x+10,y+item.height/2-22,col.width-20,44,!item.row.result.complete?'#f7edce':item.row.result.passed?'#e4eee7':'#f5e5e1','none',7);
      values.forEach((value,j)=>text(value,col.align?x+17:x+col.width/2,col.align?y+34+j*29:y+item.height/2+8+(j-(values.length-1)/2)*29,last?Math.min(22,(col.width-30)/Math.max(1,units(value)*.6)):j>0&&col.align?18:22,j>0&&col.align?muted:ink,last||j===0&&col.align?700:500,col.align?'start':'middle'));
      out.push(`<path d="M${x} ${y}v${item.height}" stroke="${line}"/>`);x+=col.width;
    });y+=item.height;
  });
  rect(margin,summaryTop,inner,summaryHeight,'#f0e9d5','#d8c590',9);
  text(labels.summary,margin+23,summaryTop+34,22,'#755c28',700);
  text(`${summary.students} STUDENTS    ·    ${summary.passed} PASSED    ·    ${summary.failed} FAILED    ·    ${summary.incomplete} INCOMPLETE`,margin+23,summaryTop+73,25,navy,700);
  gradeLines.forEach((value,index)=>text(value,margin+23,summaryTop+110+index*28,21,muted));
  rect(margin,subjectTop,inner,subjectHeight,'#ffffff',line,9);heading(labels.performance || 'SUBJECT PERFORMANCE','Averages use recorded values only',subjectTop);
  const subjectWidths=[.27,.15,.15,.14,.14,.15];
  const subjectHeadings=['SUBJECT / MAXIMUM','MARKS RECORDED','AVERAGE MARKS','AVERAGE %','TYPING WPM','ACCURACY %'];
  x=margin;subjectHeadings.forEach((value,index)=>{text(value,x+18,subjectTop+94,17,muted,700);x+=inner*subjectWidths[index];});
  y=subjectTop+116;
  subjectRows.forEach(({subject,name},index)=>{
    const h=Math.max(64,name.length*29+24);if(index%2===0)rect(margin+1,y,inner-2,h,'#f3f5f3');
    let x=margin;name.forEach((value,j)=>text(value,x+18,y+30+j*29,22,navy,700));
    const values=[`${subject.recorded} / ${summary.students}`,`${number(subject.average)} / ${subject.maximum}`,percent(subject.percentage),subject.speedCount?`${number(subject.speed)} (${subject.speedCount})`:'—',subject.accuracyCount?`${percent(subject.accuracy)} (${subject.accuracyCount})`:'—'];
    x+=inner*subjectWidths[0];values.forEach((value,i)=>{text(value,x+18,y+35,22);x+=inner*subjectWidths[i+1];});y+=h;
  });
  text('Typing values in brackets show the number of recorded measurements. Missing marks and measurements are excluded.',margin+18,y+29,18,muted);
  rect(margin,highlightTop,inner,highlightHeight,'#f3f5f3',line,9);heading(labels.highlights,'Equal highest values include every tied student',highlightTop);
  (highlightLines.length?highlightLines:['No recorded marks or typing measurements yet.']).forEach((value,index)=>text(value,margin+24,highlightTop+88+index*31,22));
  rect(margin,guidanceTop,inner,guidanceHeight,'#ffffff',line,9);heading(labels.guidance,'Student-specific next steps',guidanceTop);
  y=guidanceTop+70;
  guidance.forEach(({row,name,admission,note},index)=>{
    const h=Math.max(name.length+admission.length,note.length)*29+30;if(index%2===0)rect(margin+10,y,inner-20,h,'#f1f4f2','none',5);
    name.forEach((value,j)=>text(value,margin+26,y+30+j*29,23,navy,700));admission.forEach((value,j)=>text(value,margin+26,y+30+(name.length+j)*29,18,muted));
    note.forEach((value,j)=>text(value,margin+425,y+30+j*29,21,muted));y+=h;
  });
  ['PREPARED BY','CHECKED BY','INSTITUTE SEAL'].forEach((value,index)=>{const x=margin+index*inner/3;rule(x+22,footerTop+68,inner/3-80,'#b5b5a8');text(value,x+22,footerTop+98,17,muted,700);});
  y=footerTop+150;policy.forEach(value=>{text(value,margin,y,18,muted);y+=26;});
  rule(margin,y+12,inner,'#c5b17e');y+=48;
  contactLines.forEach(value=>{text(value,width/2,y,20,navy,600,'middle');y+=26;});
  websiteLines.forEach((value,index)=>text(value,width/2,y+6+index*26,20,gold,600,'middle'));
  out.push('</svg>');return out.join('');
}
