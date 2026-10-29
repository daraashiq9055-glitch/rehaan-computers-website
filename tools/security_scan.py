"""Redacted high-signal credential scan of the worktree and all reachable Git blobs.

No matched values are printed or written. This supplements, not replaces, a
provider-aware secret scanner and credential rotation when a leak is confirmed.
"""
from pathlib import Path
import argparse,json,re,subprocess,hashlib
ROOT=Path(__file__).resolve().parents[1]
PATTERNS={
 'private-key':re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
 'github-token':re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b'),
 'aws-access-key':re.compile(r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),
 'stripe-secret':re.compile(r'\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b'),
 'slack-token':re.compile(r'\bxox[baprs]-[A-Za-z0-9-]{20,}\b'),
 'google-oauth-token':re.compile(r'\bya29\.[A-Za-z0-9_-]{30,}\b'),
 'credential-assignment':re.compile(r'''(?im)["']?\b(?:RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|CLOUDINARY_API_SECRET|EMAILJS_PRIVATE_KEY|private_key|client_secret|api_secret|access_token|refresh_token|admin_password)["']?\s*[:=]\s*["']([^"'\r\n]{12,})["']'''),
}
PLACEHOLDER=re.compile(r'^(?:YOUR_|REPLACE_|EXAMPLE|placeholder|test[-_]|dummy|fake|mock|[xX*._-]+$)|\$\{|process\.env|env\.',re.I)
TEXT_SUFFIX={'.js','.mjs','.cjs','.json','.html','.py','.toml','.md','.txt','.yaml','.yml','.env','.example','.rules','.vars','.sh','.ps1'}
def matches(data):
 if b'\0' in data or len(data)>4000000:return []
 try:content=data.decode('utf-8')
 except UnicodeDecodeError:return []
 result=[]
 for rule,pattern in PATTERNS.items():
  for hit in pattern.finditer(content):
   value=hit.group(1) if hit.lastindex else hit.group()
   if PLACEHOLDER.search(value):continue
   if rule=='private-key':
    tail=content[hit.end():hit.end()+200].replace('\\n','\n').lstrip(' \r\n\t\"\'')
    if not re.match(r'[A-Za-z0-9+/]{32}',tail):continue
   result.append({'rule':rule,'line':content.count('\n',0,hit.start())+1,'fingerprint':hashlib.sha256(value.encode()).hexdigest()[:12]})
 return result

def scan():
 results=[];blob_count=0;worktree_count=0
 paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0')
 for name in filter(None,paths):
  path=ROOT/name
  if not path.is_file():continue
  worktree_count+=1
  for hit in matches(path.read_bytes()):results.append({'scope':'worktree','path':name,**hit})
 objects=subprocess.check_output(['git','rev-list','--objects','--all'],cwd=ROOT).decode().splitlines()
 process=subprocess.Popen(['git','cat-file','--batch'],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE)
 try:
  for row in objects:
   oid,_,name=row.partition(' ')
   process.stdin.write((oid+'\n').encode());process.stdin.flush();header=process.stdout.readline().decode().split()
   if len(header)!=3:continue
   size=int(header[2]);data=process.stdout.read(size);process.stdout.read(1)
   if header[1]!='blob':continue
   blob_count+=1
   for hit in matches(data):results.append({'scope':'history','path':name,'blob':oid,**hit})
 finally:process.stdin.close();process.stdout.close();process.wait()
 env_files=[]
 for path in ROOT.rglob('*'):
  if any(part in {'.git','node_modules','private-assets','build'} for part in path.relative_to(ROOT).parts):continue
  if path.is_file() and (path.name=='.env' or path.name.startswith('.env.') or path.name=='.dev.vars'):
   env_files.append({'path':str(path.relative_to(ROOT)),'example':path.name.endswith('.example')})
 return {'worktreeFilesScanned':worktree_count,'uniqueReachableBlobsScanned':blob_count,'reachableCommits':int(subprocess.check_output(['git','rev-list','--all','--count'],cwd=ROOT)),'findings':results,'environmentFiles':env_files,'limitations':['Custom high-signal scan; opaque or obfuscated credentials may not match.','No provider validation, account access, secret rotation or history rewrite performed.']}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path);args=parser.parse_args();result=scan()
 if args.output:args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2))
