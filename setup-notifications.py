"""Configure the separate notification Worker using a local FCM sender key."""
from pathlib import Path
import argparse,json,os,shutil,subprocess,sys,urllib.request
ROOT=Path(__file__).resolve().parent
FOLDER=ROOT/'backend/notifications'

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--service-account',help='Path to a local JSON key for a dedicated FCM sender service account. Never upload it to chat or Git.');args=p.parse_args()
 try:
  key_path=args.service_account or input('Paste the full path to your local notification-sender JSON file (not its contents): ').strip().strip('\"')
  if not key_path:raise ValueError('No file selected. Setup cancelled.')
  credentials=json.loads(Path(key_path).expanduser().read_text(encoding='utf-8'))
  if credentials.get('project_id')!='rehaan-computers' or credentials.get('type')!='service_account' or not credentials.get('client_email','').endswith('.iam.gserviceaccount.com') or 'BEGIN PRIVATE KEY' not in credentials.get('private_key',''):raise ValueError('Use a service-account key for rehaan-computers with the Firebase Cloud Messaging API Admin role.')
  npx=shutil.which('npx');
  if not npx:raise ValueError('Node/npm is required. Reopen CMD after installation.')
  config=FOLDER/'wrangler.local.toml'
  if not config.exists():config.write_text((FOLDER/'wrangler.toml').read_text(encoding='utf-8'),encoding='utf-8')
  env=os.environ.copy();env['WRANGLER_SEND_METRICS']='false';env['WRANGLER_LOG']='error'
  def run(*args,input=None):subprocess.run([npx,'--yes','wrangler@4.151.1',*args,'--config',str(config)],cwd=ROOT,env=env,input=input,text=True,check=True)
  print('Signing in to Cloudflare for the separate website-updates service.',flush=True)
  run('login')
  if 'database_id' not in config.read_text(encoding='utf-8'):
   run('d1','create','rehaan-website-updates','--binding','DB','--location','apac','--update-config')
  run('d1','execute','rehaan-website-updates','--remote','--file',str(FOLDER/'schema.sql'),'--yes')
  run('deploy')
  print('Saving the FCM sender credentials as Worker secrets. Values will not be printed.',flush=True)
  run('secret','bulk',input=json.dumps({'FCM_CLIENT_EMAIL':credentials['client_email'],'FCM_PRIVATE_KEY':credentials['private_key']}))
  request=urllib.request.Request('https://rehaan-website-updates.daraashiq9055.workers.dev/health',headers={'Origin':'https://rehaan-computers.web.app'})
  with urllib.request.urlopen(request,timeout=30) as response:
   if not json.load(response).get('ok'):raise ValueError('Notification health check did not pass.')
  print('Worker configured. No notification was sent and no student/payment records were touched. Run python release-admin.py --deploy for website checks and publication.',flush=True)
 except (ValueError,OSError,subprocess.CalledProcessError) as error:
  print('Setup stopped. '+('A Cloudflare command failed; review its output.' if isinstance(error,subprocess.CalledProcessError) else str(error)),file=sys.stderr);sys.exit(1)
if __name__=='__main__':main()
