"""Enforce actual candidate CSP with intercepted Firebase. No real services/writes."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import importlib.util,json,tempfile
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
baseline=module('baseline',ROOT/'tests/admin-browser.py');builder=module('builder',ROOT/'prepare-admin-release.py')
class SecureHandler(SimpleHTTPRequestHandler):
 security={}
 admin_security={}
 def end_headers(self):
  headers={**self.security,**(self.admin_security if self.path.split('?')[0]=='/admin.html' else {})}
  for key,value in headers.items():self.send_header(key,value)
  super().end_headers()
 def log_message(self,*args):pass

def run():
 with tempfile.TemporaryDirectory() as folder:
  output=builder.build(Path(folder)/'candidate');config=json.loads((output/'firebase.json').read_text());SecureHandler.security={header['key']:header['value'] for entry in config['hosting']['headers'] if entry['source']=='**' for header in entry['headers']}
  SecureHandler.admin_security={header['key']:header['value'] for entry in config['hosting']['headers'] if entry['source']=='/admin.html' for header in entry['headers']}
  csp=SecureHandler.admin_security['Content-Security-Policy'];assert "'unsafe-eval'" not in csp and "script-src-attr 'none'" in csp
  assert not (output/'public/admin-fix.js').exists()
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(SecureHandler,directory=str(output/'public')));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
  try:
   with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1450,'height':1100},accept_downloads=True);errors,external,writes=[],[],[]
    mock=baseline.MOCK.replace('export const getDocs=async()=>{','export const getDocs=async()=>{state.reads=(state.reads||0)+1;')
    def route(r):
     if r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):r.fulfill(content_type='application/javascript',body=mock,headers={'Access-Control-Allow-Origin':'*'})
     elif r.request.url.startswith(base+'/'):
      if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
      else:r.continue_()
     else:external.append(r.request.url);r.abort()
    context.route('**/*',route)
    payload='<img src=x onerror="window.__xss=true">'
    record={**baseline.FIXTURES['enrolled'],'fullName':payload,'parentName':payload,'email':payload,'batch':payload,'address':payload,'message':payload,'photo':'data:image/svg+xml,<svg onload="window.__xss=true"/>','markCard':{'title':payload,'date':'2026-10-20','subjects':[{'name':payload,'max':100,'marks':95}]}}
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept());page.add_init_script('window.__fixture={records:'+json.dumps({'enrolled':record})+',writes:[],reads:0,listeners:[],authorized:false,auth:{currentUser:null,authStateReady:async()=>{}}};window.__violations=[];document.addEventListener("securitypolicyviolation",e=>__violations.push({directive:e.effectiveDirective,blocked:e.blockedURI}));')
    page.goto(base+'/');expect(page.locator('.course-card')).to_have_count(7);expect(page.locator('#applicationForm')).to_be_attached();assert page.evaluate('__fixture.reads')==0;assert page.evaluate('__violations')==[],page.evaluate('__violations')
    response=page.goto(base+'/admin.html');assert response.headers['x-frame-options']=='DENY';expect(page.locator('#adminLoginButton')).to_be_enabled();expect(page.locator('#adminDashboard')).to_be_hidden();assert page.evaluate('__fixture.reads')==0
    def signin():
     page.locator('#adminEmail').fill('admin@example.test');page.locator('#adminPassword').fill('test-only-password');page.locator('#adminLoginButton').click()
    signin();expect(page.locator('#adminLoginMessage')).to_contain_text('administrator');expect(page.locator('#adminDashboard')).to_be_hidden();expect(page.locator('#adminPassword')).to_have_value('');assert page.evaluate('__fixture.reads')==0
    page.evaluate('__fixture.authorized=true');signin();expect(page.locator('#adminDashboard')).to_be_visible();expect(page.locator('#adminPassword')).to_have_value('');page.locator('[data-section=students]').click();expect(page.locator('.application-card h3')).to_have_text(payload);assert page.locator('img[src=x]').count()==0;assert page.evaluate('window.__xss===undefined')
    page.locator('[data-act=details]').click();expect(page.locator('#adminDetailsModal')).to_be_visible();assert page.evaluate('window.__xss===undefined');page.locator('#adminDetailsModal .admin-modal-close').click();page.locator('[data-section=marks]').click();expect(page.locator('#rcMarkPreview')).to_contain_text(payload);assert page.locator('#rcMarkPreview script').count()==0 and page.locator('#rcMarkPreview img[src=x]').count()==0
    assert page.evaluate('__fixture.writes.length')==0;assert page.evaluate('__violations')==[],page.evaluate('__violations')
    page.evaluate('()=>{const script=document.createElement("script");script.textContent="window.__injectedScript=true";document.body.append(script);const image=document.createElement("img");image.setAttribute("onerror","window.__injectedEvent=true");image.src="/intentional-csp-test-missing-image";document.body.append(image)}')
    page.wait_for_function('__violations.some(e=>e.directive==="script-src-attr")');assert page.evaluate('window.__injectedScript===undefined&&window.__injectedEvent===undefined');assert any(v['directive']=='script-src-elem' for v in page.evaluate('__violations'))
    page.locator('#adminLogoutBtn').click();expect(page.locator('#adminDashboard')).to_be_hidden();assert page.locator('#rcMarkPreview').count()==0
    assert not errors and not external and not writes,(errors,external,writes);browser.close();print('PASS: real CSP permits homepage/auth/full workspace, blocks inline script/event XSS, renders malicious student data safely, denies non-admin UI/reads, clears passwords and private state; no live requests or writes',flush=True)
  finally:server.shutdown()
if __name__=='__main__':run()
