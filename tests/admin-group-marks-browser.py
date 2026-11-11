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
   assert 'SUBJECT PERFORMANCE' in svg and 'PERCENTAGE' in svg and '6 complete results' in svg and 'Morning' in svg
   expect(page.locator('#groupSelectionCount')).to_have_text('7 of 7 students selected')
   page.locator('#groupStudentSearch').fill('Sara');expect(page.locator('.group-students label:visible')).to_have_count(1);assert page.locator('.group-students input:checked').count()==7;page.locator('#groupStudentSearch').fill('')
   page.locator('#groupZoom').select_option('150');assert page.locator('#groupSheet').evaluate('e=>e.clientWidth/e.parentElement.clientWidth')>1.3;page.locator('#groupZoom').select_option('100')
   with page.expect_download() as download:page.locator('#groupPNG').click()
   data=Path(download.value.path()).read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n';assert int.from_bytes(data[16:20],'big')==3840
   out=ROOT/'tests/artifacts/group-marks';out.mkdir(parents=True,exist_ok=True);(out/'group-sheet.png').write_bytes(data)
   page.evaluate("document.body.classList.add('printing-group-marks')");page.emulate_media(media='print');expect(page.locator('#groupSheet')).to_be_visible();assert page.locator('#adminDashboard').evaluate('el=>getComputedStyle(el).display')=='none';pdf=page.pdf(print_background=True);assert pdf.startswith(b'%PDF');(out/'group-sheet.pdf').write_bytes(pdf);page.emulate_media(media='screen');page.evaluate("document.body.classList.remove('printing-group-marks')")
   page.locator('.group-draft-editor>summary').click();page.locator('[data-draft="labels.student"]').fill('LEARNER DETAILS');page.locator('[data-draft="profile.name"]').fill('REHAAN COMPUTERS PREMIUM');page.locator('.draft-student-list>details').first.locator('summary').click();page.locator('[data-draft="student.0.name"]').fill('Edited student');page.locator('[data-draft="student.0.marks.0"]').fill('20');page.locator('[data-draft="student.0.marks.1"]').fill('50');page.locator('[data-draft="student.0.note"]').fill('Keep up this excellent progress.');expect(page.locator('#groupPNG')).to_be_disabled();page.locator('#groupPreview').click();page.locator('#groupSheet').evaluate('(image)=>image.decode()');edited=page.locator('#groupSheet').evaluate('async image=>await (await fetch(image.src)).text()');assert 'LEARNER DETAILS' in edited and 'Edited student' in edited and 'Keep up this excellent progress.' in edited and '70' in edited;assert page.evaluate('__adminPreview.records')==before;assert page.evaluate('__adminPreview.writes.length')==0
   # A draft changed during image decoding must cancel the old download.
   downloads=[];page.on('download',lambda item:downloads.append(item))
   page.evaluate("()=>{window.originalGroupDecode=Image.prototype.decode;Image.prototype.decode=function(){return new Promise(resolve=>window.releaseGroupDecode=resolve)};}")
   page.locator('#groupPNG').click();page.wait_for_function('typeof window.releaseGroupDecode==="function"');page.locator('#groupLabel').fill('Updated while exporting');page.locator('#groupPreview').click();page.evaluate('Image.prototype.decode=window.originalGroupDecode;window.releaseGroupDecode()');expect(page.locator('#groupStatus')).to_contain_text('Create the sheet again');assert not downloads
   page.locator('#groupResetDraft').click();expect(page.locator('#groupPNG')).to_be_disabled();expect(page.locator('[data-draft="student.0.name"]')).to_have_value('Ayaan Mir');page.locator('#groupPreview').click()
   # Wide subjects, long identity fields and maximum-length guidance stay in bounds.
   bounds=page.evaluate('''async()=>{const {groupSVG}=await import('./admin-group-sheet.js?v=20261112-1');const {assessmentKey,groupResults}=await import('./admin-group-marks-model.js?v=20261108-1');
    const profile={name:'W'.repeat(100),address:('Long institute address ').repeat(10).slice(0,240),phone:'9797205429',phone2:'9149551258',email:'a'.repeat(150)+'@example.test',website:'https://example.test/'+ 'w'.repeat(170)};
    const check=count=>{const card={title:'W'.repeat(120),date:'2026-11-01',subjects:Array.from({length:count},(_,i)=>({name:'W'.repeat(98)+String(i).padStart(2,'0'),max:1000,marks:900,...(i%2?{typing:{speed:500,accuracy:100}}:{})}))};card.subjects.forEach(s=>s.name=s.name.slice(0,100));const records=[{id:'long',data:{fullName:'W'.repeat(120),admissionNumber:'W'.repeat(40),batch:'Evening',markCard:card}}];const result=groupResults(records,assessmentKey(card),['long']);result.rows[0].note='W'.repeat(600);const svg=groupSVG(result,'W'.repeat(100),profile);const doc=new DOMParser().parseFromString(svg,'image/svg+xml');if(doc.querySelector('parsererror'))throw Error('Invalid SVG');const root=document.importNode(doc.documentElement,true);root.style.position='absolute';root.style.opacity='0';document.body.append(root);const width=Number(root.getAttribute('width')),height=Number(root.getAttribute('height'));const outside=[...root.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x<28||b.x+b.width>width-28||b.y<28||b.y+b.height>height-28}).map(t=>t.textContent);root.remove();return outside;};return [...check(1),...check(12)];}''')
   assert not bounds,bounds
   for width in [1440,390,320]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.locator('#rcGroupMarks').evaluate('e=>e.scrollTop=0');page.locator('#rcGroupMarks').screenshot(path=str(out/f'group-studio-{width}.png'))
   page.locator('#groupSelectNone').click();expect(page.locator('#groupPNG')).to_be_disabled();page.locator('#groupPreview').click();expect(page.locator('#groupStatus')).to_contain_text('Select at least one');page.locator('#groupSelectAll').click();page.locator('#groupPreview').click()
   assert page.evaluate('__adminPreview.records')==before;assert page.evaluate('__adminPreview.writes.length')==0
   page.evaluate("document.dispatchEvent(new Event('admin-session-cleared'))");expect(page.locator('#rcGroupMarks')).to_have_count(0);assert not errors,errors
   b.close();print('PASS: seven-student sheet, truthful fail/incomplete, typing highlights, 4K PNG, three widths, selection and logout cleanup; no record/payment writes.')
 finally:server.shutdown()
