(()=>{
    const previous = new Date();previous.setDate(1);previous.setMonth(previous.getMonth()-1);
    const month = previous.getFullYear()+'-'+String(previous.getMonth()+1).padStart(2,'0');
    const days = [18,23,null,9,21,24];
    days.forEach((value,index)=>{const student=window.__adminPreview.records['demo-'+index];if(student&&value!==null)student.monthlyAttendance={[month]:{days:value,totalDays:24,note:index===0?'Please attend your classes regularly. If you need any help, contact us.':'',updatedBy:'preview-admin',updatedAt:new Date().toISOString()}};});

// Injected only by the disconnected attendance preview launcher.
const attendanceReady = new MutationObserver(() => {
  const button = document.querySelector('[data-section="attendance"]');
  if (button && document.querySelector('.rc-fees')) {
    attendanceReady.disconnect();
    const panelReady=new MutationObserver(()=>{const input=document.querySelector('#attendanceMonth');if(input){panelReady.disconnect();input.value=month;input.dispatchEvent(new Event('change'));}});
    panelReady.observe(document.documentElement,{subtree:true,childList:true});
    button.click();
  }
});
attendanceReady.observe(document.documentElement, {subtree:true, childList:true});

})();
