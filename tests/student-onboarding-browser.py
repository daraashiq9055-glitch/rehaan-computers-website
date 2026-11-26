"""Required in-portal follow, server selection and refresh persistence via UI fixtures."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import importlib.util
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('live',ROOT/'tests/student-live-browser.py');live=importlib.util.module_from_spec(spec);spec.loader.exec_module(live)
# A test-only persistent store simulates an acknowledged server selection.
stub=live.STUB.replace("'student-alpha':{program:'MS Word'}", "'student-alpha':JSON.parse(localStorage.getItem('fixture-selection')||'null')")
stub=stub.replace("selections[uid]={program};selectionWatch[uid]?.(selections[uid]);", "selections[uid]={program};localStorage.setItem('fixture-selection',JSON.stringify({program}));selectionWatch[uid]?.(selections[uid]);")
stub=stub.replace("return onboarding[uid]||null;", "return JSON.parse(localStorage.getItem('fixture-follow-'+uid)||'null');").replace("onboarding[uid]={followed:true};", "onboarding[uid]={followed:true};localStorage.setItem('fixture-follow-'+uid,JSON.stringify(onboarding[uid]));")
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'public')));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in [320,360,390,1366]:
   page=browser.new_page(viewport={'width':width,'height':820})
   page.route('**/student-portal-auth.js*',lambda route:route.fulfill(content_type='text/javascript',body=stub))
   url=f'http://127.0.0.1:{server.server_port}/student.html'
   def login():
    page.locator('#studentId').fill('alpha');page.locator('#studentPassword').fill('StudentPass123');page.locator('.login-submit').click()
   page.goto(url);login();expect(page.locator('#followCentre')).to_be_visible();expect(page.locator('#demoInterior')).to_be_hidden()
   page.locator('#followCentre').click();expect(page.locator('#setupProgram')).to_be_visible();expect(page.locator('#demoInterior')).to_be_hidden()
   page.locator('#setupProgram').select_option('MS Word');page.locator('#setupLearning button').click();expect(page.locator('#demoInterior')).to_be_visible()
   page.locator('[data-demo-tab=journey]').click();expect(page.locator('#studentLearningProgram')).to_have_value('MS Word');expect(page.locator('#demoContent')).to_contain_text('OFFICIAL LEARNING CHECKLIST')
   assert page.locator('.journey-overview').count()==1
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   page.reload();login();expect(page.locator('#demoInterior')).to_be_visible();expect(page.locator('#demoOnboarding')).to_be_hidden()
   page.locator('[data-demo-tab=journey]').click();expect(page.locator('#studentLearningProgram')).to_have_value('MS Word')
   page.close()
  browser.close()
 print('PASS: required follow → software selection → dashboard; Single official checklist and browser/server-fixture persistence at 320/360/390/1366px.')
finally:server.shutdown()
