// Only requested decoration changes; original homepage layout and feature handlers remain.
const section=document.querySelector('#practice');
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const motionButton=document.querySelector('#fitMotion');
let inView=false,paused=reduce.matches;
function sync(){if(section)section.classList.toggle('skill-effects-live',inView&&!reduce.matches&&!paused&&!document.hidden)}
function applyMotion(){document.body.classList.toggle('motion-paused',paused);if(motionButton){motionButton.textContent=paused?'Enable page effects':'Pause page effects';motionButton.setAttribute('aria-pressed',String(paused))}sync()}
motionButton?.addEventListener('click',()=>{paused=!paused;applyMotion()});
reduce.addEventListener('change',()=>{paused=reduce.matches;applyMotion()});document.addEventListener('visibilitychange',sync);
if(section&&'IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync()},{threshold:.15});observer.observe(document.querySelector('#skillChallenge'))}
applyMotion();
