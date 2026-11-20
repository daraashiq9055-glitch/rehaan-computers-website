"""Exercise the exact optional Windows preview, not production data."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
import importlib.util,tempfile
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('preview',ROOT/'preview-admin.py');preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
preview.PreviewHandler.receipt_delete=True
server=ThreadingHTTPServer(('127.0.0.1',0),partial(preview.PreviewHandler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');external=[];errors=[]
  def route(r):
   if r.request.url.startswith(base+'/') and r.request.method in ['GET','HEAD']:r.continue_()
   else:external.append(r.request.url);r.abort()
  context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/previews/admin-premium/');expect(page.locator('.rc-receipt-item')).to_have_count(4,timeout=15000)
  page.locator('[data-new=deleteReceipt][data-id="'+'a'*32+'"]').click();expect(page.locator('#rcReceiptDeleteForm')).to_be_visible()
  form=page.locator('#rcReceiptDeleteForm');form.locator('[name=reason]').fill('Sample accidental payment');form.locator('[name=confirmed]').check();form.locator('[type=submit]').click();expect(page.locator('.rc-receipt-deleted')).to_contain_text('1000 deleted');expect(page.locator('.rc-receipt-item')).to_have_count(3)
  assert page.evaluate('Object.values(__adminPreview.records["demo-0"].feeReceipts).reduce((sum,r)=>sum+r.amount,0)')==30000
  assert not external and not errors,(external,errors);browser.close()
 print('PASS: --receipt-delete preview auto-opens four fictional receipts; deletion reverses the sample payment with zero external requests')
finally:server.shutdown()
spec=importlib.util.spec_from_file_location('builder',ROOT/'prepare-admin-release.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
with tempfile.TemporaryDirectory() as tmp:
 output=builder.build(Path(tmp)/'candidate');assert 'receipt-delete-fixtures' not in (output/'public/admin.html').read_text();assert not list((output/'public').rglob('receipt-delete-fixtures.js'))
print('PASS: fictional receipt fixtures are excluded from the assembled production release')
