"""Exercise the complete visitor preview without live services or payments."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from urllib.parse import urlparse,parse_qs
import json,re
import fitz
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/artifacts/premium-home'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    OUT.mkdir(parents=True,exist_ok=True)
    courses=json.loads((ROOT/'previews/premium-home/courses.json').read_text())
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
            context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce',accept_downloads=True)
            context.grant_permissions(['clipboard-read','clipboard-write'],origin=base)
            errors,external,writes,failed,whatsapp=[],[],[],[],[]
            def route(r):
                if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
                elif r.request.url.startswith(base+'/'):r.continue_()
                elif r.request.url.startswith('https://wa.me/'):whatsapp.append(r.request.url);r.fulfill(content_type='text/html',body='WhatsApp draft intercepted. No message sent.')
                else:external.append(r.request.url);r.abort()
            context.route('**/*',route)
            page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('response',lambda response:failed.append((response.status,response.url)) if response.status>=400 else None)
            page.goto(base+'/previews/premium-home/');expect(page.locator('.course-card')).to_have_count(7)
            expect(page.locator('#coursePreference option')).to_have_count(8)
            page.evaluate('document.fonts.ready')
            assert page.evaluate('document.fonts.check("500 20px Inter") && document.fonts.check("500 20px Playfair")')
            assert page.locator('#faqList details').count()==7
            assert page.locator('#toolsGrid .tool').count()==4
            assert page.locator('#benefitsGrid .benefit').count()==4
            page.screenshot(path=str(OUT/'desktop.png'))
            expect(page.locator('#workspaceDemo')).to_have_count(0)
            expect(page.locator('[data-demo]')).to_have_count(0)
            expect(page.locator('#journeyTitle')).to_have_text('A starting point that fits you.')
            page.locator('[data-journey="1"]').click();expect(page.locator('#journeyTitle')).to_have_text('Real practice. Personal guidance.')
            page.locator('[data-journey="2"]').click();expect(page.locator('#journeyTitle')).to_have_text('Skills for your everyday future.')
            page.locator('.journey-cta').click();expect(page.locator('#dialogContent')).to_contain_text('What would you like to achieve?')
            page.locator('#dialogClose').click()
            print('PASS: complete content and photo-led learning journey load; all stages and course-finder action work',flush=True)

            page.locator('[data-filter=accounting]').click();expect(page.locator('.course-card')).to_have_count(2)
            page.locator('[data-filter=typing]').click();expect(page.locator('.course-card')).to_have_count(1)
            page.locator('[data-filter=all]').click();page.locator('#durationFilter').select_option('short');expect(page.locator('.course-card')).to_have_count(3)
            page.locator('#durationFilter').select_option('all');page.locator('#courseSearch').fill('GST');expect(page.locator('.course-card')).to_have_count(3)
            page.locator('#courseSearch').fill('nothingmatches123');expect(page.locator('#emptyCourses')).to_be_visible()
            page.locator('[data-action=reset-filters]').click();expect(page.locator('.course-card')).to_have_count(7)
            page.locator('.course-card [data-action=save][data-id="4"]').click();expect(page.locator('#savedCount')).to_have_text('1')
            page.locator('.saved-link').click();expect(page.locator('.course-card')).to_have_count(1)
            page.reload();expect(page.locator('#savedCount')).to_have_text('1');expect(page.locator('.course-card')).to_have_count(7)
            assert page.evaluate('Object.keys(localStorage)')==['rehaan-visitor-saved-courses-v1']
            assert page.evaluate('JSON.parse(localStorage.getItem("rehaan-visitor-saved-courses-v1"))')==['tally-prime-with-gst-detailed-course']
            for id in [0,1,4]:page.locator(f'[data-compare="{id}"]').check()
            page.locator('[data-compare="3"]').click();expect(page.locator('[data-compare="3"]')).not_to_be_checked()
            page.locator('#compareOpen').click();expect(page.locator('.comparison-table thead th')).to_have_count(4)
            expect(page.locator('.comparison-table')).to_contain_text('Tally Prime')
            page.locator('#dialogClose').click();page.locator('#compareClear').click()
            print('PASS: categories/duration/search/empty states, saved-course persistence and comparison of up to three courses work',flush=True)

            page.locator('.course-card [data-action=course][data-id="4"]').click()
            assert '#course=tally-prime-with-gst-detailed-course' in page.url
            expect(page.locator('#dialogContent')).to_contain_text(courses[4]['subtitle'])
            page.locator('[data-detail-tab=overview]').focus();page.keyboard.press('ArrowRight')
            expect(page.locator('#course-panel-syllabus')).to_be_visible();expect(page.locator('#course-panel-syllabus details')).to_have_count(7)
            expect(page.locator('#course-panel-syllabus')).to_contain_text('GSTR-1')
            page.keyboard.press('ArrowRight');expect(page.locator('#course-panel-fees')).to_be_visible()
            expect(page.locator('#course-panel-fees')).to_contain_text('tuition')
            page.locator('[data-action=copy-course]').click();copied=page.evaluate('navigator.clipboard.readText()');assert copied==page.url
            with page.expect_download() as downloading:page.locator('#dialogContent [data-action=pdf]').click()
            document=fitz.open(downloading.value.path());text='\n'.join(p.get_text() for p in document)
            assert len(document)>=2
            for module in courses[4]['syllabus']:assert module['module'].replace('—','-') in text,module['module']
            for item in ['Rehaan','REHAAN','100','9149551258','9797205429','Dar Yasir','Aadhaar']:assert item in text,item
            document[0].get_pixmap(matrix=fitz.Matrix(1.1,1.1)).save(OUT/'brochure.png')
            page.locator('#dialogClose').click();page.goto(copied);expect(page.locator('#dialogTitle')).to_contain_text('Tally Prime')
            page.keyboard.press('Escape');expect(page.locator('#featureDialog')).not_to_be_visible()
            assert '#course=' not in page.url
            print('PASS: shareable course routes, accessible detail tabs and complete valid multi-page brochure PDFs work',flush=True)

            for goal,experience,time,match in [('basics','new','short','Three Month'),('office','some','year','One Year'),('accounting','new','flexible','Tally Prime'),('typing','some','short','Typing Diploma')]:
                page.locator('.hero-copy [data-action=finder]').click()
                page.locator('[data-finder-value='+goal+']').click();page.locator('[data-finder-value='+experience+']').click();page.locator('[data-finder-value='+time+']').click()
                expect(page.locator('.recommendation')).to_contain_text(match);page.locator('#dialogClose').click()
            page.locator('.course-card [data-action=course][data-id="4"]').click();page.locator('#dialogContent [data-action=enquiry]').click()
            expect(page.locator('#enquiryMessage')).to_have_value(re.compile('Tally Prime'))
            for index,number in [('0','919149551258'),('1','919797205429')]:
                page.locator('#enquiryContact').select_option(index);url=page.locator('#openWhatsApp').get_attribute('href');assert urlparse(url).path=='/'+number
                assert 'Tally Prime' in parse_qs(urlparse(url).query)['text'][0]
            page.locator('#enquiryMessage').fill('Hello! Please share the current course fees.');url=page.locator('#openWhatsApp').get_attribute('href');assert parse_qs(urlparse(url).query)['text'][0]=='Hello! Please share the current course fees.'
            with page.expect_popup() as popup:page.locator('#openWhatsApp').click()
            popup.value.wait_for_load_state();popup.value.close();assert len(whatsapp)==1
            page.locator('#dialogClose').click()
            print('PASS: all finder goals and both confirmed WhatsApp contacts use correct editable course-specific drafts; nothing sent',flush=True)

            page.locator('.course-card [data-action=apply][data-id="4"]').click()
            expect(page.locator('#coursePreference')).to_have_value(courses[4]['title'])
            page.locator('#formNext').click();expect(page.locator('#formStepLabel')).to_have_text('STEP 01 / 05')
            data={'fullName':'Sample Preview Learner','parentName':'Example Parent','phone':'9999999991','guardianPhone':'9999999992','aadhaarLast4':'1234','email':'preview@example.test','dob':'2005-03-12','address':'Example address for local design testing'}
            for key,value in data.items():page.locator('#'+key).fill(value)
            page.locator('#gender').select_option('prefer_not_to_say');page.locator('#qualification').select_option('Graduate')
            page.locator('#formNext').click();expect(page.locator('#formStepLabel')).to_have_text('STEP 02 / 05')
            page.locator('#batch').select_option('Evening');page.locator('#source').select_option('Facebook');page.locator('#message').fill('This is an example preview message.')
            page.locator('#formNext').click();expect(page.locator('#formStepLabel')).to_have_text('STEP 03 / 05')
            page.locator('#formNext').click();expect(page.locator('#formStatus')).to_contain_text('Choose a photo')
            page.locator('[data-action=sample-photo]').click();expect(page.locator('#photoStatus')).to_contain_text('Nothing was uploaded')
            expect(page.locator('#photoPreview')).to_have_attribute('src',re.compile('^blob:'))
            page.locator('#formNext').click();expect(page.locator('#formStepLabel')).to_have_text('STEP 04 / 05')
            for value in [data['fullName'],data['phone'],data['email'],data['address'],'Prefer not to say','Graduate',courses[4]['title'],'Evening','Facebook','example preview message']:expect(page.locator('#applicationReview')).to_contain_text(value)
            page.locator('[data-review-edit="0"]').click();page.locator('#fullName').fill(' ')
            page.locator('[data-step="3"]').click();expect(page.locator('#formStepLabel')).to_have_text('STEP 01 / 05');expect(page.locator('#formStatus')).to_contain_text('highlighted field')
            page.locator('#fullName').fill('Edited Preview Learner')
            page.locator('[data-step="3"]').click();expect(page.locator('#applicationReview')).to_contain_text('Edited Preview Learner')
            page.locator('#formNext').click();expect(page.locator('#formStepLabel')).to_have_text('STEP 05 / 05')
            page.locator('#formNext').click();expect(page.locator('#formStatus')).to_contain_text('highlighted field')
            page.locator('#agreement').check();page.locator('#formNext').click()
            expect(page.locator('#dialogContent')).to_contain_text('No application was submitted')
            expect(page.locator('#dialogContent')).to_contain_text('No money was charged')
            page.locator('[data-action=clear-application]').click();expect(page.locator('#fullName')).to_have_value('')
            expect(page.locator('#photoPreview')).not_to_have_attribute('src',re.compile('^blob:'))
            assert page.evaluate('Object.keys(localStorage)')==['rehaan-visitor-saved-courses-v1'];assert page.evaluate('sessionStorage.length')==0
            print('PASS: all existing form details, validation, photo crop, edit/review/confirmation and clear controls work entirely in memory; no submission/payment',flush=True)

            page.clock.install()
            page.locator('#typingInput').fill('Practice builds confidence.')
            expect(page.locator('#typingAccuracy')).to_have_text('100%')
            page.clock.fast_forward(30001)
            expect(page.locator('#typingTimer')).to_have_text('00:00');expect(page.locator('#typingInput')).to_be_disabled()
            expect(page.locator('#typingStatus')).to_contain_text('not saved or sent')
            page.locator('[data-action=typing-reset]').click();expect(page.locator('#typingTimer')).to_have_text('00:30');expect(page.locator('#typingInput')).to_have_value('')
            page.locator('[data-action=gallery]').first.click();expect(page.locator('.gallery-lightbox img')).to_be_visible();page.locator('#dialogClose').click()
            expect(page.locator('#contact a[href="tel:+919149551258"]')).to_have_count(1)
            expect(page.locator('#contact a[href="tel:+919797205429"]')).to_have_count(1)
            assert '34.026895%2C74.643088' in page.locator('#contact a[href^="https://www.google.com/maps"]').get_attribute('href')
            assert page.locator('a[href="https://www.facebook.com/share/14tvvFj3od1/"]').count()>=1
            print('PASS: real timed typing results/reset, gallery, contact phones, location coordinates and original social links work',flush=True)

            for width in [320,390,700,768,1024,1440]:
                page.set_viewport_size({'width':width,'height':1000});page.goto(base+'/previews/premium-home/');expect(page.locator('.course-card')).to_have_count(7)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                if width<=950:
                    page.locator('#menuButton').click();expect(page.locator('#mainNav')).to_be_visible();page.locator('#mainNav a[href="#courses"]').click();expect(page.locator('#mainNav')).not_to_be_visible()
                for id in [0,1,4]:page.locator('[data-compare="'+str(id)+'"]').check()
                page.locator('#compareOpen').click();expect(page.locator('.comparison-table')).to_be_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('comparison',width)
                page.keyboard.press('Escape');page.locator('#compareClear').click()
                if width==390:
                    page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/'mobile.png'));page.locator('#courses').scroll_into_view_if_needed();page.screenshot(path=str(OUT/'mobile-courses.png'))
                if width==1440:
                    page.emulate_media(reduced_motion='no-preference');page.locator('.hero-journey').scroll_into_view_if_needed();expect(page.locator('.journey-running .journey-progress > span')).to_have_css('animation-name','journey-time')
                    page.emulate_media(reduced_motion='reduce');expect(page.locator('.journey-progress > span')).to_have_css('animation-name','none')
            assert not errors,errors
            assert not external,external
            assert not writes,writes
            assert not failed,failed
            print('PASS: six viewport widths, contained three-course tables, mobile navigation, reduced motion and no uncaught errors/live requests/writes',flush=True)
            browser.close()
    finally:server.shutdown()

if __name__=='__main__':run()
