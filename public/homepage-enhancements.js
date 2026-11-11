// Approved application-button motion control. The removed challenge has no handlers.
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const motionButton=document.querySelector('#fitMotion');
let paused=reduce.matches;
function applyMotion(){document.body.classList.toggle('motion-paused',paused);if(motionButton){motionButton.textContent=paused?'Enable page effects':'Pause page effects';motionButton.setAttribute('aria-pressed',String(paused))}}
motionButton?.addEventListener('click',()=>{paused=!paused;applyMotion()});
reduce.addEventListener('change',()=>{paused=reduce.matches;applyMotion()});
applyMotion();
