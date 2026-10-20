// A tap-first learning exercise. No timer, storage, student record or service call.
export const skillQuestions=Object.freeze([
  {topic:'Everyday shortcuts',question:'Your assignment is ready. Which shortcut saves your work?',options:['Ctrl + S','Ctrl + P','Ctrl + C'],answer:0,explanation:'Ctrl + S saves a document. Ctrl + P opens Print, and Ctrl + C copies your selection.'},
  {topic:'Spreadsheet confidence',question:'You have five prices in Excel. Which formula adds them together?',options:['=COUNT(A1:A5)','=SUM(A1:A5)','=MAX(A1:A5)'],answer:1,explanation:'SUM adds the values in a range. COUNT counts numeric cells, while MAX finds the largest value.'},
  {topic:'Safer digital habits',question:'A message asks for your bank OTP to “confirm a prize”. What should you do?',options:['Reply with the OTP','Send a screenshot','Keep it private and ignore the request'],answer:2,explanation:'Never share an OTP or banking password. Verify suspicious requests through your bank’s official contact.'},
  {topic:'Share with confidence',question:'You want a CV to keep its layout when someone opens it. Which format is usually best?',options:['PDF','A screenshot of one line','An empty text file'],answer:0,explanation:'A PDF usually preserves the document layout across devices. Check the exported file before sharing it.'},
  {topic:'Business tools',question:'Which tool is designed for business accounts, vouchers and GST?',options:['A media player','Tally Prime','A wallpaper editor'],answer:1,explanation:'Tally Prime supports business accounting, vouchers, inventory and GST workflows.'},
  {topic:'Protect your work',question:'What helps protect important coursework if your device stops working?',options:['Keeping one copy on that device','Renaming the folder daily','Keeping a separate, secure backup'],answer:2,explanation:'Keep a separate backup, such as a protected cloud account or another storage device. Check that you can open it.'}
]);

export function initSkillChallenge(){
  const card=document.querySelector('#skillChallenge');if(!card)return;
  let round=0,step=0,answers=[];
  const questions=()=>Array.from({length:3},(_,index)=>skillQuestions[(round*3+index)%skillQuestions.length]);
  function draw(focus=false){
    const set=questions(),finished=step===set.length;
    card.innerHTML=finished?`<div class="skill-card-head"><span>YOUR NEXT LITTLE WIN</span><span class="skill-spark" aria-hidden="true">✦</span></div><div class="skill-result-icon" aria-hidden="true">✓</div><h3 id="skillQuestion" tabindex="-1">A little wiser. Ready for more.</h3><p class="skill-score">${answers.filter((answer,index)=>answer===set[index].answer).length} of 3 correct · 3 useful skills explored</p><div class="skill-review">${set.map((item,index)=>`<details><summary>${item.topic} · ${answers[index]===item.answer?'Correct':'Keep learning'}</summary><p>${item.explanation}</p></details>`).join('')}</div><p class="skill-privacy">Practice only. Your answers are not saved or sent.</p><div class="skill-card-actions"><button type="button" class="button gold" id="skillAgain">Try another set ↻</button><a class="text-link" href="#courses">Find your course ↗</a></div>`:`<div class="skill-card-head"><span>THE EVERYDAY SKILL CHALLENGE</span><span class="skill-spark" aria-hidden="true">✦</span></div><div class="skill-step" aria-label="Question ${step+1} of 3"><span>0${step+1} / 03</span><div aria-hidden="true">${set.map((_,index)=>`<i class="${index<=step?'current':''}"></i>`).join('')}</div></div><span class="skill-topic">${set[step].topic}</span><h3 id="skillQuestion" tabindex="-1">${set[step].question}</h3><div class="skill-options" role="group" aria-labelledby="skillQuestion">${set[step].options.map((option,index)=>`<button type="button" data-skill-answer="${index}" aria-pressed="false"><span>${String.fromCharCode(65+index)}</span><b>${option}</b><i aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M5 15 15 5M5 5h10v10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></i></button>`).join('')}</div><div class="skill-feedback" id="skillFeedback" role="status" aria-live="polite">Tap an answer. No keyboard or timer needed.</div><div class="skill-card-actions"><span>Take your time. Learn as you go.</span><button type="button" class="button gold small" id="skillNext" disabled>${step===2?'See my discovery':'Next question'} →</button></div>`;
    if(finished)card.querySelector('#skillAgain').onclick=()=>{round++;step=0;answers=[];draw(true);};
    else {
      card.querySelectorAll('[data-skill-answer]').forEach(button=>button.onclick=()=>{
        if(answers.length>step)return;
        const answer=Number(button.dataset.skillAnswer),item=set[step];answers.push(answer);
        for(const option of card.querySelectorAll('[data-skill-answer]')){const index=Number(option.dataset.skillAnswer);option.disabled=true;option.setAttribute('aria-pressed',String(index===answer));option.classList.toggle('is-correct',index===item.answer);option.classList.toggle('is-selected',index===answer);}
        const feedback=card.querySelector('#skillFeedback');feedback.textContent=(answer===item.answer?'That’s right. ':'A useful one to remember. ')+item.explanation;feedback.classList.add('answered');
        card.querySelector('#skillNext').disabled=false;
      });
      card.querySelector('#skillNext').onclick=()=>{if(answers.length!==step+1)return;step++;draw(true);};
    }
    if(focus)card.querySelector('#skillQuestion').focus({preventScroll:true});
  }
  draw();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let visible=false;
  const motion=()=>card.classList.toggle('challenge-live',visible&&!reduced.matches&&!document.hidden);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;motion();},{threshold:.1}).observe(card);
  reduced.addEventListener('change',motion);document.addEventListener('visibilitychange',motion);
}
