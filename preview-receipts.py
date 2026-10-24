"""Open isolated filled/blank/WhatsApp receipt design previews. No live services."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
import argparse,webbrowser
ROOT=Path(__file__).resolve().parent
PREVIEW='/previews/receipt-refresh/'
class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' blob: data:; connect-src 'self'; form-action 'none'; object-src 'none'; base-uri 'none'")
        super().end_headers()
    def log_message(self,*args):pass
    def do_POST(self):self.send_error(405,'Read-only receipt preview')
    def do_GET(self):
        path=urlparse(self.path).path
        if '..' in path or not path.startswith((PREVIEW,'/public/admin-fonts/')):self.send_error(404);return
        super().do_GET()
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--no-browser',action='store_true');args=parser.parse_args()
    required=['index.html','receipt.css','receipt.js','receipt-image.js','assets/caveat-variable.ttf']
    if any(not (ROOT/PREVIEW.strip('/')/name).is_file() for name in required):parser.exit(1,'Receipt preview files are missing. Run git pull --ff-only first.\n')
    with ThreadingHTTPServer(('127.0.0.1',0),partial(PreviewHandler,directory=str(ROOT))) as server:
        url=f'http://127.0.0.1:{server.server_port}'+PREVIEW
        print('\nREHAAN COMPUTERS - NEW RECEIPT DESIGN PREVIEW\n\n'+url+'\n',flush=True)
        print('Try Filled receipt, Blank receipt and WhatsApp preview.\nNumbers 1000/1001 are sample numbers only. No live records, payments or messages.\nKeep CMD open. Ctrl+C stops the preview.\n',flush=True)
        if not args.no_browser:
            try:webbrowser.open_new_tab(url)
            except webbrowser.Error:print('Open the printed address in your browser.',flush=True)
        try:server.serve_forever()
        except KeyboardInterrupt:print('\nPreview stopped.')
if __name__=='__main__':main()
