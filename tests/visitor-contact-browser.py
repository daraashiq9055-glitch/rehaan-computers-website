"""Homepage contact/content regression. No live requests, calls or messages."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import importlib.util
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/admission-payment-browser.py')
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
            for js in [False,True]:
                context=browser.new_context(java_script_enabled=js,reduced_motion='reduce')
                errors,external,writes=[],[],[]
                def route(r):
                    if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
                    elif r.request.url.startswith(base+'/'):r.continue_()
                    elif r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):
                        r.fulfill(content_type='application/javascript',body=fixture.MOCK,headers={'Access-Control-Allow-Origin':'*'})
                    else:external.append(r.request.url);r.abort()
                context.route('**/*',route)
                if js:context.add_init_script('window.__fixture={records:{},writes:[],listeners:[],authorized:false,auth:{currentUser:null,authStateReady:async()=>{}}};')
                page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(base+'/')
                if js:expect(page.locator('.course-card')).to_have_count(7)
                for width in [320,390,768,1024,1512]:
                    page.set_viewport_size({'width':width,'height':900})
                    page.locator('.header-call').scroll_into_view_if_needed()
                    expect(page.locator('.header-call')).to_be_visible()
                    expect(page.locator('.top-contact')).to_have_count(2)
                    for contact in page.locator('.top-contact').all():expect(contact).to_be_visible()
                    expect(page.locator('.floating-whatsapp')).to_be_visible()
                    assert page.locator('.floating-whatsapp').evaluate('el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),(js,width,'contact action obscured')
                    assert page.locator('.header-call').get_attribute('href')=='tel:+919149551258'
                    assert page.locator('.institute-phones a').all_text_contents()==['+91 9149551258','+91 9797205429']
                    assert page.locator('a[href*="facebook.com"]').count()==1
                    assert '14tvvFj3od1' in page.locator('a[href*="facebook.com"]').get_attribute('href')
                    assert 'dar_yas_ir' in page.locator('a[href*="instagram.com"]').get_attribute('href')
                    expect(page.locator('.hero-tuition strong')).to_have_text('₹999/month')
                    expect(page.locator('.monthly-tuition')).to_contain_text('₹999/month')
                    page.locator('.floating-whatsapp').click()
                    for number in ['919149551258','919797205429']:
                        expect(page.locator('.whatsapp-options a[href^="https://wa.me/'+number+'?"]')).to_be_visible()
                    page.locator('.floating-whatsapp').click()
                    body=page.locator('body').inner_text()
                    assert body.count('Dar Yasir')==1 and body.count('₹999/month')==2
                    assert 'learning images already' not in body and 'Created by' not in body and 'Managed by' not in body
                    for selector in ['.header-call','.top-contacts','.floating-whatsapp','.header-inner','.creator-credit']:
                        box=page.locator(selector).bounding_box()
                        assert box and box['x']>=-1 and box['x']+box['width']<=width+1,(js,width,selector,box)
                if js:
                    page.evaluate('document.querySelector("#paymentModal").hidden=false')
                    expect(page.locator('.floating-whatsapp')).to_be_hidden()
                    page.evaluate('document.querySelector("#paymentModal").hidden=true')
                    expect(page.locator('.saved-link')).to_be_visible()
                    page.locator('[data-action="enquiry"]').first.click()
                    for index,number in [('0','919149551258'),('1','919797205429')]:
                        page.locator('#enquiryContact').select_option(index)
                        assert page.locator('#openWhatsApp').get_attribute('href').startswith('https://wa.me/'+number+'?text=')
                    page.locator('#dialogClose').click()
                    page.locator('#brandMenuButton').click();expect(page.locator('#brandAdminLogin')).to_have_attribute('href','admin.html')
                    assert page.evaluate('__fixture.writes.length')==0
                assert not errors and not external and not writes,(errors,external,writes)
                print(f'PASS: JavaScript {js}; five widths, visible direct contacts, correct official social links, one footer credit, exactly two tuition labels, unchanged admission fee and zero writes/messages',flush=True)
                context.close()
            browser.close()
    finally:server.shutdown()

if __name__=='__main__':run()
