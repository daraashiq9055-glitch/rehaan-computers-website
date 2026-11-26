// Switch on only after the separate Worker, D1, question bank and real-account
// end-to-end checks pass. The live portal must never fall back to demo scoring.
export const quizServiceConfig=Object.freeze({enabled:false,url:'https://rehaan-student-quiz.daraashiq9055.workers.dev'});

export async function quizRequest(path,{method='GET',body,token}={}){
 if(!quizServiceConfig.enabled)throw Error('The verified weekly quiz has not been published yet.');
 if(!token)throw Error('Sign in again before opening the quiz.');
 const response=await fetch(quizServiceConfig.url+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(15000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(String(data.error||'Quiz service is unavailable.').slice(0,220));
 return data;
}
export async function publicLeaderboard(period='weekly'){
 if(!quizServiceConfig.enabled)return null;
 const response=await fetch(quizServiceConfig.url+'/leaderboard?period='+encodeURIComponent(period),{cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)return null;return response.json();
}
