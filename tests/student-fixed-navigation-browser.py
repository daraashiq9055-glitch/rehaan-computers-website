"""Scroll every signed-in tab and measure the actual viewport-fixed navigation."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import importlib.util
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('live',ROOT/'tests/student-live-browser.py');live=importlib.util.module_from_spec(spec);spec.loader.exec_module(live)
stub=live.STUB.replace('const updateWatch={}',"updates['student-alpha']=Array.from({length:12},(_,i)=>({...updates['student-alpha'][0],id:'note-'+i,title:'Private class note '+(i+1),image:''}));\nconst updateWatch={}")
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'public')));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in [320,360,390,768,1024,1366]:
   page=browser.new_page(viewport={'width':width,'height':650});errors=[];page.on('pageerror',lambda error:errors.append(str(error)));page.route('**/student-portal-auth.js*',lambda route:route.fulfill(content_type='text/javascript',body=stub))
   page.goto(f'http://127.0.0.1:{server.server_port}/student.html');page.locator('#studentId').fill('alpha');page.locator('#studentPassword').fill('StudentPass123');page.locator('.login-submit').click();page.locator('#followCentre').click();expect(page.locator('#demoInterior')).to_be_visible()
   for tab in ['home','account','updates','journey']:
    page.locator(f'[data-demo-tab={tab}]').click()
    if tab=='account':page.locator('.account-section').evaluate_all('nodes=>nodes.forEach(node=>node.open=true)')
    page.wait_for_timeout(220)
    max_scroll=page.evaluate('document.documentElement.scrollHeight-innerHeight')
    assert max_scroll>0,(width,tab,'Expected scrollable content')
    for position in [0,max_scroll/2,max_scroll]:
     page.evaluate('(value)=>window.scrollTo({top:value,behavior:"instant"})',position)
     rect=page.locator('.demo-nav').bounding_box();assert abs(rect['y']+rect['height']-650)<1,(width,tab,rect)
     assert page.locator('.demo-nav').evaluate('node=>getComputedStyle(node).position')=='fixed'
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,tab)
     for button in page.locator('.demo-nav button').all():
      assert button.evaluate('node=>node.scrollWidth<=node.clientWidth+1')
    content=page.locator('#demoContent>section').bounding_box();assert content['y']+content['height']<=rect['y']+1,(width,tab,'Content hidden by navigation')
    if width in [390,1366]:
     page.evaluate('window.scrollTo({top:0,behavior:"instant"})');page.screenshot(path=str(ROOT/'build'/f'student-fixed-{tab}-{width}.png'))
   assert not errors,errors;page.close()
  browser.close()
 print('PASS: 24 tab/viewport combinations, each tested at top/middle/bottom (72 scroll positions); nav remains at viewport bottom, last content clears navigation, no horizontal overflow or page errors at 320/360/390/768/1024/1366px.')
finally:server.shutdown()
