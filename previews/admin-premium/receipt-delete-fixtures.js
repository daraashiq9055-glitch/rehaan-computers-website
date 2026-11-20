// Fictional receipts for the optional local preview. Never included in a release.
(() => {
  const state=window.__adminPreview;if(!state)return;
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  const today=[parts.year,parts.month,parts.day].join('-');
  const currentMonth=Number(parts.month)-1-(Number(parts.day)<12?1:0);
  const due=new Date(Date.UTC(Number(parts.year),currentMonth,12)).toISOString().slice(0,10);
  const joined=new Date(Date.UTC(Number(parts.year),currentMonth-3,12)).toISOString().slice(0,10);
  const now=new Date().toISOString();
  const seed=(index,character,amount,total,number)=>{
    const id='demo-'+index,data=state.records[id];
    Object.assign(data,{status:'Approved',admissionNumber:String(index+1).padStart(3,'0'),admissionDate:joined,approvedAt:joined+'T06:00:00.000Z'});
    data.monthlyFees={...data.monthlyFees,[due]:total};
    const receiptId=character.repeat(32);
    data.feeReceipts={...data.feeReceipts,[receiptId]:{id:receiptId,number:String(number),studentId:id,
      student:{name:data.fullName,admission:data.admissionNumber,course:data.coursePreference,phone:data.phone,address:data.address},
      period:due.slice(0,7),due,date:today,method:'Cash',amount:amount*100,billed:99900,receivedAtIssue:total*100,balanceAtIssue:(999-total)*100,
      createdAt:now,createdBy:'preview-admin',note:'Fictional receipt for the local preview.'}};
  };
  seed(0,'a',400,400,1000);seed(0,'b',300,700,1001);seed(1,'c',999,999,1002);seed(2,'d',400,400,1003);
  state.counters={...state.counters,tuition:{last:1003}};
  document.addEventListener('DOMContentLoaded',()=>{
    let chosen=false,opened=false;
    const show=()=>{
      if(document.querySelector('#adminDashboard')?.style.display==='none')return;
      const fees=document.querySelector('.nav [data-section=fees]');
      if(!chosen&&fees){chosen=true;fees.click();}
      const receipts=document.querySelector('#rcReceiptTools [data-new=receipts]');
      if(chosen&&receipts&&!opened){opened=true;observer.disconnect();receipts.click();}
    };
    const observer=new MutationObserver(show);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});show();
  });
})();
