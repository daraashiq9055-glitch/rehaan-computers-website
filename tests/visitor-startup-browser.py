"""Public release cache/loading checks, using an isolated SDK and no live writes."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from urllib.parse import urlparse, parse_qs
import importlib.util
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('payment_fixture',ROOT/'tests/admission-payment-browser.py')
fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'public')))
    Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            for mode in ['warm-cache','sdk-unavailable','storage-unavailable']:
                context=browser.new_context(reduced_motion='reduce')
                errors,external,seen,stale=[],[],set(),[]
                def route(r):
                    url=r.request.url
                    if url.startswith(base+'/'):
                        path=urlparse(url).path
                        if (path.startswith('/visitor/') and path.endswith('.js')) or path=='/script.js':
                            if not parse_qs(urlparse(url).query).get('v'):
                                stale.append(path);r.fulfill(content_type='application/javascript',body='throw Error("Stale unversioned release")');return
                            seen.add(path)
                        r.continue_()
                    elif url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):
                        if mode=='sdk-unavailable':r.abort()
                        else:r.fulfill(content_type='application/javascript',body=fixture.MOCK,headers={'Access-Control-Allow-Origin':'*'})
                    else:external.append(url);r.abort()
                context.route('**/*',route)
                page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
                page.add_init_script('window.__fixture={records:{},writes:[],listeners:[],authorized:false,auth:{currentUser:null,authStateReady:async()=>{}}};')
                if mode=='storage-unavailable':page.add_init_script('Storage.prototype.getItem=Storage.prototype.setItem=Storage.prototype.removeItem=function(){throw new DOMException("Storage blocked","SecurityError")};')
                page.goto(base+'/')
                expect(page.locator('.course-card')).to_have_count(7)
                if mode=='sdk-unavailable':
                    expect(page.locator('#admissionServiceState')).to_have_text('CONNECTION REQUIRED')
                    expect(page.locator('#serviceStatus')).to_contain_text('No application has been submitted')
                else:expect(page.locator('#admissionServiceState')).to_have_text('SECURE APPLICATION')
                page.locator('.studio-course[data-id="4"]').click()
                expect(page.locator('#dialogTitle')).to_contain_text('Tally Prime')
                page.locator('#dialogClose').click()
                page.locator('.studio-bottom [data-action=finder]').click()
                expect(page.locator('#dialogContent')).to_contain_text('What would you like to achieve?')
                assert not stale,stale
                assert seen=={'/script.js','/visitor/app.js','/visitor/admission.js','/visitor/model.js','/visitor/motion.js','/visitor/studio.js','/visitor/challenge.js'},seen
                assert not errors,errors
                assert not external,external
                assert page.evaluate('__fixture.writes.length')==0
                expect(page.locator('#paymentSuccessModal')).to_be_hidden()
                print(f'PASS: {mode}; current module graph, public browsing/finder remain usable; no unintended records, messages or payments',flush=True)
                context.close()
            browser.close()
    finally:server.shutdown()

if __name__=='__main__':run()
