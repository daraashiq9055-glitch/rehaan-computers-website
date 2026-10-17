"""Public-page smoke test. Third-party services are mocked; no payments or messages."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import importlib.util
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
EXACT_MAP = 'https://www.google.com/maps/search/?api=1&query=34.026895%2C74.643088'
BROWSER_MAP = 'https://www.google.com/maps/dir/?api=1&destination=34.026895%2C74.643088&travelmode=driving&dir_action=navigate'
SOCIAL_LINKS = ['https://instagram.com/dar_yas_ir?mdxt=NWI0YzZydnF2czNm', 'https://www.facebook.com/share/1EnMSHPNxp/', 'https://www.facebook.com/share/14tvvFj3od1/']
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
        unexpected=[];errors=[];map_requests=[]
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
                map_requests.append(url)
                route.fulfill(status=200,content_type='text/html',body='<html><body style="margin:0;display:grid;place-items:center;height:100vh;background:#e9e5d8;font:14px sans-serif;color:#69634f">Area map provider · isolated test placeholder</body></html>')
            elif url in [EXACT_MAP,BROWSER_MAP,*SOCIAL_LINKS]:
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
        expect(page.locator('#location')).to_be_hidden()
        assert page.locator('.location-map iframe').get_attribute('src') is None
        assert not map_requests
        page.locator('.footer-location-link').click()
        expect(page.locator('#location')).to_be_visible()
        expect(page.locator('.footer-location-link')).to_have_attribute('aria-expanded','true')
        expect(page.locator('#location')).to_be_in_viewport()
        expect(page.locator('.location-map iframe')).to_have_attribute('src','https://www.google.com/maps?q=34.026895%2C74.643088&z=17&output=embed')
        expect(page.locator('.location-map iframe')).to_have_attribute('loading','lazy')
        expect(page.locator('.location-map iframe')).to_have_attribute('title','Rehaan Computers location at 34.026895, 74.643088')
        for selector,url in [('.location-primary',BROWSER_MAP),('.footer-location-link',BROWSER_MAP),('.location-map-footer a',EXACT_MAP)]:
            link=page.locator(selector)
            expect(link).to_have_attribute('href',url)
            expect(link).to_have_attribute('target','_blank')
            assert 'noopener' in link.get_attribute('rel')
        with page.expect_popup() as popup:page.locator('.location-primary').click()
        expect(popup.value).to_have_url(BROWSER_MAP)
        popup.value.close()
        assert page.locator('.location-primary').bounding_box()['height']>=48
        expect(page.locator('.location-primary')).to_have_css('border-top-left-radius','999px')
        from urllib.parse import urlparse, parse_qs
        params=parse_qs(urlparse(page.locator('.location-primary').get_attribute('href')).query)
        assert params['destination']==['34.026895,74.643088']
        assert params['travelmode']==['driving'] and params['dir_action']==['navigate']
        assert 'origin' not in params
        page.locator('#locationClose').click()
        expect(page.locator('#location')).to_be_hidden()
        expect(page.locator('.footer-location-link')).to_have_attribute('aria-expanded','false')
        page.locator('.footer-location-link').click()
        expect(page.locator('#location')).to_be_visible()
        page.locator('#locationHeading').focus();page.keyboard.press('Escape')
        expect(page.locator('#location')).to_be_hidden()
        page.locator('.footer-location-link').click()
        expect(page.locator('#location')).to_be_visible()
        assert len(map_requests)==1,map_requests
        print('PASS: map hidden until footer click, exact-coordinate directions, hide/reopen, Escape and one-time map load')
        expect(page.locator('.footer-social-link')).to_have_count(3)
        for index,url in enumerate(SOCIAL_LINKS):
            link=page.locator('.footer-social-link').nth(index)
            expect(link).to_have_attribute('href',url)
            expect(link).to_have_css('border-top-left-radius','999px')
            assert link.bounding_box()['height']>=44
            with page.expect_popup() as popup:link.click()
            expect(popup.value).to_have_url(url)
            popup.value.close()
        expect(page.locator('.footer-social-link').last).to_contain_text('Official Facebook Page')
        print('PASS: Instagram, existing Facebook, and new official Facebook page open in new tabs')
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
        fallback=browser.new_context(java_script_enabled=False)
        fallback.route('**/*',route_handler)
        plain=fallback.new_page();plain.goto(base+'/index.html')
        expect(plain.locator('#location')).to_be_hidden()
        with plain.expect_popup() as popup:plain.locator('.footer-location-link').click()
        expect(popup.value).to_have_url(BROWSER_MAP)
        fallback.close()
        print('PASS: without JavaScript, footer map link opens directions directly')
        browser.close()
    server.shutdown()

if __name__=='__main__':run()
