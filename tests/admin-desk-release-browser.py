"""Isolated preview checks: header, all-due reminders, receipt months and attendance."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import importlib.util,tempfile
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('builder',ROOT/'prepare-admin-release.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
temporary=tempfile.TemporaryDirectory();built=m.build(Path(temporary.name)/'release')
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(built/'public')));Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce');errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  context=page.context
  setup=(ROOT/'previews/admin-premium/demo.js').read_text().split('  const notify =')[0]+'})();'+(ROOT/'previews/admin-premium/next/fixtures.js').read_text()+";window.open=url=>{window.__lastOpened=url;return {opener:null};};"
  context.add_init_script(setup)
  def route(r):
   if r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):r.fulfill(content_type='application/javascript',body=(ROOT/'previews/admin-premium/sdk.js').read_text(),headers={'Access-Control-Allow-Origin':'*'})
   elif r.request.url.startswith(url+'/photo-storage'):r.fulfill(content_type='application/javascript',body=(ROOT/'previews/admin-premium/photos.js').read_text())
   elif r.request.url.startswith(url+'/'):r.continue_()
   else:r.abort()
  context.route('**/*',route)
  page.goto(url+'/admin.html');expect(page.locator('#adminLoginButton')).to_be_enabled();page.locator('#adminEmail').fill('admin@example.test');page.locator('#adminPassword').fill('test-only');page.locator('#adminLoginButton').click();expect(page.locator('#adminDashboard')).to_be_visible();expect(page.locator('.application-card')).to_have_count(8);expect(page.locator('.next-ticker-track')).to_be_visible()

  expect(page.locator('.next-brief')).to_have_count(1)
  page.evaluate("""async version=>{const {adminWorkspace}=await import('/admin-app.js?v='+version);const {initDesk}=await import('/admin-desk.js?v=duplicate-start-test');initDesk(adminWorkspace);}""",m.VERSION)
  expect(page.locator('.next-brief')).to_have_count(1)

  cases=page.evaluate('''async()=>{const {reminder}=await import('/admin-reminder-model.js?v=20261103-desk-1');const make=(extra={})=>({id:'test',data:{status:'Approved',admissionNumber:'090',fullName:'Example Student',phone:'9000000000',admissionDate:'2026-08-01',monthlyFees:{},...extra}});return {unpaid:reminder(make(),'2026-11-02'),partial:reminder(make({monthlyFees:{'2026-09-01':400,'2026-10-01':999}}),'2026-11-02'),newStudent:reminder(make({admissionDate:'2026-11-01'}),'2026-11-02'),cancelled:reminder(make({enrolmentStatus:'Cancelled'}),'2026-11-02'),invalid:reminder(make({monthlyFees:{'2026-09-01':'bad'}}),'2026-11-02'),single:reminder(make({admissionDate:'2026-10-01'}),'2026-11-02')};}''')
  assert cases['unpaid']['total']==299700 and len(cases['unpaid']['rows'])==3
  assert [r['label'] for r in cases['unpaid']['rows']]==['August 2026','September 2026','October 2026']
  assert cases['partial']['total']==159800
  assert cases['single']['total']==99900 and cases['single']['rows'][0]['label']=='October 2026'
  for key in ['newStudent','cancelled','invalid']:assert not cases[key]['canShare'],key
  assert page.locator('.next-ticker-track').evaluate('el=>getComputedStyle(el).animationName')=='none'
  page.emulate_media(reduced_motion='no-preference');assert page.locator('.next-ticker-track').evaluate('el=>getComputedStyle(el).animationName')=='next-marquee';page.emulate_media(reduced_motion='reduce')
  expect(page.locator('[data-act=student-whatsapp]')).to_have_count(8)
  for selector in ['[data-application-id=demo-1] [data-act=student-whatsapp]','[data-application-id=demo-6] [data-act=student-whatsapp]']:
   link=page.locator(selector);assert link.get_attribute('href').startswith('https://wa.me/91');assert 'text=' in link.get_attribute('href')
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
  page.locator('#nextReminder [data-action=whatsapp]').click();expect(page.locator('#nextReminderStatus')).to_contain_text('WhatsApp opened')
  assert page.evaluate("__lastOpened.startsWith('https://wa.me/919000000000?text=')")
  assert page.evaluate("new URL(__lastOpened).searchParams.get('text')===document.querySelector('#nextReminder pre').textContent")
  page.locator('#nextReminder [data-action=close]').click()
  page.locator('[data-reminder="demo-2"]').click();expect(page.locator('#nextReminder pre')).to_contain_text('₹2,597');expect(page.locator('#nextReminder pre')).to_contain_text('₹599');page.locator('#nextReminder [data-action=close]').click()
  page.locator('#nextState').select_option('paid');expect(page.locator('#nextMonthRows')).to_contain_text('Sara Khan');expect(page.locator('#nextMonthRows')).not_to_contain_text('Ayaan Mir')
  page.locator('#nextMonthRows [data-receipt]').first.click();expect(page.locator('dialog[open]')).to_contain_text('Payment receipt')
  page.keyboard.press('Escape')
  page.locator('#nextBasis').select_option('received');page.locator('#nextCurrent').click();expect(page.locator('#nextMonthExplanation')).to_contain_text('Payments dated in');expect(page.locator('#nextMonthRows [data-student=demo-1]')).to_have_count(2)
  assert page.evaluate('__adminPreview.records')==initial;assert page.evaluate('__adminPreview.writes.length')==0
  page.locator('.nav [data-section=attendance]').click();expect(page.locator('#nextAttendanceHelp')).to_be_visible()
  # Fixed-date model checks reproduce the reported November 2 range without allowing future days.
  result=page.evaluate('''async()=>{const {attendanceValue}=await import('/admin-attendance-model.js?v=20261103-desk-1');let error;try{attendanceValue('2026-11',{days:18,totalDays:24,note:''},'2026-11-02')}catch(e){error=e.message}return {error,valid:attendanceValue('2026-10',{days:18,totalDays:24,note:''},'2026-11-02')};}''')
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
  page.locator('.nav [data-section=reports]').click();expect(page.locator('#monthlyReport')).to_be_visible();expect(page.locator('#reportAnalysis')).to_contain_text('not a historical month-end snapshot');expect(page.locator('#updatesStats')).to_be_visible()
  page.locator('.nav [data-section=overview]').click();page.locator('[data-admission-month]').first.click();expect(page.locator('#admissionMonthDialog')).to_be_visible();page.keyboard.press('Escape')
  assert not errors,errors
  page.locator('.nav [data-section=statements]').click();out=ROOT/'tests/artifacts/admin-desk-release';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/'monthly.png'))
  browser.close();print('PASS: compact header/search, monthly receipt review, all-due and partial reminder PNG, attendance month help/save/notice, three widths, follow-up PNG, required cancellation reason, failed-delete notice suppression and successful demo deletion; no live requests.')
finally:server.shutdown();temporary.cleanup()
