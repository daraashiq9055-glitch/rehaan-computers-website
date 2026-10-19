"""Local-only visitor design checks. No production SDK or services are used."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests/artifacts/visitor-home'

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
            context = browser.new_context(viewport={'width':1440, 'height':1000}, reduced_motion='reduce')
            context.grant_permissions(['clipboard-read', 'clipboard-write'], origin=base)
            external, writes, errors, bad_responses = [], [], [], []
            def route(r):
                if not r.request.url.startswith(base + '/'):
                    external.append(r.request.url); r.abort()
                elif r.request.method not in ['GET', 'HEAD']:
                    writes.append(r.request.url); r.abort()
                else: r.continue_()
            context.route('**/*', route)
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('response', lambda response: bad_responses.append((response.status, response.url)) if response.status >= 400 else None)
            page.goto(base + '/previews/visitor-home/')
            expect(page.locator('.course-card')).to_have_count(7)
            page.evaluate('document.fonts.ready')
            assert page.evaluate('document.fonts.check("500 20px Inter") && document.fonts.check("500 20px Playfair")')
            page.screenshot(path=str(OUT / 'desktop.png'), full_page=True)
            page.screenshot(path=str(OUT / 'desktop-first-screen.png'))
            print('PASS: CMD preview path loads all seven existing courses, local assets and self-hosted fonts', flush=True)

            page.locator('[data-filter=accounting]').click()
            expect(page.locator('.course-card')).to_have_count(2)
            page.locator('[data-filter=typing]').click()
            expect(page.locator('.course-card')).to_have_count(1)
            page.locator('[data-filter=all]').click()
            page.locator('#courseSearch').fill('no such course 123')
            expect(page.locator('#emptyCourses')).to_be_visible()
            expect(page.locator('.course-card')).to_have_count(0)
            page.locator('#courseSearch').fill('GST')
            expect(page.locator('.course-card')).to_have_count(3)
            page.locator('#courseSearch').fill('')
            page.locator('[data-details="4"]').click()
            expect(page.locator('#dialogTitle')).to_contain_text('Tally Prime')
            expect(page.locator('#dialogContent')).to_contain_text('GSTR-1')
            page.keyboard.press('Escape')
            expect(page.locator('#previewDialog')).not_to_be_visible()
            print('PASS: course categories/search/empty states work, and the full existing Tally syllabus opens', flush=True)

            page.locator('[data-compare="0"]').check()
            expect(page.locator('#compareOpen')).to_be_disabled()
            page.locator('[data-compare="1"]').check()
            expect(page.locator('#compareOpen')).to_be_enabled()
            page.locator('[data-compare="2"]').click()
            expect(page.locator('[data-compare="2"]')).not_to_be_checked()
            expect(page.locator('#toast')).to_contain_text('two courses')
            page.locator('#compareOpen').click()
            expect(page.locator('.comparison-table')).to_contain_text('One Year Computer Diploma')
            expect(page.locator('.comparison-table')).to_contain_text('Six Month')
            page.locator('#dialogClose').click()
            page.locator('#compareClear').click()
            expect(page.locator('#compareTray')).not_to_be_visible()
            print('PASS: comparison preserves two choices, blocks a third and opens a full side-by-side comparison', flush=True)

            for goal, expected in [('starting','Three Month'), ('office','One Year'), ('accounts','Tally Prime'), ('typing','Typing Diploma')]:
                page.locator('.hero [data-finder]').click()
                page.locator('[data-goal=' + goal + ']').click()
                expect(page.locator('.recommendation')).to_contain_text(expected)
                page.locator('#dialogClose').click()
            page.locator('[data-details="3"]').click()
            page.locator('#dialogContent [data-apply]').click()
            expect(page.locator('#applyCourse')).to_have_value('3')
            page.locator('#previewApplication [name=name]').fill('Preview learner')
            page.locator('#previewApplication [name=batch]').select_option('Evening')
            page.locator('#previewApplication [type=submit]').click()
            expect(page.locator('#dialogContent')).to_contain_text('No payment was started')
            expect(page.locator('#dialogContent')).to_contain_text('Preview learner')
            page.locator('#dialogContent [data-enquiry]').click()
            expect(page.locator('#enquiryMessage')).to_have_value(__import__('re').compile('Typing Diploma'))
            page.locator('#copyEnquiry').click()
            expect(page.locator('#toast')).to_contain_text('Enquiry copied')
            assert 'Typing Diploma' in page.evaluate('navigator.clipboard.readText()')
            page.locator('#dialogClose').click()
            assert page.evaluate('localStorage.length') == 0
            assert page.evaluate('sessionStorage.length') == 0
            print('PASS: all four course-finder goals work; application stays local; WhatsApp copies an editable enquiry without sending', flush=True)

            page.locator('.faq-list details').nth(1).locator('summary').click()
            expect(page.locator('.faq-list details').nth(1)).to_have_attribute('open', '')
            directions = page.locator('#visit a').get_attribute('href')
            assert '34.026895%2C74.643088' in directions and 'dir_action=navigate' in directions
            assert page.locator('a[href="https://www.facebook.com/share/14tvvFj3od1/"]').count() == 1
            for width in [320, 390, 600, 768, 1440]:
                page.set_viewport_size({'width':width, 'height':1000})
                page.goto(base + '/previews/visitor-home/')
                expect(page.locator('.course-card')).to_have_count(7)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width,page.evaluate('[...document.querySelectorAll("body *")].filter(e=>e.getBoundingClientRect().right>innerWidth+1||e.getBoundingClientRect().left< -1).map(e=>({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right,left:e.getBoundingClientRect().left})).slice(0,20)'))
                if width <= 600:
                    expect(page.locator('.mobile-actions')).to_be_visible()
                    page.locator('#menuButton').click()
                    expect(page.locator('#menuButton')).to_have_attribute('aria-expanded', 'true')
                    page.locator('#navigation a[href="#courses"]').click()
                    expect(page.locator('#menuButton')).to_have_attribute('aria-expanded', 'false')
                page.locator('[data-compare="0"]').check()
                page.locator('[data-compare="1"]').check()
                page.locator('#compareOpen').click()
                expect(page.locator('.comparison-table')).to_be_visible()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), ('dialog', width)
                page.locator('#dialogClose').click()
                page.locator('#compareClear').click()
                if width == 390:
                    page.evaluate('scrollTo(0,0)')
                    page.screenshot(path=str(OUT / 'mobile.png'), full_page=True)
                    page.screenshot(path=str(OUT / 'mobile-first-screen.png'))
                if width == 1440:
                    page.emulate_media(reduced_motion='no-preference')
                    expect(page.locator('.practice-card')).to_have_css('animation-name', 'float')
                    page.emulate_media(reduced_motion='reduce')
                    expect(page.locator('.practice-card')).to_have_css('animation-name', 'none')
            assert not errors, errors
            assert not external, external
            assert not writes, writes
            assert not bad_responses, bad_responses
            print('PASS: FAQs/location/social links, five viewport widths, mobile menus, comparison dialogs and reduced motion; no external requests or writes', flush=True)
            browser.close()
    finally:
        server.shutdown()

if __name__ == '__main__': run()
