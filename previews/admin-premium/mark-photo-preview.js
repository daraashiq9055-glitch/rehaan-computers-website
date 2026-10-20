// A separate design preview. Never imported by the live admin or release bundle.
import {previewAdminBridge as app} from '/public/admin-app.js?v=20261018-login-fix-1';
import {markCardPNG} from './mark-photo-image.js';
import {validateCard} from '/public/admin-feature-model.js?v=20261018-login-fix-1';

const localPhotos=new Map(),$=selector=>document.querySelector(selector);
let token=0,quality='3840',downloadPreview=null;
const selected=()=>app.snapshot().records.find(entry=>entry.id===$('#rcMarkStudent')?.value);
async function decode(source){const image=new Image();image.src=source;await image.decode();if(!image.naturalWidth)throw Error('This photograph could not be opened.');return image;}
function cardFromForm(){return validateCard({title:$('#rcExamTitle').value,date:$('#rcExamDate').value,subjects:[...document.querySelectorAll('#rcSubjectRows tr')].map(row=>({name:row.querySelector('[data-subject=name]').value,max:row.querySelector('[data-subject=max]').value,marks:row.querySelector('[data-subject=marks]').value}))});}
function savedCard(entry){const card=cardFromForm();if(!entry.data.markCard||JSON.stringify(card)!==JSON.stringify(validateCard(entry.data.markCard)))throw Error('Save marks before downloading this preview.');return card;}
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function install(){
  const paper=$('#rcMarkPreview .mark-paper'),entry=selected();
  if(!paper||!entry||paper.querySelector('[data-mark-photo-preview]'))return;
  const current=++token,id=entry.id;
  const photo=document.createElement('div');photo.dataset.markPhotoPreview='';photo.className='mark-portrait-preview';
  photo.innerHTML='<img alt="Student photograph" hidden><span>Student<br>photo</span>';
  paper.querySelector('.paper-brand').append(photo);
  let controls=$('#markPhotoPreviewControls');
  if(!controls){
    controls=document.createElement('section');controls.id='markPhotoPreviewControls';controls.className='mark-photo-preview-controls';
    controls.innerHTML='<div><strong>Mark-card photo · preview first</strong><p>Try a photo from your computer. It stays in this preview and does not change student records. Photos added to a sample offline student also appear automatically.</p></div><label>Try a local photo<input id="markPreviewPhoto" type="file" accept="image/jpeg,image/png,image/webp"></label><label>Image size<select id="markPreviewQuality"><option value="3840">4K · 3840 pixels wide</option><option value="1600">HD · 1600 pixels wide</option></select></label><p id="markPhotoPreviewStatus" role="status">The document can be 4K; photo detail depends on the uploaded original.</p>';
    $('#rcMarksForm').before(controls); // Kept outside the saved-marks form.
  }
  const input=controls.querySelector('#markPreviewPhoto'),status=controls.querySelector('#markPhotoPreviewStatus'),button=$('[data-new=downloadMarks]');
  controls.querySelector('#markPreviewQuality').value=quality;
  controls.querySelector('#markPreviewQuality').onchange=event=>{quality=event.target.value;};
  const valid=()=>current===token&&selected()?.id===id&&app.snapshot().ready&&paper.isConnected;
  async function paint(image){if(!valid())return;const target=photo.querySelector('img');target.src=image.src;await target.decode();if(!valid())return;target.hidden=false;photo.querySelector('span').hidden=true;}
  let source=localPhotos.get(id)||(/^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(entry.data.photo||'')?entry.data.photo:null);
  if(source)void decode(source).then(paint).catch(()=>{if(valid())status.textContent='This preview photo could not load. Choose another local photo.';});
  input.onchange=async()=>{const file=input.files?.[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8000000){status.textContent='Choose a JPG, PNG or WebP photograph smaller than 8 MB.';return;}
    try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('File could not be read.'));reader.readAsDataURL(file);});const image=await decode(data);if(!valid())return;localPhotos.set(id,data);source=data;await paint(image);status.textContent=`Photo shown at its original detail (${image.naturalWidth} × ${image.naturalHeight}). This is a local preview only.`;}catch(error){if(valid())status.textContent=error.message;}
  };
  downloadPreview=async()=>{if(!valid())return;button.disabled=true;
    try{const latest=selected(),card=savedCard(latest),snapshot=JSON.stringify(card),photoImage=source?await decode(source):null;status.textContent='Preparing the full mark-card image…';const blob=await markCardPNG(latest,card,{photo:photoImage,outputWidth:Number(quality)});if(!valid()||JSON.stringify(cardFromForm())!==snapshot)return;download(blob,'Rehaan-Mark-Card-Photo-Preview-'+String(latest.data.admissionNumber||id).replace(/[^a-zA-Z0-9_-]/g,'-')+'.png');status.textContent='Full photo preview downloaded. Live student, photo and payment records were not changed.';}catch(error){if(valid())status.textContent=error.message;}finally{if(valid()){let clean=false;try{savedCard(selected());clean=true;}catch{}button.disabled=!clean;}}
  };
}
const begin=()=>{new MutationObserver(install).observe($('#workspaceView'),{childList:true,subtree:true});new MutationObserver(()=>{if($('#adminDashboard').style.display==='none'){token++;localPhotos.clear();downloadPreview=null;}}).observe($('#adminDashboard'),{attributes:true,attributeFilter:['style']});install();};
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-new=printMarks],[data-new=downloadMarks]');
  if(!button||button.disabled||!$('#markPhotoPreviewControls'))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(button.dataset.new==='downloadMarks'){await downloadPreview?.();return;}
  const entry=selected(),current=token,status=$('#markPhotoPreviewStatus');
  try{savedCard(entry);const paper=$('#rcMarkPreview .mark-paper');const clone=paper.cloneNode(true);let area=$('#rcPrintArea');if(!area){area=document.createElement('div');area.id='rcPrintArea';document.body.append(area);}area.dataset.kind='marks';area.replaceChildren(clone);const image=clone.querySelector('img:not([hidden])');if(image)await image.decode();if(current===token&&selected()?.id===entry.id&&app.snapshot().ready)window.print();}catch(error){if(status.isConnected)status.textContent=error.message;}
},true);
if($('#workspaceView'))begin();else document.addEventListener('DOMContentLoaded',begin,{once:true});
