"""Run with python3 tests/admin-browser.py. Requires Playwright and Chromium.

Every Firebase request is intercepted with an in-memory implementation. The test
blocks all other external requests; it never contacts production or sends mail.
"""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import json
import base64
import re
import struct
import zlib
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
COURSE = 'One Year Computer Diploma Course'
CLOUDINARY_PHOTO = 'https://res.cloudinary.com/test-cloud/image/upload/v123/test-student.jpg'
FIXTURES = {
    'online': {'fullName':'Ayaan Malik','parentName':'Parent','phone':'9876543210','email':'ayaan@example.test','coursePreference':COURSE,'batch':'Morning','status':'New','createdAt':'2026-10-15T10:00:00Z','payment':{'status':'at_centre','amount':100,'providerId':'preserve'},'customLegacyField':{'keep':True},'attendanceEmail':'attendance@example.test','attendanceUid':'attendance-uid'},
    'enrolled': {'photo':CLOUDINARY_PHOTO,'fullName':'Sara Khan','phone':'9876543211','coursePreference':COURSE,'batch':'Evening','status':'Approved','admissionNumber':'001','admissionDate':'2026-01-01','approvedAt':'2026-01-01T10:00:00Z','channel':'offline','monthlyFees':{'2026-02-01':200},'feeReminders':{},'payment':{'status':'paid','amount':100},'createdAt':{'seconds':1767261600}},
    'legacy': {'fullName':'Cloudinary Test Student','phone':'old','course':'Custom legacy course','batch':'Custom batch','customLegacyField':42},
    'unsafe': {'fullName':'<img src=x onerror=alert(1)>','phone':'9876543212','photo':'data:image/png;base64,xx" onerror="alert(1)','coursePreference':COURSE,'status':'Cancelled'},
}
MOCK = r'''
const state = window.__fixture;
export const initializeApp=()=>({}), getApps=()=>[], getAuth=()=>state.auth, getFirestore=()=>({});
export const inMemoryPersistence={};
export const setPersistence=async()=>{};
export const onAuthStateChanged=(_auth,fn)=>{state.listeners.push(fn);queueMicrotask(()=>fn(state.auth.currentUser));return ()=>{}};
export const signOut=async()=>{state.auth.currentUser=null;state.listeners.forEach(fn=>fn(null))};
export const signInWithEmailAndPassword=async(_auth,email,password)=>{
 if(password==='wrong-password')throw Object.assign(new Error('Invalid'),{code:'auth/invalid-credential'});
 state.auth.currentUser={uid:'admin-uid',email,getIdToken:async()=> 'test-admin-token'}; state.listeners.forEach(fn=>fn(state.auth.currentUser));
 return {user:state.auth.currentUser};
};
export const collection=(_db,name)=>({name});
export const doc=(_db,col,id)=>({col,id});
export const snapshot=(id,data)=>({id,exists:()=>data!==undefined,data:()=>structuredClone(data)});
const reordered = value => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).reverse().map(key=>[key,reordered(value[key])])) : value;
export const getDoc=async ref=>snapshot(ref.id,ref.col==='admins'?(state.authorized?{uid:'admin-uid',isAdmin:true}:undefined):(state.reorderReads?reordered(state.records[ref.id]):state.records[ref.id]));
export const getDocs=async()=>{
 if(state.failRead)throw Object.assign(new Error('Read denied'),{code:'permission-denied'});
 const rows=Object.entries(state.records).map(([id,data])=>snapshot(id,data));
 return {empty:!rows.length,forEach:fn=>rows.forEach(fn)};
};
export const runTransaction=async(_db,fn)=>{
 if(state.failWrite)throw Object.assign(new Error('Write denied'),{code:'permission-denied'});
 const staged=[];
 const tx={get:getDoc,update:(ref,patch)=>staged.push(['update',ref,patch]),set:(ref,data)=>staged.push(['set',ref,data]),delete:ref=>staged.push(['delete',ref])};
 await fn(tx);
 for(const [kind,ref,data] of staged){
  if(kind==='delete')delete state.records[ref.id];
  else if(kind==='set')state.records[ref.id]=structuredClone(data);
  else for(const [path,value] of Object.entries(data)){
   const parts=path.split('.');let obj=state.records[ref.id];
   for(const key of parts.slice(0,-1))obj=obj[key]??(obj[key]={});
   obj[parts.at(-1)]=structuredClone(value);
  }
  state.writes.push({kind,id:ref.id,data});
 }
};
'''

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def run(enabled=False):
    server = ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'public')))
    Thread(target=server.serve_forever,daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    fixtures=json.loads(json.dumps(FIXTURES))
    private_photo='https://res.cloudinary.com/salatmdv/image/authenticated/v123/student-photos/12345678-1234-4123-8123-123456789abc.jpg'
    fixture_photo=private_photo if enabled else CLOUDINARY_PHOTO
    fixtures['enrolled']['photo']=fixture_photo
    photo_calls=[]
    assertions = []
    def passed(name):
        assertions.append(name)
        print('PASS:',name,flush=True)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1440,'height':1100},accept_downloads=True)
        page.emulate_media(reduced_motion='reduce')
        errors=[];alerts=[];external=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        def dialog_handler(dialog):
            alerts.append(dialog.message)
            dialog.accept('001' if dialog.type=='prompt' else None)
        page.on('dialog',dialog_handler)
        page.add_init_script('window.__fixture={records:'+json.dumps(fixtures)+',writes:[],listeners:[],authorized:true,auth:{currentUser:null,authStateReady:async()=>{}}}; window.open=(url)=>{window.__fixture.opened=url;return {opener:null}};')
        def route_handler(route):
            url=route.request.url
            if url==base+'/photo-storage-config.js':
                route.fulfill(content_type='application/javascript',body='export const photoStorageConfig='+json.dumps({'enabled':enabled,'cloudName':'salatmdv','serviceUrl':'https://photos.example.test'})+';')
            elif url.startswith('https://photos.example.test/'):
                photo_calls.append(url)
                if '/upload' in url:
                    assert route.request.headers.get('authorization')=='Bearer test-admin-token'
                    assert route.request.post_data_buffer[:3]==b'\xff\xd8\xff'
                    route.fulfill(content_type='application/json',body=json.dumps({'photo':private_photo}),headers={'Access-Control-Allow-Origin':'*'})
                else:
                    assert '/photo?photo=' in url
                    assert route.request.headers.get('authorization')=='Bearer test-admin-token'
                    route.fulfill(content_type='image/jpeg',body=(ROOT/'tests/fixtures/photo-check.jpg').read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
            elif url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):
                route.fulfill(status=200,content_type='application/javascript',body=MOCK,headers={'Access-Control-Allow-Origin':'*'})
            elif url.startswith('https://cdn.jsdelivr.net/npm/@emailjs/browser@4/'):
                route.fulfill(status=200,content_type='application/javascript',body='window.emailjs={init(){},async send(){window.__fixture.mailAttempted=true;}};')
            elif url==CLOUDINARY_PHOTO:
                route.fulfill(content_type='image/png',body=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1EAAAAASUVORK5CYII='))
            elif url.startswith(base): route.continue_()
            else:
                external.append(url)
                route.abort()
        page.route('**/*',route_handler)
        page.goto(base+'/admin.html')
        expect(page.locator('#adminLoginButton')).to_be_enabled()
        page.evaluate('document.fonts.ready')
        assert page.evaluate('document.fonts.check(\'500 14px "Inter"\')')
        expect(page.locator('#adminDashboard')).to_be_hidden()
        page.locator('#adminPassword').fill('visibility-test')
        expect(page.locator('#togglePassword')).to_have_count(0)
        expect(page.locator('#adminPassword')).to_have_attribute('type','password')
        expect(page.get_by_role('button',name='Show password')).to_have_count(0)
        expect(page.locator('#loginMotionToggle')).to_have_count(0)
        page.emulate_media(reduced_motion='no-preference')
        expect(page.locator('.machine-laptop')).to_have_css('animation-play-state','running')
        story=page.locator('.login-story').bounding_box()
        page.mouse.move(story['x']+100,story['y']+170)
        page.wait_for_function('document.querySelector(".login-story").style.getPropertyValue("--machine-y") !== "0deg" && document.querySelector(".login-story").style.getPropertyValue("--machine-y") !== ""')
        page.emulate_media(reduced_motion='reduce')
        expect(page.locator('.machine-laptop')).to_have_css('animation-name','none')
        assert page.locator('.login-panel').bounding_box()['x'] > page.locator('.login-story').bounding_box()['x'] + 300
        assert page.locator('.login-panel').bounding_box()['y'] == page.locator('.login-story').bounding_box()['y']
        artifacts=ROOT/'tests'/'artifacts';artifacts.mkdir(exist_ok=True)
        page.screenshot(path=str(artifacts/'admin-login-gold.png'),animations='disabled',full_page=True)
        page.set_viewport_size({'width':390,'height':844})
        expect(page.locator('.login-machine')).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(artifacts/'admin-login-mobile.png'),animations='disabled',full_page=True)
        page.set_viewport_size({'width':1440,'height':1100})
        passed('Learning artwork, pointer tilt, no pause button, reduced motion and masked password on desktop/mobile')
        assert page.evaluate('__fixture.writes.length')==0
        passed('Dashboard hidden and no writes before authentication')
        def login(password='valid-password'):
            page.locator('#adminEmail').fill('admin@example.test')
            page.locator('#adminPassword').fill(password)
            page.locator('#adminLoginButton').click()
        login('wrong-password')
        expect(page.locator('#adminLoginMessage')).to_contain_text('incorrect')
        expect(page.locator('#adminDashboard')).to_be_hidden()
        expect(page.locator('#adminPassword')).to_have_attribute('type','password')
        page.evaluate('__fixture.authorized=false')
        login()
        expect(page.locator('#adminLoginMessage')).to_contain_text('No administrator record')
        expect(page.locator('#adminDashboard')).to_be_hidden()
        page.evaluate('__fixture.authorized=true')
        login()
        expect(page.locator('#adminDashboard')).to_be_visible()
        expect(page.locator('.application-row')).to_have_count(4)
        assert page.evaluate('__fixture.writes.length')==0
        assert len(alerts)==0
        assert page.locator('.application-row img').count()==1
        remote=page.locator('[data-application-id=enrolled].application-row')
        expect(remote.locator('img')).to_have_attribute('src',re.compile('^blob:') if enabled else CLOUDINARY_PHOTO)
        remote.locator('[data-photo-zoom]').click()
        expect(page.locator('#adminPhotoViewer img')).to_have_attribute('src',re.compile('^blob:') if enabled else CLOUDINARY_PHOTO)
        page.locator('.admin-lightbox-close').click()
        remote.locator('[data-act=details]').click()
        expect(page.locator('#adminDetailsModal img')).to_have_attribute('src',re.compile('^blob:') if enabled else CLOUDINARY_PHOTO)
        page.locator('#adminDetailsModal .admin-modal-close').click()
        assert page.evaluate('__fixture.records.enrolled.photo')==fixture_photo
        passed('Cloudinary photo URL renders in register, full viewer and details without changing the record')
        passed('Failed sign-in, unauthorized account, legacy undated records and escaped student content')
        for section in ['students','admissions','courses','batches']:
            page.locator('#workspaceSummary [data-summary="'+section+'"]').click()
            expect(page.locator('[data-section="'+section+'"]')).to_have_attribute('aria-current','page')
            if section in ['courses','batches']:expect(page.locator('.workspace-directory')).to_be_visible()
        page.locator('[data-section=overview]').click()
        page.locator('#adminSearch').fill('unmatched')
        for tab,count in [('new',2),('enrolled',1),('fees',1),('all',4)]:
            page.locator('[data-tab="'+tab+'"]').click()
            expect(page.locator('[data-tab="'+tab+'"]')).to_have_attribute('aria-selected','true')
            expect(page.locator('#adminSearch')).to_have_value('')
            expect(page.locator('.rc-fee-row' if tab=='fees' else '.application-row')).to_have_count(count)
        passed('All four summary cards and register tabs navigate directly and reset stale filters')
        page.locator('[data-tab="all"]').focus()
        page.keyboard.press('ArrowLeft')
        expect(page.locator('[data-tab="fees"]')).to_have_attribute('aria-selected','true')
        page.keyboard.press('End')
        expect(page.locator('[data-tab="all"]')).to_have_attribute('aria-selected','true')
        page.locator('#adminSearch').fill('Cloudinary')
        expect(page.locator('.application-row')).to_have_count(1)
        page.locator('#adminSearch').fill('')
        page.locator('#adminCourseFilter').select_option(COURSE)
        expect(page.locator('.application-row')).to_have_count(3)
        page.locator('#adminCourseFilter').select_option('')
        page.locator('#adminBatchFilter').select_option('Evening')
        expect(page.locator('.application-row')).to_have_count(1)
        page.locator('#adminBatchFilter').select_option('')
        passed('Search, course and batch filters')
        card=page.locator('[data-application-id="online"].application-row')
        card.locator('[data-act=details]').click()
        expect(page.locator('#adminDetailsModal')).to_contain_text('attendance-uid')
        page.locator('.admin-toggle-edit').click()
        page.locator('.edit-address').fill('New address')
        page.locator('.admin-save-edits').click()
        expect(page.locator('#adminDetailsModal .admin-modal-msg')).to_contain_text('Saved')
        page.wait_for_timeout(900)
        record=page.evaluate('__fixture.records.online')
        assert record['address']=='New address' and record['customLegacyField']=={'keep':True}
        assert record['payment']['providerId']=='preserve'
        assert 'gender' not in record and 'rollNumber' not in record
        passed('Single-field edit retains unknown fields, payment metadata and absent optional values')
        # A generated raster fixture exercises the actual cropper and saved photo viewer.
        def png_chunk(kind,data):
            return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
        png=b'\x89PNG\r\n\x1a\n'+png_chunk(b'IHDR',struct.pack('!2I5B',2,2,8,2,0,0,0))+png_chunk(b'IDAT',zlib.compress(b'\x00\x00\x80\x78\x00\x80\x78'*2))+png_chunk(b'IEND',b'')
        card.locator('[data-act=details]').click();page.locator('.admin-toggle-edit').click()
        page.locator('.edit-gender').select_option('prefer_not_to_say')
        page.locator('.edit-photo').set_input_files({'name':'sample.png','mimeType':'image/png','buffer':png})
        expect(page.locator('#photoCropCanvas')).to_be_visible()
        page.locator('#applyStudentCrop').click()
        page.locator('.admin-save-edits').click()
        expect(page.locator('#adminDetailsModal .admin-modal-msg')).to_contain_text('Saved')
        page.wait_for_timeout(900)
        assert page.evaluate('__fixture.records.online.gender')=='prefer_not_to_say'
        assert page.evaluate('__fixture.records.online.photo')==private_photo if enabled else page.evaluate('__fixture.records.online.photo').startswith('data:image/jpeg;base64,')
        card.locator('[data-photo-zoom]').click()
        expect(page.locator('#adminPhotoViewer')).to_be_visible()
        page.locator('.admin-lightbox-close').click()
        passed('Student photo upload, crop, save and full-size viewer')
        card.locator('[data-act=details]').click();page.locator('.admin-toggle-edit').click()
        page.locator('.edit-fullName').fill('Edited Name')
        page.evaluate('__fixture.records.online.fullName="Changed elsewhere"')
        page.locator('.admin-save-edits').click()
        expect(page.locator('#adminDetailsModal .admin-modal-msg')).to_contain_text('another session')
        assert page.evaluate('__fixture.records.online.fullName')=='Changed elsewhere'
        page.locator('#adminDetailsModal .admin-modal-close').click()
        page.locator('#refreshApplications').click()
        expect(page.locator('.application-row')).to_have_count(4)
        passed('Conflicting edit rejected without overwriting another session')
        card.locator('[data-act=fee]').click()
        expect(card.locator('[data-act=fee]')).to_have_text('✓ Fee Paid')
        assert page.evaluate('__fixture.records.online.payment.providerId')=='preserve'
        card.locator('[data-act=approve]').click()
        expect(card.locator('[data-act=approve]')).to_have_text('✓ Approved')
        assert page.evaluate('__fixture.records.online.admissionNumber')=='002'
        assert page.evaluate('__fixture.mailAttempted')
        passed('Admission fee verification and approval preserve provider details')
        page.locator('[data-section=fees]').click()
        expect(page.locator('.rc-fee-row')).to_have_count(2)
        page.locator('[data-fee-pay=enrolled]').click()
        page.locator('#rcPaymentAmount').fill('500')
        page.locator('#rcPaymentForm button[type=submit]').click()
        expect(page.locator('#rcPaymentMessage')).to_contain_text('Total received ₹700')
        assert page.evaluate('__fixture.records.enrolled.monthlyFees["2026-02-01"]')==700
        page.locator('#rcTuitionModal .admin-modal-close').click()
        page.locator('[data-fee-pay=enrolled]').click()
        page.locator('#rcPaymentAmount').fill('299')
        page.evaluate('__fixture.records.enrolled.monthlyFees["2026-02-01"]=800')
        page.locator('#rcPaymentForm button[type=submit]').click()
        expect(page.locator('#rcPaymentMessage')).to_contain_text('changed')
        assert page.evaluate('__fixture.records.enrolled.monthlyFees["2026-02-01"]')==800
        page.locator('#rcTuitionModal .admin-modal-close').click()
        page.locator('#refreshApplications').click()
        expect(page.locator('.rc-fee-row')).to_have_count(2)
        page.locator('[data-fee-wa=enrolled]').first.click()
        assert page.evaluate('__fixture.opened').startswith('https://wa.me/91')
        assert page.evaluate('Object.keys(__fixture.records.enrolled.feeReminders).length')==1
        passed('Partial monthly payment, stale ledger rejection and manually confirmed WhatsApp reminder')
        page.locator('#workspaceAdd').click()
        page.locator('#addName').fill('Offline Test')
        page.locator('#addPhone').fill('9876543213')
        page.locator('#addGuardianPhone').fill('9876543214')
        page.locator('#addGender').select_option('female')
        if enabled:
            page.locator('#addPhotoInput').set_input_files({'name':'offline.png','mimeType':'image/png','buffer':png})
            page.locator('#applyStudentCrop').click()
        page.locator('#addCourse').select_option(COURSE)
        page.locator('#addAdm').fill('001')
        page.locator('#addSaveBtn').click()
        expect(page.locator('#addMsg')).to_contain_text('already belongs')
        page.locator('#addAdm').fill('003')
        page.locator('#addSaveBtn').click()
        expect(page.locator('#addMsg')).to_contain_text('Student saved')
        expect(page.locator('#addSaveBtn')).to_be_disabled()
        assert page.evaluate('__fixture.records.offline_003.channel')=='offline'
        if enabled:assert page.evaluate('__fixture.records.offline_003.photo')==private_photo
        assert page.evaluate('__fixture.records.offline_003.guardianPhone')=='9876543214'
        page.locator('#adminAddModal .admin-modal-close').click()
        passed('Offline enrolment, duplicate admission rejection and prevention of repeat saves')
        page.locator('[data-section=courses]').click()
        expect(page.locator('.workspace-directory article')).to_have_count(8)
        page.locator('[data-directory="0"]').click()
        expect(page.locator('.application-row')).to_have_count(4)
        page.locator('[data-section=batches]').click()
        page.get_by_role('button',name='View students →').last.click()
        expect(page.locator('.application-row')).to_have_count(1)
        passed('Course and batch directories open correctly filtered student registers')
        page.locator('[data-section=reports]').click()
        with page.expect_download() as download: page.locator('#reportCsv').click()
        csv=Path(download.value.path()).read_text(encoding='utf-8-sig')
        assert 'Prefer not to say' in csv and 'Female' in csv
        assert 'Guardian Phone' in csv and 'Attendance UID' in csv and 'Monthly Fee Ledger' in csv
        with page.expect_download() as download: page.locator('#reportJson').click()
        backup=json.loads(Path(download.value.path()).read_text())
        assert len(backup['records'])==5
        assert any(r['data'].get('photo')==fixture_photo for r in backup['records'])
        assert any(r['data'].get('customLegacyField')==42 for r in backup['records'])
        passed('Full CSV export and JSON backup retain legacy fields')
        page.locator('[data-section=settings]').click()
        expect(page.locator('.workspace-settings')).to_contain_text('admin@example.test')
        expect(page.locator('#settingsTestPhotos')).to_have_count(0)
        expect(page.get_by_role('button',name='Test Cloudinary connection')).to_have_count(0)

        if enabled:
            original_photo='data:image/png;base64,'+base64.b64encode(png).decode()
            page.evaluate("value=>{__fixture.records.legacy.photo=value;__fixture.records.legacy.payment={status:'paid',amount:100,providerId:'keep'};__fixture.records.legacy.monthlyFees={'2026-10-01':200}}",original_photo)
            page.locator('#settingsRefresh').click()
            expect(page.locator('#settingsMigratePhotos')).to_be_enabled()
            original=page.evaluate('__fixture.records.legacy')
            page.locator('#settingsMigratePhotos').click()
            expect(page.locator('#photoMigrationStart')).to_be_disabled()
            with page.expect_download() as downloaded:page.locator('#photoMigrationBackup').click()
            originals=json.loads(Path(downloaded.value.path()).read_text())
            assert any(record['id']=='legacy' and record['data']['photo']==original_photo for record in originals['records'])
            page.evaluate('__fixture.failWrite=true')
            page.locator('#photoMigrationStart').click()
            expect(page.locator('#photoMigrationMessage')).to_contain_text('Stopped:')
            assert page.evaluate('__fixture.records.legacy')==original
            page.locator('#adminPhotoMigration .admin-modal-close').click()
            page.evaluate('__fixture.failWrite=false')
            page.locator('#settingsMigratePhotos').click()
            with page.expect_download():page.locator('#photoMigrationBackup').click()
            page.locator('#photoMigrationStart').click()
            expect(page.locator('#photoMigrationMessage')).to_contain_text('1 photos transferred. Finished.')
            updated=page.evaluate('__fixture.records.legacy')
            assert updated['photo']==private_photo
            assert updated['updatedBy']=='admin-uid'
            for key in ['photo','updatedAt','updatedBy']:
                updated.pop(key,None);original.pop(key,None)
            assert updated==original
            page.locator('#adminPhotoMigration .admin-modal-close').click()
            passed('Existing-photo transfer backs up originals, preserves fees/metadata, handles denied writes and resumes')
        else:
            expect(page.locator('#settingsMigratePhotos')).to_be_disabled()

        page.locator('[data-section=overview]').click()
        expect(page.locator('.application-row')).to_have_count(5)
        page.locator('[data-application-id=enrolled].application-row .delete-application-btn').click()
        expect(page.locator('#adminDeleteModal')).to_be_visible()
        page.locator('#deleteConfirmation').fill('wrong')
        page.locator('#deleteConfirm').click()
        expect(page.locator('#deleteMessage')).to_contain_text('exactly as shown')
        page.locator('#deleteConfirmation').fill('001')
        page.locator('#deleteConfirm').click()
        expect(page.locator('.application-row')).to_have_count(4)
        assert not page.evaluate('"enrolled" in __fixture.records')
        passed('Settings and explicitly confirmed record deletion in fixtures')
        page.evaluate('__fixture.failWrite=true')
        page.locator('[data-application-id=legacy].application-row [data-act=details]').click()
        page.locator('.admin-toggle-edit').click();page.locator('.edit-address').fill('Denied write')
        page.locator('.admin-save-edits').click()
        expect(page.locator('#adminDetailsModal .admin-modal-msg')).to_contain_text('not save')
        assert page.evaluate('__fixture.records.legacy.address || ""')==''
        page.locator('#adminDetailsModal .admin-modal-close').click()
        page.evaluate('__fixture.failWrite=false;__fixture.failRead=true')
        page.locator('#refreshApplications').click()
        expect(page.locator('.admin-error')).to_contain_text('Firebase denied')
        expect(page.locator('#workspaceAdd')).to_be_disabled()
        page.evaluate('__fixture.failRead=false');page.locator('#refreshApplications').click()
        expect(page.locator('.application-row')).to_have_count(4)
        passed('Permission errors do not show false save success and refresh failures block writes')
        page.locator('[data-summary=admissions]').click()
        cloudinary=page.locator('[data-application-id=legacy].application-row')
        cloudinary.locator('.delete-application-btn').click()
        expect(page.locator('#adminDeleteModal')).to_contain_text('Cloudinary Test Student')
        expect(page.locator('#deleteConfirmation')).to_have_count(0)
        page.locator('#deleteCancel').click()
        assert page.evaluate('"legacy" in __fixture.records')
        cloudinary.locator('.delete-application-btn').click()
        page.evaluate('__fixture.failWrite=true')
        page.locator('#deleteConfirm').click()
        expect(page.locator('#deleteMessage')).to_contain_text('Firebase denied')
        assert page.evaluate('"legacy" in __fixture.records')
        page.evaluate('__fixture.failWrite=false;__fixture.records.legacy.address="Changed elsewhere"')
        page.locator('#deleteConfirm').click()
        expect(page.locator('#deleteMessage')).to_contain_text('record changed')
        assert page.evaluate('"legacy" in __fixture.records')
        page.locator('#adminDeleteModal .admin-modal-close').click()
        page.locator('#refreshApplications').click()
        expect(cloudinary).to_be_visible()
        page.evaluate('__fixture.reorderReads=true')
        cloudinary.locator('.delete-application-btn').click();page.locator('#deleteConfirm').click()
        expect(cloudinary).to_have_count(0)
        expect(page.locator('[data-summary=admissions] strong')).to_have_text('0')
        assert not page.evaluate('"legacy" in __fixture.records')
        passed('Cloudinary pending-record deletion, cancel, denied permission, conflict protection and reordered Firestore fields')
        page.locator('[data-section=overview]').click()
        page.screenshot(path=str(artifacts/'admin-desktop.png'),full_page=True)
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.locator('#menuToggle').click()
        expect(page.locator('#workspaceSidebar')).to_be_in_viewport()
        page.locator('[data-section=students]').click()
        assert not page.locator('body').evaluate('(el)=>el.classList.contains("nav-open")')
        expect(page.locator('#workspaceSidebar')).not_to_be_in_viewport()
        page.screenshot(path=str(artifacts/'admin-mobile.png'),full_page=True)
        page.locator('#menuToggle').click();page.locator('#adminLogoutBtn').click()
        expect(page.locator('#adminDashboard')).to_be_hidden()
        assert page.locator('.application-row').count()==0
        assert page.locator('.admin-modal').count()==0
        passed('Mobile layout, navigation and sign-out clear private UI')
        assert not errors, errors
        assert not external, external
        if enabled:
            assert any('/upload' in url for url in photo_calls)
            assert any('/photo?photo=' in url for url in photo_calls)
            assert page.locator('img[src^="blob:"]').count()==0
        passed('No uncaught JavaScript errors and no requests to live services')
        browser.close()
    server.shutdown()
    print(f'Completed {len(assertions)} browser workflow checks.')

if __name__=='__main__':
    run()
    run(True)
