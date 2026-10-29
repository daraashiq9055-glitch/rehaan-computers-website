// Local runtime regression only. Never deploy this test entry as the photo service.
// Run via Wrangler dev, then GET /run. All provider traffic stays on localhost.
import {handleRequest} from '../backend/photos/worker.mjs';
const jpeg=Uint8Array.from([255,216,255,192,0,17,8,1,104,1,104,3,1,17,0,2,17,0,3,17,0,255,217]);
const fields={uid:{stringValue:'test-admin'},isAdmin:{booleanValue:true}};
function assert(value,message) {if(!value)throw Error(message);}
export default {async fetch(request) {
    const incoming=new URL(request.url);
    if(incoming.pathname==='/upstream/admin')return Response.json({fields});
    if(incoming.pathname==='/upstream/photo')return new Response(jpeg,{headers:{'Content-Type':'image/jpeg'}});
    if(incoming.pathname==='/upstream/redirect')return new Response(null,{status:302,headers:{Location:'https://never-contact.example'}});
    if(incoming.pathname==='/upstream/upload') {
        const body=await request.formData();
        assert(body.get('type')==='authenticated','Uploaded photo must remain private');
        assert(body.get('overwrite')==='false','Overwrite must remain disabled');
        return Response.json({type:'authenticated',resource_type:'image',format:'jpg',public_id:body.get('public_id'),version:123});
    }
    if(incoming.pathname!=='/run')return new Response('Use /run',{status:404});
    try {
        const origin='https://rehaan-computers.web.app';
        const token='e30.'+btoa(JSON.stringify({sub:'test-admin'})).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')+'.fake';
        const env={ALLOWED_ORIGINS:origin,CLOUDINARY_CLOUD_NAME:'salatmdv',CLOUDINARY_UPLOAD_PRESET:'ml_default',CLOUDINARY_API_KEY:'test-key',CLOUDINARY_API_SECRET:'test-secret',FIREBASE_PROJECT_ID:'demo-photo-tests',PHOTO_READ_LIMITER:{limit:async()=>({success:true})},PHOTO_UPLOAD_LIMITER:{limit:async()=>({success:true})}};
        const nativeFetcher=(url,options)=>{
            assert(options.redirect==='manual','Native fetch must use supported manual redirect handling');
            const path=url.startsWith('https://firestore.googleapis.com/')?'admin':url.startsWith('https://api.cloudinary.com/')?'upload':'photo';
            return fetch(incoming.origin+'/upstream/'+path,options);
        };
        const upload=()=>new Request('https://photos.example/upload',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.1',Origin:origin,Authorization:'Bearer '+token,'Content-Type':'image/jpeg'},body:jpeg});
        const result=await handleRequest(upload(),env,nativeFetcher);
        const data=await result.json();assert(result.status===200,'Upload failed: '+JSON.stringify(data));
        const get=new Request('https://photos.example/photo?photo='+encodeURIComponent(data.photo),{headers:{'CF-Connecting-IP':'192.0.2.1',Origin:origin,Authorization:'Bearer '+token}});
        const photo=await handleRequest(get,env,nativeFetcher);
        assert(photo.status===200,'Private delivery failed');assert((await photo.arrayBuffer()).byteLength===jpeg.length,'Photo body differs');
        let redirects=0;
        const rejected=await handleRequest(upload(),env,(url,options)=>{
            if(url.startsWith('https://firestore.googleapis.com/'))return nativeFetcher(url,options);
            redirects++;return fetch(incoming.origin+'/upstream/redirect',options);
        });
        assert(rejected.status===502 && redirects===1,'Redirect must be rejected');
        return Response.json({passed:true,checks:['native fetch admin verification','native fetch signed upload','native fetch private delivery','redirect rejected without following'],liveProviderRequests:0});
    } catch(error) {return Response.json({passed:false,error:error.message},{status:500});}
}};
