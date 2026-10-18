"""Production feature UI with an intercepted Firebase SDK. No live services."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from urllib.parse import urlparse,parse_qs
import importlib.util,json,struct
import fitz
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('admin_regression',ROOT/'tests/admin-browser.py');baseline=importlib.util.module_from_spec(spec);spec.loader.exec_module(baseline)
OUT=ROOT/'tests/artifacts/features';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

def run():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'public')));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 checks=[]
 def passed(text):checks.append(text);print('PASS:',text,flush=True)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  context=browser.new_context(viewport={'width':1440,'height':1100},accept_downloads=True,reduced_motion='reduce')
  external=[];network_writes=[];errors=[];whatsapp=[]
  def route(r):
   url=r.request.url
   if url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):
    r.fulfill(content_type='application/javascript',body=baseline.MOCK,headers={'Access-Control-Allow-Origin':'*'})
   elif url==baseline.CLOUDINARY_PHOTO:r.fulfill(content_type='image/jpeg',body=(ROOT/'tests/fixtures/photo-check.jpg').read_bytes())
   elif url.startswith('https://wa.me/'):
    whatsapp.append(url);r.fulfill(content_type='text/html',body='Intercepted WhatsApp draft. Nothing sent.')
   elif url.startswith(base):
    if r.request.method not in ['GET','HEAD']:network_writes.append(url);r.abort()
    else:r.continue_()
   else:external.append(url);r.abort()
  context.route('**/*',route)
  def open_page(records):
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
   page.add_init_script('window.__fixture={records:'+json.dumps(records)+',writes:[],listeners:[],authorized:true,auth:{currentUser:null,authStateReady:async()=>{}}};window.print=()=>{window.__printed=(window.__printed||0)+1};')
   page.goto(base+'/admin.html');expect(page.locator('#adminDashboard')).to_be_hidden();assert page.evaluate('__fixture.writes.length')==0
   page.locator('#adminEmail').fill('admin@example.test');page.locator('#adminPassword').fill('valid-password');page.locator('#adminLoginButton').click();expect(page.locator('#adminDashboard')).to_be_visible();return page
  def pdf(page,name,kind,count=1):
   assert page.locator('#rcPrintArea').get_attribute('data-kind')==kind
   path=OUT/(name+'.pdf');page.pdf(path=str(path),prefer_css_page_size=True,print_background=True);doc=fitz.open(path);assert len(doc)==count,(name,len(doc));pix=doc[0].get_pixmap(matrix=fitz.Matrix(1.3,1.3));assert pix.pixel(0,0)==(255,255,255);pix.save(OUT/(name+'.png'));return '\n'.join(p.get_text() for p in doc)
  fixtures=json.loads(json.dumps(baseline.FIXTURES));fixtures['enrolled']['phone']='9999999991'
  page=open_page(fixtures);page.locator('[data-section=marks]').click();expect(page.locator('#rcMarkStudent option')).to_have_count(4);page.locator('#rcMarkStudent').select_option('enrolled');expect(page.locator('[data-new=printMarks]')).to_be_disabled()
  before=page.evaluate('structuredClone(__fixture.records.enrolled)')
  for i,mark in enumerate(['76','84','91']):page.locator('[data-subject=marks]').nth(i).fill(mark)
  page.locator('#rcMarksForm [type=submit]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('Marks saved securely');expect(page.locator('#rcMarkPreview')).to_contain_text('83.67%');expect(page.locator('[data-new=printMarks]')).to_be_enabled()
  saved=page.evaluate('structuredClone(__fixture.records.enrolled)');assert 'markCard' in saved
  for key,value in before.items():assert saved[key]==value,key
  assert len(page.evaluate('__fixture.writes'))==1
  page.locator('[data-new=printMarks]').click();text=pdf(page,'mark-card','marks');assert 'Sara Khan' in text and '251' in text and '83.67%' in text and 'DESIGN PREVIEW' not in text
  # Unsaved changes cannot be printed; another admin's mark update cannot be overwritten.
  page.locator('[data-subject=marks]').first.fill('80');expect(page.locator('[data-new=printMarks]')).to_be_disabled()
  page.evaluate('__fixture.records.enrolled.markCard.title="Updated by other admin"');page.locator('#rcMarksForm [type=submit]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('another session');assert page.evaluate('__fixture.records.enrolled.markCard.subjects[0].marks')==76
  page.locator('#refreshApplications').click();page.locator('#rcMarkStudent').select_option('enrolled');expect(page.locator('#rcExamTitle')).to_have_value('Updated by other admin')
  passed('Saved per-student mark cards preserve every original field; stale edits are rejected and saved A4 output is printable')
  page.locator('[data-section=fees]').click();page.locator('[data-fee-pay=enrolled]').click();page.locator('#rcPaymentAmount').fill('400');page.locator('#rcPaymentForm [type=submit]').click();page.locator('#rcPaymentForm').evaluate("f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))")
  expect(page.locator('#rcPaymentMessage')).to_contain_text('Total received ₹600');expect(page.locator('#rcOpenSavedReceipt')).to_be_visible()
  record=page.evaluate('structuredClone(__fixture.records.enrolled)');assert record['monthlyFees']['2026-02-01']==600;assert record['payment']==before['payment'];assert record['photo']==before['photo'];assert len(record['feeReceipts'])==1
  receipt=next(iter(record['feeReceipts'].values()));assert receipt['amount']==40000 and receipt['balanceAtIssue']==39900
  writes=page.evaluate('__fixture.writes');payment_write=[w for w in writes if any(k.startswith('monthlyFees.') for k in w.get('data',{}))];assert len(payment_write)==1 and any(k.startswith('feeReceipts.') for k in payment_write[0]['data'])
  page.locator('#rcOpenSavedReceipt').click();expect(page.locator('#rcFeatureDialog .receipt-totals')).to_contain_text('₹399');page.locator('[data-new=printReceipt]').click();text=pdf(page,'receipt','receipt');assert receipt['number'] in text and 'Sara Khan' in text and 'DESIGN PREVIEW' not in text
  with page.expect_download() as downloaded:page.locator('[data-new=image]').click()
  png=Path(downloaded.value.path()).read_bytes();assert png.startswith(b'\x89PNG') and struct.unpack('>II',png[16:24])==(1600,1160);(OUT/'receipt-image.png').write_bytes(png)
  page.locator('[data-new=whatsapp]').click();expect(page.locator('#rcShareImage')).to_be_visible();url=page.locator('#rcOpenWhatsApp').get_attribute('href');assert urlparse(url).path=='/919999999991';assert '₹400' in parse_qs(urlparse(url).query)['text'][0]
  with page.expect_popup() as opened:page.locator('#rcOpenWhatsApp').click()
  opened.value.wait_for_load_state();opened.value.close();assert len(whatsapp)==1;page.locator('[data-new=close]').click()
  passed('Payment and receipt share one commit; repeat submission is blocked, and PNG/WhatsApp use saved receipt values and student mobile')
  page.locator('[data-new=receipts]').click();page.locator('[data-new=openReceipt]').click();page.locator('[data-new=editReceipt]').click()
  form=page.locator('#rcReceiptEditForm');form.locator('[name=amount]').fill('300');form.locator('[name=method]').select_option('Cash');form.locator('[name=note]').fill('Corrected after checking cash register');form.locator('[name=reason]').fill('Amount entered incorrectly');form.locator('[name=confirmed]').check()
  expect(page.locator('#rcCorrectionPreview')).to_contain_text('₹499');form.locator('[type=submit]').click()
  expect(page.locator('#rcFeatureDialog .receipt-totals')).to_contain_text('₹499');expect(page.locator('#rcFeatureDialog')).to_contain_text('Correction history (1)')
  corrected=page.evaluate('structuredClone(__fixture.records.enrolled)');assert corrected['monthlyFees']['2026-02-01']==500;receipt=corrected['feeReceipts'][receipt['id']];assert receipt['amount']==30000 and receipt['amendments'][0]['before']['amount']==40000
  for key,value in record.items():
   if key not in ['monthlyFees','feeReceipts','updatedAt','updatedBy']:assert corrected[key]==value,key
  page.locator('[data-new=printReceipt]').click();text=pdf(page,'corrected-receipt','receipt');assert 'Cash' in text and 'CORRECTION' in text and 'Corrected after checking cash register' in text
  with page.expect_download() as downloaded:page.locator('[data-new=image]').click()
  (OUT/'corrected-receipt-image.png').write_bytes(Path(downloaded.value.path()).read_bytes())
  page.locator('[data-new=receiptHistory]').click();page.locator('.rc-correction-history summary').click();expect(page.locator('#rcFeatureDialog')).to_contain_text('Amount entered incorrectly');expect(page.locator('#rcFeatureDialog')).to_contain_text('admin-uid');page.locator('[data-new=openReceipt]').click()
  page.locator('[data-new=whatsapp]').click();expect(page.locator('#rcShareImage')).to_be_visible();message=parse_qs(urlparse(page.locator('#rcOpenWhatsApp').get_attribute('href')).query)['text'][0];assert '₹300' in message and '₹499' in message and 'Balance at correction' in message;page.locator('[data-new=close]').click()
  # A denied correction must preserve both ledger and receipt history.
  page.locator('[data-new=receipts]').click();page.locator('[data-new=openReceipt]').click();page.locator('[data-new=editReceipt]').click();form=page.locator('#rcReceiptEditForm');form.locator('[name=amount]').fill('350');form.locator('[name=reason]').fill('Checking permission denial');form.locator('[name=confirmed]').check();page.evaluate('__fixture.failWrite=true');form.locator('[type=submit]').click();expect(page.locator('#rcReceiptEditStatus')).to_contain_text('not saved');assert page.evaluate('__fixture.records.enrolled')==corrected;page.evaluate('__fixture.failWrite=false');page.locator('[data-new=close]').click()
  passed('Receipt edits atomically correct the monthly total, retain original amounts/reason/admin history, print/share revised values and preserve data on denied writes')
  persisted=page.evaluate('structuredClone(__fixture.records)');page.close();page=open_page(persisted)
  page.locator('[data-section=marks]').click();page.locator('#rcMarkStudent').select_option('enrolled');expect(page.locator('#rcMarkPreview')).to_contain_text('83.67%');expect(page.locator('#rcExamTitle')).to_have_value('Updated by other admin')
  page.locator('[data-section=fees]').click();expect(page.locator('[data-new=receipts]')).to_contain_text('(1)');page.locator('[data-new=receipts]').click();page.locator('[data-new=openReceipt]').click();expect(page.locator('#rcFeatureDialog .receipt-paper')).to_contain_text(receipt['number']);page.locator('[data-new=close]').click()
  passed('Fresh sign-in loads stored marks and receipts from the saved student document; no JSON backup is required')
  page.locator('[data-new=blank]').click();expect(page.locator('#rcFeatureDialog .receipt-paper')).not_to_contain_text('Sara');page.locator('[data-new=printBlank]').click();pdf(page,'blank','receipt');page.locator('[data-new=printSheet]').click();text=pdf(page,'two-blank','sheet');assert text.splitlines().count('Rehaan Computers')==2;page.locator('[data-new=close]').click()
  before=page.evaluate('structuredClone(__fixture.records.enrolled)');page.evaluate('__fixture.failWrite=true');page.locator('[data-fee-pay=enrolled]').click();page.locator('#rcPaymentAmount').fill('100');page.locator('#rcPaymentForm [type=submit]').click();expect(page.locator('#rcPaymentMessage')).to_contain_text('not saved');expect(page.locator('#rcOpenSavedReceipt')).to_have_count(0);assert page.evaluate('__fixture.records.enrolled')==before
  page.locator('#rcTuitionModal .admin-modal-close').click();page.evaluate('__fixture.failWrite=false')
  passed('A5 blank / two-up A4 printing works, and denied payment writes create neither a ledger change nor a receipt')
  for width in [390,768,1440]:
   page.set_viewport_size({'width':width,'height':1000})
   for section in ['marks','fees']:
    if width<=760:page.locator('#menuToggle').click()
    page.locator('[data-section='+section+']').click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,section)
  page.locator('[data-section=marks]').click();page.screenshot(path=str(OUT/'mark-cards-dashboard.png'),full_page=True)
  # 100 fixtures demonstrate that the new student selector is not a fixed sample list.
  many={f'student-{i}':{**fixtures['enrolled'],'fullName':f'Fixture Student {i}','admissionNumber':f'DEMO/{i:03}','photo':''} for i in range(100)}
  page.close();page=open_page(many);page.locator('[data-section=marks]').click();expect(page.locator('#rcMarkStudent option')).to_have_count(100);page.locator('#rcMarkStudent').select_option('student-99');expect(page.locator('#rcMarkPreview')).to_contain_text('Fixture Student 99')
  page.locator('#adminLogoutBtn').click();expect(page.locator('#adminDashboard')).to_be_hidden();assert page.locator('#rcPrintArea').count()==0 or page.locator('#rcPrintArea').inner_text()=='';assert page.locator('#rcFeatureDialog img[src^="blob:"]').count()==0
  assert not errors,errors;assert not external,external;assert not network_writes,network_writes
  passed('All 100 student fixtures are selectable; desktop/mobile fit; logout clears private feature UI; no real services contacted')
  browser.close()
 server.shutdown();print('Completed',len(checks),'new-feature browser groups.')
if __name__=='__main__':run()
