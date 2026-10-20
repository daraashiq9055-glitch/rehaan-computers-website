"""Premium dashboard using the actual admin app and local-only preview adapters."""
import importlib.util
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('launcher', ROOT / 'preview-admin.py')
launcher = importlib.util.module_from_spec(spec);spec.loader.exec_module(launcher)
OUT = ROOT / 'tests/artifacts/admin-premium'

def run():
    OUT.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(launcher.PreviewHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            context = browser.new_context(viewport={'width': 1512, 'height': 1100}, reduced_motion='reduce', accept_downloads=True)
            errors, external, failed, requests = [], [], [], []
            def route(r):
                if r.request.url.startswith(base + '/'):
                    requests.append(r.request)
                    r.continue_()
                else:
                    external.append(r.request.url);r.abort()
            context.route('**/*', route)
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('response', lambda r: failed.append((r.status, r.url)) if r.status >= 400 else None)
            page.on('dialog', lambda d: d.accept())
            page.goto(base + launcher.PREVIEW)
            expect(page.locator('#adminDashboard')).to_be_visible()
            expect(page.locator('.application-card')).to_have_count(8)
            expect(page.locator('.workspace-stat').first.locator('strong')).to_have_text('6')
            assert page.evaluate('__adminPreview.writes.length') == 0
            page.evaluate('document.fonts.ready')
            page.screenshot(path=str(OUT / 'overview-desktop.png'), full_page=True)
            print('PASS: complete current dashboard boots from local adapters, eight fictional records and no live SDK/auth/network writes', flush=True)
            page.locator('#workspaceFind').click()
            expect(page.locator('.workspace-finder')).to_be_visible()
            page.locator('#finderQuery').fill('Sara')
            page.keyboard.press('Enter')
            expect(page.locator('.application-card')).to_have_count(1)
            expect(page.locator('.row-line1 h3')).to_have_text('Sara Khan')
            page.keyboard.press('Control+k')
            page.locator('#finderQuery').fill('Fees')
            page.locator('#finderResults button').filter(has_text='Fees & payments').click()
            expect(page.locator('[data-section=fees]')).to_have_attribute('aria-current', 'page')
            page.locator('[data-section=overview]').click()
            page.locator('[data-register-layout=cards]').click()
            expect(page.locator('#applicationsList')).to_have_class('applications-list register-cards')
            expect(page.locator('.application-card')).to_have_count(8)
            page.screenshot(path=str(OUT / 'student-cards-desktop.png'), full_page=True)
            page.locator('[data-register-layout=list]').click()
            assert page.evaluate('__adminPreview.writes.length') == 0
            print('PASS: quick search finds students/sections; list and card views retain all records without writes', flush=True)
            sections = ['overview', 'admissions', 'students', 'fees', 'courses', 'batches', 'reports', 'settings', 'marks']
            for width in [320, 390, 768, 1024, 1512]:
                page.set_viewport_size({'width': width, 'height': 1000})
                for section in sections:
                    if width <= 760: page.locator('#menuToggle').click()
                    page.locator('[data-section=' + section + ']').click()
                    expect(page.locator('[data-section=' + section + ']')).to_have_attribute('aria-current', 'page')
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, section, page.evaluate('document.documentElement.scrollWidth'))
                if width == 390:
                    page.screenshot(path=str(OUT / 'marks-mobile.png'), full_page=True)
            assert page.evaluate('__adminPreview.writes.length') == 0
            print('PASS: all nine original dashboard sections fit five screen widths; browsing never changes demo records', flush=True)
            page.set_viewport_size({'width': 1512, 'height': 1100})
            page.locator('[data-section=students]').click()
            for tab, count in [('new', 2), ('enrolled', 6), ('all', 8)]:
                page.locator('.admin-tab[data-tab=' + tab + ']').click()
                expect(page.locator('.application-card')).to_have_count(count)
            page.locator('#adminSearch').fill('Sara')
            expect(page.locator('.application-card')).to_have_count(1)
            page.locator('#adminSearch').fill('')
            original = page.evaluate('structuredClone(__adminPreview.records["demo-1"])')
            page.locator('[data-application-id="demo-1"] [data-act=details]').click()
            page.keyboard.press('Control+k')
            expect(page.locator('.workspace-finder')).not_to_be_visible()
            page.locator('.admin-toggle-edit').click()
            page.locator('.edit-address').fill('Updated demo address')
            page.locator('.admin-save-edits').click()
            expect(page.locator('#adminDetailsModal .admin-modal-msg')).to_contain_text('Saved')
            expect(page.locator('#adminDetailsModal')).to_be_hidden()
            page.keyboard.press('Control+k')
            expect(page.locator('.workspace-finder')).to_be_visible()
            page.locator('.workspace-finder [aria-label="Close quick search"]').click()
            expect(page.locator('.workspace-finder')).not_to_be_visible()
            updated = page.evaluate('structuredClone(__adminPreview.records["demo-1"])')
            assert updated['address'] == 'Updated demo address'
            for key, value in original.items():
                if key != 'address': assert updated[key] == value, key
            page.locator('#workspaceAdd').click()
            expect(page.locator('#addSaveBtn')).to_be_visible()
            page.locator('#addName').fill('Preview Added Student')
            page.locator('#addPhone').fill('9000000099')
            page.locator('#addCourse').select_option('One Year Computer Diploma Course')
            page.locator('#addPhotoInput').set_input_files(ROOT / 'tests/fixtures/photo-check.jpg')
            page.locator('#applyStudentCrop').click()
            expect(page.locator('#addPhotoImg')).to_be_visible()
            page.locator('#addSaveBtn').click()
            expect(page.locator('#addMsg')).to_contain_text('Student saved')
            page.locator('#adminAddModal .admin-modal-close').click()
            page.locator('.admin-tab[data-tab=all]').click()
            expect(page.locator('.application-card')).to_have_count(9)
            record = page.evaluate('Object.values(__adminPreview.records).find(r => r.fullName === "Preview Added Student")')
            assert record['photo'].startswith('data:image/jpeg;base64,')
            assert record['payment']['amount'] == 100
            page.locator('[data-application-id="offline_007"] [data-photo-zoom]').click()
            expect(page.locator('#adminPhotoViewer')).to_be_visible()
            page.locator('.admin-lightbox-close').click()
            page.locator('[data-application-id="offline_007"] .delete-application-btn').click()
            page.locator('#deleteConfirmation').fill('007')
            page.locator('#deleteConfirm').click()
            expect(page.locator('#adminDeleteModal')).to_be_hidden()
            expect(page.locator('.application-card')).to_have_count(8)
            assert page.evaluate('__adminPreview.records.offline_007 === undefined')
            print('PASS: register tabs/search, safe single-field edits, photo viewer and confirmed deletion work; sample enrolment/photo operations stay local', flush=True)
            print('PASS: register tabs/search and offline add with cropped photo work in memory; existing options retained', flush=True)
            page.locator('[data-section=fees]').click()
            page.screenshot(path=str(OUT / 'fees-desktop.png'), full_page=True)
            page.locator('[data-fee-pay="demo-1"]').click()
            page.locator('#rcPaymentMethod').select_option('Cash');page.locator('#rcPaymentAmount').fill('400')
            page.locator('#rcPaymentForm [type=submit]').click()
            expect(page.locator('#rcPaymentMessage')).to_contain_text('Payment saved')
            page.locator('#rcOpenSavedReceipt').click()
            expect(page.locator('#rcFeatureDialog')).to_contain_text('Sara Khan')
            page.locator('[data-new=editReceipt]').click()
            form = page.locator('#rcReceiptEditForm')
            form.locator('[name=amount]').fill('300')
            form.locator('[name=reason]').fill('Preview correction test')
            form.locator('[name=confirmed]').check()
            form.locator('[type=submit]').click()
            expect(page.locator('#rcFeatureDialog')).to_contain_text('Correction history (1)')
            record = page.evaluate('__adminPreview.records["demo-1"]')
            receipt = next(iter(record['feeReceipts'].values()))
            assert receipt['amount'] == 30000 and receipt['amendments'][0]['before']['amount'] == 40000
            assert sum(record['monthlyFees'].values()) == 300
            with page.expect_download() as downloaded:page.locator('[data-new=image]').click()
            assert Path(downloaded.value.path()).read_bytes().startswith(b'\x89PNG')
            page.locator('[data-new=printReceipt]').evaluate('(button) => {window.print = () => {}; button.click();}')
            page.pdf(path=str(OUT / 'receipt.pdf'), prefer_css_page_size=True, print_background=True)
            page.screenshot(path=str(OUT / 'receipt-desktop.png'), full_page=True)
            page.locator('[data-new=close]').click()
            page.locator('[data-section=marks]').click()
            page.locator('#rcMarkStudent').select_option('demo-1')
            for field, mark in zip(page.locator('[data-subject=marks]').all(), ['84', '88', '91']):field.fill(mark)
            page.locator('#rcMarksForm [type=submit]').click()
            expect(page.locator('#rcMarksStatus')).to_contain_text('Marks saved securely')
            expect(page.locator('[data-new=printMarks]')).to_be_enabled()
            expect(page.locator('#rcMarkPreview .mark-title')).to_have_css('color', 'rgb(35, 58, 44)')
            expect(page.locator('#rcMarkPreview .mark-title')).to_have_css('font-size', '26px')
            page.locator('[data-new=printMarks]').click()
            page.pdf(path=str(OUT / 'marks.pdf'), prefer_css_page_size=True, print_background=True)
            page.screenshot(path=str(OUT / 'marks-desktop.png'), full_page=True)
            print('PASS: original fee/receipt transactions, amount corrections/history, receipt PNG and mark-card save/print controls work with sample records', flush=True)
            page.locator('#adminLogoutBtn').click()
            expect(page.locator('#adminDashboard')).to_be_hidden()
            page.locator('#adminEmail').fill('preview@example.test')
            page.locator('#adminPassword').fill('demo-only')
            page.screenshot(path=str(OUT / 'login-desktop.png'), full_page=True)
            page.set_viewport_size({'width': 390, 'height': 1000})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(OUT / 'login-mobile.png'), full_page=True)
            page.locator('#adminLoginButton').click()
            expect(page.locator('#adminDashboard')).to_be_visible()
            page.locator('#demoReset').click()
            expect(page.locator('.application-card')).to_have_count(8)
            assert page.evaluate('__adminPreview.writes.length') == 0
            assert page.evaluate("fetch('https://firestore.googleapis.com/').then(() => false, () => true)")
            assert not errors, errors
            assert not failed, failed
            assert not external, external
            assert all(r.method in ['GET', 'HEAD'] for r in requests)
            print('PASS: logout/demo sign-in/reset and mobile login work; zero external requests, failed resources, JS errors or network writes', flush=True)
            browser.close()
    finally: server.shutdown()

if __name__ == '__main__': run()
