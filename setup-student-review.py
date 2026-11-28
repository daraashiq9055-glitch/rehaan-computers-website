"""One-time private Worker/D1 setup. Never deploys Hosting or Firestore rules."""
from pathlib import Path
import argparse,json,re,shutil,subprocess,sys
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parent
BACKEND=ROOT/'backend/student-portal'
DB_NAME='rc-learn-quiz-review'

def uid(value):
    if not re.fullmatch(r'[A-Za-z0-9:_-]{8,128}',value):raise ValueError('Use the Firebase Authentication UID, not a username or admission number.')
    return value

def config_text(admin,students,database,origins):
    uid(admin)
    if len(students)!=2 or len(set(students))!=2 or admin in students:raise ValueError('Use two distinct disposable student UIDs, different from the admin UID.')
    for value in students:uid(value)
    if not re.fullmatch(r'[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}',database):raise ValueError('Invalid D1 UUID.')
    for origin in origins:
        url=urlparse(origin)
        if url.scheme not in ('http','https') or not url.hostname or url.path or url.query or url.fragment or url.username or '*' in origin:raise ValueError('Use exact preview origins without paths or trailing slashes.')
        if url.hostname in ('rehaan-computers.web.app','rehaan-computers.firebaseapp.com'):raise ValueError('Live website origins must not be enabled in private review.')
    text=(BACKEND/'wrangler.review.example.toml').read_text()
    text=text.replace('REPLACE_WITH_ADMIN_FIREBASE_UID',admin).replace('REPLACE_WITH_FIRST_UID,REPLACE_WITH_SECOND_UID',','.join(students)).replace('REPLACE_WITH_REVIEW_DATABASE_UUID',database)
    text=re.sub(r'ALLOWED_ORIGINS = .*',lambda _: 'ALLOWED_ORIGINS = '+json.dumps(','.join(origins)),text)
    return text

def credential(path):
    resolved=path.expanduser().resolve()
    if resolved.is_relative_to(ROOT.resolve()):raise ValueError('Keep the service-account key outside the Git repository, for example in your Windows user folder.')
    value=json.loads(resolved.read_text())
    if value.get('project_id')!='rehaan-computers' or not value.get('client_email') or not str(value.get('private_key','')).startswith('-----BEGIN PRIVATE KEY-----'):raise ValueError('Use a dedicated service-account JSON key for rehaan-computers.')
    return json.dumps(value)

def json_output(text):
    decoder=json.JSONDecoder()
    for i,char in enumerate(text):
        if char in '[{':
            try:return decoder.raw_decode(text[i:])[0]
            except ValueError:pass
    raise RuntimeError('Cloudflare returned no valid JSON. Review the terminal output.')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--admin-uid');parser.add_argument('--student-uid',action='append',default=[]);parser.add_argument('--service-account',type=Path);parser.add_argument('--database-id');parser.add_argument('--origin',action='append',default=[]);parser.add_argument('--validate-only',action='store_true')
    args=parser.parse_args()
    admin=args.admin_uid or input('Admin Firebase UID: ').strip();students=args.student_uid or [input('First disposable student Firebase UID: ').strip(),input('Second disposable student Firebase UID: ').strip()]
    origins=args.origin or ['http://localhost:8000','http://127.0.0.1:8000'];key=credential(args.service_account or Path(input('Path to service-account JSON (outside this repo): ').strip().strip('"')))
    config_text(admin,students,args.database_id or '00000000-0000-0000-0000-000000000000',origins)
    if args.validate_only:print('Review setup inputs valid. No resources created and no secrets printed.');return
    node=shutil.which('node');npx=shutil.which('npx.cmd' if sys.platform=='win32' else 'npx')
    if not node or not npx:raise RuntimeError('Install Node.js 24 or newer, then reopen PowerShell.')
    subprocess.run([node,'--test','tests/student-review.test.mjs'],cwd=ROOT,check=True)
    cli=[npx,'--yes','wrangler@4.50.0']
    def run(*command,secret=None,capture=False):
        # Wrangler can emit Unicode box-drawing/status characters.  Explicit
        # UTF-8 with replacement keeps Windows CP1252 console settings from
        # crashing the helper while it parses machine-readable JSON output.
        result=subprocess.run([*cli,*command],cwd=ROOT,input=secret,text=True,
            encoding='utf-8',errors='replace',capture_output=capture or secret is not None)
        if result.returncode:
            # Never echo command stdin: it can contain the service-account key.
            if secret is None and capture:print(result.stdout+result.stderr)
            raise RuntimeError('Cloudflare command failed: '+' '.join(command)+'. No live website deployment was attempted.')
        if secret is not None:print('Worker secret uploaded securely.')
        return result.stdout or ''
    identity=run('whoami',capture=True)
    if 'not authenticated' in identity.lower():run('login')
    local=BACKEND/'wrangler.review.local.toml'
    database=args.database_id
    if not database:
        if local.exists():raise RuntimeError('A local review config already exists. Reuse its database ID with --database-id; do not create another database.')
        created=run('d1','create',DB_NAME,'--config',str(BACKEND/'wrangler.review.example.toml'),'--update-config','false',capture=True)
        ids=re.findall(r'[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}',created)
        if not ids:raise RuntimeError('Database creation returned no UUID. Check Cloudflare D1 before retrying; do not create duplicate databases.')
        database=ids[0]
    local.write_text(config_text(admin,students,database,origins))
    info=json_output(run('d1','info',DB_NAME,'--config',str(local),'--json',capture=True))
    if info.get('name')!=DB_NAME or info.get('uuid',info.get('id'))!=database:raise RuntimeError('Database identity mismatch. Only rc-learn-quiz-review is allowed.')
    run('d1','execute',DB_NAME,'--config',str(local),'--remote','--file',str(BACKEND/'schema.sql'))
    status=json_output(run('d1','execute',DB_NAME,'--config',str(local),'--remote','--command',"SELECT name FROM pragma_table_info('question_bank') WHERE name='status'",'--json',capture=True))
    if not any(row.get('results') for row in status):run('d1','execute',DB_NAME,'--config',str(local),'--remote','--file',str(BACKEND/'migrations/0002_review.sql'))
    run('d1','execute',DB_NAME,'--config',str(local),'--remote','--file',str(BACKEND/'migrations/0003_competition.sql'))
    result=run('deploy','--config',str(local),capture=True);print(result)
    run('secret','put','FIREBASE_SERVICE_ACCOUNT','--config',str(local),secret=key)
    urls=re.findall(r'https://[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev',result)
    if urls:
        subprocess.run([sys.executable,str(ROOT/'prepare-student-review.py'),'--worker-url',urls[-1]],cwd=ROOT,check=True)
        print('Review Worker:',urls[-1])
    else:print('Use the review Worker URL shown in Cloudflare with python prepare-student-review.py --worker-url URL')
    print('Only private review infrastructure was set up. Run the real-account checklist before any live activation. Official quiz attempts are blocked until a teacher approves sufficient questions and enables review attempts.')
if __name__=='__main__':
    try:main()
    except (ValueError,RuntimeError,OSError,subprocess.CalledProcessError) as error:print('Setup stopped:',error,file=sys.stderr);sys.exit(1)
