"""Preview the proposed Settings workflows without Firebase or student records."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from urllib.parse import urlparse, unquote
import argparse
import webbrowser
ROOT=Path(__file__).resolve().parent
PREVIEW='/previews/settings-studio/'
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()
    def do_GET(self):
        path=unquote(urlparse(self.path).path)
        target=(ROOT/path.lstrip('/')).resolve()
        allowed=any(target.is_relative_to(folder) for folder in [(ROOT/'previews/settings-studio').resolve(),(ROOT/'public/admin-fonts').resolve()])
        if path.startswith((PREVIEW,'/public/admin-fonts/')) and allowed:
            super().do_GET()
        else:
            self.send_error(404)
    def log_message(self,*args):pass
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--no-browser',action='store_true');args=parser.parse_args()
    with ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT))) as server:
        url=f'http://127.0.0.1:{server.server_port}'+PREVIEW
        print('REHAAN COMPUTERS - SETTINGS DESIGN REVIEW',flush=True)
        print('Sample documents only. Edits stay in this preview. No live sign-in, records, uploads or messages.',flush=True)
        print('Export settings draft keeps your choices in a JSON file; this is not a student backup.',flush=True)
        print(url,flush=True)
        print('Keep CMD open. Press Ctrl+C to stop.',flush=True)
        if not args.no_browser:webbrowser.open_new_tab(url)
        try:server.serve_forever()
        except KeyboardInterrupt:print('\nPreview stopped.',flush=True)
