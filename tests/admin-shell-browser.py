"""Local-only navigation, display preferences and India-time clock checks."""
from pathlib import Path
from http.server import ThreadingHTTPServer
from functools import partial
from threading import Thread
import importlib.util
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('preview',ROOT/'preview-admin.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.PreviewHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1512,'height':1050});errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.route('**/*',lambda route:route.continue_() if route.request.url.startswith(base+'/') else route.abort())
  page.goto(base+m.PREVIEW);expect(page.locator('#adminDashboard')).to_be_visible()
  expect(page.locator('.nav button').last).to_have_attribute('data-section','settings')
  assert page.locator('.studio-nav-caption').count()==3
  assert page.locator('.nav button').evaluate_all('(items)=>items.slice(0,4).map(x=>x.textContent.trim())')==['Overview','Today','Students','Admissions']
  expect(page.locator('#workspaceTime')).not_to_be_empty()
  page.locator('.nav [data-section=settings]').click();expect(page.locator('.settings-live')).to_be_visible();page.locator('[data-panel=appearance]').click()
  page.locator('#clock24').check();page.locator('#motion').check()
  expected=page.evaluate("new Intl.DateTimeFormat('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Kolkata'}).format(new Date())")
  expect(page.locator('#workspaceTime')).to_have_text(expected)
  assert page.locator('#adminDashboard').evaluate("el=>el.classList.contains('studio-reduced-motion')")
  assert page.evaluate('__adminPreview.writes.length')==0
  page.locator('[data-panel=backup]').click();page.locator('#backupReview').click();expect(page.locator('#reportJson')).to_be_visible()
  page.locator('.nav [data-section=settings]').click();expect(page.locator('.settings-live')).to_be_visible();page.locator('[data-panel=appearance]').click();expect(page.locator('#clock24')).to_be_checked()
  page.locator('.nav [data-workbench=preferences]').click();expect(page.locator('.preferences-form')).to_be_visible()
  page.locator('.nav [data-section=settings]').click();expect(page.locator('.settings-live')).to_be_visible();page.locator('[data-panel=appearance]').click();page.locator('#resetSection').click();expect(page.locator('#clock24')).not_to_be_checked()
  out=ROOT/'tests/artifacts/admin-shell';out.mkdir(parents=True,exist_ok=True)
  page.screenshot(path=str(out/'settings.png'),full_page=True)
  for width in [320,390,768,1024,1512]:
   page.set_viewport_size({'width':width,'height':1000})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
   expect(page.locator('#workspaceTime')).to_be_visible()
  page.locator('#workspaceFind').click();expect(page.locator('.workspace-finder')).to_be_visible();page.keyboard.press('Escape')
  assert page.evaluate('__adminPreview.writes.length')==0
  assert not errors,errors
  browser.close();print('PASS: navigation priority/settings last, IST clock, saved display choices, backup/preferences links, search and five widths; no record writes')
finally:server.shutdown()
