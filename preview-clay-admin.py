"""Local clay/butter colour study using the complete isolated admin preview."""
import argparse
import colorsys
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util
from pathlib import Path
import re
from urllib.parse import urlparse
import webbrowser

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('admin_preview',ROOT/'preview-admin.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
original_html=base.preview_html

def palette(css):
    def colour(match):
        value=match[0][1:]
        if len(value) in (3,4): value=''.join(c*2 for c in value)
        rgb=[int(value[i:i+2],16)/255 for i in (0,2,4)]
        h,l,s=colorsys.rgb_to_hls(*rgb)
        # Preserve status greens/reds. Recolour blue surfaces/text and gold accents.
        if 175<=h*360<=260 and s>.09:
            h=10/360; s=.30 if l<.5 else .36
        elif 30<=h*360<=55 and s>.3:
            h=46/360
            if .52<l<.85: l=.825;s=1
        else:return match[0]
        result=colorsys.hls_to_rgb(h,l,s)
        return '#'+''.join(f'{round(c*255):02x}' for c in result)+value[6:]
    return re.sub(r'#[0-9a-fA-F]{3,8}\b',colour,css)

def preview_html():
    html=original_html().decode('utf-8').replace('DESIGN PREVIEW','CLAY + BUTTER PREVIEW')
    css=(ROOT/'previews/admin-premium/clay-study.css').read_text(encoding='utf-8')
    return html.replace('</head>','<style>'+css+'</style></head>').encode('utf-8')
base.preview_html=preview_html

class Handler(base.PreviewHandler):
    def do_GET(self):
        path=urlparse(self.path).path
        if path.endswith('.css') and path.startswith(('/public/','/previews/admin-premium/')):
            file=(ROOT/path.lstrip('/')).resolve()
            if ROOT not in file.parents or not file.is_file():return self.send_error(404)
            css=file.read_text(encoding='utf-8')
            # Printed documents keep their separately chosen paper colours.
            if not any(word in file.name for word in ('receipt','mark-layout')):css=palette(css)
            data=css.encode('utf-8');self.send_response(200);self.send_header('Content-Type','text/css; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        else:super().do_GET()

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--no-browser',action='store_true');args=parser.parse_args()
    with ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT))) as server:
        url=f'http://127.0.0.1:{server.server_port}'+base.PREVIEW
        print('\nCLAY BROWN #6B352A + SOFT BUTTER #FFF1A6\nComplete admin colour preview. Fictional records only.\nNo live payments, uploads, messages or student writes.\nNothing is deployed. Keep CMD open; Ctrl+C stops the preview.\n\n'+url+'\n',flush=True)
        if not args.no_browser:webbrowser.open_new_tab(url)
        try:server.serve_forever()
        except KeyboardInterrupt:print('\nPreview stopped.')
if __name__=='__main__':main()
