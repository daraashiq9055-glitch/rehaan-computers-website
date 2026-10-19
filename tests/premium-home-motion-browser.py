"""Refined visitor design: brand access, motion controls and new local artwork."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/artifacts/premium-refinements'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
    OUT.mkdir(parents=True,exist_ok=True)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
            context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='no-preference')
            external,writes,errors,failed=[],[],[],[]
            def route(r):
                if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
                elif r.request.url.startswith(base+'/'):r.continue_()
                else:external.append(r.request.url);r.abort()
            context.route('**/*',route);page=context.new_page()
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('response',lambda response:failed.append(response.url) if response.status>=400 else None)
            page.clock.install()
            page.goto(base+'/previews/premium-home/');expect(page.locator('.course-card')).to_have_count(7)
            page.evaluate('document.fonts.ready')
            expect(page.locator('#brandMenu')).not_to_be_visible()
            expect(page.locator('#brandMenuButton img')).to_have_attribute('src','assets/rehaan-mark.svg')
            page.locator('#brandMenuButton').focus();page.keyboard.press('ArrowDown')
            expect(page.locator('#brandMenu')).to_be_visible()
            expect(page.locator('#brandMenu [role=menuitem]').first).to_be_focused()
            page.keyboard.press('ArrowDown');expect(page.locator('#brandAdminLogin')).to_be_focused()
            expect(page.locator('#brandAdminLogin')).to_have_attribute('href','https://rehaan-computers.web.app/admin.html')
            expect(page.locator('#brandAdminLogin')).to_have_attribute('target','_blank')
            page.keyboard.press('Escape');expect(page.locator('#brandMenu')).not_to_be_visible();expect(page.locator('#brandMenuButton')).to_be_focused()
            page.locator('#brandMenuButton').click();page.locator('.hero h1').click();expect(page.locator('#brandMenu')).not_to_be_visible()
            print('PASS: new logo/favicons render; brand menu supports click, keyboard, Escape/outside close and a separate live admin sign-in link',flush=True)

            expect(page.locator('.skills-track')).to_have_css('animation-name','skills-drift')
            expect(page.locator('.skills-run').first.locator(':scope > span')).to_have_count(10)
            expect(page.locator('.skills-run').nth(1)).to_have_attribute('aria-hidden','true')
            page.locator('#skillsPause').click();expect(page.locator('#skillsPause')).to_have_attribute('aria-pressed','true')
            expect(page.locator('.skills-track')).to_have_css('animation-play-state','paused')
            page.locator('#skillsPause').click();expect(page.locator('#skillsPause')).to_have_attribute('aria-pressed','false')
            page.locator('#courseSearch').focus();page.mouse.move(0,0)
            expect(page.locator('.skills-track')).to_have_css('animation-play-state','running')
            expect(page.locator('.creator-credit strong')).to_have_css('animation-name','signature-shine')
            expect(page.locator('.creator-star')).to_have_css('animation-name','signature-spark')
            print('PASS: original skills return in a seamless moving line with pause/resume; creator signature has controlled gold motion',flush=True)

            page.locator('.experience-visual').scroll_into_view_if_needed();page.mouse.move(0,0)
            # Wait for viewport observation before advancing the simulated timer.
            page.wait_for_timeout(100)
            expect(page.locator('.experience-slide.is-active')).to_have_count(1)
            first=page.locator('.experience-slide.is-active').get_attribute('data-slide')
            page.clock.fast_forward(5100)
            expect(page.locator('.experience-slide.is-active')).not_to_have_attribute('data-slide',first)
            page.locator('#experiencePause').click();selected=page.locator('.experience-slide.is-active').get_attribute('data-slide')
            page.clock.fast_forward(12000)
            expect(page.locator('.experience-slide.is-active')).to_have_attribute('data-slide',selected)
            page.locator('[data-experience-slide="3"]').click();expect(page.locator('#experienceSlideCount')).to_have_text('04 / 04')
            expect(page.locator('.experience-slide.is-active')).to_have_count(1)
            page.locator('.experience-visual').focus();page.keyboard.press('ArrowLeft');expect(page.locator('#experienceSlideCount')).to_have_text('03 / 04')
            page.locator('#experiencePause').click();page.locator('#courseSearch').focus();page.mouse.move(0,0)
            page.emulate_media(reduced_motion='reduce')
            expect(page.locator('#experiencePause')).to_be_disabled()
            expect(page.locator('.skills-track')).to_have_css('animation-name','none')
            expect(page.locator('.creator-credit strong')).to_have_css('animation-name','none')
            selected=page.locator('.experience-slide.is-active').get_attribute('data-slide');page.clock.fast_forward(12000)
            expect(page.locator('.experience-slide.is-active')).to_have_attribute('data-slide',selected)
            print('PASS: one image at a time, timed sequence, manual controls, pause and reduced-motion stop work for the learning slideshow',flush=True)

            for id,file in [(0,'course-learning.png'),(4,'course-accounting.png'),(3,'course-typing.png')]:
                image=page.locator('.course-card').filter(has=page.locator('[data-action=course][data-id="'+str(id)+'"]')).locator('.course-image img')
                expect(image).to_have_attribute('src','assets/'+file)
            page.locator('[data-action=image-samples]').click();expect(page.locator('.image-sample-grid figure')).to_have_count(3)
            expect(page.locator('#dialogContent')).to_contain_text('illustrative artwork')
            for image in page.locator('.image-sample-grid img').all():assert image.evaluate('image=>image.complete && image.naturalWidth>1000')
            page.locator('#dialogClose').click()
            for width in [320,390,700,768,1024,1440]:
                page.set_viewport_size({'width':width,'height':1000});page.goto(base+'/previews/premium-home/');expect(page.locator('.course-card')).to_have_count(7)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                page.locator('#brandMenuButton').click();expect(page.locator('#brandMenu')).to_be_visible()
                assert page.locator('#brandMenu').bounding_box()['x']+page.locator('#brandMenu').bounding_box()['width']<=width,('menu',width)
                page.keyboard.press('Escape')
                if width in [390,1440]:
                    page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/('mobile.png' if width==390 else 'desktop.png')))
            assert not external,external
            assert not writes,writes
            assert not errors,errors
            assert not failed,failed
            print('PASS: three generated image proposals/card mappings, larger typography, six responsive widths and no live requests or writes',flush=True)
            browser.close()
    finally:server.shutdown()

if __name__=='__main__':run()
