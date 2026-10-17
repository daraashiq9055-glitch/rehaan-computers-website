import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/photo-storage.js',import.meta.url),'utf8');
const photo='https://res.cloudinary.com/salatmdv/image/authenticated/v123/student-photos/12345678-1234-4123-8123-123456789abc.jpg';
const crop='data:image/jpeg;base64,/9j/4AAC/9k=';
let index=0;
async function moduleFor(enabled=true){
 const config={enabled,cloudName:'salatmdv',serviceUrl:'https://photos.example'};
 const text=source.replace("import { photoStorageConfig as config } from './photo-storage-config.js';",'const config='+JSON.stringify(config)+';')+'\n//instance '+(++index);
 return import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
}
const image=()=>({dataset:{},src:'',alt:'Photo',removeAttribute(name){if(name==='src')this.src='';}});
test('disabled integration retains original storage without a network call',async()=>{
 const mod=await moduleFor(false);const original=globalThis.fetch;
 globalThis.fetch=()=>{throw Error('Unexpected network')};
 try{assert.equal(await mod.storeStudentPhoto(crop),crop);}finally{globalThis.fetch=original;}
});
test('successful upload is reused for Firestore-save retry and admin tokens stay in headers',async()=>{
 const mod=await moduleFor();const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,options)=>{
  calls++;assert.equal(url,'https://photos.example/upload');assert.equal(options.headers.Authorization,'Bearer admin-token');
  assert.equal(options.headers['Content-Type'],'image/jpeg');return Response.json({photo});
 };
 try{
  assert.equal(await mod.storeStudentPhoto(crop,async()=>'admin-token'),photo);
  assert.equal(await mod.storeStudentPhoto(crop,async()=>'admin-token'),photo);assert.equal(calls,1);
  mod.clearPhotoSession();await mod.storeStudentPhoto(crop,async()=>'admin-token');assert.equal(calls,2);
 }finally{globalThis.fetch=original;}
});
test('upload rejects failures and wrong-account responses without falling back to inline data',async()=>{
 const original=globalThis.fetch;
 try{
  for(const response of [Response.json({error:'Upload unavailable'},{status:503}),Response.json({photo:photo.replace('salatmdv','other-cloud')}),Response.json({photo:'javascript:alert(1)'})]){
   const mod=await moduleFor();globalThis.fetch=async()=>response;
   await assert.rejects(()=>mod.storeStudentPhoto(crop));
  }
 }finally{globalThis.fetch=original;}
});
test('private viewer uses an admin-authenticated proxy and caches only an object URL',async()=>{
 const mod=await moduleFor();const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,options)=>{
  calls++;assert.equal(options.headers.Authorization,'Bearer admin-token');assert.equal(options.cache,'no-store');
  assert.equal(url,'https://photos.example/photo?photo='+encodeURIComponent(photo));
  return new Response(new Uint8Array([255,216,255,217]),{headers:{'Content-Type':'image/jpeg'}});
 };
 try{
  const first=image(),second=image();await mod.displayStudentPhoto(first,photo,async()=>'admin-token');
  await mod.displayStudentPhoto(second,photo,async()=>'admin-token');
  assert.match(first.src,/^blob:/);assert.equal(first.src,second.src);assert.equal(calls,1);
  mod.clearPhotoSession();
 }finally{globalThis.fetch=original;}
});
test('photo response arriving after sign-out cannot refill the private UI',async()=>{
 const mod=await moduleFor();const original=globalThis.fetch;let release;
 globalThis.fetch=()=>new Promise(resolve=>{release=resolve});
 try{
  const img=image();const pending=mod.displayStudentPhoto(img,photo,async()=>'admin-token');
  await new Promise(resolve=>setImmediate(resolve));mod.clearPhotoSession();
  release(new Response(new Uint8Array([255,216,255,217]),{headers:{'Content-Type':'image/jpeg'}}));
  await pending;assert.equal(img.src,'');
 }finally{globalThis.fetch=original;}
});
test('private viewer failures never expose the Cloudinary URL as a public fallback',async()=>{
 const mod=await moduleFor();const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({error:'Administrator access required'},{status:403});
 try{
  const img=image();await mod.displayStudentPhoto(img,photo,async()=>'invalid');
  assert.equal(img.src,'');assert.match(img.alt,/unavailable/);
 }finally{globalThis.fetch=original;}
});
