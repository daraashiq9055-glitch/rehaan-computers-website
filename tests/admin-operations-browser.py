"""Today/accounts/payment preview using only local adapters and generated sample data."""
import importlib.util,json
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('launcher',ROOT/'preview-admin.py');launcher=importlib.util.module_from_spec(spec);spec.loader.exec_module(launcher)
OUT=ROOT/'tests/artifacts/admin-operations'

def run():
 OUT.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(launcher.PreviewHandler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   context=browser.new_context(viewport={'width':1512,'height':1100},reduced_motion='reduce',accept_downloads=True)
   errors,external,writes,failed=[],[],[],[]
   def route(r):
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
    elif r.request.url.startswith(base+'/'):r.continue_()
    else:external.append(r.request.url);r.abort()
   context.route('**/*',route)
   page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)));page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None);page.on('dialog',lambda d:d.accept())
   page.goto(base+launcher.PREVIEW);expect(page.locator('[data-operations=today]')).to_be_enabled()
   page.evaluate('__adminPreview.records["demo-2"].monthlyFees={"2026-09-12":200}')
   page.locator('#refreshApplications').click()
   def open_view(name):
    if page.viewport_size['width']<=760:page.locator('#menuToggle').click()
    page.locator('[data-operations='+name+']').click();expect(page.locator('#operationsWorkspace')).to_be_visible()
   open_view('today');expect(page.locator('#workspaceHeading')).to_contain_text('clear start')
   before=page.evaluate('structuredClone(__adminPreview.records)')
   page.locator('[data-today-action=admissions]').first.click();expect(page.locator('[data-section=admissions]')).to_have_attribute('aria-current','page');expect(page.locator('#operationsWorkspace')).to_be_hidden()
   open_view('today');page.locator('#todayRecords').click();expect(page.locator('#recordsCentre')).to_be_visible();expect(page.locator('#operationsWorkspace')).to_be_hidden()
   open_view('accounts');page.locator('[data-account-range=all]').click();expect(page.locator('#accountsTotals')).to_contain_text('₹600');expect(page.locator('.ops-history-notice')).to_contain_text('₹200');expect(page.locator('#accountsRows tr')).to_have_count(6)
   page.locator('#accountKind').select_option('Tuition');expect(page.locator('#accountsRows')).to_contain_text('No dated entries');page.locator('#accountKind').select_option('')
   assert page.evaluate('__adminPreview.records')==before;assert page.evaluate('__adminPreview.writes.length')==0
   print('PASS: Today and accounts navigation, admission/tuition separation and undated legacy payments preserve all sample records',flush=True)
   page.locator('[data-section=fees]').click();page.locator('[data-fee-pay="demo-1"]').click()
   today=page.locator('#rcPaymentDate').input_value();yesterday=page.evaluate('(today)=>{const d=new Date(today+"T00:00:00Z");d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)}',today)
   page.locator('#rcPaymentAmount').fill('400');page.locator('#rcPaymentMethod').select_option('UPI');page.locator('#rcPaymentDate').fill(yesterday);page.locator('#rcPaymentReference').fill('UPI-TEST-123');page.locator('#rcPaymentNote').fill('Received at centre')
   expect(page.locator('#rcPaymentBalance')).to_contain_text('₹599');expect(page.locator('#paymentReviewMethod')).to_contain_text('UPI')
   page.screenshot(path=str(OUT/'payment-desktop.png'),full_page=True)
   page.locator('#rcPaymentForm [type=submit]').click();page.locator('#rcPaymentForm').evaluate("form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))")
   expect(page.locator('#rcPaymentMessage')).to_contain_text('Payment saved');expect(page.locator('#rcPaymentForm [type=submit]')).to_be_disabled()
   record=page.evaluate('__adminPreview.records["demo-1"]');receipt=next(iter(record['feeReceipts'].values()));assert receipt['method']=='UPI' and receipt['date']==yesterday and 'UPI-TEST-123' in receipt['note'];assert record['payment']==before['demo-1']['payment'];assert len(record['feeReceipts'])==1 and sum(record['monthlyFees'].values())==400
   assert len(page.evaluate('__adminPreview.writes'))==1
   with page.expect_download() as download:page.locator('#paymentDownloadImage').click()
   assert Path(download.value.path()).read_bytes().startswith(b'\x89PNG')
   page.locator('#rcOpenSavedReceipt').click();expect(page.locator('#rcFeatureDialog')).to_contain_text('UPI-TEST-123')
   page.locator('[data-new=printReceipt]').evaluate('button=>{window.print=()=>{};button.click()}');page.pdf(path=str(OUT/'payment-receipt.pdf'),prefer_css_page_size=True,print_background=True)
   page.locator('[data-new=close]').click();open_view('accounts');page.locator('[data-account-range=all]').click();page.locator('#accountKind').select_option('Tuition');expect(page.locator('#accountsTotals')).to_contain_text('₹400');page.locator('#accountMethod').select_option('UPI');expect(page.locator('#accountsRows tr')).to_have_count(1)
   with page.expect_download() as download:page.locator('#accountsExport').click()
   csv=Path(download.value.path()).read_text(encoding='utf-8-sig');assert '400.00' in csv and 'UPI-TEST-123' in csv and yesterday in csv and 'Sara Khan' in csv
   page.locator('[data-account-student="demo-1"]').click();page.locator('[data-new=editReceipt]').click()
   form=page.locator('#rcReceiptEditForm');form.locator('[name=amount]').fill('300');form.locator('[name=method]').select_option('Cash');form.locator('[name=date]').fill(today);form.locator('[name=reason]').fill('Correct cash payment details');form.locator('[name=confirmed]').check();form.locator('[type=submit]').click();expect(page.locator('#rcFeatureDialog')).to_contain_text('Correction history (1)');page.locator('[data-new=close]').click()
   page.locator('#accountMethod').select_option('Cash');page.locator('[data-account-range=today]').click();expect(page.locator('#accountsTotals')).to_contain_text('₹300');expect(page.locator('#accountsRows')).to_contain_text('Corrected')
   page.locator('#accountMethod').select_option('UPI');expect(page.locator('#accountsRows')).to_contain_text('No dated entries');page.locator('#accountMethod').select_option('')
   print('PASS: richer payment stores amount/method/date/reference atomically; repeated submit is blocked; PNG/PDF/CSV match saved receipt; corrections update daily method totals once',flush=True)
   page.locator('[data-section=fees]').click();page.locator('[data-fee-pay="demo-0"]').click();page.locator('#rcPaymentMethod').select_option('Cash');page.locator('#rcPaymentAmount').fill('50')
   unchanged=page.evaluate('structuredClone(__adminPreview.records)');page.evaluate('__adminPreview.failWrite=true');page.locator('#rcPaymentForm [type=submit]').click();expect(page.locator('#rcPaymentMessage')).to_contain_text('Payment not confirmed');assert page.evaluate('__adminPreview.records')==unchanged;assert page.locator('#rcOpenSavedReceipt').count()==0
   page.evaluate('__adminPreview.failWrite=false;__adminPreview.loseAcknowledgementOnce=true');count=page.evaluate('__adminPreview.writes.length');page.locator('#rcPaymentForm [type=submit]').click();expect(page.locator('#rcPaymentMessage')).to_contain_text('Payment not confirmed');assert page.evaluate('__adminPreview.writes.length')==count+1
   page.locator('#rcPaymentForm [type=submit]').click();expect(page.locator('#rcPaymentMessage')).to_contain_text('Payment saved');assert page.evaluate('__adminPreview.writes.length')==count+1;assert len(page.evaluate('__adminPreview.records["demo-0"].feeReceipts'))==1
   page.locator('#rcTuitionModal .admin-modal-close').click()
   page.locator('[data-fee-pay="demo-0"]').click();page.locator('#rcPaymentMethod').select_option('Cash');page.locator('#rcPaymentAmount').fill('10')
   due=page.locator('.payment-review').inner_text();key=next(iter(page.evaluate('__adminPreview.records["demo-0"].monthlyFees')))
   page.evaluate('(key)=>__adminPreview.records["demo-0"].monthlyFees[key]=75',key);unchanged=page.evaluate('structuredClone(__adminPreview.records)')
   page.locator('#rcPaymentForm [type=submit]').click();expect(page.locator('#rcPaymentMessage')).to_contain_text('changed');assert page.evaluate('__adminPreview.records')==unchanged;assert page.locator('#rcOpenSavedReceipt').count()==0;page.locator('#rcTuitionModal .admin-modal-close').click()
   print('PASS: denied commits save nothing; lost acknowledgement retries reuse the same receipt; stale balances cannot overwrite another administrator’s entry',flush=True)
   page.locator('#refreshApplications').click()
   for width in [320,390,768,1024,1512]:
    page.set_viewport_size({'width':width,'height':1000})
    for name in ['today','accounts']:
     open_view(name);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(name,width)
     if width in [390,1512]:page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(OUT/f'{name}-{width}.png'),full_page=True)
    if width<=760:page.locator('#menuToggle').click()
    page.locator('[data-section=fees]').click();page.locator('[data-fee-pay="demo-1"]').click();assert page.locator('#rcTuitionModal .admin-modal-card').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),('payment',width);page.locator('#rcTuitionModal .admin-modal-close').click()
   page.set_viewport_size({'width':1512,'height':1100});open_view('accounts');page.locator('#accountFrom').fill('2099-12-01');page.locator('#accountTo').fill('2000-01-01');page.locator('#accountTo').dispatch_event('change');expect(page.locator('#accountsStatus')).to_contain_text('valid date range');expect(page.locator('#accountsExport')).to_be_disabled()
   page.locator('#adminLogoutBtn').click();expect(page.locator('#operationsWorkspace')).to_be_hidden();assert page.locator('#operationsWorkspace').inner_text()==''
   assert not errors,errors;assert not external,external;assert not writes,writes;assert not failed,failed
   print('PASS: Today/accounts/payment fit five widths; invalid date ranges block export; logout clears private views; zero external requests or network writes',flush=True)
   browser.close()
 finally:server.shutdown()
if __name__=='__main__':run()
