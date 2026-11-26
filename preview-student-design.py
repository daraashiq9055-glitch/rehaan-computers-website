"""Open an isolated Student Portal design preview. No Firebase connection or live writes."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
import argparse, ast, base64, shutil
ROOT=Path(__file__).resolve().parent

def build_preview():
    output=ROOT/'build/student-design-preview'
    output.mkdir(parents=True,exist_ok=True)
    names=['student.html','student-portal.css','student-experience.js','student-programs.js','student-quiz.js','student-portal-data.js','student-quiz-service.js','student-portal-updates.js','student-centre-updates.json']
    for name in names:shutil.copy2(ROOT/'public'/name,output/name)
    asset=output/'visitor/assets';asset.mkdir(parents=True,exist_ok=True)
    shutil.copy2(ROOT/'public/visitor/assets/rehaan-mark.svg',asset/'rehaan-mark.svg')
    fonts=output/'admin-fonts';fonts.mkdir(exist_ok=True)
    shutil.copy2(ROOT/'public/admin-fonts/inter-latin-wght-normal.woff2',fonts/'inter-latin-wght-normal.woff2')
    tree=ast.parse((ROOT/'tests/student-live-browser.py').read_text(encoding='utf-8'))
    stub=next(ast.literal_eval(node.value) for node in tree.body if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='STUB' for t in node.targets))
    image='data:image/jpeg;base64,'+base64.b64encode((ROOT/'tests/fixtures/photo-check.jpg').read_bytes()).decode()
    stub=stub.replace('__TEST_IMAGE__',image)
    stub=stub.replace("'student-alpha':{program:'MS Word'}", "'student-alpha':JSON.parse(localStorage.getItem('preview-program')||'null')")
    stub=stub.replace("selections[uid]={program};selectionWatch[uid]?.(selections[uid]);", "selections[uid]={program};if(uid==='student-alpha')localStorage.setItem('preview-program',JSON.stringify({program}));selectionWatch[uid]?.(selections[uid]);")
    stub=stub.replace('return onboarding[uid]||null;',"return JSON.parse(localStorage.getItem('preview-follow-'+uid)||'null');")
    stub=stub.replace('onboarding[uid]={followed:true};',"onboarding[uid]={followed:true};localStorage.setItem('preview-follow-'+uid,JSON.stringify(onboarding[uid]));")
    (output/'student-portal-auth.js').write_text(stub,encoding='utf-8')
    html=(output/'student.html').read_text(encoding='utf-8')
    html=html.replace('<body id="top">', '<body id="top"><div style="padding:8px 12px;background:#29354a;color:#fff;font:11px/1.5 sans-serif;text-align:center">DESIGN PREVIEW · Sample records only · No live services</div>')
    html=html.replace('href="index.html"','href="student.html"').replace('href="index.html#admission"','href="https://rehaan-computers.web.app/#admission" target="_blank" rel="noopener"')
    html=html.replace('href="index.html#contact"','href="https://rehaan-computers.web.app/#contact" target="_blank" rel="noopener"')
    (output/'student.html').write_text(html,encoding='utf-8')
    script=(output/'student-experience.js').read_text(encoding='utf-8').replace('<a class="account-action" href="follow.html" target="_blank" rel="noopener">Enable browser notifications ↗</a>', '<p>Browser push is disconnected in this design preview.</p>')
    (output/'student-experience.js').write_text(script,encoding='utf-8')
    return output

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--port',type=int,default=8000);args=parser.parse_args()
    output=build_preview()
    server=ThreadingHTTPServer(('0.0.0.0',args.port),partial(SimpleHTTPRequestHandler,directory=str(output)))
    print(f'\nRC LEARN — ISOLATED DESIGN PREVIEW\nhttp://localhost:{args.port}/student.html',flush=True)
    print('Sample login: alpha / StudentPass123 (or beta / StudentPass123). Never enter real credentials here.\nFollow and software selection use preview-only browser storage; this is not real-account verification.\nUse your laptop IPv4 address instead of localhost on a phone connected to its hotspot/network.\nKeep this terminal open. Ctrl+C stops the preview. Nothing is deployed.',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:print('\nPreview stopped.')
    finally:server.server_close()
