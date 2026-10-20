"""Real homepage menu/footer navigation, using a mock SDK and zero live requests."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import importlib.util
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('fixture', ROOT / 'tests/admission-payment-browser.py')
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT / 'public')))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            for width in [390, 1440]:
                context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
                errors, external, writes, popups = [], [], [], []
                context.add_init_script('window.__fixture={records:{},writes:[],listeners:[],authorized:false,auth:{currentUser:null,authStateReady:async()=>{}}}')
                def route(r):
                    if r.request.method not in ['GET', 'HEAD']:
                        writes.append(r.request.url);r.abort()
                    elif r.request.url.startswith(base + '/'):
                        r.continue_()
                    elif r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):
                        r.fulfill(content_type='application/javascript', body=fixture.MOCK, headers={'Access-Control-Allow-Origin':'*'})
                    else:
                        external.append(r.request.url);r.abort()
                context.route('**/*', route)
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('popup', lambda popup: popups.append(popup.url))
                for action in ['brand-click', 'brand-keyboard', 'footer-click']:
                    page.goto(base + '/')
                    expect(page.locator('.course-card')).to_have_count(7)
                    if action == 'brand-click':
                        page.locator('#brandMenuButton').click()
                        page.locator('#brandAdminLogin').click()
                    elif action == 'brand-keyboard':
                        page.locator('#brandMenuButton').focus()
                        page.keyboard.press('ArrowUp')
                        expect(page.locator('#brandAdminLogin')).to_be_focused()
                        page.keyboard.press('Enter')
                    else:
                        page.locator('footer a[href="admin.html"]').click()
                    expect(page).to_have_url(base + '/admin.html')
                    expect(page.locator('#adminLoginButton')).to_be_enabled()
                    expect(page.locator('#adminDashboard')).to_be_hidden()
                    assert page.evaluate('__fixture.writes.length') == 0
                    page.go_back()
                    expect(page.locator('.course-card')).to_have_count(7)
                    expect(page).to_have_url(base + '/')
                assert not errors, errors
                assert not external, external
                assert not writes, writes
                assert not popups, popups
                assert len(context.pages) == 1
                print(f'PASS: {width}px; logo click, keyboard and footer open the same admin sign-in in the same tab; Back works; zero writes/popups', flush=True)
                context.close()
            browser.close()
    finally:
        server.shutdown()

if __name__ == '__main__': run()
