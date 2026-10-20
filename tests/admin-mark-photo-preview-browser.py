"""Portrait and 4K preview checks. All records and images stay local."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
import importlib.util,struct,zlib
from PIL import Image
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('launcher',ROOT/'preview-admin.py');launcher=importlib.util.module_from_spec(spec);spec.loader.exec_module(launcher)
OUT=ROOT/'tests/artifacts/mark-photo-preview'
def chunk(kind,data):return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
def sample():
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',256,320,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+bytes([30,120,160])*256)*320))+chunk(b'IEND',b'')

def run():
    OUT.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(launcher.PreviewHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            context=browser.new_context(viewport={'width':1512,'height':1100},reduced_motion='reduce',accept_downloads=True)
            errors,external,writes=[],[],[]
            def route(r):
                if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
                elif r.request.url.startswith(base+'/'):r.continue_()
                else:external.append(r.request.url);r.abort()
            context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)));page.on('dialog',lambda d:d.accept())
            page.goto(base+launcher.PREVIEW);expect(page.locator('#adminDashboard')).to_be_visible();page.locator('[data-section=marks]').click();page.locator('#rcMarkStudent').select_option('demo-1');expect(page.locator('#markPhotoPreviewControls')).to_be_visible()
            for field in page.locator('[data-subject=marks]').all():field.fill('80')
            page.locator('#rcMarksForm [type=submit]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('Marks saved securely')
            before=page.evaluate('structuredClone(__adminPreview.records)');count=page.evaluate('__adminPreview.writes.length')
            page.locator('#markPreviewPhoto').set_input_files({'name':'local-preview.png','mimeType':'image/png','buffer':sample()})
            expect(page.locator('#rcMarkPreview .mark-portrait-preview img')).to_be_visible();expect(page.locator('#markPhotoPreviewStatus')).to_contain_text('256 × 320')
            assert page.evaluate('__adminPreview.records')==before and page.evaluate('__adminPreview.writes.length')==count
            with page.expect_download() as download:page.locator('#markPhotoPreviewDownload').click()
            path=download.value.path();image=Image.open(path);assert image.width==3840 and image.height>=5424
            assert image.convert('RGB').getpixel((3330,559))==(30,120,160)
            image.save(OUT/'mark-photo-4k.png')
            page.locator('#markPreviewQuality').select_option('1600')
            with page.expect_download() as download:page.locator('#markPhotoPreviewDownload').click()
            hd=Image.open(download.value.path());assert hd.width==1600 and hd.height>=2260
            assert hd.convert('RGB').getpixel((1387,233))==(30,120,160)
            for width in [320,390,768,1512]:
                page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                box=page.locator('#rcMarkPreview .mark-portrait-preview').bounding_box();paper=page.locator('#rcMarkPreview .mark-paper').bounding_box();assert box['x']>=paper['x']+paper['width']/2 and box['x']+box['width']<=paper['x']+paper['width']
                if width in [390,1512]:page.locator('#rcMarkPreview').screenshot(path=str(OUT/f'preview-{width}.png'))
            page.set_viewport_size({'width':1512,'height':1100});page.evaluate('window.print=()=>window.__printed=true');page.locator('[data-new=printMarks]').click();page.wait_for_function('window.__printed===true');assert page.locator('#rcPrintArea .mark-portrait-preview img').get_attribute('src').startswith('data:image/png')
            page.locator('#rcMarkStudent').select_option('demo-2');expect(page.locator('#rcMarkPreview .mark-portrait-preview img')).to_be_hidden();page.locator('#rcMarkStudent').select_option('demo-1');expect(page.locator('#rcMarkPreview .mark-portrait-preview img')).to_be_visible()
            page.locator('#adminLogoutBtn').click();expect(page.locator('#adminDashboard')).to_be_hidden()
            assert not errors and not external and not writes,(errors,external,writes)
            print('PASS: local portrait appears top-right in preview/print and both 3840px/1600px PNGs; exact photo pixels preserved; four widths; separate student photos; no record writes, live requests or payments',flush=True)
            browser.close()
    finally:server.shutdown()

if __name__=='__main__':run()
