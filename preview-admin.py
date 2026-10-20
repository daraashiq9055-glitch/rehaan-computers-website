"""Open the premium admin UI preview with sample records and no live services."""
import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
import webbrowser

ROOT = Path(__file__).resolve().parent
PREVIEW = '/previews/admin-premium/'

def preview_html():
    # Reuse the complete current dashboard and its existing application modules.
    # Only preview-specific styling, fixtures and service adapters are injected.
    html = (ROOT / 'public/admin.html').read_text(encoding='utf-8')
    imports = {f'https://www.gstatic.com/firebasejs/12.2.1/firebase-{name}.js': PREVIEW + 'sdk.js' for name in ['app', 'auth', 'firestore']}
    imports['/public/photo-storage.js?v=20261018-login-fix-1'] = PREVIEW + 'photos.js'
    imports['/public/photo-storage-config.js'] = PREVIEW + 'photos.js'
    imports['/public/admin-app.js?v=20261018-login-fix-1'] = '/public/admin-preview-app.js'
    head = '<base href="/public/"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\'; connect-src \'self\'; object-src \'none\'; form-action \'none\'; base-uri \'self\'">'
    head += '<script type="importmap">' + json.dumps({'imports': imports}) + '</script>'
    head += '<script src="' + PREVIEW + 'demo.js"></script>'
    html = html.replace('<head>', '<head>' + head, 1)
    head_module = '<script type="module" src="' + PREVIEW + 'workbench.js"></script>'
    html = html.replace('</head>', head_module + '</head>', 1)
    html = html.replace('</head>', '<script type="module" data-preview-only src="' + PREVIEW + 'mark-photo-preview.js"></script><link data-preview-only rel="stylesheet" href="' + PREVIEW + 'mark-photo-preview.css"></head>', 1)
    html = html.replace('</head>', '<link rel="stylesheet" href="' + PREVIEW + 'theme.css"><link rel="stylesheet" href="' + PREVIEW + 'records.css"><link rel="stylesheet" href="' + PREVIEW + 'operations.css"><link rel="stylesheet" href="' + PREVIEW + 'workbench.css"></head>', 1)
    html = html.replace('<body class="admin-page">', '<body class="admin-page admin-premium-preview"><div class="demo-strip"><span><i></i> DESIGN PREVIEW</span><p>Sample students only. Live records and payments are disconnected.</p><button type="button" id="demoReset">Reset demo</button></div>', 1)
    html = html.replace('href="index.html"', 'href="/previews/premium-home/"')
    html = html.replace('<span class="mark">RC</span>', '<span class="mark"><img src="visitor/assets/rehaan-mark.svg" alt="Rehaan Computers" width="44" height="44"></span>')
    html = html.replace('TRAINING INSTITUTE', 'ADMIN WORKSPACE')
    html = html.replace('<div class="content"><header><div>', '<div class="content"><header><div><span class="workspace-eyebrow">REHAAN COMPUTERS / ADMINISTRATION</span>')
    html = html.replace('<nav class="nav" aria-label="Dashboard sections">', '<nav class="nav" aria-label="Dashboard sections"><span class="nav-caption">YOUR WORKSPACE</span>')
    html = html.replace('<span class="workspace-profile">', '<span class="workspace-profile"><span class="workspace-date" id="workspaceDate"></span>')
    html = html.replace('<span class="workspace-profile">', '<button type="button" class="workspace-find" id="workspaceFind"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><span>Find a student or page</span><kbd>Ctrl K</kbd></button><span class="workspace-profile">')
    html = html.replace('Your session ends when this page is reloaded.', 'This demo resets when you reload the page.')
    html = html.replace('Private by design.', 'Try the new design.')
    html = html.replace('Enter your admin email', 'Demo email')
    html = html.replace('Enter your password', 'Demo password')
    html = html.replace('Sign in to your admin workspace.', 'Open the sample workspace. No real password needed.')
    return html.encode('utf-8')

class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path in [PREVIEW, PREVIEW + 'admin.html', PREVIEW + 'index.html']:
            body = preview_html()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif path == '/public/admin-preview-app.js':
            body = ((ROOT / 'public/admin-app.js').read_text(encoding='utf-8') + '\n' + (ROOT / 'previews/admin-premium/bridge-exports.js').read_text(encoding='utf-8')).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif path.startswith('/public/') and (Path(path).suffix == '.html' or path == '/public/script.js'):
            self.send_error(404)
        elif path.startswith(('/public/', '/previews/admin-premium/', '/previews/premium-home/')):
            super().do_GET()
        else:
            self.send_error(404)

    def log_message(self, *args): pass

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    for file in ['public/admin.html', 'previews/admin-premium/theme.css', 'previews/admin-premium/sdk.js', 'previews/admin-premium/demo.js', 'previews/admin-premium/photos.js', 'previews/admin-premium/records.css', 'previews/admin-premium/records.js', 'previews/admin-premium/operations.js', 'previews/admin-premium/workbench.js', 'previews/admin-premium/workbench.css', 'previews/admin-premium/journey-service.js', 'previews/admin-premium/operations.css', 'previews/admin-premium/payment-ui.js', 'previews/admin-premium/payment-service.js', 'previews/admin-premium/accounts-model.js', 'previews/admin-premium/records-model.js', 'previews/admin-premium/bridge-exports.js']:
        if not (ROOT / file).is_file():
            parser.exit(1, 'Missing preview files. Run git pull --ff-only first.\n')
    with ThreadingHTTPServer(('127.0.0.1', 0), partial(PreviewHandler, directory=str(ROOT))) as server:
        url = f'http://127.0.0.1:{server.server_port}' + PREVIEW
        print('\nREHAAN COMPUTERS - PREMIUM ADMIN PREVIEW', flush=True)
        print('Same dashboard options, new sapphire and gold design.', flush=True)
        print('New: Student journeys, My workspace, Change history demo and direct student search.', flush=True)
        print('Sample data only. Try adding a demo student, payments, receipts and mark cards.', flush=True)
        print('No live sign-in, student writes, uploads, messages or charges. Reload resets the demo.', flush=True)
        print('\n' + url + '\n', flush=True)
        print('Keep CMD open. Press Ctrl+C to stop.', flush=True)
        if not args.no_browser:
            try:
                if not webbrowser.open_new_tab(url):
                    print('Open the address above in your browser.', flush=True)
            except webbrowser.Error:
                print('Open the address above in your browser.', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nPreview stopped.', flush=True)

if __name__ == '__main__': main()
