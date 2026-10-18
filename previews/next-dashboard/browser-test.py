"""Standalone preview checks. Every nonlocal request is blocked; no real app services."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
import fitz

ROOT=Path(__file__).resolve().parent
OUT=Path('/tmp/rehaan-next-preview-checks');OUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

def run():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
 Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 checks=[]
 def passed(message):checks.append(message);print('PASS:',message,flush=True)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  context=browser.new_context(viewport={'width':1500,'height':1100},reduced_motion='reduce',accept_downloads=True)
  external=[];writes=[];errors=[];dialogs=[];whatsapp=[]
  def routes(route):
   url=route.request.url
   if route.request.method not in ['GET','HEAD']:writes.append(url);route.abort()
   elif url.startswith(base):route.continue_()
   elif url.startswith('https://wa.me/'):
    whatsapp.append(url);route.fulfill(content_type='text/html',body='<h1>Isolated WhatsApp draft test</h1>')
   else:external.append(url);route.abort()
  context.route('**/*',routes)
  page=context.new_page();page.add_init_script('window.print=()=>{window.__printCalls=(window.__printCalls||0)+1};')
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.on('dialog',lambda dialog:(dialogs.append(dialog.message),dialog.dismiss()))
  page.goto(base+'/');expect(page.locator('h1')).to_have_text('A quieter kind of premium.')
  page.evaluate('document.fonts.ready')
  assert page.evaluate('document.fonts.check(\'500 14px "Inter"\')')
  assert page.evaluate('document.fonts.check(\'500 24px "Playfair"\')')
  expect(page.locator('.stat').first).to_contain_text('3')
  assert page.locator('[data-view=attendance]').count()==0
  assert page.locator('[data-view=roles]').count()==0
  page.screenshot(path=str(OUT/'overview-desktop.png'),full_page=True)
  passed('Local fonts, premium overview, sample-data banner and excluded attendance/staff roles')
  page.locator('[data-view=payments]').click()
  expect(page.locator('#paymentRows tr')).to_have_count(3)
  page.locator('#paymentSearch').fill('Ayaan');expect(page.locator('#paymentRows tr')).to_have_count(1)
  page.locator('[data-action=payment]').click();page.locator('#paymentAmount').fill('1000')
  page.locator('#paymentForm').evaluate("form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))")
  expect(page.locator('#paymentMessage')).to_contain_text('exceeds')
  page.locator('#paymentAmount').fill('400');page.locator('#paymentMethod').select_option('UPI')
  page.locator('#paymentForm [type=submit]').click()
  expect(page.locator('#dialogTitle')).to_contain_text('Payment recorded')
  expect(page.locator('[data-document=filled-receipt]')).to_contain_text('DEMO-RC-0003')
  expect(page.locator('[data-document=filled-receipt]')).to_contain_text('₹400')
  expect(page.locator('[data-document=filled-receipt]')).to_contain_text('₹399')
  page.screenshot(path=str(OUT/'filled-receipt-screen.png'),full_page=True)
  page.locator('#dialog [data-action=printReceipt]').click()
  assert page.evaluate('__printCalls')==1
  def pdf(name,kind,expected_pages):
   assert page.locator('#printArea').get_attribute('data-kind')==kind
   path=OUT/(name+'.pdf');page.pdf(path=str(path),prefer_css_page_size=True,print_background=True)
   doc=fitz.open(path);assert len(doc)==expected_pages,(name,len(doc));text=''.join(item.get_text() for item in doc)
   doc[0].get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(OUT/(name+'.png'))
   return doc,text
  doc,text=pdf('filled-receipt','receipt',1)
  assert 'Ayaan Demo' in text and 'DEMO-RC-0003' in text
  assert abs(doc[0].rect.width-595.28)<3 and abs(doc[0].rect.height-419.53)<3
  passed('Partial payment validates overpayment, records once and prints a filled A5 receipt with its own balance')
  page.locator('#dialog [data-action=whatsapp]').click()
  message=page.locator('#whatsappText').input_value()
  assert 'Ayaan Demo' in message and 'October 2026' in message and '₹400' in message and '₹399' in message
  with page.expect_popup() as opened:page.locator('#openWhatsApp').click()
  popup=opened.value;popup.wait_for_load_state();assert parse_qs(urlparse(popup.url).query)['text']==[message]
  popup.close();assert len(whatsapp)==1
  page.locator('#closeDialog').click()
  row=page.locator('#paymentRows tr').filter(has_text='Ayaan Demo');expect(row).to_contain_text('₹600');expect(row).to_contain_text('₹399')
  page.locator('[data-view=reports]').click();expect(page.locator('.stats')).to_contain_text('₹1,599');expect(page.locator('.stats')).to_contain_text('₹1,398')
  with page.expect_download() as downloaded:page.locator('[data-action=reportCSV]').click()
  csv=Path(downloaded.value.path()).read_text(encoding='utf-8-sig');assert 'Ayaan Demo' in csv and '600.00' in csv and '399.00' in csv
  page.locator('[data-action=printReport]').click();pdf('monthly-report','report',1)
  passed('WhatsApp opens only a filled draft; reports and CSV reconcile with sample payment totals')
  page.locator('[data-view=payments]').click();page.locator('[data-action=blank]').click()
  blank=page.locator('#dialog [data-document=blank-receipt]')
  expect(blank).not_to_contain_text('Ayaan');expect(blank).not_to_contain_text('October');expect(blank).not_to_contain_text('999')
  assert blank.locator('.write-line').count()>=8
  page.locator('[data-action=printBlank]').click();doc,text=pdf('blank-receipt','receipt',1)
  assert 'Ayaan Demo' not in text and 'October 2026' not in text and 'DEMO-RC-0003' not in text
  page.locator('[data-action=printSheet]').click();doc,text=pdf('two-blank-receipts','sheet',1)
  assert text.splitlines().count('Rehaan Computers')==2
  assert abs(doc[0].rect.height-841.89)<3
  page.locator('#closeDialog').click()
  passed('Blank name/date/month/amount fields and two handwritten forms fit one A4 page')
  page.locator('[data-view=import]').click();page.locator('[data-action=loadSampleCSV]').click()
  expect(page.locator('#commitImport')).to_contain_text('2 valid')
  expect(page.locator('#view')).to_contain_text('Duplicate admission number')
  page.locator('#commitImport').click();expect(page.locator('#importMessage')).to_contain_text('tick the confirmation')
  page.locator('#confirmImport').check();page.locator('#commitImport').click()
  expect(page.locator('#importMessage')).to_contain_text('2 sample students imported')
  expect(page.locator('#commitImport')).to_be_disabled()
  page.locator('[data-view=payments]').click();expect(page.locator('#paymentRows tr')).to_have_count(5)
  expect(page.locator('#view')).to_contain_text('Opening fees need review')
  page.locator('[data-view=import]').click();page.locator('[data-action=loadSampleCSV]').click()
  page.locator('#csvFile').set_input_files({'name':'invalid.xlsx','mimeType':'application/octet-stream','buffer':b'not a CSV'})
  expect(page.locator('#importMessage')).to_contain_text('Save the Excel sheet as CSV')
  expect(page.locator('#commitImport')).to_be_disabled()
  page.locator('[data-view=activity]').click();expect(page.locator('#eventRows')).to_contain_text('Student import completed')
  page.locator('#activityFilter').select_option('payment');expect(page.locator('#eventRows .event')).to_have_count(3)
  page.locator('#eventRows [data-action=event]').first.click();expect(page.locator('#dialogBody')).to_contain_text('Balance after payment')
  expect(page.locator('#dialogBody')).to_contain_text('₹399');page.locator('#closeDialog').click()
  passed('Reviewed CSV imports skip duplicates, do not record payments, reject stale file reviews and show audit detail')
  page.locator('[data-view=documents]').click();page.locator('[data-action=printMarks]').click();doc,text=pdf('mark-card','marks',1)
  assert 'Ayaan Demo' in text and '251' in text and '83.67%' in text
  assert abs(doc[0].rect.height-841.89)<3
  page.locator('[data-doc-tab=certificate]').click()
  expect(page.locator('[data-action=printCertificate]')).to_be_disabled()
  page.locator('[data-action=issueCertificate]').click();expect(page.locator('#certificateMessage')).to_contain_text('tick the approval')
  page.locator('#approveCertificate').check();page.locator('[data-action=issueCertificate]').click()
  expect(page.locator('[data-action=printCertificate]')).to_be_enabled()
  page.locator('[data-action=printCertificate]').click();doc,text=pdf('certificate','certificate',1)
  assert 'Certificate of Achievement' in text and 'Ayaan Demo' in text and 'DEMO-CERT-0001' in text
  assert abs(doc[0].rect.width-841.89)<3 and abs(doc[0].rect.height-595.28)<3
  page.screenshot(path=str(OUT/'certificate-screen.png'),full_page=True)
  page.locator('#documentStudent').select_option('demo-003')
  expect(page.locator('[data-action=issueCertificate]')).to_be_disabled()
  expect(page.locator('#view')).to_contain_text('below the sample pass mark')
  page.locator('[data-action=marks]').click();page.locator('[data-score="2"]').fill('80')
  page.locator('#marksForm [type=submit]').click()
  expect(page.locator('[data-action=issueCertificate]')).to_be_enabled()
  passed('Detailed A4 mark card, approval-gated landscape certificate and component-level pass rules')
  for width in [390,768,1500]:
   page.set_viewport_size({'width':width,'height':1000})
   for section in ['overview','payments','import','activity','reports','assessments','documents']:
    page.locator('[data-view='+section+']').click()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,section)
  page.set_viewport_size({'width':390,'height':844});page.locator('[data-view=payments]').click();page.locator('[data-action=blank]').click()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(OUT/'blank-receipt-mobile.png'),full_page=True)
  page.locator('#closeDialog').click();page.reload();page.locator('[data-view=payments]').click();expect(page.locator('#paymentRows tr')).to_have_count(3)
  assert page.evaluate('localStorage.length')==0
  assert not errors,errors
  assert not external,external
  assert not writes,writes
  assert not dialogs,dialogs
  passed('All sections fit desktop/tablet/mobile; reload resets sample data; no storage, SDK or real-service requests')
  browser.close()
 server.shutdown();print('Completed',len(checks),'preview workflow groups. Artifacts:',OUT)
if __name__=='__main__':run()
