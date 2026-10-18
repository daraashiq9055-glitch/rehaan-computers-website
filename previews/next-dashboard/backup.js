// A local snapshot only. No SDK, restoration, uploads or financial conversion.
export function parseBackup(text){
 if(typeof text!=='string'||text.length>32*1024*1024)throw Error('Choose a JSON backup smaller than 32 MB.');
 let backup;try{backup=JSON.parse(text);}catch{throw Error('This file is not valid JSON. Choose the original dashboard backup.');}
 if(backup?.collection!=='applications'||!Array.isArray(backup.records)||backup.records.length>5000)throw Error('Choose a dashboard applications backup containing a records array (up to 5,000 records).');
 const ids=new Set();for(const entry of backup.records){if(!entry||typeof entry.id!=='string'||!entry.id||entry.id.length>256||!entry.data||typeof entry.data!=='object'||Array.isArray(entry.data))throw Error('Each record must have its original id and data object.');if(ids.has(entry.id))throw Error('This backup contains duplicate document IDs.');ids.add(entry.id);}
 return structuredClone(backup);
}
export function ledgerRows(data){
 // Values in the deployed dashboard are rupees keyed by the precise due date.
 // Retain that date and value: do not turn totals into individual receipts.
 return Object.entries(data.monthlyFees||{}).sort(([a],[b])=>a.localeCompare(b)).map(([due,amount])=>({due,amount,valid:typeof amount==='number'&&Number.isFinite(amount)&&amount>=0}));
}
export function recordLabel(data){return String(data.fullName||'Unnamed record');}
