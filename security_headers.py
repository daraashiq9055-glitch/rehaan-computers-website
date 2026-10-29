"""Build static Hosting security headers from the exact released HTML scripts."""
from pathlib import Path
import base64,copy,hashlib,json,re
ROOT=Path(__file__).resolve().parent

def inline_hashes(paths):
    values=set()
    for path in paths:
        for attrs,body in re.findall(r'<script\b([^>]*)>(.*?)</script\s*>',Path(path).read_text(encoding='utf-8'),re.I|re.S):
            if re.search(r'\bsrc\s*=',attrs,re.I) or not body.strip():continue
            values.add("'sha256-"+base64.b64encode(hashlib.sha256(body.encode()).digest()).decode()+"'")
    return sorted(values)

def secure_hosting_config(config,html_paths):
    config=copy.deepcopy(config)
    scripts=['\'self\'','https://www.gstatic.com/firebasejs/12.2.1/','https://*.razorpay.com','https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js',*inline_hashes(html_paths)]
    directives={
        'default-src':["'self'"],
        'script-src':scripts,
        'script-src-attr':["'none'"],
        'style-src':["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],
        'font-src':["'self'",'https://fonts.gstatic.com'],
        'img-src':["'self'",'data:','blob:','https://res.cloudinary.com','https://images.unsplash.com','https://*.razorpay.com'],
        'connect-src':["'self'",'https://identitytoolkit.googleapis.com','https://securetoken.googleapis.com','https://firestore.googleapis.com','https://*.razorpay.com','https://api.emailjs.com','https://rehaan-razorpay-live.daraashiq9055.workers.dev','https://rehaan-student-photos.daraashiq9055.workers.dev'],
        'frame-src':['https://*.razorpay.com','https://www.google.com'],
        'object-src':["'none'"],
        'base-uri':["'self'"],
        'form-action':["'self'"],
        'frame-ancestors':["'none'"],
        'upgrade-insecure-requests':[],
    }
    strict_policy='; '.join(key+(' '+' '.join(value) if value else '') for key,value in directives.items())
    headers={
        # Stage checkout restrictions until the real provider flow has been verified.
        'Content-Security-Policy':"object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
        'Content-Security-Policy-Report-Only':strict_policy,
        'X-Content-Type-Options':'nosniff',
        'X-Frame-Options':'DENY',
        'Referrer-Policy':'strict-origin-when-cross-origin',
        'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security':'max-age=31536000; includeSubDomains',
    }
    old=config['hosting'].get('headers',[])
    existing=[]
    for entry in old:
        retained=[h for h in entry['headers'] if h['key'] not in headers]
        if retained:existing.append({**entry,'headers':retained})
    config['hosting']['headers']=[{'source':'**','headers':[{'key':k,'value':v} for k,v in headers.items()]},*existing,{'source':'/admin.html','headers':[{'key':'Content-Security-Policy','value':strict_policy}]}]
    ignore=config['hosting'].setdefault('ignore',[])
    for pattern in ['**/*.env','**/*.env.*','**/*.pem','**/*.key','**/*.p12','**/*.map','**/*.log','**/*.zip','**/*.md','**/admin-fix.js','**/*service-account*.json','**/credentials.json']:
        if pattern not in ignore:ignore.append(pattern)
    return config

if __name__=='__main__':
    target=ROOT/'firebase.json';config=secure_hosting_config(json.loads(target.read_text(encoding='utf-8')),[ROOT/'public/index.html',ROOT/'public/admin.html'])
    target.write_text(json.dumps(config,indent=2)+'\n',encoding='utf-8')
    print('Hosting security headers generated. No deployment or database write performed.')
