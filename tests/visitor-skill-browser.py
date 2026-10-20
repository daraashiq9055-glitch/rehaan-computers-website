"""Mobile-first skill discovery and decorative laptop object; no live services."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import importlib.util
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/artifacts/visitor-skills'
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/admission-payment-browser.py');fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    OUT.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'public')))
    Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            errors,external,writes=[],[],[]
            def route(r):
                if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
                elif r.request.url.startswith(base+'/'):r.continue_()
                elif r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):
                    r.fulfill(content_type='application/javascript',body=fixture.MOCK,headers={'Access-Control-Allow-Origin':'*'})
                else:external.append(r.request.url);r.abort()
            context=browser.new_context(reduced_motion='reduce');context.route('**/*',route);context.add_init_script('window.__fixture={records:{},writes:[],listeners:[],authorized:false,auth:{currentUser:null,authStateReady:async()=>{}}};')
            page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            for width in [320,390,768,1024,1512]:
                page.set_viewport_size({'width':width,'height':1000});page.goto(base+'/')
                expect(page.locator('#skillNext')).to_be_disabled();expect(page.locator('#typingInput')).to_have_count(0)
                assert page.locator('body').inner_text().count('30-second')==0
                page.locator('#skillChallenge').scroll_into_view_if_needed()
                for answer in [2,1,2]:
                    button=page.locator('[data-skill-answer="'+str(answer)+'"]');button.focus();page.keyboard.press('Enter');expect(page.locator('#skillNext')).to_be_enabled();expect(page.locator('.skill-options button:not(:disabled)')).to_have_count(0)
                    assert page.locator('#skillFeedback').inner_text()!='Tap an answer. No keyboard or timer needed.'
                    # Double activation must not advance or count a second answer.
                    button.evaluate("button=>button.dispatchEvent(new MouseEvent('click',{bubbles:true}))")
                    page.locator('#skillNext').click();expect(page.locator('#skillQuestion')).to_be_focused()
                expect(page.locator('.skill-score')).to_have_text('2 of 3 correct · 3 useful skills explored')
                expect(page.locator('.skill-review details')).to_have_count(3);page.locator('.skill-review summary').first.click();expect(page.locator('.skill-review details').first).to_contain_text('Ctrl + S')
                page.locator('#skillAgain').click();expect(page.locator('#skillQuestion')).to_contain_text('CV');expect(page.locator('#skillNext')).to_be_disabled()
                assert page.locator('#skillChallenge').evaluate('el=>getComputedStyle(el,"::before").animationName')=='none'
                assert page.locator('.learning-pages').evaluate('el=>getComputedStyle(el).animationName')=='none'
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                if width in [390,1512]:page.locator('#skillChallenge').screenshot(path=str(OUT/f'challenge-{width}.png'));page.locator('.studio-screen').screenshot(path=str(OUT/f'laptop-{width}.png'))
                assert page.evaluate('__fixture.writes.length')==0 and page.evaluate('localStorage.length')==0 and page.evaluate('sessionStorage.length')==0
            print('PASS: phone-friendly tap/keyboard challenge at five widths, explanations for wrong/correct answers, no double scoring, alternate questions, accessible focus/review and no stored answers or writes',flush=True)
            context.close()
            context=browser.new_context(viewport={'width':1440,'height':1000});context.route('**/*',route);context.add_init_script('window.__fixture={records:{},writes:[],listeners:[],authorized:false,auth:{currentUser:null,authStateReady:async()=>{}}};')
            page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/');page.locator('.hero-studio').scroll_into_view_if_needed();expect(page.locator('.hero-studio')).to_have_class(__import__('re').compile('studio-live'))
            expect(page.locator('.learning-pages')).to_have_css('animation-play-state','running')
            before=page.locator('.learning-pages').evaluate('el=>getComputedStyle(el).transform');page.wait_for_timeout(250);after=page.locator('.learning-pages').evaluate('el=>getComputedStyle(el).transform');assert before!=after
            page.locator('#studioMotion').click();expect(page.locator('.learning-pages')).to_have_css('animation-play-state','paused');page.locator('#studioMotion').click();expect(page.locator('.learning-pages')).to_have_css('animation-play-state','running')
            page.locator('#skillChallenge').scroll_into_view_if_needed();expect(page.locator('#skillChallenge')).to_have_class(__import__('re').compile('challenge-live'))
            page.locator('#contact').scroll_into_view_if_needed();expect(page.locator('#skillChallenge')).not_to_have_class(__import__('re').compile('challenge-live'))
            assert not errors and not external and not writes,(errors,external,writes)
            print('PASS: small laptop learning object animates with scene pause/resume; challenge animation pauses off-screen; reduced motion stops both; zero live requests or payments',flush=True)
            browser.close()
    finally:server.shutdown()

if __name__=='__main__':run()
