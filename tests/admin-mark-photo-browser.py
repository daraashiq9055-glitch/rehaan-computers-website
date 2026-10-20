"""Real release/photo modules with intercepted services; no live student data."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from urllib.parse import urlparse,parse_qs
from io import BytesIO
import base64,importlib.util,json,tempfile
from PIL import Image
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
baseline=module('baseline',ROOT/'tests/admin-browser.py');builder=module('builder',ROOT/'prepare-admin-release.py')
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    image=Image.new('RGB',(256,320),(30,120,160));buffer=BytesIO();image.save(buffer,format='JPEG',quality=100);photo=buffer.getvalue()
    private='https://res.cloudinary.com/salatmdv/image/authenticated/v123/student-photos/12345678-1234-4123-8123-123456789abc.jpg'
    card={'title':'Saved assessment','date':'2026-10-20','subjects':[{'name':'Practical','max':100,'marks':87}]}
    fixtures=json.loads(json.dumps(baseline.FIXTURES));fixtures['enrolled']['photo']=private
    fixtures['online']['photo']='data:image/jpeg;base64,'+base64.b64encode(photo).decode()
    fixtures['public']={**fixtures['enrolled'],'fullName':'Public photo fixture','photo':baseline.CLOUDINARY_PHOTO}
    for entry in fixtures.values():entry['markCard']=card
    with tempfile.TemporaryDirectory() as directory:
        output=builder.build(Path(directory)/'candidate');server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(output/'public')));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1512,'height':1100},accept_downloads=True,reduced_motion='reduce')
                errors,external,writes,reads,pending,downloads=[],[],[],[],[],[];mode=['normal']
                headers={'Access-Control-Allow-Origin':'*'}
                def fulfill(r):r.fulfill(content_type='image/jpeg',body=photo,headers=headers)
                def route(r):
                    url=r.request.url
                    if r.request.method not in ['GET','HEAD']:writes.append(url);r.abort()
                    elif url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):r.fulfill(content_type='application/javascript',body=baseline.MOCK,headers=headers)
                    elif url==base+'/photo-storage-config.js':r.fulfill(content_type='application/javascript',body='export const photoStorageConfig='+json.dumps({'enabled':True,'cloudName':'salatmdv','serviceUrl':'https://photos.example.test'})+';')
                    elif url.startswith('https://photos.example.test/photo?'):
                        assert r.request.headers.get('authorization')=='Bearer test-admin-token'
                        assert parse_qs(urlparse(url).query)['photo']==[private]
                        reads.append(url)
                        if mode[0]=='delay':pending.append(r)
                        elif mode[0]=='deny':r.fulfill(status=503,content_type='application/json',body='{}',headers=headers)
                        else:fulfill(r)
                    elif url==baseline.CLOUDINARY_PHOTO:fulfill(r)
                    elif url.startswith(base+'/'):r.continue_()
                    else:external.append(url);r.abort()
                context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('download',lambda d:downloads.append(d));page.on('dialog',lambda d:d.accept())
                page.add_init_script('window.__fixture={records:'+json.dumps(fixtures)+',writes:[],listeners:[],authorized:true,auth:{currentUser:null,authStateReady:async()=>{}}};window.print=()=>window.__printed=(window.__printed||0)+1;')
                page.goto(base+'/admin.html');expect(page.locator('#adminLoginButton')).to_be_enabled();page.locator('#adminEmail').fill('admin@example.test');page.locator('#adminPassword').fill('valid-password');page.locator('#adminLoginButton').click();expect(page.locator('#adminDashboard')).to_be_visible()
                page.locator('[data-section=marks]').click();page.locator('#rcMarkStudent').select_option('enrolled');portrait=page.locator('#rcMarkPreview .mark-portrait-preview img');expect(portrait).to_be_visible();assert portrait.get_attribute('src').startswith('blob:')
                original=page.evaluate('structuredClone(__fixture.records)')
                def download(width):
                    page.locator('#rcMarkImageWidth').select_option(str(width))
                    with page.expect_download() as event:page.locator('[data-new=downloadMarks]').click()
                    result=Image.open(event.value.path());assert result.width==width and result.height>=2260*width/1600
                    pixel=result.convert('RGB').getpixel((int(1387*width/1600),int(233*width/1600)));assert max(abs(a-b) for a,b in zip(pixel,(30,120,160)))<=2,pixel
                download(3840);download(1600)
                page.locator('[data-new=printMarks]').click();page.wait_for_function('window.__printed===1');page.emulate_media(media='print');expect(page.locator('#rcPrintArea .mark-portrait-preview img')).to_be_visible();page.emulate_media(media='screen')
                for width in [320,390,768,1512]:
                    page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                    box=portrait.bounding_box();paper=page.locator('#rcMarkPreview .mark-paper').bounding_box();assert box['x']>paper['x']+paper['width']/2 and box['x']+box['width']<=paper['x']+paper['width']
                page.set_viewport_size({'width':1512,'height':1100})
                for student in ['online','public']:
                    page.locator('#rcMarkStudent').select_option(student);expect(portrait).to_be_visible();download(1600)
                page.locator('#rcMarkStudent').select_option('legacy');expect(portrait).to_be_hidden()
                with page.expect_download():page.locator('[data-new=downloadMarks]').click()
                page.locator('#rcMarkStudent').select_option('unsafe');expect(page.locator('[data-new=retryMarkPhoto]')).to_be_visible();count=len(downloads);page.locator('[data-new=downloadMarks]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('reference needs review');assert len(downloads)==count
                print('PASS: generated release includes correct private/inline/public photos in main 4K/HD PNGs and print; no-photo placeholder; invalid URLs blocked; four widths',flush=True)
                def clear():page.evaluate("async()=>{const photos=await import('/photo-storage.js?v=20261018-login-fix-1');photos.clearPhotoSession();}")
                clear();mode[0]='deny';page.locator('#rcMarkStudent').select_option('enrolled');expect(page.locator('[data-new=retryMarkPhoto]')).to_be_visible();page.locator('[data-new=downloadMarks]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('could not load');assert len(downloads)==count
                mode[0]='normal';page.locator('[data-new=retryMarkPhoto]').click();expect(portrait).to_be_visible();download(1600)
                # A delayed private read must never paint/download for another student.
                page.locator('#rcMarkStudent').select_option('legacy');clear();mode[0]='delay';page.locator('#rcMarkStudent').select_option('enrolled');page.locator('[data-new=downloadMarks]').click();assert pending
                page.locator('#rcMarkStudent').select_option('legacy');count=len(downloads)
                for request in pending:fulfill(request)
                pending.clear();expect(portrait).to_be_hidden();page.evaluate('()=>new Promise(r=>setTimeout(r,150))');assert len(downloads)==count
                # The same guard applies when signing out during a private read.
                clear();page.locator('#rcMarkStudent').select_option('enrolled');page.locator('[data-new=downloadMarks]').click();assert pending;page.locator('#adminLogoutBtn').click()
                for request in pending:fulfill(request)
                pending.clear();expect(page.locator('#adminDashboard')).to_be_hidden();page.evaluate('()=>new Promise(r=>setTimeout(r,150))');assert len(downloads)==count
                assert page.locator('#rcPrintArea').inner_html()==''
                assert page.evaluate('__fixture.records')==original and page.evaluate('__fixture.writes.length')==0
                assert reads and not errors and not external and not writes,(errors,external,writes)
                print('PASS: photo failures block incomplete exports; retry recovers; delayed photo reads cannot cross student/session; exact original records/payment fields retained; zero live services or writes',flush=True)
                browser.close()
        finally:server.shutdown()
if __name__=='__main__':run()
