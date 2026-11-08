// Fictional records for the explicitly requested group marksheet preview only.
if(window.__adminPreview){
 const marks=[[14,33,25,88],[13,37,27,93],[15,39,30,93],[15,43,32,99],[16,31,25,92],[15,41,42,94],[13,32,28,90]];
 for(let index=0;index<marks.length;index++){
  const entry=window.__adminPreview.records['demo-'+index], [word,typing,speed,accuracy]=marks[index];
  entry.markCard={title:'MS Word & Typing Examination',date:'2026-11-01',subjects:[{name:'MS Word',max:20,marks:word},{name:'Typing',max:50,marks:typing,typing:{speed,accuracy}}]};
 }
 document.addEventListener('DOMContentLoaded',()=>{let opened=false;const wait=new MutationObserver(()=>{const create=document.querySelector('#groupPreview');if(create){wait.disconnect();document.querySelector('#groupLabel').value='Sample students · Morning batch';create.click();return;}const button=document.querySelector('[data-new=groupMarks]');if(button&&!opened){opened=true;button.click();}});wait.observe(document.body,{subtree:true,childList:true});const start=()=>{if(document.querySelector('#adminDashboard')?.style.display!=='none'){document.querySelector('.nav [data-section=marks]')?.click();return true;}return false;};if(!start()){const login=new MutationObserver(()=>{if(start())login.disconnect();});login.observe(document.querySelector('#adminDashboard'),{attributes:true,attributeFilter:['style']});}});
}
