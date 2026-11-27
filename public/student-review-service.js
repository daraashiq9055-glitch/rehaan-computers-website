// Enabled only in the separate generated review candidate, never on the live site.
export const reviewServiceConfig=Object.freeze({enabled:false,url:''});
export async function reviewRequest(path,token,{method='GET',body}={}){
 if(!reviewServiceConfig.enabled||!/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(reviewServiceConfig.url))throw Error('Private review service is not configured.');
 if(!token)throw Error('Sign in again.');
 const response=await fetch(reviewServiceConfig.url+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 const data=await response.json().catch(()=>({error:'Review service returned an invalid response.'}));if(!response.ok)throw Error(data.error||'Review request failed.');return data;
}
