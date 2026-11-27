// Supplemental numeracy questions for the first programme. Only the admin
// workspace imports this module. Saved questions and results live in review D1.
export function basicsExercises() {
 const exercises=[];
 for(let group=0;group<10;group++){
  const n=2+group*3+crypto.getRandomValues(new Uint8Array(1))[0]%3;
  const tasks=[
   [`A folder contains ${n} documents of 4 MB each. How large are the documents together?`,n*4,'MB','Multiply the number of documents by 4 MB.'],
   [`You have ${n*12} MB free. How many 12 MB photos will fit?`,n,'photos','Divide the free space by the size of each photo.'],
   [`A file contains ${n} bytes. How many bits does it contain?`,n*8,'bits','Each byte contains eight bits.'],
   [`A backup transfers 3 MB each second at a constant rate. How much transfers in ${n} seconds?`,n*3,'MB','Multiply the transfer rate by the number of seconds.'],
   [`A printer uses both sides of each sheet. How many sheets does one ${n*2}-page document need?`,n,'sheets','Two pages fit on each sheet when printing on both sides.'],
   [`A drive contains ${n*10} GB of files. You remove ${n} GB. How much file data remains?`,n*9,'GB','Subtract the removed data from the original total.'],
   [`A display uses ${n*100} pixels per row. How many pixels are in three complete rows?`,n*300,'pixels','Multiply the width of one row by three rows.']
  ];
  for(const [i,[question,value,unit,explanation]] of tasks.entries()){
   const answer=crypto.getRandomValues(new Uint8Array(1))[0]%4;
   const options=[value-1,value+1,value+2];
   options.splice(answer,0,value);
   exercises.push({id:`rc-basics-math-${group}-${i}`,program:'Computer basics',question,options:options.map(v=>v+' '+unit),answer,explanation,difficulty:'Foundation',status:'Draft'});
  }
 }
 return exercises;
}

export async function approveQuestions(api,questions,progress){
 let completed=0;
 for(const question of questions){
  progress(completed,questions.length);
  let revision=question.revision;
  if(question.status==='Draft'){
   await api('/admin/questions',{method:'POST',body:{...question,status:'Review'}});
   revision++;
  }
  await api('/admin/questions',{method:'POST',body:{...question,revision,status:'Approved'}});
  completed++;
 }
 progress(completed,questions.length);
}

// The deployed review API replaces the entire activation list on each write.
export async function setProgrammeOpen(api,program,open){
 const read=async()=>{
  const {quizEnabled}=await api('/admin/status');
  return quizEnabled?.enabled ? quizEnabled.programs : [];
 };
 const before=await read();
 if(before.includes(program)!==open){
  const programs=open?[...before,program]:before.filter(item=>item!==program);
  await api('/admin/activation',{method:'POST',body:{enabled:programs.length>0,programs:programs.length?programs:[program]}});
 }
 const after=await read();
 if(after.includes(program)!==open)throw Error('The saved schedule changed. Refresh to see which programmes are open.');
 return after;
}
