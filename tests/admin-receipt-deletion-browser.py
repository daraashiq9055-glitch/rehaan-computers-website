"""Generated premium admin: delete receipts and reverse fees using isolated fixtures only."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import importlib.util,tempfile,json
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/artifacts/receipt-deletion';OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('builder',ROOT/'prepare-admin-release.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
with tempfile.TemporaryDirectory() as tmp:
 output=builder.build(Path(tmp)/'candidate')
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(output/'public')));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
   errors=[];failed=[];external=[]
   sdk=(ROOT/'previews/admin-premium/sdk.js').read_text()
   sdk=sdk.replace('export const getDocs = async ref => {',"export const getDocs = async ref => {if(state.failNextListRead){state.failNextListRead=false;throw Error('Preview list read unavailable');}")
   sdk=sdk.replace('const settings=structuredClone(state.settings||{}),growth=structuredClone(state.growth||{});','const settings=structuredClone(state.settings||{}),growth=structuredClone(state.growth||{}),summaries=structuredClone(state.summaries||{});')
   sdk=sdk.replace("if(ref.col==='instituteSettings'){", "if(ref.col==='studentFeeSummaries'){summaries[ref.id]=structuredClone(data);continue;}if(ref.col==='instituteSettings'){")
   sdk=sdk.replace('state.settings=settings;','state.settings=settings;state.summaries=summaries;')
   sdk=sdk.replace("ref.col!=='receiptCounters'&&ref.col!=='instituteSettings'", "ref.col!=='studentFeeSummaries'&&ref.col!=='receiptCounters'&&ref.col!=='instituteSettings'")
   def route(r):
    if r.request.method not in ['GET','HEAD']:external.append(r.request.url);r.abort()
    elif r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):r.fulfill(content_type='application/javascript',body=sdk,headers={'Access-Control-Allow-Origin':'*'})
    elif r.request.url.startswith(base+'/photo-storage'):r.fulfill(content_type='application/javascript',body=(ROOT/'previews/admin-premium/photos.js').read_text())
    elif r.request.url.startswith(base+'/'):r.continue_()
    else:external.append(r.request.url);r.abort()
   context.route('**/*',route);context.add_init_script((ROOT/'previews/admin-premium/demo.js').read_text().split('  const notify =')[0]+'})();')
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None)
   page.goto(base+'/admin.html');expect(page.locator('#adminLoginButton')).to_be_enabled()
   page.evaluate('''async()=>{const {makeReceipt}=await import('./admin-feature-model.js?v=20261102-settings-1');const {indiaDate}=await import('./admin-feature-model.js?v=20261102-settings-1');const now=new Date().toISOString();const due=indiaDate().slice(0,7)+'-14';window.testDue=due;
    const add=(student,receiptId,amount,total,number)=>{const data=__adminPreview.records[student];data.status='Approved';data.admissionDate='2026-01-14';data.admissionNumber=student==='demo-2'?'040':student==='demo-1'?'002':'001';data.monthlyFees={...data.monthlyFees,[due]:total,'2026-10-14':999};const r=makeReceipt({id:student,data,due,added:amount,total,monthly:999,receiptId,createdAt:now,createdBy:'preview-admin'});r.number=String(number);data.feeReceipts={...data.feeReceipts,[receiptId]:r};};
    add('demo-0','a'.repeat(32),400,400,1000);add('demo-0','b'.repeat(32),300,700,1001);add('demo-1','c'.repeat(32),999,999,1002);add('demo-2','d'.repeat(32),400,400,1003);__adminPreview.counters={tuition:{last:1003}};}''')
   page.locator('#adminEmail').fill('admin@example.test');page.locator('#adminPassword').fill('test-only');page.locator('#adminLoginButton').click();expect(page.locator('#adminDashboard')).to_be_visible()
   before=page.evaluate('structuredClone(__adminPreview.records)')
   expect(page.locator('.application-card')).to_have_count(8)
   page.locator('.nav [data-section=fees]').click();page.locator('[data-new=receipts]').click()
   expect(page.locator('.rc-receipt-item')).to_have_count(4);expect(page.locator('.rc-receipt-item [data-new=deleteReceipt]')).to_have_count(4)
   modules=page.evaluate("performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname.endsWith('/admin-features.js')).map(e=>e.name)")
   assert len(set(modules))==1,modules
   def choose(receipt):page.locator(f'.rc-receipt-item [data-new=deleteReceipt][data-id="{receipt}"]').click();expect(page.locator('#rcReceiptDeleteForm')).to_be_visible()
   def confirm(reason='Accidentally recorded payment'):
    form=page.locator('#rcReceiptDeleteForm');form.locator('[name=reason]').fill(reason);form.locator('[name=confirmed]').check();form.locator('[type=submit]').click()
   rid='a'*32;choose(rid);expect(page.locator('.rc-delete-summary')).to_contain_text('₹700');expect(page.locator('.rc-delete-summary')).to_contain_text('₹300')
   for width in [1440,390,320]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('#rcFeatureDialog').screenshot(path=str(OUT/f'confirm-{width}.png'))
   page.set_viewport_size({'width':1440,'height':1000});page.locator('#rcReceiptDeleteForm [type=submit]').click();assert page.evaluate('__adminPreview.writes.length')==0
   page.locator('#rcReceiptDeleteForm [data-new=openReceipt]').click();expect(page.locator('[data-new=deleteReceipt]')).to_have_count(1);assert page.evaluate('__adminPreview.records')==before
   for action in ['printReceipt','image','whatsapp','editReceipt','receiptHistory','openReceipt']:expect(page.locator('#rcFeatureDialog [data-new='+action+']')).to_have_count(1)
   page.locator('[data-new=deleteReceipt]').click();confirm();expect(page.locator('.rc-receipt-deleted')).to_contain_text('Receipt 1000 deleted');expect(page.locator('.rc-receipt-item')).to_have_count(3)
   after=page.evaluate('__adminPreview.records');due=page.evaluate('testDue');assert rid not in after['demo-0']['feeReceipts'];assert after['demo-0']['monthlyFees'][due]==300;assert after['demo-0']['feeReceipts']['b'*32]==before['demo-0']['feeReceipts']['b'*32]
   for field in ['fullName','photo','payment','admissionNumber','coursePreference']:assert after['demo-0'][field]==before['demo-0'][field],field
   assert after['demo-0']['monthlyFees']['2026-10-14']==999 and after['demo-1']==before['demo-1'];assert page.evaluate('__adminPreview.counters.tuition.last')==1003
   print('PASS: both delete entry points, confirmation/cancel, 320/390/1440 widths, partial reversal and unrelated data preservation',flush=True)
   choose('b'*32);confirm();expect(page.locator('.rc-receipt-deleted')).to_contain_text('1001 deleted');assert page.evaluate('Object.hasOwn(__adminPreview.records["demo-0"].monthlyFees,testDue)')==False
   # Permission denial leaves the form retryable and both stored values intact.
   choose('c'*32);snapshot=page.evaluate('structuredClone(__adminPreview.records)');page.evaluate('__adminPreview.failWrite=true');confirm();expect(page.locator('#rcReceiptDeleteStatus')).to_contain_text('permission denied');assert page.evaluate('__adminPreview.records')==snapshot;page.evaluate('__adminPreview.failWrite=false;__adminPreview.failNextListRead=true');page.locator('#rcReceiptDeleteForm [type=submit]').click();expect(page.locator('#rcFeatureDialog')).to_contain_text('Receipt 1002 deleted');expect(page.locator('[data-new=refreshReceiptList]')).to_be_visible();page.locator('[data-new=refreshReceiptList]').click();expect(page.locator('.rc-receipt-item')).to_have_count(1)
   print('PASS: zero balance removes its ledger key; denied deletion preserves receipt and ledger, then retries successfully',flush=True)
   # The existing 040 mobile summary is reversed in the same transaction.
   choose('d'*32);page.evaluate('__adminPreview.loseAcknowledgementOnce=true');confirm();expect(page.locator('#rcReceiptDeleteStatus')).to_contain_text('acknowledgement');count=page.evaluate('__adminPreview.writes.length');assert page.evaluate('Object.keys(__adminPreview.records["demo-2"].feeReceipts).length')==0
   page.locator('#rcReceiptDeleteForm [type=submit]').click();expect(page.locator('.rc-receipt-deleted')).to_contain_text('1003 deleted');assert page.evaluate('__adminPreview.writes.length')==count;assert page.evaluate('__adminPreview.counters.tuition.last')==1003
   pending=page.evaluate('''async()=>{const {feeStatement}=await import('./admin-fee-statement-model.js?v=20261102-settings-1');return feeStatement({id:'demo-2',data:__adminPreview.records['demo-2']}).totals.due/100}''')
   assert page.evaluate('__adminPreview.summaries.ShnX2EUQARbWwD2plwEZhnLrbcZ2.pendingRupees')==pending
   expect(page.locator('.rc-receipt-item')).to_have_count(0);page.locator('[data-new=close]').click();page.locator('[data-new=receipts]').click();expect(page.locator('#rcFeatureDialog')).to_contain_text('No saved receipts remain')
   assert len(page.evaluate('Object.keys(__adminPreview.records)'))==8;assert not errors and not failed and not external,(errors,failed,external)
   print('PASS: lost-ack retry reverses only once, deleted receipts stay removed, numbering is preserved, 040 mobile balance remains synchronized; no live requests',flush=True)
   browser.close()
 finally:server.shutdown()
