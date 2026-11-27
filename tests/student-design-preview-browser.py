"""Verify the user-facing design launcher works without Firebase or live services."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import importlib.util
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('preview',ROOT/'preview-student-design.py');preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(preview.build_preview())));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':320,'height':740});errors=[];external=[];bad=[]
  page.add_init_script("Object.defineProperty(Notification,'permission',{get:()=> 'denied'});")
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.on('response',lambda response:bad.append(response.url) if response.status>=400 else None)
  def request(route):
   if not route.request.url.startswith(f'http://127.0.0.1:{server.server_port}/'):external.append(route.request.url);route.abort()
   else:route.continue_()
  page.route('**/*',request)
  page.goto(f'http://127.0.0.1:{server.server_port}/student.html')
  expect(page.get_by_text('DESIGN PREVIEW · Sample records only · No live services')).to_be_visible()
  def login():
   page.locator('#enterStudentPortal').click();page.locator('#studentId').fill('alpha');page.locator('#studentPassword').fill('StudentPass123');page.locator('.login-submit').click()
  login();page.locator('#followCentre').click();page.locator('#setupProgram').select_option('MS Word');page.locator('#setupLearning button').click();expect(page.locator('#demoInterior')).to_be_visible()
  for tab in ['home','updates','journey','account']:
   page.locator(f'[data-demo-tab={tab}]').click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  expect(page.locator('.notification-preference')).to_contain_text('browser notifications blocked');page.locator('#demoLogout').click();login();expect(page.locator('#demoInterior')).to_be_visible();expect(page.locator('#demoOnboarding')).to_be_hidden()
  page.reload();login();expect(page.locator('#demoInterior')).to_be_visible()
  assert not external,external;assert not errors,errors;assert not bad,bad
  browser.close()
 print('PASS: isolated design launcher, sample-only banner, first Follow/software setup, repeat login/refresh, four tabs at 320px; no external requests, missing files or script errors.')
finally:server.shutdown()
