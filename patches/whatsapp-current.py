"""Prepare a small WhatsApp fix from the exact currently deployed local release."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse,datetime,hashlib,json,os,shutil,subprocess,urllib.request,urllib.parse
ROOT=Path(__file__).resolve().parents[1]
LIVE='https://rehaan-computers.web.app/'
VERSION='20261104-whatsapp-1'

def same_file(local,live,name):
 if local==live:return True
 if Path(name).suffix.lower() not in {'.html','.js','.css','.json','.svg','.txt','.xml','.webmanifest'}:return False
 try:return local.decode('utf-8').replace('\r\n','\n')==live.decode('utf-8').replace('\r\n','\n')
 except UnicodeDecodeError:return False

def release_pages():
 roots={ROOT,*[p for p in ROOT.parent.glob('rehaan-*') if p.is_dir()]}
 for root in sorted(roots):
  for folder,dirs,files in os.walk(root):
   dirs[:]=[d for d in dirs if d not in {'.git','node_modules','private-assets','.venv','venv','.cache','attachments'}]
   here=Path(folder)
   if here.name=='public' and 'admin.html' in files and (here.parent/'firebase.json').is_file():yield here/'admin.html'

def patch(public):
 app=public/'admin-app.js';ui=public/'admin-next/ui.js';html=public/'admin.html'
 source=app.read_text(encoding='utf-8');text=ui.read_text(encoding='utf-8');page=html.read_text(encoding='utf-8')
 if '20261102-monday-pre-follow-1' not in page:raise ValueError('This patch is for the Monday pre-follow release. The selected build is different; stop and share RELEASE.json.')
 needle='<button type="button" class="admin-ghost-btn" data-act="details">Details</button>'
 if source.count(needle)!=1:raise ValueError('Student row layout differs; nothing was changed.')
 source="import {studentChatURL} from './admin-whatsapp.js?v="+VERSION+"';\n"+source
 anchor='''${studentChatURL(data) ? `<a class="admin-ghost-btn student-whatsapp" data-act="student-whatsapp" href="${escapeHTML(studentChatURL(data))}" target="_blank" rel="noopener noreferrer" aria-label="Open WhatsApp for ${escapeHTML(data.fullName || 'student')}">WhatsApp ↗</a>` : '<button type="button" class="admin-ghost-btn student-whatsapp" disabled title="Add a valid mobile number in Details first">WhatsApp · add number</button>'}
                '''
 source=source.replace(needle,anchor+needle).replace('>🔔 WhatsApp</button>','>🔔 Fee reminder</button>')
 listener='        card.querySelector("[data-photo-zoom]")?.addEventListener('
 if source.count(listener)!=1:raise ValueError('Student handlers differ; nothing was changed.')
 source=source.replace(listener,'''        card.querySelector('[data-act="student-whatsapp"]')?.addEventListener('click',event=>{
            try {requireAdmin();const current=adminState.apps.find(row=>row.id===id);const url=current&&studentChatURL(current.data);if(!url)throw Error('Save a valid student mobile number first.');event.currentTarget.href=url;}catch(error){event.preventDefault();window.alert(error.message);}
        });
'''+listener)
 start=text.index("  if(action==='whatsapp')");end=text.index('  b.disabled=true;',start)
 text=text[:start]+'''  if(action==='whatsapp'){
   if(app.identity()?.uid!==reminderUid){status.textContent='Sign in again before opening WhatsApp.';return;}
   const current=app.snapshot().records.find(row=>row.id===entry.id);
   if(!current||JSON.stringify(current.data)!==JSON.stringify(entry.data)){status.textContent='This student record changed. Close and reopen the reminder.';return;}
   const url=studentWhatsAppURL(current.data.phone,value.message);
   if(!url){status.textContent='Save a valid student mobile number in Details first.';return;}
   const opened=window.open(url,'_blank');if(opened)opened.opener=null;
   status.textContent=opened?'WhatsApp opened with the full message. Review and press Send. Attaching the image is optional and manual.':'Pop-up blocked. Allow WhatsApp pop-ups and try again.';return;
  }
'''+text[end:]
 text="import {studentWhatsAppURL} from '../admin-whatsapp.js?v="+VERSION+"';\n"+text
 text=text.replace('export function openReminder(entry){','export function openReminder(entry){\n const reminderUid=app.identity()?.uid;if(!reminderUid)return;')
 text=text.replace('dialog.showModal();let imageURL;', "dialog.showModal();let imageURL;const sessionWatch=new MutationObserver(()=>{if(app.identity()?.uid!==reminderUid)dialog.close();});const dashboard=document.querySelector('#adminDashboard');if(dashboard)sessionWatch.observe(dashboard,{attributes:true,attributeFilter:['hidden','style']});")
 text=text.replace('dialog.onclose=()=>{','dialog.onclose=()=>{sessionWatch.disconnect();')
 text=text.replace('WhatsApp message preview','Open WhatsApp · filled message')
 text=text.replace("Nothing has been sent or marked paid. Review the reminder and attach the downloaded image to the student's WhatsApp chat manually.", 'Open WhatsApp to use the complete message shown above. Attaching an image is optional. You still need to press Send; no payment is changed.')
 page=page.replace('admin-next/ui.js?v=20261102-monday-pre-follow-1','admin-next/ui.js?v='+VERSION)
 page=page.replace('</head>','<link rel="stylesheet" href="admin-whatsapp.css?v='+VERSION+'"></head>')
 # The inline bootstrap is unchanged, preserving its existing CSP hash.
 app.write_text(source,encoding='utf-8');ui.write_text(text,encoding='utf-8');html.write_text(page,encoding='utf-8')
 shutil.copyfile(ROOT/'public/admin-whatsapp.js',public/'admin-whatsapp.js')
 (public/'admin-whatsapp.css').write_text('.student-whatsapp{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 14px;border:1px solid #63c6a455;border-radius:10px;background:#21443955;color:#d9f5e7;text-decoration:none;font:600 12px Inter,Arial,sans-serif}.student-whatsapp:focus-visible{outline:2px solid #f6db9b;outline-offset:3px}\n',encoding='utf-8')

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',help='Folder containing firebase.json and public from the last deployment; normally auto-detected.');parser.add_argument('--deploy',action='store_true',help='After verification, deploy Hosting from the prepared patch folder only.');args=parser.parse_args()
 if args.source:source=(ROOT/args.source).resolve()
 else:
  with urllib.request.urlopen(LIVE+'admin.html',timeout=30) as response:live_html=response.read()
  pages=list(release_pages())
  candidates=[p.parent.parent for p in pages if same_file(p.read_bytes(),live_html,'admin.html')]
  if not candidates:raise ValueError('No saved release matches the restored Monday page. The old build may have been overwritten. Nothing was changed. Folders checked: '+', '.join(str(p.parent.parent) for p in pages[:12])+'. Paste this output; do not rebuild or deploy root/public.')
  source=max(candidates,key=lambda p:p.stat().st_mtime)
 public=source/'public';output=ROOT/'build/whatsapp-release'
 if not (source/'firebase.json').is_file() or not (public/'admin-next/ui.js').is_file():raise ValueError('Could not find your Monday release at '+str(source)+'. Run with --source followed by the folder you deployed. Nothing was deployed.')
 print('Verifying local release files against the live website. No records are read or changed.',flush=True)
 config=json.loads((source/'firebase.json').read_text(encoding='utf-8'))
 if not isinstance(config.get('hosting'),dict) or config['hosting'].get('public')!='public':raise ValueError('Unexpected Hosting folder configuration. Nothing was deployed.')
 ignored=config['hosting'].get('ignore',[])
 import fnmatch
 files=[p for p in public.rglob('*') if p.is_file() and not any(fnmatch.fnmatch(p.relative_to(public).as_posix(),pattern) or fnmatch.fnmatch(p.name,pattern.removeprefix('**/')) for pattern in ignored)]
 def verify(path):
  relative=path.relative_to(public).as_posix();request=urllib.request.Request(LIVE+urllib.parse.quote(relative),headers={'Cache-Control':'no-cache'})
  with urllib.request.urlopen(request,timeout=30) as response:live=response.read()
  if not same_file(path.read_bytes(),live,relative):raise ValueError('Local file differs from live: '+relative+'. Stop; select the exact release you last deployed.')
 with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(verify,files))
 if output.exists():output.rename(output.with_name('whatsapp-release-backup-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S')))
 shutil.copytree(source,output);patch(output/'public')
 (output/'WHATSAPP-PATCH.json').write_text(json.dumps({'version':VERSION,'source':str(source),'verifiedFiles':len(files)},indent=2),encoding='utf-8')
 print('Ready: '+str(output)+'\nOnly WhatsApp UI/link files changed.',flush=True)
 if args.deploy:
  npx=shutil.which('npx')
  if not npx:raise ValueError('Node/npm is required. Nothing was deployed.')
  print('Deploying the verified WhatsApp-only folder. Monday colours and layout are retained.',flush=True)
  subprocess.run([npx,'--yes','firebase-tools@15.34.0','deploy','--only','hosting','--project','rehaan-computers'],cwd=output,check=True)
  print('Hosting command completed. Reload the admin page and check both WhatsApp actions.',flush=True)
 else:
  print('Nothing deployed. To verify and deploy from the correct folder automatically: python patches/whatsapp-current.py --deploy',flush=True)

if __name__=='__main__':
 try:main()
 except Exception as error:raise SystemExit('Stopped: '+str(error))
