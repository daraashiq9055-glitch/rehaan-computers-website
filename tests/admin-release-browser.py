"""Upgrade regression: stale cached modules must not break the sign-in screen.

Uses local files and a fake Firebase SDK; no production connection or writes.
"""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from urllib.parse import urlparse, parse_qs
import importlib.util
from playwright.sync_api import sync_playwright, expect
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('admin_baseline', ROOT / 'tests/admin-browser.py')
baseline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT / 'public')))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    changed = {'admin-app.js', 'admin-features.js', 'admin-feature-store.js', 'admin-feature-model.js', 'admin-receipt-image.js', 'photo-storage.js'}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        page = browser.new_page()
        seen, stale, errors, external = set(), [], [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_init_script('window.__fixture={records:{},writes:[],listeners:[],authorized:true,auth:{currentUser:null,authStateReady:async()=>{}}}')
        def route(r):
            url = r.request.url
            if url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):
                r.fulfill(content_type='application/javascript', body=baseline.MOCK, headers={'Access-Control-Allow-Origin':'*'})
            elif url.startswith(base):
                name = Path(urlparse(url).path).name
                if name in changed:
                    # Simulate a still-valid old browser cache entry at every
                    # original URL, including the store without correctReceipt.
                    if not parse_qs(urlparse(url).query).get('v'):
                        stale.append(name)
                        r.fulfill(content_type='application/javascript', body='export async function saveMarkCard(){};export async function saveMonthlyPayment(){};')
                        return
                    seen.add(name)
                r.continue_()
            else:
                external.append(url);r.abort()
        page.route('**/*', route)
        page.goto(base + '/admin.html')
        expect(page.locator('#adminLoginButton')).to_be_enabled()
        expect(page.locator('#adminLoginButton')).to_have_text('Sign in securely')
        page.locator('#adminEmail').fill('admin@example.test')
        page.locator('#adminPassword').fill('valid-password')
        page.locator('#adminLoginButton').click()
        expect(page.locator('#adminDashboard')).to_be_visible()
        assert seen == changed, (seen, changed)
        assert not stale, stale
        assert not errors, errors
        assert not external, external
        assert page.evaluate('__fixture.writes.length') == 0
        print('PASS: warm-cache upgrade loads a consistent versioned module graph, allows admin sign-in and makes no record writes')
        browser.close()
    server.shutdown()
if __name__ == '__main__': run()
