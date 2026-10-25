// Private institute settings, never static public signature assets.
export function validateSignatureSet(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Signature settings need review.');
 const result={};for(const key of ['examiner','authorized']){const image=value[key]??'';if(typeof image!=='string'||(image&&!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(image))||image.length>220000)throw Error('Use a transparent PNG signature under 165 KB.');result[key]=image;}
 return result;
}
export async function importSignature(file){
 if(!file||file.type!=='image/png'||file.size>8000000)throw Error('Choose a transparent PNG signature, up to 8 MB.');
 const image=new Image(),url=URL.createObjectURL(file);
 try{image.src=url;await image.decode();if(!image.naturalWidth||!image.naturalHeight)throw Error('The signature image could not be read.');
 let scale=Math.min(1,1000/image.naturalWidth,750/image.naturalHeight);
 for(let attempt=0;attempt<8;attempt++){const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('Signature preparation is unavailable in this browser.');ctx.drawImage(image,0,0,canvas.width,canvas.height);const png=canvas.toDataURL('image/png');if(png.length<=220000)return png;scale*=.8;}
 throw Error('This signature is too detailed. Choose a smaller transparent PNG.');
 }finally{URL.revokeObjectURL(url);}
}
export async function decodeSignatures(value){const clean=validateSignatureSet(value),result={};await Promise.all(Object.entries(clean).map(async([key,source])=>{if(!source)return;const image=new Image();image.src=source;await image.decode();result[key]=image;}));return result;}
