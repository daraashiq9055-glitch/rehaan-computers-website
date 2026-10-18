"""Current-dashboard preview only. External services and network writes are blocked."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import json,struct
import fitz
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parent
OUT=Path('/tmp/rehaan-current-preview-checks');OUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

def run():
 for name in ['admin-dashboard.css','admin-gold.css','admin-records.js','admin-login-effects.js']:
  assert (ROOT/name).read_bytes()==(ROOT.parents[1]/'public'/name).read_bytes(),name+' must match the deployed dashboard'
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 checks=[]
 def passed(message):checks.append(message);print('PASS:',message,flush=True)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  context=browser.new_context(viewport={'width':1440,'height':1100},accept_downloads=True,reduced_motion='reduce')
  errors=[];external=[];network_writes=[];whatsapp=[]
  def route(r):
   url=r.request.url
   if r.request.method not in ['GET','HEAD']:network_writes.append(url);r.abort()
   elif url.startswith(base):r.continue_()
   elif url.startswith('https://wa.me/'):
    whatsapp.append(url);r.fulfill(content_type='text/html',body='Intercepted WhatsApp test. No message sent.')
   else:external.append(url);r.abort()
  context.route('**/*',route)
  page=context.new_page();page.add_init_script('window.print=()=>{window.__prints=(window.__prints||0)+1}');page.on('pageerror',lambda error:errors.append(str(error)));page.on('dialog',lambda dialog:dialog.accept())
  page.goto(base+'/index.html');expect(page.locator('#adminDashboard')).to_be_visible();page.evaluate('document.fonts.ready')
  def nav(section):
   if page.viewport_size['width']<=760 and not page.evaluate("document.body.classList.contains('nav-open')"):page.locator('#menuToggle').click()
   page.locator('[data-section='+section+']').click()
  def state():return page.evaluate("async()=>structuredClone((await import('./preview-backend.js')).previewState.records)")
  def write_count():return page.evaluate("async()=>(await import('./preview-backend.js')).previewState.writes.length")
  def pdf(name,kind,count=1):
   assert page.locator('#rcPrintArea').get_attribute('data-kind')==kind
   path=OUT/(name+'.pdf');page.pdf(path=str(path),prefer_css_page_size=True,print_background=True);doc=fitz.open(path);assert len(doc)==count,(name,len(doc));pix=doc[0].get_pixmap(matrix=fitz.Matrix(1.4,1.4));assert pix.pixel(0,0)==(255,255,255);pix.save(OUT/(name+'.png'));return doc,'\n'.join(p.get_text() for p in doc)
  expect(page.locator('.nav [data-section]')).to_have_count(9)
  assert [b.get_attribute('data-section') for b in page.locator('.nav [data-section]').all()]==['overview','admissions','students','fees','courses','batches','reports','settings','marks']
  expect(page.locator('#workspaceSummary .workspace-stat')).to_have_count(4)
  assert write_count()==0
  page.screenshot(path=str(OUT/'current-dashboard.png'),full_page=True)
  passed('Deployed dashboard CSS/helpers are identical; original eight sections remain with only Mark Cards added')
  # Synthetic saved mobile; no real WhatsApp request is allowed by this test.
  page.evaluate("async()=>{const s=(await import('./preview-backend.js')).previewState;s.records['sample-ayaan'].phone='9999999991';s.records['sample-ayaan'].customLegacyField={keep:true};}")
  page.locator('#refreshApplications').click();nav('marks');expect(page.locator('#rcMarkStudent option')).to_have_count(3)
  before=state()
  page.locator('#rcMarkStudent').select_option('sample-ayaan')
  for i,value in enumerate(['76','84','91']):page.locator('[data-subject=marks]').nth(i).fill(value)
  page.locator('#rcMarksForm [type=submit]').click();expect(page.locator('#rcMarkPreview')).to_contain_text('83.67%');expect(page.locator('#rcMarkPreview')).to_contain_text('251')
  assert state()==before and write_count()==0
  page.locator('[data-new=printMarks]').click();doc,text=pdf('mark-card','marks');assert 'Ayaan Demo' in text and '251' in text and '83.67%' in text
  assert abs(doc[0].rect.height-841.89)<3
  page.screenshot(path=str(OUT/'mark-cards-section.png'),full_page=True)
  page.locator('#rcMarkStudent').select_option('sample-zoya');expect(page.locator('#rcMarkPreview')).to_contain_text('Zoya Application Demo');expect(page.locator('#rcMarkPreview')).to_contain_text('Incomplete')
  page.locator('#rcMarkStudent').select_option('sample-ayaan');expect(page.locator('#rcMarkPreview')).to_contain_text('83.67%')
  page.locator('[data-subject=name]').nth(1).fill('Computer fundamentals');page.locator('#rcMarksForm').evaluate("f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");expect(page.locator('#rcMarksStatus')).to_contain_text('unique name')
  assert state()==before and write_count()==0
  passed('One Mark Cards section covers all loaded students; marks persist per student in memory without touching profiles/fees')
  nav('fees');expect(page.locator('#rcReceiptTools')).to_be_visible()
  page.locator('[data-fee-pay=sample-ayaan]').click();page.locator('#rcPaymentAmount').fill('1000');page.locator('#rcPaymentForm').evaluate("f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");expect(page.locator('#rcPaymentMessage')).to_contain_text('Enter a valid');assert write_count()==0
  page.locator('#rcPaymentAmount').fill('400');page.locator('#rcPaymentForm [type=submit]').click();page.locator('#rcPaymentForm').evaluate("f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");expect(page.locator('#rcOpenSavedReceipt')).to_be_visible()
  now=state();key=next(iter(before['sample-ayaan']['monthlyFees']));assert now['sample-ayaan']['monthlyFees'][key]==600;assert now['sample-ayaan']['payment']==before['sample-ayaan']['payment'];assert now['sample-ayaan']['customLegacyField']=={'keep':True};assert write_count()==1
  page.locator('#rcOpenSavedReceipt').click();expect(page.locator('#rcFeatureDialog')).to_be_visible();expect(page.locator('.receipt-totals')).to_contain_text('₹400');expect(page.locator('.receipt-totals')).to_contain_text('₹600');expect(page.locator('.receipt-totals')).to_contain_text('₹399')
  page.locator('[data-new=printReceipt]').click();doc,text=pdf('filled-receipt','receipt');assert 'Ayaan Demo' in text and 'PREVIEW-RC-0001' in text;assert abs(doc[0].rect.width-595.28)<3
  with page.expect_download() as downloaded:page.locator('[data-new=image]').click()
  png=Path(downloaded.value.path()).read_bytes();assert png.startswith(b'\x89PNG') and struct.unpack('>II',png[16:24])==(1600,1160);(OUT/'receipt-image.png').write_bytes(png)
  page.locator('[data-new=whatsapp]').click();expect(page.locator('#rcShareImage')).to_be_visible();assert page.locator('#rcOpenWhatsApp').get_attribute('href').startswith('https://wa.me/919999999991?')
  with page.expect_popup() as opened:page.locator('#rcOpenWhatsApp').click()
  opened.value.wait_for_load_state();opened.value.close();assert len(whatsapp)==1
  page.screenshot(path=str(OUT/'whatsapp-receipt.png'),full_page=True);page.locator('[data-new=close]').click()
  passed('Existing payment form adds ₹400 exactly once; receipt balances, PNG and saved-number WhatsApp agree')
  page.locator('[data-new=blank]').click();expect(page.locator('#rcFeatureDialog .receipt-paper')).not_to_contain_text('Ayaan');page.locator('[data-new=printBlank]').click();pdf('blank-receipt','receipt');page.locator('[data-new=printSheet]').click();doc,text=pdf('two-blank-receipts','sheet');assert text.splitlines().count('Rehaan Computers')==2;page.locator('[data-new=close]').click()
  page.evaluate("async()=>{(await import('./preview-backend.js')).previewState.failWrite=true}")
  page.locator('[data-fee-pay=sample-sara]').click();page.locator('#rcPaymentAmount').fill('200');page.locator('#rcPaymentForm [type=submit]').click();expect(page.locator('#rcPaymentMessage')).to_contain_text('Payment not saved');expect(page.locator('#rcOpenSavedReceipt')).to_have_count(0);assert state()==now and write_count()==1
  page.locator('#rcTuitionModal .admin-modal-close').click();page.evaluate("async()=>{(await import('./preview-backend.js')).previewState.failWrite=false}")
  page.locator('[data-new=receipts]').click();expect(page.locator('.rc-receipt-list button')).to_have_count(1);page.locator('[data-new=close]').click()
  passed('Blank A5 / two-up A4 print correctly; a failed payment cannot create a receipt or change the ledger')
  for section in ['overview','admissions','students','courses','batches','reports','settings']:nav(section);expect(page.locator('#workspaceHeading')).not_to_be_empty()
  nav('reports')
  with page.expect_download() as downloaded:page.locator('#reportJson').click()
  exported=json.loads(Path(downloaded.value.path()).read_text());assert {r['id']:r['data'] for r in exported['records']}==state()
  passed('Original navigation and full JSON export retain all fields, including legacy data and admission payments')
  private={'collection':'applications','exportedAt':'2026-10-18T00:00:00Z','records':[{'id':'private-one','data':{'fullName':'Private Student <b>literal</b>','parentName':'Guardian','phone':'9999999992','status':'Approved','admissionNumber':'RC/101','admissionDate':'2026-01-14','coursePreference':'Custom course','batch':'Evening','gender':'female','monthlyFees':{'2026-02-14':500.25,'2026-03-14':999},'payment':{'status':'paid','amount':100},'extra':{'all':['original','fields']}}},{'id':'private-two','data':{'fullName':'Pending Private Student','status':'New','customField':42}}]}
  page.locator('#previewBackup').set_input_files({'name':'private.json','mimeType':'application/json','buffer':json.dumps(private).encode()});expect(page.locator('#previewSourceLabel')).to_contain_text('2 records');assert state()=={r['id']:r['data'] for r in private['records']};assert write_count()==0
  nav('marks');expect(page.locator('#rcMarkStudent option')).to_have_count(2);expect(page.locator('#rcMarkPreview')).to_contain_text('Private Student <b>literal</b>');assert page.locator('#rcMarkPreview b').count()==1
  for i,value in enumerate(['90','85','80']):page.locator('[data-subject=marks]').nth(i).fill(value)
  page.locator('#rcMarksForm [type=submit]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('Student and payment records unchanged')
  assert state()=={r['id']:r['data'] for r in private['records']} and write_count()==0
  nav('fees');page.locator('[data-fee-pay=private-one]').click();page.locator('#rcPaymentAmount').fill('100');page.locator('#rcPaymentForm [type=submit]').click();expect(page.locator('#rcPaymentMessage')).to_contain_text('read-only');assert write_count()==0;page.locator('#rcTuitionModal .admin-modal-close').click()
  nav('reports')
  with page.expect_download() as downloaded:page.locator('#reportJson').click()
  exported=json.loads(Path(downloaded.value.path()).read_text());assert {r['id']:r['data'] for r in exported['records']}=={r['id']:r['data'] for r in private['records']}
  page.locator('#previewBackup').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{bad'});expect(page.locator('#previewStatus')).to_contain_text('not valid JSON');assert len(state())==2
  passed('Complete private backups retain every field and exact fee amount; marks work for all records while payments stay read-only')
  page.locator('#previewReset').click();expect(page.locator('#previewSourceLabel')).to_contain_text('sample records')
  for width in [390,768,1440]:
   page.set_viewport_size({'width':width,'height':1000})
   for section in ['overview','students','fees','marks']:
    nav(section);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,section)
  page.set_viewport_size({'width':390,'height':844});nav('marks');page.screenshot(path=str(OUT/'mark-cards-mobile.png'),full_page=True)
  page.reload();expect(page.locator('#adminDashboard')).to_be_visible();assert len(state())==3 and write_count()==0;assert page.evaluate('localStorage.length')==0
  assert not errors,errors;assert not external,external;assert not network_writes,network_writes
  passed('Desktop/tablet/mobile layouts fit; reload clears private records and drafts; no real-service requests or writes')
  browser.close()
 server.shutdown();print('Completed',len(checks),'workflow groups. Artifacts:',OUT)
if __name__=='__main__':run()
