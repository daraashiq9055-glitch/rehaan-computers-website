"""Records-centre review, profile and original payment entry points; local samples only."""
import importlib.util,json,base64
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('launcher',ROOT/'preview-admin.py');launcher=importlib.util.module_from_spec(spec);spec.loader.exec_module(launcher)
OUT=ROOT/'tests/artifacts/admin-records-centre'

def run():
 OUT.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(launcher.PreviewHandler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   context=browser.new_context(viewport={'width':1512,'height':1100},reduced_motion='reduce',accept_downloads=True)
   errors,external,failed,writes=[],[],[],[]
   def route(r):
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
    elif r.request.url.startswith(base+'/'):r.continue_()
    else:external.append(r.request.url);r.abort()
   context.route('**/*',route)
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None);page.on('dialog',lambda d:d.accept())
   page.goto(base+launcher.PREVIEW);expect(page.locator('[data-records-centre]')).to_be_enabled()
   def hub():
    if page.viewport_size['width']<=760:page.locator('#menuToggle').click()
    page.locator('[data-records-centre]').click();expect(page.locator('#recordsCentre')).to_be_visible()
   hub();expect(page.locator('.records-row')).to_have_count(8)
   before=page.evaluate('structuredClone(__adminPreview.records)')
   page.locator('[data-record-queue=review]').click();expect(page.locator('.records-row')).to_have_count(1);expect(page.locator('.records-row')).to_contain_text('Danish Malik')
   page.locator('[data-record-queue=duplicates]').click();expect(page.locator('.records-row')).to_have_count(2)
   page.locator('[data-open-profile="demo-6"]').first.click();expect(page.locator('.profile-match')).to_contain_text('Shared student phone');page.locator('[data-profile-match="demo-7"]').click();expect(page.locator('#profileName')).to_have_text('Danish Malik');page.locator('.profile-close').click()
   page.locator('[data-record-queue=photos]').click();expect(page.locator('.records-row')).to_have_count(8)
   page.locator('#recordsClear').click();page.locator('#recordsSearch').fill('9000000099');expect(page.locator('.records-row')).to_have_count(1)
   page.locator('#recordsSaveView').click();page.locator('#recordsSaveForm input').fill('Family contact');page.locator('#recordsSaveForm [type=submit]').click();expect(page.locator('.records-saved-chip')).to_have_count(1)
   page.locator('#recordsClear').click();expect(page.locator('.records-row')).to_have_count(8);page.locator('.records-saved-chip button').first.click();expect(page.locator('.records-row')).to_have_count(1)
   with page.expect_download() as download:page.locator('#recordsExport').click()
   csv=Path(download.value.path()).read_text(encoding='utf-8-sig');assert 'Mahira Lone' in csv and 'Sara Khan' not in csv
   assert page.evaluate('__adminPreview.records')==before
   assert page.evaluate('__adminPreview.writes.length')==0
   print('PASS: review/shared-family-phone/photo queues, guardian-phone search, session views and filtered CSV keep all original records unchanged',flush=True)
   page.locator('[data-fee-queue=overdue]').click();expect(page.locator('#rcFeeFilter')).to_have_value('overdue');expect(page.locator('#recordsCentre')).to_be_hidden();hub()
   page.locator('#recordsClear').click()
   # Seed only a generated test photo into the local adapter, then refresh normally.
   photo='data:image/jpeg;base64,'+base64.b64encode((ROOT/'tests/fixtures/photo-check.jpg').read_bytes()).decode()
   page.evaluate('photo=>__adminPreview.records["demo-0"].photo=photo',photo)
   page.locator('#refreshApplications').click();expect(page.locator('.records-row')).to_have_count(8)
   before=page.evaluate('structuredClone(__adminPreview.records)')
   page.locator('#recordsClear').click();page.locator('#recordsSearch').fill('Ayaan');page.locator('.records-open').click();expect(page.locator('#profileName')).to_have_text('Ayaan Mir')
   expect(page.locator('#profileStudentPhoto')).to_be_visible();page.wait_for_function('document.querySelector("#profileStudentPhoto")?.naturalWidth>0')
   with page.expect_download() as download:page.locator('#profileExport').click()
   original=json.loads(Path(download.value.path()).read_text())['records'][0];assert original['id']=='demo-0' and original['data']==before['demo-0']
   page.locator('[data-profile-tab=fees]').click();expect(page.locator('#profileContent')).to_contain_text('Admission fee');expect(page.locator('#profileContent')).to_contain_text('No monthly payments recorded')
   page.locator('[data-profile-tab=activity]').click();expect(page.locator('#profileContent')).to_contain_text('Record created');expect(page.locator('#profileContent')).to_contain_text('Admission approved')
   page.keyboard.press('Home');expect(page.locator('[data-profile-tab=overview]')).to_have_attribute('aria-selected','true')
   page.locator('#profileEdit').click();expect(page.locator('#adminDetailsModal .admin-edit-fields')).to_be_visible();page.locator('#adminDetailsModal .admin-modal-close').click()
   assert page.evaluate('__adminPreview.records')==before
   print('PASS: profile sections, available history, keyboard tabs, full private export and original edit form preserve unknown fields and fee metadata',flush=True)
   page.locator('#recordsSearch').fill('Sara');page.locator('.records-open').click();page.locator('[data-profile-tab=fees]').click();page.locator('#profileRecordPayment').click()
   expect(page.locator('#rcTuitionModal')).to_be_visible();assert page.evaluate('__adminPreview.writes.length')==0
   page.locator('#rcPaymentAmount').fill('400');page.locator('#rcPaymentForm [type=submit]').click();expect(page.locator('#rcPaymentMessage')).to_contain_text('Payment saved');page.locator('#rcOpenSavedReceipt').click();page.locator('[data-new=editReceipt]').click()
   form=page.locator('#rcReceiptEditForm');form.locator('[name=amount]').fill('300');form.locator('[name=reason]').fill('Records centre correction');form.locator('[name=confirmed]').check();form.locator('[type=submit]').click();expect(page.locator('#rcFeatureDialog')).to_contain_text('Correction history (1)');page.locator('[data-new=close]').click()
   hub();page.locator('#recordsSearch').fill('Sara');page.locator('.records-open').click();page.locator('[data-profile-tab=fees]').click();expect(page.locator('.profile-receipts button')).to_have_count(1);expect(page.locator('.profile-receipts button')).to_contain_text('₹300');expect(page.locator('.profile-ledger')).to_contain_text('₹300')
   page.locator('.profile-receipts button').click();expect(page.locator('#rcFeatureDialog')).to_contain_text('Correction history (1)');page.locator('[data-new=close]').click()
   hub();page.locator('#recordsSearch').fill('Sara');page.locator('.records-open').click();page.locator('[data-profile-tab=activity]').click();expect(page.locator('.profile-timeline')).to_contain_text('Records centre correction');page.locator('[data-profile-tab=marks]').click();page.locator('#profileMarks').click();expect(page.locator('#rcMarkStudent')).to_have_value('demo-1')
   for field,mark in zip(page.locator('[data-subject=marks]').all(),['82','87','90']):field.fill(mark)
   page.locator('#rcMarksForm [type=submit]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('Marks saved securely')
   hub();page.locator('#recordsSearch').fill('Sara');page.locator('.records-open').click();page.locator('[data-profile-tab=marks]').click();expect(page.locator('#profileContent')).to_contain_text('86.33%')
   record=page.evaluate('__adminPreview.records["demo-1"]');assert sum(record['monthlyFees'].values())==300 and record['payment']==before['demo-1']['payment'];assert len(next(iter(record['feeReceipts'].values()))['amendments'])==1
   for key,value in before.items():
    if key!='demo-1':assert page.evaluate('__adminPreview.records')[key]==value,key
   page.locator('.profile-close').click()
   print('PASS: profile opens the original fee/receipt/marks forms; corrected ledger and receipt history agree, original admission payment and other records remain intact',flush=True)
   page.locator('#recordsClear').click()
   for width in [320,390,768,1024,1512]:
    page.set_viewport_size({'width':width,'height':1000})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('hub',width)
    page.locator('#recordsSearch').fill('Sara');page.locator('[data-open-profile="demo-1"]').first.click()
    for tab in ['overview','fees','marks','activity']:
     page.locator('[data-profile-tab='+tab+']').click()
     assert page.locator('#studentProfile').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1'),('profile',width,tab)
    page.locator('.profile-close').click();page.locator('#recordsClear').click()
    if width in [390,1512]:
     page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(OUT/f'records-{width}.png'),full_page=True)
   page.set_viewport_size({'width':1512,'height':1100})
   # Reuse saved sample data to demonstrate pagination over 100 records.
   page.evaluate('''const template=structuredClone(__adminPreview.records['demo-0']);for(let i=0;i<100;i++)__adminPreview.records['many-'+i]={...structuredClone(template),fullName:'Demo '+i,admissionNumber:'DEMO/'+i,phone:String(9100000000+i)}''')
   page.locator('#refreshApplications').click();expect(page.locator('.records-row')).to_have_count(15);expect(page.locator('#recordsResultCount')).to_contain_text('108 of 108')
   page.locator('#recordsNext').click();expect(page.locator('#recordsPage')).to_have_text('Page 2 of 8')
   page.locator('#recordsSearch').fill('Demo 99');expect(page.locator('.records-row')).to_have_count(1)
   print('PASS: hub and all profile tabs fit five widths; pagination/search show all 108 samples without discarding records',flush=True)
   with page.expect_download() as download:page.locator('#recordsBackup').click()
   backup=json.loads(Path(download.value.path()).read_text());assert len(backup['records'])==108
   hub();page.locator('#adminLogoutBtn').click();expect(page.locator('#adminDashboard')).to_be_hidden();expect(page.locator('#recordsCentre')).to_be_hidden();assert page.locator('#recordsCentre').inner_text()=='';assert page.locator('#studentProfile').inner_text()==''
   page.locator('#adminEmail').fill('preview@example.test');page.locator('#adminPassword').fill('demo-only');page.locator('#adminLoginButton').click();expect(page.locator('#adminDashboard')).to_be_visible();hub();expect(page.locator('.records-saved-chip')).to_have_count(0)
   assert not errors,errors;assert not external,external;assert not failed,failed;assert not writes,writes
   print('PASS: full private backup includes every sample; logout clears profiles and saved views; no external requests, network writes, resource failures or JS errors',flush=True)
   browser.close()
 finally:server.shutdown()
if __name__=='__main__':run()
