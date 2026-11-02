from pathlib import Path
from http.server import ThreadingHTTPServer
from functools import partial
from threading import Thread
import importlib.util
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('preview',ROOT/'preview-admin.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.PreviewHandler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1512,'height':1100},accept_downloads=True);errors=[];page.on('pageerror',lambda err:errors.append(str(err)));page.on('dialog',lambda d:d.accept());page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base+'/') else r.abort());page.goto(base+m.PREVIEW);expect(page.locator('#adminDashboard')).to_be_visible();before=page.evaluate('structuredClone(__adminPreview.records)')
  page.locator('.nav [data-section=settings]').click();expect(page.locator('.settings-live')).to_be_visible();expect(page.locator('#saveSettings')).to_be_enabled()
  page.locator('[data-institute=name]').fill('REHAAN TEST INSTITUTE');page.locator('[data-panel=documents]').click();page.locator('#paperColour').fill('#f1e6cc');page.locator('#documentFooter').fill('Learning together.');page.locator('[data-panel=messages]').click();page.locator('#messageText').fill('Hello {name}, {month}: {attended} days.\nNote: {notice}')
  page.locator('#saveSettings').click();expect(page.locator('#draftStatus')).to_contain_text('Saved for both');assert page.evaluate('__adminPreview.settings.workspace.institute.name')=='REHAAN TEST INSTITUTE';assert page.evaluate('__adminPreview.records')==before
  drawn=page.evaluate('''async()=>{const drawn=[];const original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(value,...args){drawn.push(String(value));return original.call(this,value,...args);};try{const settings=__adminPreview.settings.workspace;const {receiptImage}=await import('/public/admin-receipt-canvas.js?v=20261102-settings-1');const profile={institute:settings.institute,footer:'Learning together.'};await receiptImage({documentProfile:profile,number:'1000',student:{name:'Sample',admission:'001',address:'Sample',course:'Computers'},date:'2026-10-01',due:'2026-10-01',month:'September 2026',method:'Cash',amount:99900,receivedAtIssue:99900,balanceAtIssue:0});const receipt=[...drawn];drawn.length=0;const {markCardPNG}=await import('/public/admin-mark-image.js?v=20261102-settings-1');await markCardPNG({data:{fullName:'Sample',admissionNumber:'001'}},{documentProfile:profile,title:'Assessment',date:'2026-10-01',subjects:[{name:'Computers',max:50,marks:49}]},{outputWidth:1600});return {receipt,marks:drawn};}finally{CanvasRenderingContext2D.prototype.fillText=original;}}''')
  for kind in ['receipt','marks']:
   assert any('REHAAN TEST INSTITUTE' in text for text in drawn[kind]),kind
   assert 'Learning together.' in drawn[kind],kind
  page.locator('.nav [data-section=overview]').click();page.locator('.nav [data-section=settings]').click();expect(page.locator('[data-institute=name]')).to_have_value('REHAAN TEST INSTITUTE')
  page.evaluate('__adminPreview.settings.workspace.revision++');page.locator('[data-institute=name]').fill('Concurrent test');page.locator('#saveSettings').click();expect(page.locator('#draftStatus')).to_contain_text('another session');assert page.evaluate('__adminPreview.settings.workspace.institute.name')=='REHAAN TEST INSTITUTE'
  page.locator('[data-panel=account]').click();page.locator('#passwordReview').click();expect(page.locator('#accountStatus')).to_contain_text('email requested');assert page.evaluate('__adminPreview.resetEmails.length')==1
  page.locator('[data-panel=appearance]').click();page.locator('#clock24').check();page.locator('#motion').check();assert page.locator('#adminDashboard').evaluate("el=>el.classList.contains('studio-reduced-motion')")
  for width in [320,390,768,1024,1512]:
   page.set_viewport_size({'width':width,'height':1000})
   for category in ['institute','documents','messages','backup','account','appearance']:
    page.locator('[data-panel='+category+']').click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,category)
  page.locator('[data-panel=backup]').click()
  with page.expect_download() as download:page.locator('#backupReview').click()
  assert download.value.suggested_filename.endswith('.json');assert page.evaluate('__adminPreview.records')==before
  page.locator('.nav [data-section=settings]').click();expect(page.locator('.settings-live')).to_be_visible();page.locator('[data-panel=account]').click();page.locator('#settingsLogout').click();expect(page.locator('#adminDashboard')).to_be_hidden();assert page.locator('.settings-live').count()==0;assert not errors,errors
  browser.close();print('PASS: shared save/reload, concurrent rejection, student preservation, real reset callback, appearance, backup, six settings panels/five widths and logout')
finally:server.shutdown()
