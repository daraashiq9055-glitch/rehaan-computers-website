"""Compatibility entrypoint: confirm the removed skill challenge stays absent."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import importlib.util
from browser_visit_fixture import mock_visit_counter
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/admission-payment-browser.py');fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT/'public')));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context();errors=[];requests=[]
  def route(r):
   requests.append(r.request.url)
   if r.request.url.startswith(base+'/') and r.request.method in ['GET','HEAD']:r.continue_()
   elif r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):r.fulfill(content_type='application/javascript',body=fixture.MOCK,headers={'Access-Control-Allow-Origin':'*'})
   else:r.abort()
  context.route('**/*',route);mock_visit_counter(context);context.add_init_script('window.__fixture={records:{},writes:[],listeners:[],authorized:false,auth:{currentUser:null,authStateReady:async()=>{}}};')
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/')
  expect(page.locator('.course-card')).to_have_count(7);expect(page.locator('#practice, #skillChallenge, #skillHeading, [href="#practice"], .skill-signature')).to_have_count(0)
  assert 'A smart little break' not in page.locator('body').inner_text()
  assert not any('/visitor/challenge.' in u for u in requests)
  assert page.evaluate('__fixture.writes.length')==0
  assert not errors,errors
  print('PASS: challenge, all of its text, footer link, artwork and network requests removed; catalogue and original services initialise without errors or writes.')
  browser.close()
finally:server.shutdown()
