"""An isolated, read-only homepage polish preview. No Firebase or payment modules."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
import argparse,json,re,webbrowser
ROOT=Path(__file__).resolve().parent
PREVIEW='/clean-home-preview/'

def preview_html():
    html=(ROOT/'public/index.html').read_text(encoding='utf-8')
    old=(ROOT/'previews/premium-home/index.html').read_text(encoding='utf-8')
    start='<section class="section admission-section"';end='<section class="section faq-section"'
    html=html[:html.index(start)]+old[old.index(start):old.index(end)]+html[html.index(end):]
    # Remove production payment overlays entirely, retaining comparison/dialog tools.
    a=html.index('</footer>')+len('</footer>');b=html.index('<div class="compare-tray"',a);html=html[:a]+html[b:]
    html=re.sub(r'(src|href)="((?:visitor/|assets/|site-details\.js)[^"]*)"',r'\1="/public/\2"',html)
    html=re.sub(r'<title>.*?</title>','<title>Rehaan Computers · Clean modern homepage preview</title>',html,flags=re.S)
    html=re.sub(r'src="/public/visitor/app\.js[^\"]*"','src="'+PREVIEW+'app.js"',html)
    html=html.replace('<head>','<head><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; connect-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\'; frame-src \'self\'; form-action \'none\'; object-src \'none\'; base-uri \'none\'">',1)
    html=html.replace('</head>','<link rel="stylesheet" href="/previews/home-polish/polish.css"><script type="module" src="/previews/home-polish/polish.js"></script></head>')
    html=html.replace('<body data-visitor-design="premium">','<body class="home-polish" data-visitor-design="premium"><div class="polish-preview-note"><span>NEW HOMEPAGE PREVIEW</span><p>Design review only · live admissions and payments disconnected</p><a href="#courses">Explore the new layout ↗</a></div>',1)
    html=html.replace('Master real<br />computer skills.<br /><em>For a better future.</em>','Computer skills.<br /><em>Real confidence.</em>')
    html=html.replace('Practical classes. Individual attention. Skills you can use.','Practical computer training in Charangam, Beerwah. Personal guidance, useful skills and a clear place to begin.')
    html=html.replace('Find my course<span class="button-dot"></span>','Get guidance<span class="button-dot"></span>').replace('<button class="button outline" data-action="finder">','<button class="button outline" data-action="enquiry">',1)
    # An editorial caption gives the existing device some breathing room.
    html=html.replace('YOUR SKILLS. YOUR POSSIBILITIES.','A LITTLE PRACTICE. A BIGGER POSSIBILITY.')
    html=html.replace('Personal guidance.<br /><em>Practical progress.</em>','Learning, with guidance.<br /><em>At every step.</em>')
    html=html.replace('A closer look at the learning tools.','A closer look at what you’ll practise.')
    html=html.replace('GOOD QUESTIONS. CLEAR ANSWERS.','BEFORE YOUR FIRST CLASS')
    html=html.replace('A little clarity<br /><em>before you begin.</em>','Good questions.<br /><em>Clear answers.</em>')
    html=html.replace('<div class="faq-list" id="faqList"></div>','''<div class="polish-faq-panel"><label class="polish-faq-search" for="polishFAQSearch">Find an answer<input id="polishFAQSearch" type="search" placeholder="Try fees, documents or batches…"></label><div class="polish-faq-filters" role="group" aria-label="Question topics"><button type="button" data-faq-topic="all" aria-pressed="true">All questions</button><button type="button" data-faq-topic="admissions" aria-pressed="false">Joining</button><button type="button" data-faq-topic="fees" aria-pressed="false">Fees</button><button type="button" data-faq-topic="learning" aria-pressed="false">Learning</button></div><p id="polishFAQCount" role="status"></p><div class="faq-list" id="faqList"></div><p id="polishFAQEmpty" hidden>No matching answer. Try another word, or ask us below.</p><button class="text-link" data-action="enquiry">Still have a question? Get guidance ↗</button></div>''')
    html=html.replace('data-src="https://www.google.com/maps?q=34.026895%2C74.643088&amp;z=17&amp;output=embed"','data-src="'+PREVIEW+'map.html"')
    return html.encode()

def preview_app():
    app=(ROOT/'public/visitor/app.js').read_text(encoding='utf-8')
    app=re.sub(r'([\'\"])\./([^\'\"]+\.js(?:\?[^\'\"]*)?)([\'\"])',r'\1/public/visitor/\2\3',app)
    app=re.sub(r'/public/visitor/admission\.js\?[^\'\"]+','/previews/premium-home/admission.js',app)
    app=app.replace('"assets/"','"/public/assets/"').replace('src="assets/','src="/public/assets/')
    app=app.replace('initAdmission({ courses, toast, escape, icon })','initAdmission({ courses, showDialog, toast, escape, icon })')
    app=app.replace('const storageKey = "rehaan-visitor-saved-courses-v1"','const storageKey = "rehaan-clean-preview-saved-v1"')
    return app.encode()

def site_data():
    site=json.loads((ROOT/'public/visitor/site.json').read_text(encoding='utf-8'))
    for item in site['faq']:
        if item['q']=='How can I check course fees?':item['a']='Monthly tuition is shown near the top of this page and with the batch options. It is separate from the one-time ₹100 admission fee. Contact the centre to discuss the course and payment details before joining.'
    site['faq'].extend([{'q':'Can I join as a beginner?','a':'Several of our courses start with computer fundamentals. Explore the syllabus and beginner level on each course, or use Find my course for a starting point.'},{'q':'Can someone help me choose a course?','a':'Yes. Use Get guidance to choose either institute contact and discuss your goals. You can also compare courses and explore their full syllabuses on this page.'}])
    return json.dumps(site,ensure_ascii=False).encode()

class PreviewHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store');super().end_headers()
    def do_POST(self):self.send_error(405,'Read-only design preview')
    def do_GET(self):
        path=urlparse(self.path).path
        routes={PREVIEW:('text/html; charset=utf-8',preview_html),PREVIEW+'app.js':('application/javascript; charset=utf-8',preview_app),PREVIEW+'site.json':('application/json; charset=utf-8',site_data),PREVIEW+'courses.json':('application/json',lambda:(ROOT/'public/visitor/courses.json').read_bytes()),PREVIEW+'map.html':('text/html; charset=utf-8',lambda:b'<body style="margin:0;display:grid;place-content:center;height:100vh;background:#142637;color:#f2dfae;font:18px system-ui;text-align:center"><h2>Rehaan Computers</h2><p>Charangam, Beerwah, Kashmir</p><p>34.026895, 74.643088</p><small>Map area preview. External maps are disconnected here.</small></body>')}
        if path in routes:
            content_type,make=routes[path];data=make();self.send_response(200);self.send_header('Content-Type',content_type);self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        elif any(value in path for value in ['firebase','photo-storage','admin-app','public/admission.js','public/script.js']):self.send_error(403,'Live services are not available in this preview')
        else:super().do_GET()

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--no-browser',action='store_true');args=parser.parse_args()
    with ThreadingHTTPServer(('127.0.0.1',0),partial(PreviewHandler,directory=str(ROOT))) as server:
        url=f'http://127.0.0.1:{server.server_port}'+PREVIEW
        print('\nREHAAN COMPUTERS — CLEAN MODERN HOMEPAGE PREVIEW\n',flush=True);print(url,flush=True)
        print('\nNew first screen, course cards, typography, learning images, mobile layout, searchable FAQs and calmer motion.\nKeep CMD open. Ctrl+C stops the preview. No live admissions, messages or payments.\n',flush=True)
        if not args.no_browser:
            try:webbrowser.open_new_tab(url)
            except webbrowser.Error:print("Open the address above in your browser.",flush=True)
        try:server.serve_forever()
        except KeyboardInterrupt:print('\nPreview stopped.')
if __name__=='__main__':main()
