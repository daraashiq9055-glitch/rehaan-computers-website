"""Generate a local-only, authenticated review candidate. Never deploys."""
from pathlib import Path
import argparse,importlib.util,json,re,shutil
ROOT=Path(__file__).resolve().parent

def build_review(url):
    if not re.fullmatch(r'https://[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev',url):raise ValueError('Use the HTTPS private review Worker URL without a trailing slash.')
    spec=importlib.util.spec_from_file_location('builder',ROOT/'prepare-admin-release.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
    target=ROOT/'build/student-service-review'
    if target.exists():
        manifest=target/'RELEASE.json'
        if target.is_symlink() or not manifest.exists() or json.loads(manifest.read_text(encoding='utf-8')).get('source')!='prepare-admin-release.py':raise ValueError('Existing directory is not a generated candidate; files were kept.')
        shutil.rmtree(target)
    destination=builder.build(target);public=destination/'public'
    path=public/'student-review-service.js';text=path.read_text(encoding='utf-8');text=text.replace("{enabled:false,url:''}",'{enabled:true,url:'+json.dumps(url)+'}');path.write_text(text,encoding='utf-8')
    path=public/'student-quiz-service.js';text=path.read_text(encoding='utf-8');text=re.sub(r"enabled:false,url:'[^']+'",'enabled:true,reviewOnly:true,url:'+json.dumps(url),text);start=text.index('export async function publicLeaderboard(');text=text[:start]+"export async function publicLeaderboard(){return null;}\n";path.write_text(text,encoding='utf-8')
    for filename in ['student.html','admin.html']:
        path=public/filename;text=path.read_text(encoding='utf-8');text=re.sub(r'(<body[^>]*>)',r'\1<div style="background:#302c1d;color:#f3db9b;padding:8px;font:12px sans-serif;text-align:center">PRIVATE REVIEW · Allowlisted accounts only · Public quiz remains disabled</div>',text,count=1);path.write_text(text,encoding='utf-8')
    # Refuse accidental Firebase Hosting deployment from this review-only folder.
    (destination/'firebase.json').write_text(json.dumps({'hosting':{'public':'DO-NOT-DEPLOY-PRIVATE-REVIEW'}}),encoding='utf-8')
    print('Private authenticated review built:',public)
    print('Serve locally: python -m http.server 8000 --bind 0.0.0.0 --directory build/student-service-review/public')
    print('Student: http://localhost:8000/student.html | Admin: http://localhost:8000/admin.html')
    return destination
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--worker-url',required=True);args=parser.parse_args();build_review(args.worker_url)
