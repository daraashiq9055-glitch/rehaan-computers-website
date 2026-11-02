"""Check the isolated clay palette across the existing admin sections."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
import importlib.util
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('clay',ROOT/'preview-clay-admin.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.Handler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce');errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url+'/') else r.abort());page.goto(url+m.base.PREVIEW);expect(page.locator('#adminDashboard')).to_be_visible();expect(page.locator('.application-card')).to_have_count(8)
  initial=page.evaluate('structuredClone(__adminPreview.records)')
  for width in [1440,390,320]:
   page.set_viewport_size({'width':width,'height':1000})
   for name in ['overview','admissions','students','fees','courses','batches','reports','settings','marks','statements','attendance']:
    if width<=760:page.locator('#menuToggle').click()
    page.locator('.nav [data-section='+name+']').click();page.wait_for_timeout(150)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,name)
  page.set_viewport_size({'width':1440,'height':1000});page.locator('.nav [data-section=overview]').click();page.evaluate('window.scrollTo(0,0)')
  assert page.locator('.nav button.active').evaluate("el=>getComputedStyle(el).backgroundColor")=='rgb(255, 241, 166)'
  assert page.evaluate('__adminPreview.records')==initial
  assert page.evaluate('__adminPreview.writes.length')==0
  assert not errors,errors
  out=ROOT/'tests/artifacts/clay-preview';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/'desktop.png'))
  browser.close();print('PASS: clay/butter palette, 11 sections at 3 widths, no errors or record writes; live network blocked.')
finally:server.shutdown()
