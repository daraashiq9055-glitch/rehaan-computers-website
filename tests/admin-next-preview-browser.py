"""Isolated preview checks: header, all-due reminders, receipt months and attendance."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
import importlib.util
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('next_preview',ROOT/'preview-admin-next.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.Handler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce');errors=[];page.on('pageerror',lambda err:errors.append(str(err)));page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url+'/') else r.abort());page.goto(url+m.base.PREVIEW);expect(page.locator('#adminDashboard')).to_be_visible();expect(page.locator('.application-card')).to_have_count(8)
  cases=page.evaluate('''async()=>{const {reminder}=await import('/previews/admin-premium/next/model.js');const make=(extra={})=>({id:'test',data:{status:'Approved',admissionNumber:'090',fullName:'Example Student',phone:'9000000000',admissionDate:'2026-08-01',monthlyFees:{},...extra}});return {unpaid:reminder(make(),'2026-11-02'),partial:reminder(make({monthlyFees:{'2026-09-01':400,'2026-10-01':999}}),'2026-11-02'),newStudent:reminder(make({admissionDate:'2026-11-01'}),'2026-11-02'),cancelled:reminder(make({enrolmentStatus:'Cancelled'}),'2026-11-02'),invalid:reminder(make({monthlyFees:{'2026-09-01':'bad'}}),'2026-11-02'),single:reminder(make({admissionDate:'2026-10-01'}),'2026-11-02')};}''')
  assert cases['unpaid']['total']==299700 and len(cases['unpaid']['rows'])==3
  assert [r['label'] for r in cases['unpaid']['rows']]==['August 2026','September 2026','October 2026']
  assert cases['partial']['total']==159800
  assert cases['single']['total']==99900 and cases['single']['rows'][0]['label']=='October 2026'
  for key in ['newStudent','cancelled','invalid']:assert not cases[key]['canShare'],key
  assert page.locator('.next-ticker-track').evaluate('el=>getComputedStyle(el).animationName')=='none'
  page.emulate_media(reduced_motion='no-preference');assert page.locator('.next-ticker-track').evaluate('el=>getComputedStyle(el).animationName')=='next-marquee';page.emulate_media(reduced_motion='reduce')
  initial=page.evaluate('structuredClone(__adminPreview.records)');expect(page.locator('#workspaceProfile')).not_to_be_visible();assert page.locator('.topbar').bounding_box()['height']<80
  page.locator('#workspaceFind').click();expect(page.locator('#finderQuery')).to_be_visible();page.keyboard.press('Escape')
  page.locator('.nav [data-section=statements]').click();expect(page.locator('#nextMonthReview')).to_be_visible()
  for width in [1440,390,320]:
   page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  page.set_viewport_size({'width':1440,'height':1000})
  page.locator('[data-reminder="demo-0"]').click();expect(page.locator('#nextReminder pre')).to_contain_text('₹2,997');assert page.locator('#nextReminder pre').inner_text().count('• *')==3
  page.locator('#nextReminder [data-action=image]').click();expect(page.locator('#nextReminderImage img')).to_be_visible(timeout=15000)
  with page.expect_download() as download:page.locator('#nextReminder [data-action=download]').click()
  path=download.value.path();assert Path(path).read_bytes().startswith(b'\x89PNG');assert Path(path).stat().st_size>10000
  page.locator('#nextReminder [data-action=whatsapp]').click();expect(page.locator('#nextReminderStatus')).to_contain_text('must be attached separately')
  page.locator('#nextReminder [data-action=close]').click()
  page.locator('[data-reminder="demo-2"]').click();expect(page.locator('#nextReminder pre')).to_contain_text('₹2,597');expect(page.locator('#nextReminder pre')).to_contain_text('₹599');page.locator('#nextReminder [data-action=close]').click()
  page.locator('#nextState').select_option('paid');expect(page.locator('#nextMonthRows')).to_contain_text('Sara Khan');expect(page.locator('#nextMonthRows')).not_to_contain_text('Ayaan Mir')
  page.locator('#nextMonthRows [data-receipt]').first.click();expect(page.locator('dialog[open]')).to_contain_text('Payment receipt')
  page.keyboard.press('Escape')
  page.locator('#nextBasis').select_option('received');page.locator('#nextCurrent').click();expect(page.locator('#nextMonthExplanation')).to_contain_text('Payments dated in');expect(page.locator('#nextMonthRows [data-student=demo-1]')).to_have_count(2)
  assert page.evaluate('__adminPreview.records')==initial;assert page.evaluate('__adminPreview.writes.length')==0
  page.locator('.nav [data-section=attendance]').click();expect(page.locator('#nextAttendanceHelp')).to_be_visible()
  # Fixed-date model checks reproduce the reported November 2 range without allowing future days.
  result=page.evaluate('''async()=>{const {attendanceValue}=await import('/public/admin-attendance-model.js?v=20261102-settings-1');let error;try{attendanceValue('2026-11',{days:18,totalDays:24,note:''},'2026-11-02')}catch(e){error=e.message}return {error,valid:attendanceValue('2026-10',{days:18,totalDays:24,note:''},'2026-11-02')};}''')
  assert 'Previous month' in result['error'];assert 'November 2026' in result['error'];assert result['valid']['days']==18
  page.locator('#nextAttendanceHelp [data-month=previous]').click();page.locator('#attendanceForm [name=days]').fill('18');page.locator('#attendanceForm [name=totalDays]').fill('24');page.locator('#attendanceSuggest').click();page.locator('#attendanceForm [type=submit]').click();expect(page.locator('#attendanceStatus')).to_contain_text('Attendance saved')
  page.locator('#attendanceShare').click();expect(page.locator('#attendanceSharePreview')).to_contain_text('75%');expect(page.locator('#attendanceSharePreview')).to_contain_text('Note:')
  after=page.evaluate('structuredClone(__adminPreview.records)')
  for key,old in initial.items():
   for field,value in old.items():assert after[key][field]==value,(key,field)
  page.locator('#attendanceFollowup').click();expect(page.locator('#followupImageTools')).to_be_visible()
  page.locator('[data-followup-image=preview]').click();expect(page.locator('.followup-image-stage img')).to_be_visible(timeout=15000)
  with page.expect_download() as notice_download:page.locator('[data-followup-image=download]').click()
  assert Path(notice_download.value.path()).read_bytes().startswith(b'\x89PNG')
  page.keyboard.press('Escape')
  page.locator('.nav [data-section=students]').click();page.locator('[data-tab=all]').click()
  page.locator('.delete-application-btn[data-application-id="demo-0"]').click()
  page.locator('#deleteConfirmation').fill('001');page.locator('#deleteConfirm').click()
  assert page.evaluate("Boolean(__adminPreview.records['demo-0'])")
  page.locator('#cancellationReason').fill('Student requested cancellation.');page.evaluate('__adminPreview.failWrite=true');page.locator('#deleteConfirm').click()
  expect(page.locator('#deleteMessage')).to_contain_text('Record kept');expect(page.locator('#nextCancellation')).to_have_count(0);assert page.evaluate("Boolean(__adminPreview.records['demo-0'])")
  page.evaluate('__adminPreview.failWrite=false');page.locator('#deleteConfirm').click()
  expect(page.locator('#nextCancellation')).to_be_visible();expect(page.locator('#nextCancellation pre')).to_contain_text('Student requested cancellation.');expect(page.locator('#nextCancellation')).to_contain_text('9000000000')
  assert not page.evaluate("Boolean(__adminPreview.records['demo-0'])")
  page.locator('#nextCancellation [data-notice-action=close]').click()
  remaining=page.evaluate('structuredClone(__adminPreview.records)')
  for key in initial:
   if key!='demo-0':assert remaining[key]==after[key],key
  assert not errors,errors
  page.locator('.nav [data-section=statements]').click();out=ROOT/'tests/artifacts/admin-next';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/'monthly.png'))
  browser.close();print('PASS: compact header/search, monthly receipt review, all-due and partial reminder PNG, attendance month help/save/notice, three widths, follow-up PNG, required cancellation reason, failed-delete notice suppression and successful demo deletion; no live requests.')
finally:server.shutdown()
