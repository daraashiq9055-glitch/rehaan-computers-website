"""Dedicated Fee Statements tab: read-only filtering, totals and full histories."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from datetime import datetime,timezone
import importlib.util,json,tempfile,csv,io
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/artifacts/fee-statement-directory'
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
baseline=module('baseline',ROOT/'tests/admin-browser.py');builder=module('builder',ROOT/'prepare-admin-release.py')
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    OUT.mkdir(parents=True,exist_ok=True)
    student={**baseline.FIXTURES['enrolled'],'photo':'','admissionDate':'2026-08-10','coursePreference':'Computer Diploma','batch':'Morning','monthlyFees':{'2026-09-10':500,'2026-10-10':999},'feeReceipts':{}}
    paid={**student,'fullName':'Paid Student','phone':'9000000002','admissionNumber':'002','admissionDate':'2026-09-10','coursePreference':'Tally Prime','batch':'Evening','monthlyFees':{'2026-10-10':999,'2026-11-10':999}}
    review={**student,'fullName':'Review Student','admissionNumber':'003','admissionDate':'','approvedAt':''}
    fixtures={'enrolled':student,'paid':paid,'review':review}
    with tempfile.TemporaryDirectory() as directory:
        output=builder.build(Path(directory)/'candidate');server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(output/'public')));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='reduce',accept_downloads=True);errors,external,writes=[],[],[]
                def route(r):
                    if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
                    elif r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):r.fulfill(content_type='application/javascript',body=baseline.MOCK,headers={'Access-Control-Allow-Origin':'*'})
                    elif r.request.url.startswith(base+'/'):r.continue_()
                    else:external.append(r.request.url);r.abort()
                context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.clock.set_fixed_time(datetime(2026,10,24,6,0,tzinfo=timezone.utc));page.add_init_script('window.__fixture={records:'+json.dumps(fixtures)+',writes:[],listeners:[],authorized:true,auth:{currentUser:null,authStateReady:async()=>{}}};')
                page.goto(base+'/admin.html');expect(page.locator('#adminLoginButton')).to_be_enabled();page.locator('#adminEmail').fill('admin@example.test');page.locator('#adminPassword').fill('valid-password');page.locator('#adminLoginButton').click();expect(page.locator('#adminDashboard')).to_be_visible()
                page.locator('[data-section=statements]').click();hub=page.locator('#feeStatementsWorkspace');expect(hub).to_be_visible();expect(page.locator('#workspaceHeading')).to_have_text('Fee Statements');expect(page.locator('#registerPanel')).to_be_hidden();expect(page.locator('[data-section=statements]')).to_have_attribute('aria-current','page');expect(page.locator('.statement-student-card')).to_have_count(3)
                expect(page.locator('#statementHubTotals>div').nth(1)).to_contain_text('₹499');expect(page.locator('#statementHubTotals>div').nth(2)).to_contain_text('₹3,497');expect(page.locator('#statementHubTotals>div').nth(3).locator('strong')).to_have_text('1')
                before=page.evaluate('structuredClone(__fixture.records)')
                page.locator('#statementHubSearch').fill('9876543211');expect(page.locator('.statement-student-card')).to_have_count(2);page.locator('#statementHubReset').click();page.locator('#statementHubCourse').select_option('Tally Prime');expect(page.locator('.statement-student-card')).to_have_count(1);expect(page.locator('#statementHubTotals>div').nth(1)).to_contain_text('₹0');page.locator('#statementHubReset').click();page.locator('#statementHubBatch').select_option('Morning');expect(page.locator('.statement-student-card')).to_have_count(2);page.locator('#statementHubReset').click()
                page.locator('#statementHubPosition').select_option('partial');expect(page.locator('.statement-student-card')).to_have_count(1)
                with page.expect_download() as event:page.locator('#statementHubCSV').click()
                rows=list(csv.reader(io.StringIO(Path(event.value.path()).read_text(encoding='utf-8-sig'))));assert len(rows)==2 and rows[1][5]=='499'
                page.locator('#statementHubReset').click();page.locator('#statementHubSort').select_option('balance');expect(page.locator('.statement-student-card').first).to_have_attribute('data-statement-student','enrolled')
                page.locator('[data-statement-breakdown=enrolled] summary').click();expect(page.locator('[data-statement-breakdown=enrolled] tbody tr')).to_have_count(3);expect(page.locator('[data-statement-breakdown=enrolled]')).to_contain_text('August 2026');page.locator('[data-open-student-statement=enrolled]').click();expect(page.locator('#feeStatementDialog')).to_be_visible();expect(page.locator('#feeStatementDialog .statement-totals>div').first).to_contain_text('₹499');page.locator('[data-statement-action=close]').click();expect(hub).to_be_visible()
                page.locator('#statementHubPosition').select_option('review');expect(page.locator('.statement-student-card')).to_have_count(1);expect(page.locator('#statementHubTotals>div').nth(1)).to_contain_text('Review needed');page.locator('#statementHubReset').click();page.locator('#statementHubSearch').fill('nothingmatches');expect(page.locator('.statement-hub-empty')).to_be_visible();page.locator('#statementHubReset').click()
                assert page.evaluate('__fixture.records')==before and page.evaluate('__fixture.writes.length')==0
                # Read-only server refresh loads new fixtures; every filter/summary still uses all pages.
                page.evaluate("()=>{for(let i=0;i<20;i++)__fixture.records['more-'+i]={...structuredClone(__fixture.records.enrolled),fullName:'More Student '+i,admissionNumber:String(10+i).padStart(3,'0')};}")
                expected=page.evaluate('structuredClone(__fixture.records)');page.locator('#statementHubRefresh').click();expect(page.locator('#statementHubResult')).to_contain_text('of 23 matching');expect(page.locator('.statement-student-card')).to_have_count(15);page.locator('#statementHubNext').click();expect(page.locator('.statement-student-card')).to_have_count(8);expect(page.locator('#statementHubPage')).to_have_text('Page 2 of 2')
                with page.expect_download() as event:page.locator('#statementHubCSV').click()
                exported=list(csv.reader(io.StringIO(Path(event.value.path()).read_text(encoding='utf-8-sig'))));assert len(exported)==24;assert any(row[-1]=='Yes' for row in exported[1:])
                for width in [320,390,768,1440]:
                    page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                    if width in [390,1440]:page.locator('#feeStatementsWorkspace').scroll_into_view_if_needed();page.screenshot(path=str(OUT/f'tab-{width}.png'))
                page.locator('#adminLogoutBtn').evaluate('button=>button.click()');expect(page.locator('#adminDashboard')).to_be_hidden();expect(page.locator('#feeStatementsWorkspace')).to_have_count(0)
                assert page.evaluate('__fixture.records')==expected and page.evaluate('__fixture.writes.length')==0
                assert not errors and not external and not writes,(errors,external,writes)
                print('PASS: separate native Fee Statements tab, scoped accurate totals, review exclusion, search/course/batch/payment filters, sorting, complete inline history, full statement, refresh, 23-record pagination/CSV, four widths and logout; no student/payment/network writes',flush=True);browser.close()
        finally:server.shutdown()
if __name__=='__main__':run()
