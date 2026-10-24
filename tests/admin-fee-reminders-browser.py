"""All-day oldest-unpaid reminder checks against generated release; no live services."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from datetime import datetime,timezone
from urllib.parse import urlparse,parse_qs
import importlib.util,json,tempfile
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
baseline=module('baseline',ROOT/'tests/admin-browser.py');builder=module('builder',ROOT/'prepare-admin-release.py')
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    original={**baseline.FIXTURES['enrolled'],'photo':'','admissionDate':'2026-07-10','monthlyFees':{'2026-08-10':500},'feeReminders':{'2026-08-10':'2026-08-11T06:00:00Z'}}
    paid={**original,'fullName':'Paid fixture','admissionNumber':'002','admissionDate':'2026-10-01','monthlyFees':{'2026-11-01':999},'feeReminders':{}}
    with tempfile.TemporaryDirectory() as directory:
        output=builder.build(Path(directory)/'candidate');server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(output/'public')));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='reduce');errors,external,writes=[],[],[];confirm=[False]
                def route(r):
                    if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
                    elif r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):r.fulfill(content_type='application/javascript',body=baseline.MOCK,headers={'Access-Control-Allow-Origin':'*'})
                    elif r.request.url.startswith(base+'/'):r.continue_()
                    else:external.append(r.request.url);r.abort()
                context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept() if confirm[0] else d.dismiss())
                page.clock.set_fixed_time(datetime(2026,10,24,6,0,tzinfo=timezone.utc))
                page.add_init_script('window.__fixture={records:'+json.dumps({'enrolled':original,'paid':paid})+',writes:[],listeners:[],authorized:true,auth:{currentUser:null,authStateReady:async()=>{}}};window.__opened=[];window.open=url=>{__opened.push(url);return {opener:null}};')
                page.goto(base+'/admin.html');expect(page.locator('#adminLoginButton')).to_be_enabled();page.locator('#adminEmail').fill('admin@example.test');page.locator('#adminPassword').fill('valid-password');page.locator('#adminLoginButton').click();expect(page.locator('#adminDashboard')).to_be_visible()
                for day in [1,15,16,24,25,31]:
                    page.clock.set_fixed_time(datetime(2026,10,day,6,0,tzinfo=timezone.utc));page.locator('[data-section=fees]').click();expect(page.locator('.rc-reminder[data-fee-wa=enrolled]')).to_be_visible();expect(page.locator('.rc-reminder[data-fee-wa=paid]')).to_have_count(0)
                assert page.evaluate('__fixture.writes.length')==0
                page.clock.set_fixed_time(datetime(2026,10,24,6,0,tzinfo=timezone.utc))
                page.locator('[data-operations=today]').click();expect(page.locator('[data-today-action=soon] strong')).to_have_text('1');page.locator('[data-section=students]').click();expect(page.locator('[data-application-id=enrolled] [data-act=monthly-reminder]')).to_be_visible();page.locator('[data-section=fees]').click();page.locator('#rcFeeFilter').select_option('reminders');expect(page.locator('.rc-fee-row')).to_have_count(1)
                before=page.evaluate('structuredClone(__fixture.records)');page.locator('.rc-reminder[data-fee-wa=enrolled]').click();assert page.evaluate('__fixture.records')==before and page.evaluate('__fixture.writes.length')==0
                def draft():return parse_qs(urlparse(page.evaluate('__opened.at(-1)')).query)['text'][0]
                message=draft();assert 'August 2026' in message and 'Rs. 499' in message and 'OVERDUE' in message and 'September 2026' not in message
                confirm[0]=True;page.locator('.rc-reminder[data-fee-wa=enrolled]').click();expect(page.locator('.rc-reminder[data-fee-wa=enrolled]')).to_have_text('🔔 Remind again');page.wait_for_function('__fixture.writes.length===1')
                saved=page.evaluate('__fixture.records.enrolled')
                for key,value in original.items():
                    if key!='feeReminders':assert saved[key]==value,key
                assert '2026-08-10' in saved['feeReminders'] and '2026-09-10' not in saved['feeReminders']
                patch=page.evaluate('__fixture.writes[0].data');assert set(patch)=={'feeReminders.2026-08-10','updatedAt','updatedBy'}
                confirm[0]=False;page.locator('.rc-reminder[data-fee-wa=enrolled]').click();assert 'August 2026' in draft() and 'Rs. 499' in draft()
                print('PASS: all calendar dates, Today/student/fee views, reminder filter, paid period exclusion, repeat reminders and month-specific overdue draft; only confirmed reminder metadata changes',flush=True)
                confirm[0]=True;page.locator('[data-fee-pay=enrolled]').click();page.locator('#rcPaymentAmount').fill('499');page.locator('#rcPaymentMethod').select_option('Cash');page.locator('#rcPaymentForm [type=submit]').click();expect(page.locator('#rcPaymentMessage')).to_contain_text('Payment saved.');page.locator('#rcTuitionModal .admin-modal-close').click()
                assert page.evaluate('__fixture.records.enrolled.monthlyFees["2026-08-10"]')==999
                confirm[0]=False;page.locator('.rc-reminder[data-fee-wa=enrolled]').click();assert 'September 2026' in draft() and 'Rs. 999' in draft() and 'August 2026' not in draft()
                assert page.evaluate('__fixture.records.enrolled.payment')==original['payment'];assert page.evaluate('__fixture.records.enrolled.photo')==original['photo']
                assert not errors and not external and not writes,(errors,external,writes)
                print('PASS: recording the remaining August balance advances the reminder to unpaid September; original payment/provider/photo data retained; no live charge, message or network write',flush=True)
                browser.close()
        finally:server.shutdown()
if __name__=='__main__':run()
