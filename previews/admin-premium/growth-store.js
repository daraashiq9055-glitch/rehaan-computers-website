import {validateProspect,validateIncome,validateConcession} from './growth-model.js';
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const canonical=value=>JSON.stringify(stable(value??null));
export async function saveGrowthRecord({db,ref,runTransaction,assertSession,actor,kind,input,expected,now=new Date().toISOString()}){
 const clean=kind==='prospect'?validateProspect(input):kind==='income'?validateIncome(input):input;
 const saved={...clean,revision:Number(expected?.revision||0)+1,updatedAt:now,updatedBy:actor,...(expected?{createdAt:expected.createdAt,createdBy:expected.createdBy}:{createdAt:now,createdBy:actor})};
 await runTransaction(db,async tx=>{assertSession();const snap=await tx.get(ref);assertSession();if(canonical(snap.exists()?snap.data():null)!==canonical(expected))throw Error('This entry changed in another session. Refresh and review it.');tx.set(ref,saved);});return saved;
}
export async function saveConcession({db,ref,runTransaction,assertSession,actor,id,input,expectedPaid,monthly=999,now=new Date().toISOString()}){
 const clean=validateConcession(input,{monthly,paid:expectedPaid});
 return runTransaction(db,async tx=>{assertSession();const snap=await tx.get(ref);assertSession();if(!snap.exists())throw Error('Student record no longer exists.');const data=snap.data(),paid=Number(data.monthlyFees?.[clean.due]||0);if(Math.round(paid*100)!==clean.paidBefore)throw Error('The fee ledger changed. Refresh before approving this concession.');if(data.status!=='Approved'||!data.admissionNumber||data.enrolmentStatus==='Cancelled')throw Error('Student is no longer enrolled.');const key=crypto.randomUUID().replaceAll('-',''),existing=data.feeConcessions?.[clean.due];if(existing)throw Error('This month already has a saved concession. Review it before making another change.');const saved={id:key,studentId:id,...clean,approvedAt:now,approvedBy:actor};assertSession();tx.update(ref,{['monthlyFees.'+clean.due]:clean.monthly/100,['feeConcessions.'+clean.due]:saved,updatedAt:now,updatedBy:actor});return saved;});
}
