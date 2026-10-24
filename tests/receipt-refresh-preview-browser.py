"""Receipt design only: filled, blank, WhatsApp, HD images and real paper sizes."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
import importlib.util,struct
import fitz
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/artifacts/receipt-refresh'
spec=importlib.util.spec_from_file_location('receipt_preview',ROOT/'preview-receipts.py');preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
def run():
    OUT.mkdir(parents=True,exist_ok=True);server=ThreadingHTTPServer(('127.0.0.1',0),partial(preview.PreviewHandler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='reduce',accept_downloads=True);errors,external,writes,failed,requests=[],[],[],[],[]
            def route(r):
                requests.append(r.request.url)
                if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
                elif r.request.url.startswith(base+'/'):r.continue_()
                else:external.append(r.request.url);r.abort()
            context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:failed.append((r.status,r.url)) if r.status>=400 else None);page.add_init_script('window.print=()=>window.__printed=(window.__printed||0)+1;');page.goto(base+preview.PREVIEW)
            expect(page.locator('.receipt-design')).to_be_visible();page.evaluate("async()=>{await document.fonts.load('700 44px Caveat');await document.fonts.ready}");assert page.evaluate("document.fonts.check('700 44px Caveat')")
            expect(page.locator('.receipt-number')).to_have_text('1000');expect(page.locator('.receipt-number')).to_have_css('font-weight','700');expect(page.locator('.receipt-school h2')).to_have_text('REHAAN COMPUTERS CHARANGAM');expect(page.locator('.receipt-contacts')).to_contain_text('rehaancomputers881@gmail.com');expect(page.locator('.receipt-contacts')).to_contain_text('9797205429, 9149551258');expect(page.locator('.receipt-school p')).to_have_text('MAIN ROAD CHARANGAM BEERWAH BUDGAM KASHMIR 193411');expect(page.locator('.receipt-website')).to_have_text('rehaan-computers.web.app');assert '₹100' not in page.locator('.receipt-design').inner_text()
            page.locator('.receipt-design').screenshot(path=str(OUT/'filled-paper.png'));page.screenshot(path=str(OUT/'desktop.png'))
            with page.expect_download() as event:page.locator('#downloadReceipt').click()
            image=Path(event.value.path()).read_bytes();assert struct.unpack('>II',image[16:24])==(3200,2240);(OUT/'filled.png').write_bytes(image)
            page.locator('#printReceipt').click();page.wait_for_function('window.__printed===1');pdf=page.pdf(prefer_css_page_size=True,print_background=True);(OUT/'filled.pdf').write_bytes(pdf);doc=fitz.open(stream=pdf,filetype='pdf');assert len(doc)==1,('filled page count',len(doc));assert doc[0].rect.width>doc[0].rect.height;text=doc[0].get_text();assert '1000' in text and 'Sara Khan' in text and 'rehaan-computers.web.app' in text and '₹100' not in text
            page.emulate_media(media='print');assert page.locator('#receiptPrintRoot .receipt-design').evaluate('el=>el.scrollHeight<=el.clientHeight'),page.locator('#receiptPrintRoot .receipt-design').evaluate('el=>({scroll:el.scrollHeight,height:el.clientHeight})');page.emulate_media(media='screen')
            page.locator('[data-tab=whatsapp]').click();expect(page.locator('#whatsappImage')).to_have_attribute('src',__import__('re').compile('^blob:'));expect(page.locator('#whatsappText')).to_contain_text('Receipt No.: 1000');expect(page.locator('#whatsappText')).to_contain_text('Balance after payment: ₹499');assert 'PAYMENT NUMBER' not in page.locator('#whatsappText').inner_text() and '₹100' not in page.locator('#whatsappText').inner_text();page.locator('#whatsappStage').screenshot(path=str(OUT/'whatsapp.png'))
            page.locator('#receiptNumber').fill('1001');expect(page.locator('#whatsappText')).to_contain_text('Receipt No.: 1001');page.locator('#samplePaid').click();expect(page.locator('#whatsappText')).to_contain_text('Balance after payment: ₹0')
            page.locator('[data-tab=blank]').click();paper=page.locator('#receiptStage .receipt-design');expect(paper.locator('.receipt-number')).to_have_text('1001');text=paper.inner_text();assert 'Sara Khan' not in text and 'Charangam, Beerwah' not in text and 'Cash' not in text and '₹999' not in text and '₹100' not in text
            paper.screenshot(path=str(OUT/'blank-paper.png'));page.locator('#numberBlank').uncheck();expect(paper.locator('.receipt-number')).to_have_text('');page.locator('#numberBlank').check();page.locator('#receiptNumber').fill('1000');page.locator('#printBlankSheet').click();page.wait_for_function('window.__printed===2');page.emulate_media(media='print');pdf=page.pdf(prefer_css_page_size=True,print_background=True);(OUT/'two-blank.pdf').write_bytes(pdf);doc=fitz.open(stream=pdf,filetype='pdf');assert len(doc)==1,('two blank page count',len(doc));assert doc[0].rect.height>doc[0].rect.width;text=doc[0].get_text();assert '1000' in text and '1001' in text and text.count('REHAAN COMPUTERS CHARANGAM')==2 and 'Sara Khan' not in text
            assert page.locator('#receiptPrintRoot .receipt-design').evaluate_all('items=>items.every(el=>el.scrollHeight<=el.clientHeight)'),page.locator('#receiptPrintRoot .receipt-design').evaluate_all('items=>items.map(el=>({scroll:el.scrollHeight,height:el.clientHeight,parts:[...el.children].map(x=>({name:x.className,height:x.getBoundingClientRect().height}))}))')
            page.emulate_media(media='screen')
            for width in [320,390,768,1440]:
                page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                page.locator('[data-tab=whatsapp]').click();expect(page.locator('#whatsappImage')).to_have_attribute('src',__import__('re').compile('^blob:'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('whatsapp',width)
                if width==390:page.screenshot(path=str(OUT/'mobile.png'))
                page.locator('[data-tab=blank]').click()
            assert page.evaluate('localStorage.length===0&&sessionStorage.length===0')
            assert not errors and not external and not writes and not failed,(errors,external,writes,failed)
            assert not any(any(word in url for word in ['firebase','razorpay','admin-app.js','photo-storage']) for url in requests)
            print('PASS: requested contacts/address/website, handwriting numbers 1000+, filled/blank/WhatsApp matching design, 3200px PNG, one A5 filled receipt and two A4 blank receipts, mobile widths; no live requests, messages, record/payment writes or storage',flush=True);browser.close()
    finally:server.shutdown()
if __name__=='__main__':run()
