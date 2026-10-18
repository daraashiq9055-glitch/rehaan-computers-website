"""Fetch a pinned Google Cloud SDK Firestore emulator for local demo tests.

The official Cloud SDK registry is used when this environment cannot reach the
Firebase CLI's storage.googleapis.com download. Both the registry layer and the
extracted JAR must match their pinned SHA-256 digests before the JAR is used.
No archive paths are written directly to disk, and no credentials are needed.
"""
from pathlib import Path
import hashlib,shutil,subprocess,tarfile,tempfile

CACHE=Path(tempfile.gettempdir())/'rehaan-firestore-emulator'
JAR=CACHE/'cloud-firestore-emulator.jar'
LAYER_SHA='bed7b1871148a3d0f23b8995bba16ce043df9a16e5f18c6aed3eecf90e2f9fd9'
JAR_SHA='6262939c48d3d6b08495931706b8920399e57d5f5918e6af133a3d30cb3ae369'
URL='https://gcr.io/v2/google.com/cloudsdktool/google-cloud-cli/blobs/sha256:'+LAYER_SHA
MEMBER='google-cloud-sdk/platform/cloud-firestore-emulator/cloud-firestore-emulator.jar'

def digest(path):
 with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()

def setup():
 CACHE.mkdir(parents=True,exist_ok=True)
 if JAR.is_file() and digest(JAR)==JAR_SHA:
  print('Verified cached Firestore emulator 1.22.0:',JAR);return
 layer=CACHE/'google-cloud-sdk-layer.tar.gz'
 if not layer.is_file() or digest(layer)!=LAYER_SHA:
  part=CACHE/'download.partial'
  try:
   subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','240','--output',str(part),URL],check=True)
   if digest(part)!=LAYER_SHA:raise RuntimeError('Google Cloud SDK layer digest mismatch; emulator was not installed.')
   part.replace(layer)
  finally:part.unlink(missing_ok=True)
 part=CACHE/'emulator.partial'
 try:
  with tarfile.open(layer,'r:gz') as archive:
   member=archive.getmember(MEMBER)
   if not member.isfile():raise RuntimeError('Expected emulator JAR is not a regular file.')
   with archive.extractfile(member) as source,part.open('wb') as target:shutil.copyfileobj(source,target)
  if digest(part)!=JAR_SHA:raise RuntimeError('Firestore emulator JAR digest mismatch; emulator was not installed.')
  part.replace(JAR)
 finally:part.unlink(missing_ok=True)
 print('Verified official Firestore emulator 1.22.0:',JAR)

if __name__=='__main__':setup()
