import {programs,questionOkay} from './quiz-core.mjs';
export const statuses=['Draft','Review','Approved','Archived'];
export function normalizeQuestion(input,uid,existing=null){
 const row={...input,id:existing?.id||input.id||crypto.randomUUID().replaceAll('-','')};
 if(!questionOkay(row))throw Error('Enter approved software, a question, exactly four distinct options and one correct answer.');
 if(!['Foundation','Intermediate','Advanced'].includes(row.difficulty)||typeof row.explanation!=='string'||row.explanation.trim().length<5||row.explanation.length>1500)throw Error('Choose difficulty and write an explanation (5–1500 characters).');
 const status=row.status||'Draft';if(!statuses.includes(status))throw Error('Invalid review status.');
 const contentChanged=existing&&['program','question','options','answer','difficulty','explanation'].some(key=>JSON.stringify(row[key])!==JSON.stringify(existing[key]));
 if(status==='Approved'&&(!existing||existing.status!=='Review'||contentChanged))throw Error('Save the question for review first; approval must be a separate action without content changes.');
 return {...row,status,active:status==='Approved'?1:0,reviewed_by:status==='Approved'?uid:null,reviewed_at:status==='Approved'?new Date().toISOString():null};
}
export async function bankRows(db){return ((await db.prepare('SELECT * FROM question_bank ORDER BY program,id LIMIT 5000').all()).results||[]).map(row=>({...row,options:JSON.parse(row.options_json)}));}
export function readiness(rows){
 const approved=rows.filter(row=>row.status==='Approved'&&row.active===1&&questionOkay(row));
 return programs.map((program,index)=>{
  const current=new Set(approved.filter(row=>row.program===program).map(row=>row.question.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()));
  const previous=new Set(approved.filter(row=>programs.indexOf(row.program)<index).map(row=>row.question.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()).filter(text=>!current.has(text)));
  const currentNeeded=index?28:70,previousNeeded=index?42:0;
  return {program,approvedCurrent:current.size,approvedPrevious:previous.size,currentNeeded,previousNeeded,missingCurrent:Math.max(0,currentNeeded-current.size),missingPrevious:Math.max(0,previousNeeded-previous.size),ready:current.size>=currentNeeded&&previous.size>=previousNeeded};
 });
}
export async function saveQuestion(db,input,uid){
 const existing=input.id?(await bankRows(db)).find(row=>row.id===input.id):null;
 if(existing&&input.revision!==existing.revision)throw Error('This question changed. Refresh before saving or approving.');
 const row=normalizeQuestion(input,uid,existing),now=new Date().toISOString();
 const duplicate=await db.prepare('SELECT id FROM question_bank WHERE lower(trim(question))=lower(trim(?)) AND id<>?').bind(row.question,row.id).first();if(duplicate)throw Error('This question already exists; edit its existing entry.');
 const result=await db.prepare(`INSERT INTO question_bank(id,program,question,options_json,answer,active,created_at,author_uid,difficulty,explanation,status,reviewed_by,reviewed_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET program=excluded.program,question=excluded.question,options_json=excluded.options_json,answer=excluded.answer,active=excluded.active,difficulty=excluded.difficulty,explanation=excluded.explanation,status=excluded.status,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at,updated_at=excluded.updated_at,revision=question_bank.revision+1 WHERE question_bank.revision=?`).bind(row.id,row.program,row.question.trim(),JSON.stringify(row.options),row.answer,row.active,now,uid,row.difficulty,row.explanation.trim(),row.status,row.reviewed_by,row.reviewed_at,now,existing?.revision||0).run();
 if(result.meta?.changes===0)throw Error('This question changed. Refresh before saving.');
 return {id:row.id,status:row.status};
}
