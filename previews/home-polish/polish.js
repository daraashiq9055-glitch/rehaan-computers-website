// Preview presentation only. No SDK, uploads, application writes or messages.
const $=s=>document.querySelector(s);
const fee=$('.hero-tuition');$('.hero-actions').after(fee);
// Keep the established learning images. No new classroom/student claims.
$('.experience-section .eyebrow').textContent='THE REHAAN LEARNING EXPERIENCE';
const faqList=$('#faqList'),search=$('#polishFAQSearch');let topic='all';
function category(text){return /fee|tuition|payment/.test(text)?'fees':/beginner|course|choose/.test(text)?'learning':'admissions';}
function filterFAQ(){
  const query=search.value.trim().toLowerCase(),items=[...faqList.querySelectorAll('details')];let count=0;
  for(const item of items){const title=item.querySelector('summary').textContent.toLowerCase(),show=(!query||item.textContent.toLowerCase().includes(query))&&(topic==='all'||category(title)===topic);item.hidden=!show;if(show)count++;else item.open=false;}
  $('#polishFAQCount').textContent=`${count} ${count===1?'answer':'answers'}${query?' matching your search':''}`;$('#polishFAQEmpty').hidden=!!count;
}
new MutationObserver(filterFAQ).observe(faqList,{childList:true});search.addEventListener('input',filterFAQ);
document.querySelectorAll('[data-faq-topic]').forEach(button=>button.addEventListener('click',()=>{topic=button.dataset.faqTopic;document.querySelectorAll('[data-faq-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filterFAQ();}));
filterFAQ();
// Native accordion keyboard support, with one answer expanded at a time.
faqList.addEventListener('toggle',event=>{if(!event.target.open)return;faqList.querySelectorAll('details[open]').forEach(item=>{if(item!==event.target)item.open=false;});},true);
let noticeTimer;function notice(message){const toast=$('#toast');clearTimeout(noticeTimer);toast.textContent=message;toast.hidden=false;noticeTimer=setTimeout(()=>toast.hidden=true,5000);}
document.addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;if(link.matches('.footer-location-link')&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey)return;const href=link.getAttribute('href')||'';if(/^(https?:|tel:|mailto:)/.test(href)||/admin\.html/.test(href)){event.preventDefault();event.stopImmediatePropagation();notice(/admin\.html/.test(href)?'The admin dashboard stays unchanged. This is a visitor design preview.':'Contact/link preview: '+(link.textContent.trim()||href));}},true);
// Prevent persistent decoration on small screens; the laptop's learning detail remains animated on desktop.
const mobile=matchMedia('(max-width:760px)');function mobileMotion(){document.body.classList.toggle('polish-mobile',mobile.matches);}mobile.addEventListener('change',mobileMotion);mobileMotion();
