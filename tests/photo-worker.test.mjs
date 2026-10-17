import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handleRequest,uploadSignature,privatePhotoPath} from '../backend/photos/worker.mjs';
const origin='https://rehaan-computers.web.app';
const env={CLOUDINARY_CLOUD_NAME:'salatmdv',CLOUDINARY_UPLOAD_PRESET:'ml_default',CLOUDINARY_API_KEY:'test-key',CLOUDINARY_API_SECRET:'test-secret',FIREBASE_PROJECT_ID:'demo-photo-tests',ALLOWED_ORIGINS:origin,PHOTO_UPLOAD_LIMITER:{limit:async()=>({success:true})}};
const photo='https://res.cloudinary.com/salatmdv/image/authenticated/v123/student-photos/12345678-1234-4123-8123-123456789abc.jpg';
const token='e30.'+Buffer.from(JSON.stringify({sub:'test-admin'})).toString('base64url')+'.fake';
const jpeg=Uint8Array.from([255,216,255,192,0,17,8,1,104,1,104,3,1,17,0,2,17,0,3,17,0,255,217]);
const req=(path,options={})=>new Request('https://photos.example'+path,{...options,headers:{Origin:origin,...options.headers}});
const upload=()=>req('/upload',{method:'POST',headers:{'Content-Type':'image/jpeg','CF-Connecting-IP':'192.0.2.1'},body:jpeg});
const denyFetch=async()=>{throw Error('Unexpected upstream request')};
test('signature uses the provider-required sorted parameter digest',async()=>{
 const params={timestamp:'123',public_id:'random',overwrite:'false'};
 assert.equal(await uploadSignature(params,'test-secret'),createHash('sha1').update('overwrite=false&public_id=random&timestamp=123test-secret').digest('hex'));
});
test('anonymous upload is bounded, signed, private and never overwrites',async()=>{
 let count=0;
 const res=await handleRequest(upload(),env,async(url,options)=>{
  count++;assert.equal(url,'https://api.cloudinary.com/v1_1/salatmdv/image/upload');
  assert.equal(options.method,'POST');assert.equal(options.redirect,'error');
  const body=options.body;const params=Object.fromEntries([...body].filter(([key])=>!['file','api_key','signature'].includes(key)));
  assert.equal(params.type,'authenticated');assert.equal(params.overwrite,'false');assert.equal(params.use_filename,'false');assert.equal(params.unique_filename,'true');assert.equal(params.upload_preset,'ml_default');
  assert.match(params.public_id,/^student-photos\/[a-f0-9-]{36}$/);assert.equal(params.folder,undefined);
  assert.equal(body.get('signature'),await uploadSignature(params,'test-secret'));
  assert.equal(body.get('file').size,jpeg.length);
  return Response.json({type:'authenticated',resource_type:'image',format:'jpg',public_id:params.public_id,version:123});
 });
 assert.equal(res.status,200);assert.equal(count,1);
 const data=await res.json();assert.ok(privatePhotoPath(data.photo,'salatmdv'));
 assert.equal(res.headers.get('Cache-Control'),'no-store');assert.equal(res.headers.get('Access-Control-Allow-Origin'),origin);
 assert.ok(!JSON.stringify(data).includes('test-secret'));
});
test('CORS denies missing and unapproved origins; preflight supports authentication',async()=>{
 for(const input of [new Request('https://photos.example/upload'),req('/upload',{headers:{Origin:'https://evil.example'}})])assert.equal((await handleRequest(input,env,denyFetch)).status,403);
 const res=await handleRequest(req('/upload',{method:'OPTIONS'}),env,denyFetch);
 assert.equal(res.status,204);assert.ok(res.headers.get('Access-Control-Allow-Headers').includes('Authorization'));
});
test('upload fails closed without secrets, rate binding or connecting IP',async()=>{
 for(const changed of [{CLOUDINARY_API_SECRET:''},{PHOTO_UPLOAD_LIMITER:null}])assert.equal((await handleRequest(upload(),{...env,...changed},denyFetch)).status,503);
 const request=req('/upload',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:jpeg});
 assert.equal((await handleRequest(request,env,denyFetch)).status,503);
 assert.equal((await handleRequest(upload(),{...env,PHOTO_UPLOAD_LIMITER:{limit:async()=>({success:false})}},denyFetch)).status,429);
});
test('invalid formats, oversized payloads and malformed JPEG are rejected before Cloudinary',async()=>{
 for(const [headers,body,code] of [[{'Content-Type':'image/png'},jpeg,415],[{'Content-Type':'image/jpeg'},'not jpeg',415],[{'Content-Type':'image/jpeg'},new Uint8Array(375001),413]]){
  const request=req('/upload',{method:'POST',headers:{...headers,'CF-Connecting-IP':'192.0.2.1'},body});
  assert.equal((await handleRequest(request,env,denyFetch)).status,code);
 }
});
test('Cloudinary failures and unexpected public delivery never report success or expose upstream errors',async()=>{
 for(const response of [Response.json({error:{message:'test-secret'}},{status:400}),Response.json({type:'upload',resource_type:'image',format:'jpg',public_id:'bad',version:123})]){
  const result=await handleRequest(upload(),env,async()=>response);
  assert.equal(result.status,502);assert.ok(!(await result.text()).includes('test-secret'));
 }
 const result=await handleRequest(upload(),env,async()=>{throw Error('test-secret')});
 assert.equal(result.status,503);assert.ok(!(await result.text()).includes('test-secret'));
});
test('private viewing rejects anonymous, malformed tokens and non-administrators',async()=>{
 assert.equal((await handleRequest(req('/photo?photo='+encodeURIComponent(photo)),env,denyFetch)).status,401);
 assert.equal((await handleRequest(req('/photo',{headers:{Authorization:'Bearer malformed'}}),env,denyFetch)).status,401);
 for(const response of [Response.json({error:'denied'},{status:403}),Response.json({fields:{uid:{stringValue:'test-admin'},isAdmin:{booleanValue:false}}}),Response.json({fields:{uid:{stringValue:'someone-else'},isAdmin:{booleanValue:true}}})]){
  const result=await handleRequest(req('/photo?photo='+encodeURIComponent(photo),{headers:{Authorization:'Bearer '+token}}),env,async()=>response);
  assert.equal(result.status,403);
 }
});
test('admin token is verified by Firestore before a signed photo is fetched',async()=>{
 const calls=[];
 const result=await handleRequest(req('/photo?photo='+encodeURIComponent(photo),{headers:{Authorization:'Bearer '+token}}),env,async(url,options)=>{
  calls.push(url);
  if(url.startsWith('https://firestore.googleapis.com/')){
   assert.equal(options.headers.Authorization,'Bearer '+token);
   assert.equal(url,'https://firestore.googleapis.com/v1/projects/demo-photo-tests/databases/(default)/documents/admins/test-admin');
   return Response.json({fields:{uid:{stringValue:'test-admin'},isAdmin:{booleanValue:true}}});
  }
  const path=privatePhotoPath(photo,'salatmdv');
  const signature='PKyKIICL' // Reference: official Cloudinary Node SDK, type=authenticated, version=123.;
  assert.equal(url,`https://res.cloudinary.com/salatmdv/image/authenticated/s--${signature}--/${path}`);
  assert.equal(options.redirect,'error');
  return new Response(jpeg,{headers:{'Content-Type':'image/jpeg'}});
 });
 assert.equal(result.status,200);assert.equal(calls.length,2);
 assert.deepEqual(new Uint8Array(await result.arrayBuffer()),jpeg);
 assert.equal(result.headers.get('Cache-Control'),'no-store');
});
test('private photo lookup cannot access another host, account, folder or arbitrary resource',async()=>{
 for(const invalid of [photo.replace('salatmdv','other-cloud'),photo.replace('authenticated','upload'),photo.replace('student-photos','other-folder'),photo.replace('.jpg','.svg'),photo+'?x=1','https://evil.example/test.jpg']){
  let calls=0;
  const result=await handleRequest(req('/photo?photo='+encodeURIComponent(invalid),{headers:{Authorization:'Bearer '+token}}),env,async()=>{
   calls++;return Response.json({fields:{uid:{stringValue:'test-admin'},isAdmin:{booleanValue:true}}});
  });
  assert.equal(result.status,400);assert.equal(calls,1);
 }
});
test('private delivery failure has no public image fallback',async()=>{
 let calls=0;
 const result=await handleRequest(req('/photo?photo='+encodeURIComponent(photo),{headers:{Authorization:'Bearer '+token}}),env,async()=>++calls===1?Response.json({fields:{uid:{stringValue:'test-admin'},isAdmin:{booleanValue:true}}}):new Response('not found',{status:404}));
 assert.equal(result.status,502);
});


test('oversized JPEG dimensions and missing image headers are rejected', async()=>{
 for(const bytes of [Uint8Array.from([255,216,255,224,0,2,255,217]),Uint8Array.from([...jpeg.slice(0,7),255,255,...jpeg.slice(9)])]) {
  const request=req('/upload',{method:'POST',headers:{'Content-Type':'image/jpeg','CF-Connecting-IP':'192.0.2.1'},body:bytes});
  assert.equal((await handleRequest(request,env,denyFetch)).status,415);
 }
});


test('health reports readiness without exposing credentials or contacting providers',async()=>{
 for(const [config,expected] of [[env,true],[{...env,CLOUDINARY_API_SECRET:''},false]]){
  const result=await handleRequest(req('/health'),config,denyFetch);
  assert.deepEqual(await result.json(),{ok:true,configured:expected,uploadProtection:true});
 }
});
