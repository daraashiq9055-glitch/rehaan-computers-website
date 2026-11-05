"""Configure the separate notification Worker using a local FCM sender key."""
from pathlib import Path
import argparse,json,os,re,shutil,subprocess,sys,urllib.error,urllib.request
ROOT=Path(__file__).resolve().parent
FOLDER=ROOT/'backend/notifications'

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--service-account',help='Path to a local JSON key for a dedicated FCM sender service account. Never upload it to chat or Git.');p.add_argument('--database-id',help='Existing rehaan-website-updates D1 UUID, used when Wrangler JSON capture is unavailable on Windows.');args=p.parse_args()
 try:
  key_path=args.service_account or input('Paste the full path to your local notification-sender JSON file (not its contents): ').strip().strip('\"')
  if not key_path:raise ValueError('No file selected. Setup cancelled.')
  credentials=json.loads(Path(key_path).expanduser().read_text(encoding='utf-8'))
  if credentials.get('project_id')!='rehaan-computers' or credentials.get('type')!='service_account' or not credentials.get('client_email','').endswith('.iam.gserviceaccount.com') or 'BEGIN PRIVATE KEY' not in credentials.get('private_key',''):raise ValueError('Use a service-account key for rehaan-computers with the Firebase Cloud Messaging API Admin role.')
  npx=shutil.which('npx');
  if not npx:raise ValueError('Node/npm is required. Reopen CMD after installation.')
  config=FOLDER/'wrangler.local.toml'
  if not config.exists():config.write_text((FOLDER/'wrangler.toml').read_text(encoding='utf-8'),encoding='utf-8')
  else:
   # Keep the ignored local binding while applying the current safe limiter.
   local=config.read_text(encoding='utf-8').replace('simple = { limit = 30, period = 60 }','simple = { limit = 120, period = 60 }')
   if 'FIREBASE_WEB_API_KEY' not in local:local=local.replace('FIREBASE_PROJECT_ID = "rehaan-computers"','FIREBASE_PROJECT_ID = "rehaan-computers"\nFIREBASE_WEB_API_KEY = "AIzaSyBXRQvUZBPP_E3Q0SZBYTsOc6sfzAEiqpE"')
   config.write_text(local,encoding='utf-8')
  env=os.environ.copy();env['WRANGLER_SEND_METRICS']='false';env['WRANGLER_LOG']='error'
  def command(*args):return [npx,'--yes','wrangler@4.151.1',*args,'--config',str(config)]
  def run(*args,input=None):subprocess.run(command(*args),cwd=ROOT,env=env,input=input,text=True,check=True)
  def capture_json(*args):
   result=subprocess.run(command(*args),cwd=ROOT,env=env,text=True,check=True,capture_output=True)
   output=re.sub(r'\x1b\[[0-9;]*m','',result.stdout+'\n'+result.stderr)
   decoder=json.JSONDecoder()
   for index,char in enumerate(output):
    if char!='[':continue
    try:
     value,_=decoder.raw_decode(output[index:])
     if isinstance(value,list):return value
    except json.JSONDecodeError:pass
   raise ValueError('Cloudflare did not return its database list. Run: npx --yes wrangler@4.151.1 d1 list --json --config backend/notifications/wrangler.local.toml')
  print('Signing in to Cloudflare for the separate website-updates service.',flush=True)
  run('login')
  if 'database_id' not in config.read_text(encoding='utf-8'):
   # --update-config does not update some Windows/TOML combinations. Reuse an
   # existing database by ID instead of creating a duplicate.
   if args.database_id:
    if not re.fullmatch(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}',args.database_id):raise ValueError('The supplied database ID is not a valid UUID.')
    database_id=args.database_id
   else:
    databases=capture_json('d1','list','--json')
    match=next((row for row in databases if row.get('name')=='rehaan-website-updates'),None)
    if not match:
     run('d1','create','rehaan-website-updates','--binding','DB','--location','apac','--update-config')
     databases=capture_json('d1','list','--json')
     match=next((row for row in databases if row.get('name')=='rehaan-website-updates'),None)
    database_id=(match or {}).get('uuid') or (match or {}).get('id')
   if not database_id:raise ValueError('The notification database exists but its ID could not be read. Nothing was deployed.')
   with config.open('a',encoding='utf-8',newline='\n') as file:
    file.write('\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "rehaan-website-updates"\ndatabase_id = '+json.dumps(database_id)+'\n')
  run('d1','execute','rehaan-website-updates','--remote','--file',str(FOLDER/'schema.sql'),'--yes')
  run('deploy')
  print('Saving the FCM sender credentials as Worker secrets. Values will not be printed.',flush=True)
  run('secret','bulk',input=json.dumps({'FCM_CLIENT_EMAIL':credentials['client_email'],'FCM_PRIVATE_KEY':credentials['private_key']}))
  curl=shutil.which('curl')
  if not curl:raise ValueError('curl is required for the Cloudflare health check.')
  health=subprocess.run([curl,'-fsS','--max-time','30','-H','Origin: https://rehaan-computers.web.app','https://rehaan-website-updates.daraashiq9055.workers.dev/health'],capture_output=True,text=True)
  if health.returncode:
   raise ValueError('Notification health check failed: '+(health.stderr.strip() or 'curl exit '+str(health.returncode)))
  try:ready=json.loads(health.stdout)
  except json.JSONDecodeError:raise ValueError('Notification health check returned an unreadable response.')
  if not ready.get('ok') or ready.get('version')!='20261105-auth-4':raise ValueError('Notification health check reached an older or unhealthy Worker: '+health.stdout[:500])
  print('Worker configured. No notification was sent and no student/payment records were touched. Run python release-admin.py --deploy for website checks and publication.',flush=True)
 except (ValueError,OSError,subprocess.CalledProcessError) as error:
  print('Setup stopped. '+('A Cloudflare command failed; review its output.' if isinstance(error,subprocess.CalledProcessError) else str(error)),file=sys.stderr);sys.exit(1)
if __name__=='__main__':main()
