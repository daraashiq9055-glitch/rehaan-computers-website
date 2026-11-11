"""November 11 media fitting and five-slide guidance regression; mocked services only."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import importlib.util
from browser_visit_fixture import mock_visit_counter
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/artifacts/homepage-media';OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/admission-payment-browser.py');fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT/'public')));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1000});errors=[];failed=[];external=[]
  def route(r):
   if r.request.url.startswith(base+'/') and r.request.method in ['GET','HEAD']:r.continue_()
   elif r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):r.fulfill(content_type='application/javascript',body=fixture.MOCK,headers={'Access-Control-Allow-Origin':'*'})
   else:external.append(r.request.url);r.abort()
  context.route('**/*',route);mock_visit_counter(context);context.add_init_script('window.__fixture={records:{},writes:[],listeners:[],authorized:false,auth:{currentUser:null,authStateReady:async()=>{}}};')
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None);page.goto(base+'/');expect(page.locator('.course-card')).to_have_count(7)
  page.locator('.course-image img').evaluate_all('es=>es.forEach(e=>e.loading="eager")');page.wait_for_function('Array.from(document.querySelectorAll(".course-image img")).every(i=>i.complete&&i.naturalWidth>1000)')
  for width in [320,360,390,430,768,1440]:
   page.set_viewport_size({'width':width,'height':1000})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
   for image in page.locator('.course-image img').all():
    box=image.evaluate('e=>{const b=e.getBoundingClientRect(),p=e.closest(".course-image").getBoundingClientRect();return {w:b.width,h:b.height,pw:p.width,ph:p.height,ratio:e.naturalWidth/e.naturalHeight,fit:getComputedStyle(e).objectFit}}')
    assert abs(box['w']-box['pw'])<1 and abs(box['h']-box['ph'])<1,(width,box)
    assert abs(box['w']/box['h']-box['ratio'])<.005 and box['fit']=='cover',(width,box)
   if width in [390,1440]:
    page.locator('.course-card').first.scroll_into_view_if_needed();page.screenshot(path=str(OUT/f'courses-{width}.png'))
   page.locator('.experience-visual').scroll_into_view_if_needed()
   expect(page.locator('[data-experience-slide]')).to_have_count(5)
   for index in range(5):
    page.locator(f'[data-experience-slide="{index}"]').click()
    expect(page.locator('.experience-slide.is-active')).to_have_count(1)
    image=page.locator('.experience-slide.is-active');expect(image).to_have_attribute('data-slide',str(index))
    image.evaluate('e=>e.decode()');expect(page.locator('#experienceSlideCount')).to_have_text(f'{index+1:02} / 05')
    assert page.locator('#experienceSlideTitle').inner_text().strip() and 'undefined' not in page.locator('#experienceSlideTitle').inner_text()
   page.locator('[data-experience-slide="0"]').click()
   if width in [390,1440]:page.screenshot(path=str(OUT/f'guidance-{width}.png'))
   if width<=700:
    apply=page.locator('.mobile-actions a.apply-special');assert apply.is_visible()
    data=apply.evaluate('e=>{const b=e.getBoundingClientRect(),l=e.querySelector(".apply-label");return {x:b.left,r:b.right,color:getComputedStyle(l).color}}');assert data['x']>=0 and data['r']<=width and data['color']=='rgb(20, 37, 54)'
   print(f'PASS: {width}px covers fill frames without gutters/text cropping; all five guidance photos and controls work; original mobile Apply remains visible.',flush=True)
  page.locator('.experience-visual').focus();page.keyboard.press('ArrowRight');expect(page.locator('#experienceSlideCount')).to_have_text('02 / 05');page.keyboard.press('ArrowLeft');expect(page.locator('#experienceSlideCount')).to_have_text('01 / 05')
  page.locator('#experiencePause').click();expect(page.locator('#experiencePause')).to_have_attribute('aria-pressed','true');selected=page.locator('.experience-slide.is-active').get_attribute('data-slide');page.wait_for_timeout(5200);expect(page.locator('.experience-slide.is-active')).to_have_attribute('data-slide',selected)
  page.emulate_media(reduced_motion='reduce');expect(page.locator('#experiencePause')).to_be_disabled()
  expect(page.locator('#practice, #skillChallenge, #skillHeading, [href="#practice"]')).to_have_count(0)
  assert not errors and not external and not failed,(errors,external,failed);assert page.evaluate('__fixture.writes.length')==0
  print('PASS: keyboard controls, pause, reduced motion, complete challenge removal, no missing assets/page errors/external writes.',flush=True);browser.close()
finally:server.shutdown()
