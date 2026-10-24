"""Statements in the assembled dashboard, with intercepted services and no writes."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from datetime import datetime,timezone
from urllib.parse import urlparse,parse_qs
import importlib.util,json,tempfile,csv,io,struct
import fitz
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/artifacts/fee-statements'
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
baseline=module('baseline',ROOT/'tests/admin-browser.py');builder=module('builder',ROOT/'prepare-admin-release.py')
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    OUT.mkdir(parents=True,exist_ok=True)
    record={**baseline.FIXTURES['enrolled'],'photo':'','admissionDate':'2026-08-10','monthlyFees':{'2026-09-10':500,'2026-10-10':999},'feeReceipts':{'a':{'id':'a'*32,'studentId':'enrolled','due':'2026-09-10','date':'2026-09-12','amount':50000}},'feeReminders':{}}
    review={**record,'fullName':'Review fixture','admissionNumber':'002','admissionDate':'','approvedAt':'','feeReceipts':{}}
    with tempfile.TemporaryDirectory() as directory:
        output=builder.build(Path(directory)/'candidate');server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(output/'public')));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='reduce',accept_downloads=True);errors,external,writes,pending=[],[],[],[];delay=[False]
                def route(r):
                    if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
                    elif r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):r.fulfill(content_type='application/javascript',body=baseline.MOCK,headers={'Access-Control-Allow-Origin':'*'})
                    elif r.request.url.startswith(base+'/'):
                        if delay[0] and '/admin-fee-statement-image.js' in r.request.url:pending.append(r)
                        else:r.continue_()
                    else:external.append(r.request.url);r.abort()
                context.route('**/*',route)
                def login():
                    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.clock.set_fixed_time(datetime(2026,10,24,6,0,tzinfo=timezone.utc));page.add_init_script('window.__fixture={records:'+json.dumps({'enrolled':record,'review':review})+',writes:[],listeners:[],authorized:true,auth:{currentUser:null,authStateReady:async()=>{}}};window.__opened=[];window.open=url=>{__opened.push(url);return {opener:null}};window.print=()=>window.__printed=(window.__printed||0)+1;');page.goto(base+'/admin.html');expect(page.locator('#adminLoginButton')).to_be_enabled();page.locator('#adminEmail').fill('admin@example.test');page.locator('#adminPassword').fill('valid-password');page.locator('#adminLoginButton').click();expect(page.locator('#adminDashboard')).to_be_visible();return page
                page=login();snapshot=page.evaluate('structuredClone(__fixture.records)');page.locator('[data-section=fees]').click();page.locator('[data-new=statement][data-student=enrolled]').click();dialog=page.locator('#feeStatementDialog');expect(dialog).to_be_visible();expect(dialog.locator('.statement-totals>div').nth(0)).to_contain_text('₹499');expect(dialog.locator('.statement-totals>div').nth(1)).to_contain_text('₹1,499');expect(dialog.locator('.statement-totals>div').nth(2)).to_contain_text('₹999');expect(dialog.locator('.statement-oldest')).to_contain_text('August 2026');expect(dialog.locator('tbody tr')).to_have_count(3);expect(dialog.locator('.statement-foot')).to_contain_text('₹999 of recorded payments has no matching dated receipt')
                dialog.locator('#statementMonthFilter').select_option('unpaid');expect(dialog.locator('tbody tr:not([hidden])')).to_have_count(1)
                with page.expect_download() as event:dialog.locator('[data-statement-action=image]').click()
                image=Path(event.value.path()).read_bytes();assert image.startswith(b'\x89PNG');w,h=struct.unpack('>II',image[16:24]);assert w==2000 and h>1500;(OUT/'statement.png').write_bytes(image)
                with page.expect_download() as event:dialog.locator('[data-statement-action=csv]').click()
                rows=list(csv.reader(io.StringIO(Path(event.value.path()).read_text(encoding='utf-8-sig'))));assert len(rows)==4 and rows[1][0]=='August 2026' and rows[1][4]=='499' and rows[3][5]=='Upcoming'
                dialog.locator('[data-statement-action=print]').click();page.wait_for_function('window.__printed===1');expect(page.locator('#rcPrintArea tbody tr')).to_have_count(3);pdf=page.pdf(prefer_css_page_size=True,print_background=True);(OUT/'statement.pdf').write_bytes(pdf);doc=fitz.open(stream=pdf,filetype='pdf');text=' '.join(' '.join(sheet.get_text() for sheet in doc).split());assert 'August 2026' in text and 'October 2026' in text and 'not a payment receipt' in text
                dialog.locator('[data-statement-action=whatsapp]').click();url=page.evaluate('__opened.at(-1)');assert urlparse(url).path=='/919876543211';message=parse_qs(urlparse(url).query)['text'][0];assert 'TOTAL DUE: ₹499' in message and 'August 2026' in message and 'Upcoming fees' in message
                for width in [320,390,768,1440]:
                    page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                    assert dialog.evaluate('el=>el.scrollWidth<=el.clientWidth'),width
                    if width==1440:assert dialog.bounding_box()['width']>=1000
                    if width in [390,1440]:dialog.screenshot(path=str(OUT/f'dialog-{width}.png'))
                assert page.evaluate('__fixture.records')==snapshot and page.evaluate('__fixture.writes.length')==0
                dialog.locator('[data-statement-action=close]').click();page.set_viewport_size({'width':1440,'height':1100})
                page.locator('[data-new=statement][data-student=review]').click();expect(dialog.locator('#feeStatementStatus')).to_contain_text('review is required');expect(dialog.locator('[data-statement-action=image]')).to_be_disabled();expect(dialog.locator('[data-statement-action=whatsapp]')).to_be_disabled();dialog.locator('[data-statement-action=close]').click()
                print('PASS: full read-only statement totals, learning months, receipts/legacy labels, HD PNG, full print/CSV despite screen filter, saved-phone WhatsApp draft, review guards and four widths',flush=True)
                page.locator('[data-records-centre]').click();page.locator('[data-open-profile=enrolled]').first.click();page.locator('[data-profile-tab=fees]').click();page.locator('#profileFeeStatement').click();expect(dialog).to_be_visible();dialog.locator('[data-statement-action=close]').click();page.locator('[data-section=fees]').click()
                long_image=page.evaluate(r"""async()=>{
                    const {feeStatement}=await import('/admin-fee-statement-model.js?v=20261024-admin-8');
                    const {statementPNG}=await import('/admin-fee-statement-image.js?v=20261024-admin-8');
                    const entry={id:'long',data:{status:'Approved',admissionNumber:'RC/123',admissionDate:'2022-10-10',fullName:'N'.repeat(120),coursePreference:'C'.repeat(120),monthlyFees:{},feeReceipts:{}}};
                    const s=feeStatement(entry,'2026-10-24'),original=CanvasRenderingContext2D.prototype.fillText,calls=[];
                    CanvasRenderingContext2D.prototype.fillText=function(value,x,y){calls.push({text:String(value),right:x+this.measureText(String(value)).width,bottom:y+parseFloat(this.font.match(/([\d.]+)px/)[1])});return original.call(this,value,x,y)};
                    try{const blob=await statementPNG(s),bitmap=await createImageBitmap(blob);const result={width:bitmap.width,height:bitmap.height,calls,rows:s.rows.length};bitmap.close();return result;}finally{CanvasRenderingContext2D.prototype.fillText=original;}
                }""")
                assert long_image['width']==2000 and long_image['rows']==49
                assert any(c['text']=='October 2022' for c in long_image['calls']) and any(c['text']=='October 2026' for c in long_image['calls'])
                assert all(c['right']<=1540 and c['bottom']<=long_image['height']/1.25-24 for c in long_image['calls'])
                # Refreshing loaded data invalidates an old open statement before export.
                page.locator('[data-new=statement][data-student=enrolled]').click();page.evaluate("async()=>{__fixture.records.enrolled.monthlyFees['2026-09-10']=700;const m=await import('/admin-app.js?v="+builder.VERSION+"');await m.adminWorkspace.refresh();}");dialog.locator('[data-statement-action=image]').click();expect(dialog.locator('#feeStatementStatus')).to_contain_text('record or session changed');dialog.locator('[data-statement-action=refresh]').click();expect(dialog.locator('.statement-totals>div').first).to_contain_text('₹299');dialog.locator('[data-statement-action=close]').click()
                # A delayed optional renderer must not finish a download after logout.
                page.close();delay[0]=True;page=login();downloads=[];page.on('download',lambda d:downloads.append(d));page.locator('[data-section=fees]').click();page.locator('[data-new=statement][data-student=enrolled]').click();page.locator('[data-statement-action=image]').click();assert pending;page.evaluate("document.querySelector('#adminLogoutBtn').click()");expect(page.locator('#adminDashboard')).to_be_hidden();expect(page.locator('#feeStatementDialog')).to_have_count(0)
                for request in pending:request.continue_()
                pending.clear();page.evaluate('()=>new Promise(r=>setTimeout(r,150))');assert not downloads and page.evaluate('__fixture.writes.length')==0
                assert not errors and not external and not writes,(errors,external,writes)
                print('PASS: stale records block export until refresh; logout clears statement/print and cancels delayed image export; no live service, financial or student writes',flush=True);browser.close()
        finally:server.shutdown()
if __name__=='__main__':run()
