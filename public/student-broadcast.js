import {studentUpdatePayload} from './student-portal-updates.js';
export function audienceRows(rows,target){
 if(!['all','batch','boys','girls','selected'].includes(target?.kind))throw Error('Choose an audience.');
 return rows.filter(({id,data:d})=>d.status==='Approved'&&d.enrolmentStatus!=='Cancelled'&&d.studentPortalAccount?.uid&&d.studentPortalAccount.enabled===true&&(target.kind==='all'||target.kind==='batch'&&d.batch===target.batch||target.kind==='boys'&&['male','boy','boys'].includes(String(d.gender).toLowerCase())||target.kind==='girls'&&['female','girl','girls'].includes(String(d.gender).toLowerCase())||target.kind==='selected'&&target.ids?.includes(id))).sort((a,b)=>a.id.localeCompare(b.id));
}
export async function broadcastUpdate({db,sdk,assertAdmin,input}){
 assertAdmin();const snapshot=await sdk.getDocs(sdk.collection(db,'applications'));assertAdmin();
 const recipients=audienceRows(snapshot.docs.map(row=>({id:row.id,data:row.data()})),input.target);
 if(!recipients.length||recipients.length>100)throw Error('Choose between 1 and 100 active linked students per publication.');
 if(JSON.stringify(recipients.map(row=>row.id))!==JSON.stringify(input.reviewedIds))throw Error('The audience changed. Preview the recipients again.');
 if(!/^[a-zA-Z0-9-]{8,80}$/.test(input.publicationId||''))throw Error('Preview this publication first.');
 const payload=studentUpdatePayload(input.payload,input.payload.createdAt);
 if(new TextEncoder().encode(JSON.stringify(payload)).length*recipients.length>8000000)throw Error('This image is too large for this audience. Reduce its size or publish to smaller groups.');
 return sdk.runTransaction(db,async tx=>{
  assertAdmin();const apps=await Promise.all(recipients.map(row=>tx.get(sdk.doc(db,'applications',row.id))));
  const fresh=apps.map((snap,index)=>({id:recipients[index].id,data:snap.exists()?snap.data():{}}));
  if(audienceRows(fresh,input.target).length!==recipients.length||fresh.some((row,index)=>row.data.studentPortalAccount.uid!==recipients[index].data.studentPortalAccount.uid))throw Error('Student eligibility changed. Preview again.');
  const refs=fresh.map(row=>sdk.doc(db,'studentPortalViews',row.data.studentPortalAccount.uid,'updates',input.publicationId));
  const existing=await Promise.all(refs.map(ref=>tx.get(ref)));assertAdmin();
  existing.forEach((snap,index)=>{if(snap.exists()){const old=snap.data();for(const key of ['category','title','details','author','createdAt','image'])if(old[key]!==payload[key])throw Error('Publication ID already exists with different content. Start a new preview.');}else tx.set(refs[index],payload);});
  return {recipients:recipients.length};
 });
}
