// Privileged Firestore transport. Credentials exist only in Worker secrets.
const b64=value=>btoa(String.fromCharCode(...new Uint8Array(value))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const encoded=value=>b64(new TextEncoder().encode(JSON.stringify(value)));
let cached={};
export async function serviceToken(env,fetcher=fetch){
 let account;try{account=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT||'{}');}catch{throw Error('Configure valid service-account JSON in the Worker secret.');}
 if(account.project_id!==env.FIREBASE_PROJECT_ID||!account.client_email||!account.private_key)throw Error('Configure a service account for the selected review Firebase project.');
 if(cached.email===account.client_email&&cached.expires>Date.now()+60000)return cached.token;
 const now=Math.floor(Date.now()/1000),payload=encoded({alg:'RS256',typ:'JWT'})+'.'+encoded({iss:account.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const raw=account.private_key.replace(/-----[^-]+-----|\s/g,''),key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(raw),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const jwt=payload+'.'+b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(payload)));
 const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Server credential exchange failed.');const data=await response.json();cached={email:account.client_email,token:data.access_token,expires:Date.now()+data.expires_in*1000};return cached.token;
}
export function decode(value){
 if('stringValue'in value)return value.stringValue;if('booleanValue'in value)return value.booleanValue;if('integerValue'in value)return Number(value.integerValue);if('doubleValue'in value)return value.doubleValue;if('nullValue'in value)return null;
 if('timestampValue'in value){const ms=Date.parse(value.timestampValue);return {seconds:Math.floor(ms/1000),nanoseconds:Number((value.timestampValue.match(/\.(\d+)/)?.[1]||'').padEnd(9,'0')),_firestoreTimestamp:value.timestampValue,toMillis:()=>ms};}
 if(value.arrayValue)return (value.arrayValue.values||[]).map(decode);if(value.mapValue)return fields(value.mapValue.fields);return null;
}
export const fields=value=>Object.fromEntries(Object.entries(value||{}).map(([key,item])=>[key,decode(item)]));
export function encode(value){
 if(value===null)return {nullValue:null};if(value instanceof Date)return {timestampValue:value.toISOString()};if(value?.toMillis)return {timestampValue:value._firestoreTimestamp||new Date(value.toMillis()).toISOString()};
 if(Array.isArray(value))return {arrayValue:{values:value.map(encode)}};if(typeof value==='object')return {mapValue:{fields:encodedFields(value)}};if(typeof value==='boolean')return {booleanValue:value};if(typeof value==='number')return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value};return {stringValue:String(value)};
}
export const encodedFields=value=>Object.fromEntries(Object.entries(value).filter(([,item])=>item!==undefined).map(([key,item])=>[key,encode(item)]));
export function serverStore(env,fetcher=fetch){
 const root=`projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
 const base='https://firestore.googleapis.com/v1/'+root;
 const pathOkay=path=>{if(!/^[A-Za-z0-9_/-]+$/.test(path)||path.includes('..'))throw Error('Invalid document path.');return path;};
 async function call(path,body,method=body?'POST':'GET'){
  const response=await fetcher(base+path,{method,headers:{Authorization:'Bearer '+await serviceToken(env,fetcher),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  if(response.status===404)return null;if(!response.ok){const error=Error('Server database request failed.');error.retry=response.status===409;throw error;}return response.json();
 }
 const snapshot=data=>({exists:()=>Boolean(data),data:()=>data?fields(data.fields):undefined});
 const sdk={doc:(_, ...parts)=>pathOkay(parts.join('/')),runTransaction:async(_,fn)=>{
  for(let attempt=0;attempt<5;attempt++){
   const {transaction}=await call(':beginTransaction',{}),writes=[];
   const tx={get:async path=>{const rows=await call(':batchGet',{documents:[root+'/'+pathOkay(path)],transaction});return snapshot(rows.find(row=>row.found)?.found||null);},set:(path,data)=>writes.push({update:{name:root+'/'+pathOkay(path),fields:encodedFields(data)}}),update:(path,data)=>writes.push({update:{name:root+'/'+pathOkay(path),fields:encodedFields(data)},updateMask:{fieldPaths:Object.keys(data)}}),delete:path=>writes.push({delete:root+'/'+pathOkay(path)})};
   try{const result=await fn(tx);if(writes.length)await call(':commit',{transaction,writes});else await call(':rollback',{transaction});return result;}
   catch(error){await call(':rollback',{transaction}).catch(()=>{});if(!error.retry||attempt===4)throw error;}
  }
 }};
 return {sdk,db:{},get:async path=>snapshot(await call('/'+pathOkay(path))),list:async path=>{const data=await call('/'+pathOkay(path)+'?pageSize=100');return (data?.documents||[]).map(row=>({id:row.name.split('/').at(-1),data:fields(row.fields)}));},listApplications:async()=>{const results=await call(':runQuery',{structuredQuery:{from:[{collectionId:'applications'}],where:{fieldFilter:{field:{fieldPath:'status'},op:'EQUAL',value:{stringValue:'Approved'}}},limit:1000}});return results.filter(row=>row.document).map(row=>({id:row.document.name.split('/').at(-1),data:fields(row.document.fields)}));}};
}
