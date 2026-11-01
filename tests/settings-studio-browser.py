"""Exercise Settings design drafts; all network traffic must remain local."""
from pathlib import Path
from http.server import ThreadingHTTPServer
from threading import Thread
from functools import partial
import importlib.util,json
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('settings',ROOT/'preview-settings.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.Handler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1512,'height':1100},accept_downloads=True);errors=[];external=[]
  page.on('pageerror',lambda err:errors.append(str(err)))
  def route(r):
   if r.request.url.startswith(base+'/'):r.continue_()
   else:external.append(r.request.url);r.abort()
  page.route('**/*',route);page.goto(base+m.PREVIEW)
  out=ROOT/'tests/artifacts/settings-studio';out.mkdir(parents=True,exist_ok=True)
  page.evaluate('document.fonts.ready');page.screenshot(path=str(out/'institute.png'),full_page=True)
  page.locator('[data-institute=name]').fill('Sample Institute');expect(page.locator('#identityName')).to_have_text('Sample Institute')
  page.locator('[data-panel=documents]').click();expect(page.locator('#documentInstitute')).to_have_text('Sample Institute');page.locator('#paperColour').fill('#eee6d8');page.locator('#documentFooter').fill('Learning with care.');expect(page.locator('#documentFooterPreview')).to_have_text('Learning with care.')
  page.locator('#documentKind').select_option('marks');expect(page.locator('#documentTitle')).to_have_text('STATEMENT OF MARKS')
  page.locator('[data-panel=messages]').click();expect(page.locator('#messagePreview')).to_contain_text('75%');page.screenshot(path=str(out/'messages.png'),full_page=True)
  page.locator('#messageText').fill('Hello {name}, <img src=x onerror=alert(1)>');expect(page.locator('#messagePreview')).to_contain_text('Hello Ayaan Mir');assert page.locator('#messagePreview img').count()==0
  page.locator('#resetSection').click();expect(page.locator('#messagePreview')).to_contain_text('75%');page.locator('#messageKind').select_option('fee');expect(page.locator('#messagePreview')).to_contain_text('₹999')
  page.locator('[data-panel=backup]').click();page.locator('#backupReview').click();expect(page.locator('#reviewDialog')).to_contain_text('No backup was created');page.locator('.close').click()
  page.locator('[data-panel=account]').click();page.locator('#passwordReview').click();expect(page.locator('#reviewDialog')).to_contain_text('No reset email');page.locator('.close').click()
  page.locator('[data-panel=appearance]').click();page.locator('#motion').check();expect(page.locator('body')).to_have_class('calm');page.locator('#clock24').check()
  with page.expect_download() as download:page.locator('#exportDraft').click()
  draft=json.loads(Path(download.value.path()).read_text());assert draft['liveApplied'] is False;assert draft['studentRecordsIncluded'] is False;assert draft['settings']['institute']['name']=='Sample Institute'
  for width in [320,390,768,1024,1512]:
   page.set_viewport_size({'width':width,'height':1000})
   for category in ['institute','documents','messages','backup','account','appearance']:
    page.locator('[data-panel='+category+']').click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,category)
  assert not errors,errors;assert not external,external;browser.close();print('PASS: six settings workflows, linked drafts, message substitution/XSS, export, dialogs and five widths; no external requests')
finally:server.shutdown()
