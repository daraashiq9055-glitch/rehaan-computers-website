"""Check the familiar-homepage preview with no live data or payment services."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests/artifacts/current-home'

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    OUT.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
            page = browser.new_page(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
            errors, unexpected, writes, failed, maps = [], [], [], [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('response', lambda response: failed.append(response.url) if response.status >= 400 else None)
            def route(r):
                if r.request.method not in ['GET','HEAD']:
                    writes.append(r.request.url);r.abort()
                elif r.request.url.startswith(base + '/'):
                    r.continue_()
                elif r.request.url.startswith('https://www.google.com/maps?'):
                    maps.append(r.request.url);r.fulfill(content_type='text/html', body='Local map placeholder. No map service contacted.')
                else:
                    unexpected.append(r.request.url);r.abort()
            page.route('**/*', route)
            page.goto(base + '/previews/current-home/')
            expect(page.locator('.course-card')).to_have_count(7)
            expect(page.locator('h1')).to_have_text('Master Real Computer Skills For a Better Future')
            for selector in ['#about','#process','#admission','#tools','#schedule','#faq','.creator-top-badge','#creatorCredit']:
                expect(page.locator(selector)).to_have_count(1)
            assert 'hero-library.jpg' in page.locator('.hero-photo').get_attribute('style')
            assert 'rgba(214, 173, 85' in page.locator('.hero-aura-one').evaluate('e=>getComputedStyle(e).backgroundColor')
            page.evaluate('document.fonts.ready')
            page.screenshot(path=str(OUT / 'desktop.png'))
            print('PASS: the existing heading/background/sections/creator credit remain, with all seven courses and self-hosted fonts', flush=True)

            for name,count in [('basics',3),('accounting',2),('typing',1),('all',7)]:
                page.locator('[data-filter='+name+']').click()
                expect(page.locator('.course-card')).to_have_count(count)
                expect(page.locator('[data-filter='+name+']')).to_have_attribute('aria-selected','true')
                expect(page.locator('#courseGrid')).to_have_attribute('aria-labelledby','category-'+name)
            page.locator('[data-filter=all]').focus();page.keyboard.press('ArrowRight')
            expect(page.locator('[data-filter=basics]')).to_be_focused()
            expect(page.locator('.course-card')).to_have_count(3)
            page.keyboard.press('End');expect(page.locator('.course-card')).to_have_count(1)
            page.keyboard.press('Home');expect(page.locator('.course-card')).to_have_count(7)
            page.locator('#currentCourseSearch').fill('GST')
            expect(page.locator('.course-card')).to_have_count(3)
            page.locator('[data-filter=accounting]').click();expect(page.locator('.course-card')).to_have_count(1)
            page.locator('#currentCourseSearch').fill('no match 123');expect(page.locator('#noCourseResults')).to_be_visible()
            page.locator('#currentCourseSearch').fill('');page.locator('[data-filter=all]').click()
            print('PASS: gold category tabs, combined search, empty results and keyboard navigation work without losing courses', flush=True)

            page.locator('[data-course="4"]').click()
            expect(page.locator('#currentCourseDialog')).to_be_visible()
            expect(page.locator('#currentDetailTitle')).to_contain_text('Tally Prime')
            expect(page.locator('#detailPanel-overview')).to_be_visible()
            page.locator('[data-detail=overview]').focus();page.keyboard.press('ArrowRight')
            expect(page.locator('#detailPanel-syllabus')).to_be_visible()
            expect(page.locator('#detailPanel-syllabus details')).to_have_count(7)
            expect(page.locator('#detailPanel-syllabus')).to_contain_text('GSTR-1')
            page.keyboard.press('ArrowRight');expect(page.locator('#detailPanel-fees')).to_be_visible()
            expect(page.locator('#detailPanel-fees')).to_contain_text('₹100')
            expect(page.locator('#detailPanel-fees')).to_contain_text('Separate from tuition')
            expect(page.locator('#detailPanel-fees .current-batches span')).to_have_count(3)
            page.screenshot(path=str(OUT / 'course-fees.png'))
            page.locator('#currentNext').click();expect(page.locator('#currentDetailTitle')).to_contain_text('Crash')
            page.locator('#currentPrevious').click();expect(page.locator('#currentDetailTitle')).to_contain_text('Tally')
            page.locator('#currentApply').click();expect(page.locator('#currentCourseDialog')).not_to_be_visible()
            expect(page.locator('#coursePreference')).to_have_value('Tally Prime with GST — Detailed Course')
            expect(page.locator('#applicationSubmit')).to_be_disabled()
            expect(page.locator('#studentPhoto')).to_be_disabled()
            expect(page.locator('#fullName')).to_be_disabled()
            page.locator('#applicationForm').evaluate('form=>form.requestSubmit()')
            expect(page.locator('#previewStatus')).to_contain_text('disabled')
            print('PASS: Overview/Syllabus/Fees tabs, full Tally syllabus, next/previous and application selection work; form/uploads/payment stay disabled', flush=True)

            page.locator('.footer-location-link').click();expect(page.locator('#location')).to_be_visible()
            expect(page.locator('.location-primary')).to_have_attribute('href', 'https://www.google.com/maps/dir/?api=1&destination=34.026895%2C74.643088&travelmode=driving&dir_action=navigate')
            page.locator('#locationClose').click();expect(page.locator('#location')).to_be_hidden()
            assert len(maps) == 1
            expect(page.locator('.footer-social-link')).to_have_count(3)
            page.locator('.nav-admin').click();expect(page.locator('#previewStatus')).to_contain_text('admin dashboard is unchanged')
            for width in [320,390,700,768,1440]:
                page.set_viewport_size({'width':width,'height':1000})
                page.goto(base + '/previews/current-home/')
                expect(page.locator('.course-card')).to_have_count(7)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
                if width <= 700:
                    assert page.locator('#home').bounding_box()['height'] < 850, width
                    page.locator('#mobileMenuBtn').click();expect(page.locator('#navMenu')).to_be_visible()
                    page.locator('#navMenu a[href="#courses"]').click();expect(page.locator('#navMenu')).not_to_be_visible()
                    expect(page.locator('#mobileMenuBtn')).to_have_attribute('aria-expanded','false')
                page.locator('[data-filter=typing]').click();page.locator('[data-course="3"]').click()
                expect(page.locator('#currentPrevious')).to_be_disabled();expect(page.locator('#currentNext')).to_be_disabled()
                page.locator('[data-detail=fees]').click()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), ('dialog',width)
                page.keyboard.press('Escape');expect(page.locator('#currentCourseDialog')).not_to_be_visible()
                page.locator('[data-filter=all]').click()
                if width == 390:
                    page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT / 'mobile.png'))
                    page.locator('.current-course-toolbar').scroll_into_view_if_needed();page.screenshot(path=str(OUT / 'mobile-course-tabs.png'))
            assert not errors, errors
            assert not unexpected, unexpected
            assert not writes, writes
            assert not failed, failed
            assert page.evaluate('localStorage.length===0 && sessionStorage.length===0')
            print('PASS: original map/social links, five screen widths, shorter mobile hero, menus, Escape and contained dialogs; no live service requests or record writes', flush=True)
            browser.close()
    finally:
        server.shutdown()

if __name__ == '__main__': run()
