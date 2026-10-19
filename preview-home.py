"""Start the isolated visitor preview and open its exact page in a browser.

Uses a free localhost port so an older preview server cannot show the wrong page.
No production services or deployment commands are involved.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import webbrowser

ROOT = Path(__file__).resolve().parent


class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--no-browser', action='store_true', help='Print the URL without opening a browser.')
    args = parser.parse_args()
    required = [
        'previews/premium-home/index.html',
        'previews/premium-home/premium.css',
        'previews/premium-home/app.js',
        'previews/premium-home/admission.js',
        'previews/premium-home/model.js',
        'previews/premium-home/courses.json',
        'previews/premium-home/site.json',
        'public/assets/hero-library.jpg',
        'public/admin-fonts/inter-latin-wght-normal.woff2',
    ]
    missing = [name for name in required if not (ROOT / name).is_file()]
    if missing:
        parser.exit(1, 'Preview files are missing. Update codex/admin-dashboard-redesign first.\n' + '\n'.join(missing) + '\n')

    handler = partial(PreviewHandler, directory=str(ROOT))
    with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server:
        url = f'http://127.0.0.1:{server.server_port}/previews/premium-home/'
        print('\nREHAAN COMPUTERS - COMPLETE PREMIUM VISITOR PREVIEW', flush=True)
        print('Look for: COMPLETE DESIGN PREVIEW and the interactive learning workspace.', flush=True)
        print('Try the course finder, comparison, PDF brochures, typing challenge and guided application.', flush=True)
        print('\n' + url, flush=True)
        print('\nKeep this window open. Press Ctrl+C to stop.', flush=True)
        print('This preview cannot submit applications or payments.\n', flush=True)
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


if __name__ == '__main__':
    main()
