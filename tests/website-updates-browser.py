"""Visitor notification opt-in/out, failure states and mobile layout, with mocked services."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import json
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT/'public')));Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':390,'height':844});calls=[];fail=False
  def route(r):
   nonlocal_dummy=None
   address=r.request.url
   if 'rehaan-website-updates.' in address:
    calls.append((address,r.request.post_data_json));r.fulfill(status=503 if fail else 200,content_type='application/json',body=json.dumps({'error':'Updates are unavailable'} if fail else {'subscribed':address.endswith('/subscribe')}),headers={'Access-Control-Allow-Origin':url});return
   if address.endswith('firebase-app.js'):r.fulfill(content_type='application/javascript',body='export const initializeApp=()=>({});export const getApps=()=>[];',headers={'Access-Control-Allow-Origin':'*'});return
   if address.endswith('firebase-messaging.js'):r.fulfill(content_type='application/javascript',body="export const isSupported=async()=>true,getMessaging=()=>({}),getToken=async()=> 'A'.repeat(180),deleteToken=async()=>true,onMessage=()=>{};",headers={'Access-Control-Allow-Origin':'*'});return
   if address.startswith(url+'/'):r.continue_()
   else:r.abort()
  context.route('**/*',route);context.add_init_script("window.__permissionCalls=0;Object.defineProperty(window,'Notification',{value:{permission:'default',requestPermission:async()=>{__permissionCalls++;return window.__deny?'denied':'granted';}}});Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>({active:{}})}});")
  page=context.new_page();page.on('dialog',lambda d:d.accept());page.goto(url+'/index.html');button=page.locator('#websiteUpdates button');status=page.locator('#websiteUpdates [role=status]');expect(button).to_have_text('Follow for updates');assert page.evaluate('__permissionCalls')==0
  for width in [1440,390,320]:
   page.set_viewport_size({'width':width,'height':844});rect=page.locator('#websiteUpdates').bounding_box();assert rect['x']>=-1 and rect['x']+rect['width']<=width+1,(width,rect)
  page.evaluate('window.__deny=true');button.click();expect(status).to_contain_text('not subscribed');assert not [c for c in calls if not c[0].endswith('/visit')]
  page.evaluate('window.__deny=false');fail=True;button.click();expect(status).to_contain_text('Updates are unavailable');expect(button).to_have_text('Follow for updates')
  fail=False;button.click();expect(button).to_have_text('Manage updates');expect(page.locator('.header-follow')).to_have_text('Following');expect(status).to_contain_text('following');expect(page.locator('#websiteUpdates')).to_have_class(__import__('re').compile('is-followed'));expect(page.locator('.header-follow')).to_have_class(__import__('re').compile('follow-success'));assert calls[-1][0].endswith('/subscribe');assert len(calls[-1][1]['secret'])==64
  button.click();expect(button).to_have_text('Follow for updates');expect(status).to_contain_text('unfollowed');assert calls[-1][0].endswith('/unsubscribe')
  sw=(ROOT/'public/website-updates-sw.js').read_text();assert "addEventListener('fetch'" not in sw and 'caches.' not in sw;assert 'rehaan-notification-192.png' in sw and 'rehaan-notification-badge.png' in sw and "title:'Open website'" in sw
  out=ROOT/'tests/artifacts/website-updates';out.mkdir(parents=True,exist_ok=True);page.locator('#websiteUpdates').screenshot(path=str(out/'mobile.png'))
  browser.close();print('PASS: no unsolicited permission, denied/failed/successful subscription, private management credential, unfollow and three widths; no real notifications or student writes.')
finally:server.shutdown()
