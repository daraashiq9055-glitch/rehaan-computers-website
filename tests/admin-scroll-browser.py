"""Check sidebar/header coverage during page scrolling and independent tab scrolling."""
from pathlib import Path
from http.server import ThreadingHTTPServer
from threading import Thread
from functools import partial
import importlib.util
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('preview',ROOT/'preview-admin.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.PreviewHandler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':800},reduced_motion='reduce');errors=[];page.on('pageerror',lambda err:errors.append(str(err)));page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base+'/') else r.abort());page.goto(base+m.PREVIEW);expect(page.locator('#adminDashboard')).to_be_visible();expect(page.locator('.application-card')).to_have_count(8)
  for width in [1440,1024,390,320]:
   page.set_viewport_size({'width':width,'height':800});page.evaluate("document.body.classList.remove('nav-open');window.scrollTo(0,0)")
   if width<=760:page.locator('#menuToggle').click()
   for scroll in [900,1800,500,0]:
    page.evaluate('(y)=>window.scrollTo(0,y)',scroll)
    page.wait_for_function("Math.abs(document.querySelector('.topbar').getBoundingClientRect().top-40)<1")
    assert page.evaluate("(()=>{const side=document.querySelector('.sidebar').getBoundingClientRect(),banner=document.querySelector('.demo-strip').getBoundingClientRect();return Math.abs(side.top-banner.bottom)<1&&Math.abs(side.bottom-innerHeight)<1})()")
    expect(page.locator('.sidebar .brand')).to_be_visible()
    assert page.evaluate("document.elementFromPoint(10,45)?.closest('.sidebar')!==null")
   brand_top=page.locator('.sidebar .brand').bounding_box()['y'];page.locator('.sidebar .nav').evaluate('el=>el.scrollTop=el.scrollHeight');assert abs(page.locator('.sidebar .brand').bounding_box()['y']-brand_top)<1
   expect(page.locator('.nav [data-section=settings]')).to_be_in_viewport();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  # The release removes the preview strip/class; the same chrome must meet y=0.
  page.set_viewport_size({'width':1440,'height':800});page.evaluate("document.querySelector('.demo-strip').remove();document.body.classList.remove('admin-premium-preview','nav-open');window.scrollTo(0,900)")
  page.wait_for_function("Math.abs(document.querySelector('.topbar').getBoundingClientRect().top)<1")
  assert page.locator('.sidebar').bounding_box()['y']==0
  assert page.evaluate("document.elementFromPoint(10,5)?.closest('.sidebar')!==null")
  assert page.evaluate('__adminPreview.writes.length')==0;assert not errors,errors
  out=ROOT/'tests/artifacts/admin-shell';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/'scroll-chrome.png'))
  browser.close();print('PASS: preview/release top coverage, sticky opaque header, fixed brand, independent tab scroll, Settings visibility and four widths; no record writes')
finally:server.shutdown()
