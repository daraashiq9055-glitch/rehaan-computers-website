// Windows desktop defaults. Teachers review these against their installed version.
const editing=[
 ['Ctrl+C','copy the selected text'],['Ctrl+X','cut the selected text'],['Ctrl+V','paste the clipboard contents'],
 ['Ctrl+A','select all text'],['Ctrl+Z','undo the last edit'],['Ctrl+S','save the current document'],
 ['Ctrl+O','open an existing document'],['Ctrl+P','open print settings'],['Ctrl+F','find text'],
 ['Ctrl+H','open Find and Replace'],['Ctrl+N','create a new document'],
 ['Ctrl+Home','move to the start of the document'],['Ctrl+End','move to the end of the document'],
 ['Home','move to the start of the current line'],['End','move to the end of the current line'],
 ['Ctrl+Left','move to the previous word boundary'],['Ctrl+Right','move to the next word boundary'],
 ['Shift+Left','extend the selection one character left'],['Shift+Right','extend the selection one character right'],
 ['Shift+Home','extend the selection to the beginning of the line'],['Shift+End','extend the selection to the end of the line'],
 ['Ctrl+Shift+Home','extend the selection to the beginning of the document'],['Ctrl+Shift+End','extend the selection to the end of the document'],
 ['Ctrl+Shift+Left','extend the selection to the previous word boundary'],['Ctrl+Shift+Right','extend the selection to the next word boundary'],
 ['Backspace','delete the character immediately before the caret'],['Delete','delete the character immediately after the caret'],
 ['Shift+Up','extend the selection one line upward'],['Shift+Down','extend the selection one line downward'],
 ['Left','move the caret one character left'],['Right','move the caret one character right'],
 ['Up','move the caret one line upward'],['Down','move the caret one line downward'],
 ['Enter','start a new line of text'],['Space','insert a space at the caret']
];
const formatting=[['Ctrl+B','toggle bold'],['Ctrl+I','toggle italics'],['Ctrl+U','toggle underline'],
 ['Ctrl+L','align the paragraph left'],['Ctrl+E','centre the paragraph'],['Ctrl+R','align the paragraph right']];
export function shortcutDrafts(program){
 if(!['Notepad','WordPad','MS Word'].includes(program))return [];
 const entries=program==='Notepad'?editing:[...formatting,...editing];
 return entries.flatMap(([key,action],i)=>[0,1].map(reverse=>{
  const candidates=[0,1,2,3].map(n=>entries[(i+n*7)%entries.length][reverse?1:0]);
  const answer=(i+reverse)%4;
  candidates.unshift(...candidates.splice(candidates.length-answer,answer));
  return {id:'rc-shortcut-'+program.replace(/\W/g,'').toLowerCase()+'-'+i+'-'+reverse,program,difficulty:'Foundation',status:'Draft',
   question:reverse?`In ${program} for Windows, what does the shortcut ${key} do when editing text?`:
   `In ${program} for Windows, which keyboard shortcut lets you ${action}?`,options:candidates,answer,
   explanation:`In ${program}, use ${key} to ${action}.`};
 }));
}
