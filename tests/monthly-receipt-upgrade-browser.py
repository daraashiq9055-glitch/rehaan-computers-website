"""Offline preview regression: monthly cards, receipt media, colour-only audit and PNG/print."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
import importlib.util,json,struct
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/artifacts/monthly-receipt-upgrade'
spec=importlib.util.spec_from_file_location('upgrade_preview',ROOT/'preview-fees-receipts.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);preview=module.preview

def run():
 OUT.mkdir(parents=True,exist_ok=True);server=ThreadingHTTPServer(('127.0.0.1',0),partial(preview.PreviewHandler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1400,'height':1050},accept_downloads=True,reduced_motion='reduce');errors=[];external=[]
   def route(r):
    if r.request.url.startswith(base+'/') and r.request.method in ['GET','HEAD']:r.continue_()
    else:external.append(r.request.url);r.abort()
   context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.add_init_script('window.print=()=>window.__printed=(window.__printed||0)+1;');page.goto(base+preview.PREVIEW);expect(page.locator('.rc-fees')).to_be_visible();before=page.evaluate('structuredClone(__adminPreview.records)');writes=page.evaluate('__adminPreview.writes.length')
   page.locator('[data-new=monthlyStatus][data-student=demo-0]').click();expect(page.locator('.monthly-status-card')).to_have_count(3)
   for state in ['paid','partial','upcoming']:expect(page.locator('.monthly-status-card.is-'+state)).to_be_visible()
   expect(page.locator('.monthly-status-card.is-partial')).to_contain_text('₹499');page.locator('#rcFeatureDialog').screenshot(path=str(OUT/'monthly-status.png'))
   page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('.monthly-status-cards').evaluate('e=>e.scrollWidth<=e.clientWidth+2');page.set_viewport_size({'width':1400,'height':1050})
   page.locator('[data-new=monthlyPayment]').click();expect(page.locator('#rcPaymentForm')).to_be_visible();assert page.evaluate('__adminPreview.writes.length')==writes;page.locator('#rcTuitionModal .admin-modal-close').click();page.locator('[data-new=monthlyStatus][data-student=demo-0]').click();
   page.locator('[data-new=studentReceipts]').click();page.locator('[data-new=openReceipt]').click();expect(page.locator('[data-new=image]')).to_be_enabled();expect(page.locator('.receipt-student-photo img')).to_be_visible()
   has_signature=(ROOT/'private-assets/mark-signatures/authorized.png').is_file()
   if has_signature:
    expect(page.locator('.receipt-signature-image img')).to_be_visible();assert page.locator('.receipt-signature-image img').count()==1
    expected=page.evaluate('async()=> (await __markSignaturePreviewPromise).authorized');assert page.locator('.receipt-signature-image img').get_attribute('src')==expected
   assert page.locator('.receipt-student-photo img').get_attribute('src')==before['demo-0']['photo'];assert page.evaluate('__adminPreview.records')==before and page.evaluate('__adminPreview.writes.length')==writes
   page.locator('.receipt-design').screenshot(path=str(OUT/'receipt-preview.png'))
   page.locator('[data-new=editReceipt]').click();form=page.locator('#rcReceiptEditForm');form.locator('[name=paperColor]').fill('#eef4fb');expect(form.locator('.receipt-design')).to_have_css('background-color','rgb(238, 244, 251)');assert page.evaluate('__adminPreview.writes.length')==writes
   form.locator('[name=reason]').fill('Change receipt paper colour only');form.locator('[name=confirmed]').check();form.locator('[type=submit]').click();expect(page.locator('[data-new=image]')).to_be_enabled();expect(page.locator('#rcFeatureDialog')).to_contain_text('Correction history (1)')
   after=page.evaluate('structuredClone(__adminPreview.records)');old=next(iter(before['demo-0']['feeReceipts'].values()));new=next(iter(after['demo-0']['feeReceipts'].values()));assert new['paperColor']=='#eef4fb' and new['amount']==old['amount'];assert new['amendments'][0]['amountDelta']==0 and new['amendments'][0]['before']['paperColor']=='#fffcf2' and new['amendments'][0]['after']['paperColor']=='#eef4fb'
   assert after['demo-0']['monthlyFees']==before['demo-0']['monthlyFees'];assert after['demo-0']['payment']==before['demo-0']['payment'];assert after['demo-0']['photo']==before['demo-0']['photo']
   page.evaluate('''()=>{window.__drawn=[];const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(image,...rest){__drawn.push(image.src);return draw.call(this,image,...rest);}}''')
   with page.expect_download() as download:page.locator('[data-new=image]').click()
   png=Path(download.value.path()).read_bytes();assert struct.unpack('>II',png[16:24])==(3200,2240);(OUT/'receipt-hd.png').write_bytes(png);drawn=page.evaluate('__drawn');assert before['demo-0']['photo'] in drawn
   if has_signature:assert expected in drawn
   page.locator('[data-new=printReceipt]').click();page.wait_for_function('()=>window.__printed===1');assert not page.locator('#rcPrintArea .receipt-student-photo img').evaluate('e=>e.hidden');assert page.locator('#rcPrintArea .receipt-student-photo img').get_attribute('src')==before['demo-0']['photo']
   if has_signature:assert page.locator('#rcPrintArea .receipt-signature-image img').get_attribute('src')==expected
   page.emulate_media(media='print');pdf=page.pdf(path=str(OUT/'receipt-print.pdf'),prefer_css_page_size=True,print_background=True);page.emulate_media(media='screen')
   import fitz
   document=fitz.open(stream=pdf,filetype='pdf');assert len(document)==1,len(document);assert abs(document[0].rect.width-595)<3 and abs(document[0].rect.height-420)<3
   page.locator('[data-new=whatsapp]').click();expect(page.locator('#rcImageStatus')).to_have_text('PNG image ready.');assert page.locator('#rcOpenWhatsApp').get_attribute('href').startswith('https://wa.me/91');page.locator('[data-new=close]').click()
   page.locator('[data-new=blank]').click()
   if has_signature:expect(page.locator('#rcFeatureDialog .receipt-signature-image img')).to_be_visible()
   assert page.locator('#rcFeatureDialog .receipt-student-photo').count()==0;page.locator('[data-new=printSheet]').click();page.wait_for_function('()=>window.__printed===2');assert page.locator('#rcPrintArea .receipt-design').count()==2;page.locator('[data-new=close]').click()
   # A failed saved photo must block exports, rather than silently dropping it.
   page.evaluate('__adminPreview.records["demo-0"].photo="data:image/png;base64,invalid"');page.locator('#refreshApplications').click();expect(page.locator('[data-new=monthlyStatus][data-student=demo-0]')).to_be_visible();page.locator('[data-new=receipts]').click();page.locator('[data-new=openReceipt]').click();expect(page.locator('#rcReceiptMediaStatus')).to_contain_text('Could not prepare receipt');expect(page.locator('[data-new=image]')).to_be_disabled();expect(page.locator('[data-new=printReceipt]')).to_be_disabled()
   assert not external and not errors,(external,errors);browser.close();print('PASS: three ledger status cards and mobile layout; private student photo and authorised-only signature in preview/PNG/print/WhatsApp; colour-only correction history preserves payments; blank signature and A5 export; failed photo blocks export; no live requests',flush=True)
 finally:server.shutdown()
if __name__=='__main__':run()
