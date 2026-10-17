"""Public-page smoke test. Third-party services are mocked; no payments or messages."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import importlib.util
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
EXACT_MAP = 'https://maps.app.goo.gl/oFssNm9peFexUEix7?g_st=awb'
spec=importlib.util.spec_from_file_location('admin_browser_fixture',ROOT/'tests/admin-browser.py')
fixture=importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)
PUBLIC_MOCK=fixture.MOCK+'''
export const createUserWithEmailAndPassword=async()=>{throw Error('Public writes disabled in this test')};
export const updateDoc=async()=>{throw Error('Public writes disabled in this test')};
export const deleteDoc=async()=>{throw Error('Public writes disabled in this test')};
export const addDoc=async()=>{throw Error('Public writes disabled in this test')};
export const query=(value)=>value;
export const orderBy=()=>({});
'''

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'public')))
    Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
        unexpected=[];errors=[]
        def route_handler(route):
            url=route.request.url
            if url.startswith(base):route.continue_()
            elif url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):
                route.fulfill(status=200,content_type='application/javascript',body=PUBLIC_MOCK,headers={'Access-Control-Allow-Origin':'*'})
            elif url.startswith('https://cdn.jsdelivr.net/npm/@emailjs/browser@4/'):
                route.fulfill(status=200,content_type='application/javascript',body='window.emailjs={init(){},send(){throw Error("No live emails in tests")}};')
            elif url.startswith('https://fonts.googleapis.com/'):
                route.fulfill(status=200,content_type='text/css',body='')
            elif url.startswith('https://www.google.com/maps?'):
                route.fulfill(status=200,content_type='text/html',body='<html><body style="margin:0;display:grid;place-items:center;height:100vh;background:#e9e5d8;font:14px sans-serif;color:#69634f">Area map provider · isolated test placeholder</body></html>')
            elif url==EXACT_MAP:
                route.fulfill(status=200,content_type='text/html',body='<html><body>Shared Google Maps location</body></html>')
            else:
                unexpected.append(url);route.abort()
        context.route('**/*',route_handler)
        page=context.new_page()
        page.add_init_script('window.__fixture={records:{},writes:[],listeners:[],authorized:false,auth:{currentUser:null,authStateReady:async()=>{}}};')
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(base+'/index.html')
        expect(page.locator('#courseGrid .course-card')).to_have_count(7)
        expect(page.locator('#applicationForm')).to_have_count(1)
        page.locator('.course-detail-btn').first.click()
        expect(page.locator('#courseModal')).to_have_class('modal active')
        page.locator('#courseModalClose').click()
        print('PASS: existing courses, course modal and admissions form initialize')
        credit=page.locator('.creator-top-badge')
        expect(credit).to_contain_text('Created by Dar Yasir')
        credit.click()
        expect(page).to_have_url(base+'/index.html#creatorCredit')
        expect(page.locator('#creatorCredit')).to_be_in_viewport()
        expect(page.locator('.creator-name')).to_have_text('Dar Yasir')
        expect(page.locator('.creator-manager')).to_have_text('Managed by Dar Yasir')
        print('PASS: top creator badge opens the styled footer credit and retains management attribution')
        page.locator('.footer-location-link').click()
        expect(page.locator('#location')).to_be_in_viewport()
        expect(page.locator('.location-map iframe')).to_have_attribute('loading','lazy')
        expect(page.locator('.location-map iframe')).to_have_attribute('title','Area map around Charangam, Beerwah, Kashmir')
        for selector in ['.location-primary','.location-map-footer a']:
            link=page.locator(selector)
            expect(link).to_have_attribute('href',EXACT_MAP)
            expect(link).to_have_attribute('target','_blank')
            assert 'noopener' in link.get_attribute('rel')
        with page.expect_popup() as popup:page.locator('.location-primary').click()
        expect(popup.value).to_have_url(EXACT_MAP)
        popup.value.close()
        print('PASS: map links open the exact user-supplied location safely in a new tab')
        artifacts=ROOT/'tests/artifacts';artifacts.mkdir(exist_ok=True)
        page.locator('#location').scroll_into_view_if_needed()
        page.screenshot(path=str(artifacts/'site-location.png'),full_page=False)
        for width in [390,768,1440]:
            page.set_viewport_size({'width':width,'height':900})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        page.set_viewport_size({'width':390,'height':844})
        page.goto(base+'/index.html')
        page.locator('#mobileMenuBtn').click()
        expect(page.locator('#mobileMenuBtn')).to_have_attribute('aria-expanded','true')
        page.locator('#mobileMenuBtn').click()
        page.screenshot(path=str(artifacts/'site-header-mobile.png'),full_page=False)
        page.locator('#creatorCredit').scroll_into_view_if_needed()
        page.screenshot(path=str(artifacts/'site-credit-mobile.png'),full_page=False)
        assert page.evaluate('__fixture.writes.length')==0
        assert not errors,errors
        assert not unexpected,unexpected
        print('PASS: desktop/tablet/mobile layout, mobile menu, no JS errors or live writes/requests')
        browser.close()
    server.shutdown()

if __name__=='__main__':run()
