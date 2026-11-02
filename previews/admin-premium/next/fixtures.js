// Only fictional examples, injected before the mocked dashboard loads.
(()=>{
 const now=new Date(),ym=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).format(now).split('-').map(Number);
 const key=offset=>new Date(Date.UTC(ym[0],ym[1]-1+offset,1)).toISOString().slice(0,10);
 Object.entries(__adminPreview.records).slice(0,6).forEach(([id,d],index)=>{
  d.admissionDate=key(-3);d.approvedAt=d.admissionDate+'T00:00:00Z';d.monthlyFees={};d.feeReceipts={};
  // Ayaan: three unpaid months; Sara: all paid; Zoya: a partial oldest month.
  for(let offset=-2;offset<=0;offset++){
   const amount=index===1?999:index===2&&offset===-2?400:index===3&&offset<0?999:0;
   if(!amount)continue;const due=key(offset),rid=String(index*10+offset+3).padStart(32,'0');
   d.monthlyFees[due]=amount;
   d.feeReceipts[rid]={id:rid,studentId:id,number:String(1000+index*10+offset+3),date:index===1&&offset===-1?key(0):due,due,month:new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(key(offset-1))),amount:amount*100,method:'Cash',student:{name:d.fullName,admission:d.admissionNumber,course:d.coursePreference,address:d.address,phone:d.phone},receivedAtIssue:amount*100,balanceAtIssue:(999-amount)*100,note:'Fictional preview payment',createdBy:'preview-admin',createdAt:due+'T12:00:00Z'};
  }
 });
})();
