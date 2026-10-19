"""Refined visitor design: brand access, top skills line and real course imagery."""
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

            page.locator('.hero-journey').scroll_into_view_if_needed();page.locator('.hero h1').click();page.mouse.move(0,0)
            expect(page.locator('.hero-journey')).to_have_class(__import__('re').compile('journey-running'))
            first=page.locator('#journeyCount').inner_text();page.clock.fast_forward(6600)
            expect(page.locator('#journeyCount')).not_to_have_text(first)
            page.locator('[data-journey="0"]').click();page.keyboard.press('ArrowRight');expect(page.locator('[data-journey="1"]')).to_be_focused()
            expect(page.locator('#journeyCount')).to_have_text('02 / 03')
            page.keyboard.press('End');expect(page.locator('#journeyCount')).to_have_text('03 / 03')
            page.keyboard.press('Home');expect(page.locator('#journeyCount')).to_have_text('01 / 03')
            page.locator('#journeyMotion').click();expect(page.locator('#journeyMotion')).to_have_attribute('aria-pressed','true')
            page.locator('.hero h1').click();first=page.locator('#journeyCount').inner_text();page.clock.fast_forward(13200)
            expect(page.locator('#journeyCount')).to_have_text(first)
            page.locator('#journeyMotion').click();page.locator('.hero h1').click();page.clock.fast_forward(6600)
            expect(page.locator('#journeyCount')).not_to_have_text(first)
            print('PASS: new photo-led journey advances automatically, supports keyboard/manual stage selection and pause/resume',flush=True)

            expect(page.locator('.skills-track')).to_have_css('animation-name','skills-drift')
            expect(page.locator('.skills-run').first.locator(':scope > span')).to_have_count(10)
            expect(page.locator('.skills-run').nth(1)).to_have_attribute('aria-hidden','true')
            expect(page.locator('#skillsPause')).to_have_count(0)
            assert page.evaluate("document.querySelector('.skills-line').compareDocumentPosition(document.querySelector('.site-header')) & Node.DOCUMENT_POSITION_FOLLOWING")
            page.mouse.move(0,0)
            expect(page.locator('.skills-track')).to_have_css('animation-play-state','running')
            expect(page.locator('.creator-credit strong')).to_have_css('animation-name','signature-shine')
            expect(page.locator('.creator-star')).to_have_css('animation-name','signature-spark')
            print('PASS: original skills run above the header without a pause button; creator signature has controlled gold motion',flush=True)

            page.locator('.experience-visual').scroll_into_view_if_needed();page.mouse.move(0,0)
            # Wait for viewport observation before advancing the simulated timer.
            page.wait_for_timeout(100)
            expect(page.locator('.experience-slide.is-active')).to_have_count(1)
            first=page.locator('.experience-slide.is-active').get_attribute('data-slide')
            page.clock.fast_forward(5100)
            expect(page.locator('.experience-slide.is-active')).not_to_have_attribute('data-slide',first)
            page.locator('#experiencePause').click();selected=page.locator('.experience-slide.is-active').get_attribute('data-slide')
            page.clock.fast_forward(10000)
            expect(page.locator('.experience-slide.is-active')).to_have_attribute('data-slide',selected)
            page.locator('[data-experience-slide="1"]').click();expect(page.locator('#experienceSlideCount')).to_have_text('02 / 02')
            expect(page.locator('.experience-slide.is-active')).to_have_count(1)
            page.locator('.experience-visual').focus();page.keyboard.press('ArrowLeft');expect(page.locator('#experienceSlideCount')).to_have_text('01 / 02')
            page.locator('#experiencePause').click()
            page.locator('.experience-visual').hover();page.locator('.experience-visual').focus()
            selected=page.locator('.experience-slide.is-active').get_attribute('data-slide');page.clock.fast_forward(5100)
            expect(page.locator('.experience-slide.is-active')).not_to_have_attribute('data-slide',selected)
            page.clock.fast_forward(5100)
            expect(page.locator('.experience-slide.is-active')).to_have_attribute('data-slide',selected)
            page.emulate_media(reduced_motion='reduce')
            expect(page.locator('#experiencePause')).to_be_disabled()
            expect(page.locator('#journeyMotion')).to_be_disabled()
            expect(page.locator('.journey-progress > span')).to_have_css('animation-name','none')
            expect(page.locator('.skills-track')).to_have_css('animation-name','none')
            expect(page.locator('.creator-credit strong')).to_have_css('animation-name','none')
            selected=page.locator('.experience-slide.is-active').get_attribute('data-slide');page.clock.fast_forward(12000)
            expect(page.locator('.experience-slide.is-active')).to_have_attribute('data-slide',selected)
            print('PASS: one image at a time, timed sequence, manual controls, pause and reduced-motion stop work for the learning slideshow',flush=True)

            expected=['hero-library.jpg','word-doc.jpg','excel-desk.jpg','typing-keys.jpg','tally-prime.jpg','excel-sheet.jpg','marg-erp.jpg']
            for id,file in enumerate(expected):
                image=page.locator('.course-card').filter(has=page.locator('[data-action=course][data-id="'+str(id)+'"]')).locator('.course-image img')
                image.scroll_into_view_if_needed()
                expect(image).to_have_attribute('src','../../public/assets/'+file)
                assert image.get_attribute('alt')
                page.wait_for_function('(src) => [...document.querySelectorAll(".course-image img")].find(i => i.getAttribute("src") === src)?.naturalWidth > 0',arg='../../public/assets/'+file)
            expect(page.locator('.course-art-preview')).to_have_count(0)
            expect(page.locator('[data-action=image-samples]')).to_have_count(0)
            expect(page.locator('.experience-slide')).to_have_count(2)
            assert 'word-doc' not in page.locator('.experience-slides').inner_html()
            for width in [320,390,700,768,1024,1440]:
                page.set_viewport_size({'width':width,'height':1000});page.goto(base+'/previews/premium-home/');expect(page.locator('.course-card')).to_have_count(7)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                stage_heights=[]
                for stage in range(3):
                    page.locator(f'[data-journey="{stage}"]').click()
                    box=page.locator('.journey-card').bounding_box()
                    stage_heights.append(box['height'])
                    assert box['x']>=0 and box['x']+box['width']<=width,(width,stage,box)
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,stage)
                assert max(stage_heights)-min(stage_heights)<1,(width,stage_heights)
                page.locator('[data-journey="0"]').click()
                page.locator('#brandMenuButton').click();expect(page.locator('#brandMenu')).to_be_visible()
                assert page.locator('#brandMenu').bounding_box()['x']+page.locator('#brandMenu').bounding_box()['width']<=width,('menu',width)
                page.keyboard.press('Escape')
                if width in [390,1440]:
                    page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/('mobile.png' if width==390 else 'desktop.png')))
                    page.locator('.hero-journey').screenshot(path=str(OUT/('journey-mobile.png' if width==390 else 'journey-desktop.png')))
                    page.locator('.footer-main').scroll_into_view_if_needed();page.screenshot(path=str(OUT/('footer-mobile.png' if width==390 else 'footer-desktop.png')))
                    page.locator('#courses').scroll_into_view_if_needed();page.screenshot(path=str(OUT/('courses-mobile.png' if width==390 else 'courses-desktop.png')))
                expect(page.locator('.footer-links')).to_have_count(3)
                expect(page.locator('.footer-social .social-logo')).to_have_count(4)
                for link in page.locator('.footer-links > a, .footer-links > button').all():
                    box=link.bounding_box()
                    assert box['height']>=48 and box['x']>=0 and box['x']+box['width']<=width,(width,box)
                    assert link.evaluate('el => parseFloat(getComputedStyle(el).borderTopLeftRadius)')>=box['height']/2,(width,link.inner_text())
            assert not external,external
            assert not writes,writes
            assert not errors,errors
            assert not failed,failed
            print('PASS: seven distinct real course-image mappings, larger typography, six responsive widths and no live requests or writes',flush=True)
            browser.close()
    finally:server.shutdown()

if __name__=='__main__':run()
