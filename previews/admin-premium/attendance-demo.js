// Injected only by the disconnected attendance preview launcher.
const attendanceReady = new MutationObserver(() => {
  const button = document.querySelector('[data-section="attendance"]');
  if (button && document.querySelector('.rc-fees')) {
    attendanceReady.disconnect();
    button.click();
  }
});
attendanceReady.observe(document.documentElement, {subtree:true, childList:true});
