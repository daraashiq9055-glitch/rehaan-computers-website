"""Build a separate, reviewable admin release. Does not deploy or contact Firebase.

The normal public/ checkout stays untouched. The default candidate keeps secure
history disabled until its backend, region, access rules and identity are verified.
"""
from pathlib import Path
import argparse
import importlib.util
import json
import re
import shutil
import tempfile

ROOT=Path(__file__).resolve().parent
VERSION='20261026-admin-13'

def build(destination, audit_ready=False):
    destination=Path(destination)
    if destination.exists() and any(destination.iterdir()):
        raise RuntimeError('Build destination must be empty; existing files were kept.')
    destination.mkdir(parents=True,exist_ok=True)
    public=destination/'public';shutil.copytree(ROOT/'public',public)
    ui=public/'admin-ui';ui.mkdir()
    source=ROOT/'previews/admin-premium'
    def adapt(text):
        text=text.replace('previewAdminBridge','adminWorkspace').replace('../../public/','../').replace('/public/','/')
        text=text.replace('admin-app.js?v=20261018-login-fix-1','admin-app.js?v='+VERSION)
        return re.sub(r"(from\s+|import\s*)(['\"])(\.{1,2}/[^'\"]+\.js)(['\"])",lambda m:m[1]+m[2]+m[3]+'?v='+VERSION+m[4],text)
    files=['records.js','records-model.js','operations.js','accounts-model.js','payment-service.js','payment-ui.js','journey-service.js','workbench.js','theme.css','records.css','operations.css','workbench.css']
    for name in files:
        text=(source/name).read_text(encoding='utf-8')
        if name.endswith('.js'):text=adapt(text)
        if name=='theme.css':
            text='\n'.join(line for line in text.splitlines() if '.demo-' not in line)
            text=text.replace('/* Preview layer only. The original dashboard DOM and transaction code are reused. */','/* Premium administration. Original dashboard and transaction modules retained. */')
            text+='\n.sidebar { top: 0; }\n'
        if name=='workbench.js':
            text=text.replace("const actorLabel=id=>id==='preview-admin'?'Demo administrator 1':id==='preview-admin-2'?'Demo administrator 2':String(id||'Administrator');","const actorLabel=id=>String(id||'Administrator');")
            text=text.replace('rehaan-preview-ui-v1:','rehaan-admin-ui-v1:')
            start=text.index(' function renderHistory(){');end=text.index(' function renderPreferences(',start)
            text=text[:start]+' function renderHistory(){history.render();}\n'+text[end:]
            start=text.index('<section class="demo-admin-switch">');end=text.index('</section>',start)+len('</section>')
            text=text[:start]+text[end:]
            text='\n'.join(line for line in text.splitlines() if "$('#switchDemoAdmin').onclick" not in line)
            text=text.replace("leave();host.replaceChildren();", "leave();history.clear();host.replaceChildren();")
            marker="const shortcuts=document.createElement('div');"
            text=text.replace(marker,"const history=createHistoryView({host,readPage:options=>app.auditPage(options),records:()=>app.snapshot().records,identity:()=>app.identity(),enabled:auditConfig.enabled,isActive:()=>active==='history'});\n "+marker)
            text="import {createHistoryView} from './history-ui.js?v="+VERSION+"';\nimport {auditConfig} from './audit-config.js?v="+VERSION+"';\n"+text
        (ui/name).write_text(text,encoding='utf-8')
    for source_name,target in [('reader.js','audit-reader.js'),('history-ui.js','history-ui.js')]:
        shutil.copyfile(ROOT/'backend/audit'/source_name,ui/target)
    (ui/'audit-config.js').write_text('export const auditConfig = Object.freeze('+json.dumps({'enabled':bool(audit_ready)})+');\n', encoding='utf-8')
    # Reuse only the presentation tools from the demo, never its fixture/auth code.
    presentation=(source/'demo.js').read_text(encoding='utf-8').split('// Presentation tools call the existing controls; no new persistence paths.\n')[1]
    presentation=presentation.replace("document.addEventListener('DOMContentLoaded', () => {",'function setupShell(){',1)
    assert presentation.rstrip().endswith('});')
    presentation=presentation.rstrip()[:-3]+'}\nsetupShell();\n'
    presentation+="document.querySelector('#workspaceDate').textContent=new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date());\n"
    (ui/'shell.js').write_text(presentation, encoding='utf-8')
    (ui/'main.js').write_text("import './shell.js?v="+VERSION+"';\nimport './workbench.js?v="+VERSION+"';\nimport {adminWorkspace} from '../admin-app.js?v="+VERSION+"';\nimport {createPaymentUI} from './payment-ui.js?v="+VERSION+"';\nadminWorkspace.installPaymentForm(createPaymentUI);\n", encoding='utf-8')
    bridge=(source/'bridge-exports.js').read_text(encoding='utf-8')
    bridge=bridge.replace('// Appended to the original admin module by the local preview launcher only.','// Reviewed workspace interface. All saves retain original session/transaction guards.')
    bridge=adapt(bridge).replace('/previews/admin-premium/','/admin-ui/').replace('// The preview uses the same original transaction function with a richer form.','// Richer form, same atomic ledger/receipt transaction.')
    # Keep the original sign-in graph independent from optional workspace assets.
    # Missing new UI files must never make the existing login unavailable.
    bridge=bridge[:bridge.index('// Richer form, same atomic ledger/receipt transaction.')]
    bridge=bridge.replace('await saveLifecycle(',"await (await import('./admin-ui/journey-service.js?v="+VERSION+"')).saveLifecycle(")
    bridge=bridge.replace('await saveProgress(',"await (await import('./admin-ui/journey-service.js?v="+VERSION+"')).saveProgress(")
    additions="""
  installPaymentForm(factory){recordMonthlyTuition=factory({tuitionPeriod,overdueMonthlyTuition,requireAdmin,createModal:adminCreateModal,closeModal:closeAdminModal,uid:()=>verifiedAdminUid,saveMonthlyPayment,db,doc,runTransaction,refresh:loadApplications,openReceipt});},
  async auditPage(options){requireAdmin();const [{createAuditReader},sdk]=await Promise.all([import('./admin-ui/audit-reader.js?v=VERSION'),import('https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js')]);return createAuditReader({db,sdk,identity:()=>verifiedAdminUid&&auth.currentUser?.uid===verifiedAdminUid?{uid:verifiedAdminUid}:null})(options);},
""".replace('VERSION',VERSION)
    bridge=bridge.replace('export const adminWorkspace = Object.freeze({','export const adminWorkspace = Object.freeze({'+additions)
    (public/'admin-app.js').write_text((public/'admin-app.js').read_text(encoding='utf-8')+'\n'+bridge, encoding='utf-8')
    # Use the exact reviewed premium DOM, without fixture scripts/import maps or CSP mocks.
    spec=importlib.util.spec_from_file_location('admin_preview_builder',ROOT/'preview-admin.py')
    preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
    html=preview.preview_html().decode()
    # Unapproved design extensions stay in the local preview only.
    html=re.sub(r'<script[^>]*data-preview-only[^>]*>.*?</script>','',html)
    html=re.sub(r'<link[^>]*data-preview-only[^>]*>','',html)
    html=re.sub(r'<base href="/public/"><meta http-equiv="Content-Security-Policy"[^>]+>','',html)
    html=re.sub(r'<script type="importmap">.*?</script>','',html)
    html=re.sub(r'<script src="/previews/admin-premium/demo.js"></script>','',html)
    html=re.sub(r'<script type="module" src="/previews/admin-premium/workbench.js"></script>','',html)
    html=re.sub(r'<div class="demo-strip">.*?</div>','',html)
    html=html.replace(' admin-premium-preview','').replace('/previews/admin-premium/','admin-ui/').replace('href="/previews/premium-home/"','href="index.html"')
    html=html.replace('This demo resets when you reload the page.','Your session ends when this page is reloaded.').replace('Try the new design.','Private by design.').replace('Demo email','Enter your admin email').replace('Demo password','Enter your password').replace('Open the sample workspace. No real password needed.','Sign in to your admin workspace.')
    html=html.replace("import('./admin-app.js?v=20261018-login-fix-1').catch", "import('./admin-app.js?v="+VERSION+"').catch")
    # UI load errors must never replace a working login or create a second auth instance.
    html=html.replace('</body>',"<script type=\"module\">import('./admin-ui/main.js?v="+VERSION+"').catch(()=>{const note=document.createElement('p');note.className='startup-error';note.setAttribute('role','alert');note.textContent='Some workspace tools could not load. Reload the page before making changes.';document.querySelector('#adminDashboard .content').prepend(note);});</script></body>")
    html=re.sub(r'href="(admin-ui/[^\"]+\.css)"',r'href="\1?v='+VERSION+'"',html)
    if any(value in html for value in ['__adminPreview','previews/','demo-strip','type="importmap"','No real password']):raise RuntimeError('Preview-only markup leaked into the candidate.')
    (public/'admin.html').write_text(html, encoding='utf-8')
    config=json.loads((ROOT/'firebase.json').read_text(encoding='utf-8'));config.pop('firestore',None)
    (destination/'firebase.json').write_text(json.dumps(config,indent=2)+'\n', encoding='utf-8')
    (destination/'RELEASE.json').write_text(json.dumps({'generated':True,'version':VERSION,'auditEnabled':audit_ready,'receiptCounterRulesRequired':True,'markSignatureRulesRequired':True,'source':'prepare-admin-release.py'},indent=2)+'\n', encoding='utf-8')
    return destination

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--audit-ready',action='store_true',help='Enable history only after the separately deployed backend and access checks pass.')
    args=parser.parse_args()
    parent=ROOT/'build';parent.mkdir(exist_ok=True)
    target=parent/'admin-release'
    if target.exists() and not (target/'RELEASE.json').is_file():parser.exit(1,'Existing build folder is not a generated release; no files were changed.\n')
    with tempfile.TemporaryDirectory(prefix='admin-build-',dir=parent) as temporary:
        output=build(Path(temporary)/'release',args.audit_ready)
        if target.exists():shutil.rmtree(target)
        shutil.move(str(output),target)
    print('Built separate candidate:',target)
    print('Current public/ and live website were not changed. Nothing was deployed.')
    print('Before Hosting: publish current receipt counter and private signature rules (see docs/mark-card-premium.md).')
    print('Secure history:', 'enabled; verify backend before deployment' if args.audit_ready else 'disabled until backend verification')

if __name__=='__main__':main()
