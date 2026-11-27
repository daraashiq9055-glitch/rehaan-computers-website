"""Isolated visual fixtures; never contacts production services."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import importlib.util, json
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'build/rc-learn-review';OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('live',ROOT/'tests/student-live-browser.py');live=importlib.util.module_from_spec(spec);spec.loader.exec_module(live)
stub=live.STUB.replace("journey:{course,topics:[{title:'Introduction',done:true}]}","journey:{course,currentProgram:'MS Word',topics:[{title:'Computer Basics',done:true},{title:'Notepad',done:true},{title:'WordPad',done:true},{title:'MS Word',done:false},{title:'Excel',done:false},{title:'PowerPoint',done:false}]}")
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'public')));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in [390,320,360,430,1366]:
   page=browser.new_page(viewport={'width':width,'height':844},reduced_motion='reduce');errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   page.route('**/student-portal-auth.js*',lambda route:route.fulfill(content_type='text/javascript',body=stub))
   page.goto(f'http://127.0.0.1:{server.server_port}/student.html');page.wait_for_timeout(300)
   if width in [390,1366]:page.screenshot(path=str(OUT/f'public-{width}.png'),full_page=True)
   page.locator('#studentId').fill('alpha');page.locator('#studentPassword').fill('StudentPass123');page.locator('.login-submit').click();page.locator('#followCentre').click();expect(page.locator('#demoInterior')).to_be_visible()
   page.evaluate("document.querySelector('.portal-brand small').textContent='VISUAL TEST FIXTURE · NOT LIVE DATA'")
   for tab in ['home','journey','updates','account']:
    page.locator(f'[data-demo-tab={tab}]').click();page.wait_for_timeout(150);page.evaluate('scrollTo({top:0,behavior:"instant"})')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,tab)
    if width in [390,1366]:page.screenshot(path=str(OUT/f'{tab}-{width}.png'),full_page=True)
    for position in [0,.5,1]:
     page.evaluate('(p)=>scrollTo({top:p*(document.documentElement.scrollHeight-innerHeight),behavior:"instant"})',position)
     box=page.locator('.demo-nav').bounding_box();assert abs(box['y']+box['height']-844)<1,(width,tab,box)
    assert page.locator('#demoContent').bounding_box()['y']+page.locator('#demoContent').bounding_box()['height']<=box['y']+1
   page.locator('[data-demo-tab=home]').click();page.locator('[aria-label="View my attendance"]').click();page.wait_for_timeout(150)
   details=page.locator('details').filter(has=page.locator('summary',has_text='Attendance & timetable'));expect(details).to_have_attribute('open','');expect(details).to_contain_text('18 of 20 classes');assert 'Bilal' not in page.locator('#demoContent').inner_text();assert page.locator('#attendanceForm').count()==0
   if width==390:page.screenshot(path=str(OUT/'attendance-390.png'),full_page=True)
   assert not errors,errors;page.close()
  page=browser.new_page(viewport={'width':390,'height':844},record_video_dir=str(OUT/'scroll'),reduced_motion='reduce')
  page.route('**/student-quiz-service.js*',lambda route:route.fulfill(content_type='text/javascript',body="export const quizServiceConfig={enabled:true,reviewOnly:true};export async function publicLeaderboard(){return {published:true,students:Array.from({length:10},(_,i)=>({name:'Test Student '+(i+1),score:70-i,quizDays:7}))};}export async function quizRequest(){return {quizReady:false};}"))
  page.goto(f'http://127.0.0.1:{server.server_port}/student.html');expect(page.locator('.demo-ranks li')).to_have_count(7)
  page.evaluate("document.querySelector('.league-section .eyebrow').textContent='VISUAL TEST FIXTURE — 10 STUDENTS'")
  page.locator('.league-section').scroll_into_view_if_needed();page.screenshot(path=str(OUT/'top10-390.png'),full_page=True)
  for rank in page.locator('.demo-ranks li').all():rank.scroll_into_view_if_needed();page.wait_for_timeout(200)
  expect(page.locator('.demo-ranks li').last).to_contain_text('Test Student 10');page.close();browser.close()
 print('PASS: 5 widths; 20 tab layouts; 60 fixed-nav scroll checks; personal attendance shortcut; no cross-student content; Top 10 published fixture and scroll recording. Screenshots in build/rc-learn-review.')
finally:server.shutdown()
