export const updateCategories=['Class notes','Homework','Announcements','Exams','Results','Holidays'];

export function studentUpdatePayload({category,title,details,author,image=''},now=new Date().toISOString()){
 category=String(category||'').trim();title=String(title||'').trim();details=String(details||'').trim();author=String(author||'').trim();
 if(!updateCategories.includes(category))throw Error('Choose a valid update category.');
 if(title.length<2||title.length>120)throw Error('Enter a title of 2–120 characters.');
 if(details.length<1||details.length>5000)throw Error('Enter update details of at most 5,000 characters.');
 if(author.length<2||author.length>100)throw Error('Enter a teacher or centre name.');
 if(typeof image!=='string'||image.length>350000||(image&&!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)))throw Error('Choose a smaller JPG class image.');
 return {category,title,details,author,createdAt:now,image,readByStudent:false,savedByStudent:false};
}

// Firestore holds a small private JPG in this student's update document. This
// avoids making a class image public or relying on the admin photo service.
const preparedImages=new WeakMap();
export async function prepareStudentUpdateImage(file){
 if(!file)return '';
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('Choose a JPG, PNG or WebP image under 8 MB.');
 if(preparedImages.has(file))return preparedImages.get(file);
 let bitmap;
 try{bitmap=await createImageBitmap(file);}catch{
  const url=URL.createObjectURL(file);
  try{bitmap=new Image();bitmap.src=url;await bitmap.decode();}
  catch{throw Error('This image could not be opened. Choose another JPG, PNG or WebP file.');}
  finally{URL.revokeObjectURL(url);}
 }
 const scale=Math.min(1,1100/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 const context=canvas.getContext('2d');if(!context)throw Error('Image processing is unavailable in this browser.');
 context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
 for(const quality of [.78,.62,.46,.32]){const image=canvas.toDataURL('image/jpeg',quality);if(image.length<=350000){preparedImages.set(file,image);return image;}}
 throw Error('The class image is too detailed. Choose a smaller picture.');
}

// Show the prepared private JPEG immediately, before the teacher submits.
export function showAttachmentPreview(input){
 const figure=document.createElement('figure');
 figure.hidden=true;
 const picture=document.createElement('img'),message=document.createElement('figcaption');
 picture.alt='Selected class image';picture.style.cssText='display:block;max-width:100%;max-height:180px;border-radius:10px';
 message.setAttribute('role','status');figure.append(picture,message);input.closest('label').after(figure);
 let version=0;
 function clear(){version++;figure.hidden=true;picture.removeAttribute('src');input.setCustomValidity('');}
 input.form.addEventListener('reset',clear);
 input.addEventListener('change',async()=>{
  clear();const file=input.files[0],current=version;if(!file)return;
  figure.hidden=false;picture.hidden=true;message.textContent='Preparing '+file.name+'…';
  try{
   const image=await prepareStudentUpdateImage(file);if(current!==version)return;
   picture.src=image;picture.hidden=false;message.textContent=file.name+' · Ready to publish';
  }catch(error){
   if(current!==version)return;
   input.setCustomValidity(error.message);message.textContent=error.message;
  }
 });
}
