from pathlib import Path
import re,shutil
root=Path(__file__).resolve().parents[2];out=root/'previews/next-dashboard';src=root/'public'
for name in ['admin-dashboard.css','admin-gold.css','admin-records.js','admin-login-effects.js']:
 shutil.copy2(src/name,out/name)
shutil.copytree(src/'admin-fonts',out/'admin-fonts',dirs_exist_ok=True)
app=(src/'admin-app.js').read_text()
app=re.sub(r'from "https://www.gstatic.com/firebasejs/12.2.1/firebase-(?:app|auth|firestore).js"', 'from "./preview-backend.js"',app)
app=re.sub(r'const firebaseConfig = \{.*?\n\};','const firebaseConfig = {projectId:"disconnected-preview"};',app,count=1,flags=re.S)
app='import {renderMarkCards,openReceipt,recordReceipt,receiptTools,resetAdditions} from "./additions.js";\n'+app
app=app.replace('overview: "Your institute, at a glance.",','marks: "Student mark cards", overview: "Your institute, at a glance.",')
app=app.replace('["courses", "batches", "reports", "settings"].includes(workspaceSection)','["courses", "batches", "reports", "settings", "marks"].includes(workspaceSection)')
old='    } else if (workspaceSection === "reports") {'
assert app.count(old)==1
app=app.replace(old,'    } else if (workspaceSection === "marks") {\n        renderMarkCards(view,apps);\n'+old)
old='            scheduleModalClose(modal, 1300);'
assert app.count(old)==1
app=app.replace(old,'''            form.dataset.receiptSaved = "true";
            const receipt = recordReceipt({id,data:latest,due:bill.key,added,total,monthly:MONTHLY_TUITION_FEE});
            const receiptButton = document.createElement("button");
            receiptButton.type = "button"; receiptButton.id = "rcOpenSavedReceipt";
            receiptButton.className = "admin-save-btn"; receiptButton.textContent = "Print / WhatsApp receipt";
            receiptButton.onclick = () => { closeAdminModal(modal); openReceipt(receipt); };
            form.appendChild(receiptButton);''')
app=app.replace('        const added = Number(amount.value);\n        if (!Number.isFinite(added)', '        if (form.dataset.receiptSaved === "true") return;\n        const added = Number(amount.value);\n        if (!Number.isFinite(added)')
# Guard repeat submissions while retaining the deployed payment validation and transaction.
a=app.index('async function recordMonthlyTuition(');b=app.index('const ADMIN_QUALIFICATIONS',a)
payment=app[a:b]
payment=payment.replace('if (form.dataset.receiptSaved === "true") return;', 'if (form.dataset.receiptSaved === "true" || form.dataset.pending === "true") return;')
payment=payment.replace('        submit.disabled = true;', '        form.dataset.pending = "true";\n        submit.disabled = true;')
payment=payment.replace('            submit.disabled = false;', '            form.dataset.pending = "false";\n            submit.disabled = false;')
payment=payment.replace('            await loadApplications();\n            form.dataset.receiptSaved = "true";\n            const receipt = recordReceipt({id,data:latest,due:bill.key,added,total,monthly:MONTHLY_TUITION_FEE});', '            form.dataset.receiptSaved = "true";\n            const receipt = recordReceipt({id,data:latest,due:bill.key,added,total,monthly:MONTHLY_TUITION_FEE});\n            await loadApplications();')
app=app[:a]+payment+app[b:]
# Add receipt controls inside the existing Fee Management section only.
app=app.replace('        renderFeeManagement(list, adminFilteredApps());','        renderFeeManagement(list, adminFilteredApps());\n        receiptTools(list);')
# Disable email explicitly; the disconnected preview never loads a mail SDK.
start=app.index('function loadEmailService() {');end=app.index('\nfunction workspaceIcon',start)
app=app[:start]+'async function loadEmailService() { throw new Error("Email is disabled in this disconnected preview."); }\n'+app[end:]
app+='''
// Preview entry points. All reads/writes go to the local in-memory adapter.
export async function startPreview(){
 document.getElementById("adminEmail").value="preview@example.test";
 document.getElementById("adminPassword").value="local-preview-only";
 await handleAdminLogin({preventDefault(){}});
}
export async function refreshPreview(){resetAdditions();selectSection("overview");await loadApplications();}
'''
(out/'admin-app.js').write_text(app)
html=(src/'admin.html').read_text()
html=html.replace('<title>Rehaan Computers · Admin workspace</title>','<title>Rehaan Computers · Current dashboard preview</title><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\'; connect-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">')
html=html.replace('</head>','<link rel="stylesheet" href="additions.css"></head>')
html=html.replace('<body class="admin-page">','''<body class="admin-page">
<div class="preview-safety"><strong>LOCAL PREVIEW</strong><span id="previewSourceLabel">Your current dashboard · sample records · no live connection</span><label class="preview-load">Load private backup<input type="file" id="previewBackup" accept=".json,application/json"></label><button id="previewReset" type="button">Reset samples</button><span id="previewStatus" role="status"></span></div>''')
html=html.replace('</nav><div class="sidebar-bottom">','''<button type="button" data-section="marks"><i aria-hidden="true"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/></svg></i>Mark Cards</button></nav><div class="sidebar-bottom">''')
html=re.sub(r'<script type="module">.*?</script>','<script type="module" src="preview-entry.js"></script>',html,flags=re.S)
html=html.replace('Rehaan Computers · Private admin workspace · All dates shown in India time','Rehaan Computers · Disconnected design preview · All dates shown in India time')
(out/'index.html').write_text(html)
# Alias avoids repeating the previous /admin.html 404 confusion.
(out/'admin.html').write_text(html)
(out/'photo-storage-config.js').write_text('export const photoStorageConfig={enabled:false};\n')
(out/'photo-storage.js').write_text('''export const isPrivateStudentPhoto=value=>typeof value==="string"&&value.includes("/authenticated/");
export async function storeStudentPhoto(value){return value;}
export async function displayStudentPhoto(image,value){if(/^data:image\\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value||""))image.src=value;else{image.removeAttribute("src");image.alt="Private photo available in the live dashboard";}}
export function clearPhotoSession(){}
''')
print('Built current-dashboard preview. Production files untouched.')
