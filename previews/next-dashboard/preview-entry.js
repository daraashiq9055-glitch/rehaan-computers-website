import {startPreview,refreshPreview} from './admin-app.js';
import {replaceRecords,resetRecords} from './preview-backend.js';
import {parseBackup} from './backup.js';
await startPreview();
let generation=0;
document.querySelector('#previewBackup').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;const run=++generation;const status=document.querySelector('#previewStatus');try{if(file.size>32*1024*1024)throw Error('Choose a backup smaller than 32 MB.');const backup=parseBackup(await file.text());if(run!==generation)return;replaceRecords(backup);await refreshPreview();document.querySelector('#previewSourceLabel').textContent=`Private backup · ${backup.records.length} records · original records and fees read-only`;status.textContent='Backup loaded locally. Mark card drafts stay in preview memory.';}catch(error){if(run===generation)status.textContent=error.message;}});
document.querySelector('#previewReset').addEventListener('click',async()=>{generation++;resetRecords();await refreshPreview();document.querySelector('#previewSourceLabel').textContent='Your current dashboard · sample records · no live connection';document.querySelector('#previewStatus').textContent='Sample data reset.';document.querySelector('#previewBackup').value='';});
