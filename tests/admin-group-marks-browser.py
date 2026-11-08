"""Combined saved marksheet preview/export with mocked services and zero record writes."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import importlib.util,tempfile
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('builder',ROOT/'prepare-admin-release.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tempfile.TemporaryDirectory() as tmp:
 built=m.build(Path(tmp)/'candidate')
 class Handler(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(built/'public')));Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
 try:
  with sync_playwright() as p:
   b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
   setup=(ROOT/'previews/admin-premium/demo.js').read_text().split('  const notify =')[0]+'})();'
   setup+="""for(let i=0;i<7;i++){__adminPreview.records['demo-'+i].markCard={title:'MS Word & Typing Examination',date:'2026-11-01',subjects:[{name:'MS Word',max:20,marks:i===6?2:14+i%3},{name:'Typing',max:50,marks:33+i,typing:{speed:25+i,accuracy:88+i}}]};}__adminPreview.records['demo-5'].markCard.subjects[0].marks=null;"""
   page.context.add_init_script(setup)
   def route(r):
    if r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):r.fulfill(content_type='application/javascript',body=(ROOT/'previews/admin-premium/sdk.js').read_text(),headers={'Access-Control-Allow-Origin':'*'})
    elif r.request.url.startswith(url+'/photo-storage'):r.fulfill(content_type='application/javascript',body=(ROOT/'previews/admin-premium/photos.js').read_text())
    elif r.request.url.startswith(url+'/'):r.continue_()
    else:r.abort()
   page.context.route('**/*',route)
   page.goto(url+'/admin.html');expect(page.locator('#adminLoginButton')).to_be_enabled();page.locator('#adminEmail').fill('admin@example.test');page.locator('#adminPassword').fill('test-only');page.locator('#adminLoginButton').click();expect(page.locator('#adminDashboard')).to_be_visible();before=page.evaluate('structuredClone(__adminPreview.records)')
   page.locator('.nav [data-section=marks]').click();page.locator('[data-new=groupMarks]').click();expect(page.locator('#rcGroupMarks')).to_be_visible();expect(page.locator('.group-students input')).to_have_count(7);page.locator('#groupLabel').fill('November · Morning batch');page.locator('#groupPreview').click();expect(page.locator('#groupStatus')).to_contain_text('7 students · 5 passed · 1 failed · 1 incomplete');expect(page.locator('#groupSheet')).to_be_visible()
   page.locator('#groupSheet').evaluate('(image)=>image.decode()')
   svg=page.locator('#groupSheet').evaluate('async image=>await (await fetch(image.src)).text()');assert 'Highest Typing speed (WPM)' in svg and 'FAIL' in svg and 'INCOMPLETE' in svg
   with page.expect_download() as download:page.locator('#groupPNG').click()
   data=Path(download.value.path()).read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n';assert int.from_bytes(data[16:20],'big')==3840
   out=ROOT/'tests/artifacts/group-marks';out.mkdir(parents=True,exist_ok=True);(out/'group-sheet.png').write_bytes(data)
   page.evaluate("document.body.classList.add('printing-group-marks')");page.emulate_media(media='print');expect(page.locator('#groupSheet')).to_be_visible();assert page.locator('#adminDashboard').evaluate('el=>getComputedStyle(el).display')=='none';pdf=page.pdf(print_background=True);assert pdf.startswith(b'%PDF');(out/'group-sheet.pdf').write_bytes(pdf);page.emulate_media(media='screen');page.evaluate("document.body.classList.remove('printing-group-marks')")
   for width in [1440,390,320]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.locator('#groupSelectNone').click();expect(page.locator('#groupPNG')).to_be_disabled();page.locator('#groupPreview').click();expect(page.locator('#groupStatus')).to_contain_text('Select at least one');page.locator('#groupSelectAll').click();page.locator('#groupPreview').click()
   assert page.evaluate('__adminPreview.records')==before;assert page.evaluate('__adminPreview.writes.length')==0
   page.evaluate("document.dispatchEvent(new Event('admin-session-cleared'))");expect(page.locator('#rcGroupMarks')).to_have_count(0);assert not errors,errors
   b.close();print('PASS: seven-student sheet, truthful fail/incomplete, typing highlights, 4K PNG, three widths, selection and logout cleanup; no record/payment writes.')
 finally:server.shutdown()
