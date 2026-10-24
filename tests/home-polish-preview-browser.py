"""Read-only homepage refinement: current content, isolated local interactions."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
import importlib.util,json,re
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('clean_preview',ROOT/'preview-clean-home.py');preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
OUT=ROOT/'tests/artifacts/home-polish'
def run():
    OUT.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(preview.PreviewHandler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
    courses=json.loads((ROOT/'public/visitor/courses.json').read_text())
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1050},reduced_motion='reduce',accept_downloads=True)
            errors,external,writes,failed,requests=[],[],[],[],[]
            def route(r):
                requests.append(r.request.url)
                if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
                elif r.request.url.startswith(base+'/'):r.continue_()
                else:external.append(r.request.url);r.abort()
            context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:failed.append((r.status,r.url)) if r.status>=400 else None)
            page.goto(base+preview.PREVIEW);expect(page.locator('body')).to_have_class(re.compile('home-polish'));expect(page.locator('.polish-preview-note')).to_be_visible();expect(page.locator('.course-card')).to_have_count(7);expect(page.locator('#faqList details')).to_have_count(9)
            assert page.locator('.course-card h3').all_text_contents()==[c['title'] for c in courses]
            assert page.locator('#toolsGrid .tool').count()==4 and page.locator('#benefitsGrid .benefit').count()==4
            assert '₹999/month' in page.locator('.hero-tuition').inner_text();assert page.locator('#paymentModal').count()==0
            page.locator('[data-filter=accounting]').click();expect(page.locator('.course-card')).to_have_count(2);page.locator('[data-filter=all]').click();page.locator('#courseSearch').fill('nothingmatches');expect(page.locator('#emptyCourses')).to_be_visible();page.locator('[data-action=reset-filters]').click();expect(page.locator('.course-card')).to_have_count(7)
            page.locator('.course-card [data-action=save]').first.click();expect(page.locator('#savedCount')).to_have_text('1');assert page.evaluate('Object.keys(localStorage)')==['rehaan-clean-preview-saved-v1']
            for i in [0,1]:page.locator(f'[data-compare="{i}"]').check()
            page.locator('#compareOpen').click();expect(page.locator('.comparison-table')).to_be_visible();page.locator('#dialogClose').click();page.locator('#compareClear').click()
            page.locator('.course-card [data-action=course]').first.click();expect(page.locator('#dialogTitle')).to_have_text(courses[0]['title']);page.locator('[data-detail-tab=syllabus]').click();expect(page.locator('#course-panel-syllabus')).to_be_visible();page.locator('#dialogClose').click()
            with page.expect_download() as event:page.locator('.course-card [data-action=pdf]').first.click()
            assert Path(event.value.path()).read_bytes().startswith(b'%PDF-1.4')
            page.locator('.hero-actions [data-action=enquiry]').click();expect(page.locator('#enquiryContact option')).to_have_count(2);page.locator('#enquiryContact').select_option('1');assert '/919797205429' in page.locator('#openWhatsApp').get_attribute('href');page.locator('#openWhatsApp').click();expect(page.locator('#toast')).to_contain_text('Contact/link preview');assert len(context.pages)==1;page.locator('#dialogClose').click()
            page.locator('.studio-bottom [data-action=finder]').click();expect(page.locator('.finder-choice')).not_to_have_count(0);page.locator('#dialogClose').click()
            print('PASS: current seven courses, fees, details, comparison, brochure, isolated saved choices, finder and both enquiry contacts retained; external contact navigation disconnected',flush=True)
            page.locator('[data-faq-topic=fees]').click();expect(page.locator('#faqList details:not([hidden])')).to_have_count(2);page.locator('[data-faq-topic=all]').click();page.locator('#polishFAQSearch').fill('notarealquestion');expect(page.locator('#polishFAQEmpty')).to_be_visible();page.locator('#polishFAQSearch').fill('');expect(page.locator('#faqList details:not([hidden])')).to_have_count(9)
            page.locator('#faqList summary').nth(0).focus();page.keyboard.press('Enter');expect(page.locator('#faqList details').nth(0)).to_have_attribute('open','');page.locator('#faqList summary').nth(1).click();expect(page.locator('#faqList details[open]')).to_have_count(1)
            for width in [320,390,768,1024,1440]:
                page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                if width<=950:
                    page.locator('#menuButton').click();expect(page.locator('#mainNav')).to_be_visible();page.locator('#mainNav a[href="#courses"]').click();expect(page.locator('#mainNav')).to_be_hidden()
                for section in ['#courses','#experience','#tools','#faq','#contact']:
                    page.locator(section).scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,section)
                if width in [390,1440]:
                    page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/f'hero-{width}.png'))
                if width==390:expect(page.locator('.whatsapp-contacts')).to_be_hidden();expect(page.locator('.mobile-actions')).to_be_visible()
            page.locator('#brandMenuButton').click();page.locator('#brandAdminLogin').click();expect(page.locator('#toast')).to_contain_text('admin dashboard stays unchanged')
            page.locator('.footer-location-link').click();expect(page.locator('#location')).to_be_visible();expect(page.locator('#location iframe')).to_have_attribute('src',preview.PREVIEW+'map.html');page.locator('#locationClose').click()
            page.locator('#courses').screenshot(path=str(OUT/'courses.png'));page.locator('#faq').screenshot(path=str(OUT/'faq.png'))
            print('PASS: searchable/topic FAQs, keyboard accordion, five widths, mobile navigation/contact spacing, local map and admin-link separation',flush=True)
            page.locator('.course-card [data-action=apply][data-id="4"]').click();expect(page.locator('#coursePreference')).to_have_value(courses[4]['title'])
            data={'fullName':'Local Preview Learner','parentName':'Sample Parent','phone':'9999999991','guardianPhone':'9999999992','email':'preview@example.test','dob':'2005-03-12','address':'Local fictional address'}
            for key,value in data.items():page.locator('#'+key).fill(value)
            page.locator('#gender').select_option('prefer_not_to_say');page.locator('#qualification').select_option('Graduate');page.locator('#formNext').click();expect(page.locator('#formStepLabel')).to_have_text('STEP 02 / 05');page.locator('#batch').select_option('Evening');page.locator('#formNext').click();page.locator('[data-action=sample-photo]').click();expect(page.locator('#photoStatus')).to_contain_text('Nothing was uploaded');page.locator('#formNext').click();expect(page.locator('#applicationReview')).to_contain_text('Local Preview Learner');page.locator('#formNext').click();page.locator('#agreement').check();page.locator('#formNext').click();expect(page.locator('#dialogContent')).to_contain_text('No application was submitted');expect(page.locator('#dialogContent')).to_contain_text('No money was charged');page.locator('[data-action=clear-application]').click();expect(page.locator('#fullName')).to_have_value('')
            assert page.evaluate('sessionStorage.length')==0
            assert not errors and not external and not writes and not failed,(errors,external,writes,failed)
            assert not any(any(word in url for word in ['firebase','razorpay','photo-storage','/public/script.js']) for url in requests)
            print('PASS: all five application steps and local crop complete without uploads, payments, records, emails or messages; no failed resources, JavaScript errors, external requests or network writes',flush=True)
            browser.close()
    finally:server.shutdown()
if __name__=='__main__':run()
