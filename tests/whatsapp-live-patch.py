"""Verify the narrow patch changes only permitted blocks and its filled-chat handler works."""
from pathlib import Path
import importlib.util,tempfile,subprocess,re,json
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('patch',ROOT/'patches/whatsapp-current.py');patch=importlib.util.module_from_spec(spec);spec.loader.exec_module(patch)
# Downloaded public code, not student data. Required for checking the exact live baseline.
with tempfile.TemporaryDirectory() as folder:
 root=Path(folder);(root/'admin-next').mkdir()
 for source,target in [('/tmp/rehaan-live-app.js','admin-app.js'),('/tmp/rehaan-live-next.js','admin-next/ui.js'),('/tmp/rehaan-live-admin.html','admin.html')]:
  (root/target).write_bytes(Path(source).read_bytes())
 before=(root/'admin-app.js').read_text();inline=re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>',(root/'admin.html').read_text(),re.S)
 patch.patch(root);after=(root/'admin-app.js').read_text()
 assert re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>',(root/'admin.html').read_text(),re.S)==inline
 for name,end in [('async function recordMonthlyTuition(', '\nfunction '),('async function deleteDoc(', '\nfunction friendlyError')]:
  a=before.index(name);b=before.find(end,a+len(name));old=before[a:b if b!=-1 else None];assert old in after,name
 for js in ['admin-app.js','admin-next/ui.js','admin-whatsapp.js']:subprocess.run(['node','--check',str(root/js)],check=True)
 class Handler(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page()
   message='*REHAAN COMPUTERS*\nHello Ayaan,\nAugust 2026: ₹999\nSeptember 2026: ₹599\n*TOTAL TO PAY: ₹1,598*'
   (root/'test.html').write_text('<script>window.entry={id:"s",data:{fullName:"Ayaan",phone:"+91 9149551258"}};window.open=url=>{window.opened=url;return {opener:null}};</script><script type="module">import {openReminder} from "./admin-next/ui.js";openReminder(entry);</script>')
   def route(r):
    path=r.request.url.split('?')[0]
    if path==base+'/admin-app.js':r.fulfill(content_type='application/javascript',body='export const adminWorkspace={identity:()=>({uid:"admin"}),snapshot:()=>({records:[window.entry]})};')
    elif path==base+'/admin-next/notices.js':r.fulfill(content_type='application/javascript',body='export const addFollowupImage=()=>{};')
    elif path==base+'/admin-next/model.js':r.fulfill(content_type='application/javascript',body='export const reminder=()=>('+json.dumps({'statement':{'student':{'phone':'+91 9149551258','name':'Ayaan','admission':'001'},'reliable':True},'rows':[{},{}],'total':159800,'message':message,'canShare':True})+');')
    elif path==base+'/admin-feature-model.js':r.fulfill(content_type='application/javascript',body='export const indiaDate=()=>"2026-11-04",monthLabel=x=>x,money=x=>"₹"+x/100,escapeHTML=x=>String(x).replaceAll("&","&amp;").replaceAll("<","&lt;");')
    elif path==base+'/admin-fee-statement-model.js':r.fulfill(content_type='application/javascript',body='export const feeStatement=()=>({});')
    elif path.startswith(base+'/'):r.continue_()
    else:r.abort()
   page.route('**/*',route);page.goto(base+'/test.html');expect(page.locator('#nextReminder')).to_be_visible();page.locator('[data-action=whatsapp]').click();assert page.evaluate('new URL(opened).pathname')=='/919149551258';assert page.evaluate('new URL(opened).searchParams.get("text")')==message
   page.evaluate('delete window.opened;entry={id:"s",data:{fullName:"Changed",phone:"9797205429"}}');page.locator('[data-action=whatsapp]').click();expect(page.locator('#nextReminderStatus')).to_contain_text('record changed');assert page.evaluate('window.opened===undefined')
   browser.close();print('PASS: live patch filled message and saved recipient, stale-data guard, payment/deletion blocks and inline CSP preserved.')
 finally:server.shutdown()
