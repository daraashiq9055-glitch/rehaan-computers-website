"""Manual/automatic grading in the generated release. Intercepted services only."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import base64,importlib.util,json,tempfile
import fitz
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
baseline=module('baseline',ROOT/'tests/admin-browser.py');builder=module('builder',ROOT/'prepare-admin-release.py')
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    record=json.loads(json.dumps(baseline.FIXTURES['enrolled']));record['photo']='data:image/jpeg;base64,'+base64.b64encode((ROOT/'tests/fixtures/photo-check.jpg').read_bytes()).decode()
    record['markCard']={'title':'Grade check','date':'2026-10-20','subjects':[{'name':name,'max':50,'marks':marks} for name,marks in zip(['Practical','Theory','Office','Typing','Basics'],[49,40,32.5,25,17.5])]}
    with tempfile.TemporaryDirectory() as directory:
        output=builder.build(Path(directory)/'candidate');server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(output/'public')));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1512,'height':1100},accept_downloads=True,reduced_motion='reduce');errors,external,writes=[],[],[]
                def route(r):
                    if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
                    elif r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):r.fulfill(content_type='application/javascript',body=baseline.MOCK,headers={'Access-Control-Allow-Origin':'*'})
                    elif r.request.url.startswith(base+'/'):r.continue_()
                    else:external.append(r.request.url);r.abort()
                context.route('**/*',route)
                def open_page(records):
                    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
                    page.add_init_script('window.__fixture={records:'+json.dumps(records)+',writes:[],listeners:[],authorized:true,auth:{currentUser:null,authStateReady:async()=>{}}};window.print=()=>window.__printed=(window.__printed||0)+1;')
                    page.goto(base+'/admin.html');expect(page.locator('#adminLoginButton')).to_be_enabled();page.locator('#adminEmail').fill('admin@example.test');page.locator('#adminPassword').fill('valid-password');page.locator('#adminLoginButton').click();expect(page.locator('#adminDashboard')).to_be_visible();page.locator('[data-section=marks]').click();return page
                page=open_page({'enrolled':record});rows=page.locator('#rcMarkPreview tbody tr');assert [rows.nth(i).locator('td').last.inner_text() for i in range(5)]==['Excellent','Excellent','Very Good','Good','Pass']
                page.locator('[data-subject=grade]').first.select_option('B');page.locator('#rcOverallGrade').select_option('C');expect(page.locator('[data-new=downloadMarks]')).to_be_disabled();page.locator('#rcMarksForm [type=submit]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('Marks saved securely')
                expect(rows.first.locator('td').last).to_have_text('Very Good');expect(page.locator('.mark-result>div').nth(1).locator('strong')).to_have_text('C');expect(page.locator('.mark-result>div').nth(2).locator('strong')).to_have_text('Pass')
                saved=page.evaluate('structuredClone(__fixture.records)');assert saved['enrolled']['markCard']['manualGrade']=='C' and saved['enrolled']['markCard']['subjects'][0]['manualGrade']=='B'
                for key,value in record.items():
                    if key!='markCard':assert saved['enrolled'][key]==value,key
                # Canvas output must use the exact same descriptions and manually selected grade.
                page.evaluate('()=>{window.__drawn=[];const original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(value,...args){__drawn.push(String(value));return original.call(this,value,...args)}}')
                with page.expect_download():page.locator('[data-new=downloadMarks]').click()
                drawn=page.evaluate('__drawn');assert 'Very Good' in drawn and 'C' in drawn and 'Not passed' not in drawn
                page.locator('[data-new=printMarks]').click();page.wait_for_function('window.__printed===1');pdf=fitz.open(stream=page.pdf(prefer_css_page_size=True,print_background=True),filetype='pdf');text=' '.join(' '.join(sheet.get_text() for sheet in pdf).split());assert 'Very Good' in text and 'Not passed' not in text
                page.close();page=open_page(saved);expect(page.locator('#rcOverallGrade')).to_have_value('C');expect(page.locator('[data-subject=grade]').first).to_have_value('B')
                page.locator('[data-subject=grade]').first.select_option('');page.locator('#rcOverallGrade').select_option('');page.locator('#rcMarksForm [type=submit]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('Marks saved securely');assert 'manualGrade' not in page.evaluate('__fixture.records.enrolled.markCard');expect(page.locator('#rcMarkPreview tbody tr').first.locator('td').last).to_have_text('Excellent')
                page.locator('[data-subject=marks]').first.fill('5');page.locator('#rcMarksForm [type=submit]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('Marks saved securely');expect(page.locator('#rcMarkPreview tbody tr').first.locator('td').last).to_have_text('Fail');expect(page.locator('.mark-result>div').nth(1).locator('strong')).to_have_text('F');expect(page.locator('.mark-result>div').nth(2).locator('strong')).to_have_text('Fail');assert 'Not passed' not in page.locator('#rcMarkPreview').inner_text()
                before=page.evaluate('structuredClone(__fixture.records)');page.evaluate('__fixture.failWrite=true');page.locator('#rcOverallGrade').select_option('D');page.locator('#rcMarksForm [type=submit]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('not saved');assert page.evaluate('__fixture.records')==before
                for width in [320,390,768,1512]:
                    page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                assert not errors and not external and not writes,(errors,external,writes)
                print('PASS: automatic descriptions, manual subject/final grades, persistence, returning to automatic, F/Fail, PNG/print, rejected writes and four widths; payments/photos/legacy fields retained',flush=True)
                browser.close()
        finally:server.shutdown()
if __name__=='__main__':run()
