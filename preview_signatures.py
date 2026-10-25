"""Unlock the institute's local preview assets; never used by Hosting or Firebase.

AES-256-CBC with independent HMAC-SHA256 authentication, verified before decrypt.
Windows uses built-in PowerShell/.NET; other systems use OpenSSL. No pip setup.
The random preview key is supplied separately and is never saved in this repo.
"""
from pathlib import Path
import base64
import hmac
import io
import os
import shutil
import subprocess
import zipfile

MAGIC=b'REHAAN-MARK-SIGS\x01'
ROOT=Path(__file__).resolve().parent

def preview_keys(value):
    if not isinstance(value,str) or len(value)!=64:
        raise ValueError('Paste the complete 64-character signature preview key.')
    try:master=bytes.fromhex(value)
    except ValueError:raise ValueError('The signature preview key must contain hexadecimal characters.') from None
    if len(master)!=32:raise ValueError('Paste the complete signature preview key.')
    return (hmac.digest(master,b'rehaan-marks-preview/encryption/v1','sha256'),hmac.digest(master,b'rehaan-marks-preview/authentication/v1','sha256'))

def decrypt(cipher,key,iv):
    if os.name=='nt':
        executable=shutil.which('powershell.exe') or shutil.which('pwsh.exe')
        if not executable:raise ValueError('Windows PowerShell is needed to load the preview signatures.')
        script=r'''$ErrorActionPreference='Stop';$aes=$null;try{$parts=[Console]::In.ReadToEnd().Split([char]10);$aes=[System.Security.Cryptography.Aes]::Create();$aes.Mode=[System.Security.Cryptography.CipherMode]::CBC;$aes.Padding=[System.Security.Cryptography.PaddingMode]::PKCS7;$aes.Key=[Convert]::FromBase64String($parts[0]);$aes.IV=[Convert]::FromBase64String($parts[1]);$cipher=[Convert]::FromBase64String($parts[2]);$plain=$aes.CreateDecryptor().TransformFinalBlock($cipher,0,$cipher.Length);[Console]::Out.Write([Convert]::ToBase64String($plain))}catch{[Console]::Error.Write('Could not unlock local preview signatures.');exit 1}finally{if($aes){$aes.Dispose()}}'''
        payload=b'\n'.join(base64.b64encode(v) for v in (key,iv,cipher))
        result=subprocess.run([executable,'-NoLogo','-NoProfile','-NonInteractive','-Command',script],input=payload,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=40)
        if result.returncode:raise ValueError('Could not unlock the local signature preview. No website records were contacted.')
        try:return base64.b64decode(result.stdout.strip(),validate=True)
        except ValueError:raise ValueError('The local signature preview could not be decoded.') from None
    executable=shutil.which('openssl')
    if not executable:raise ValueError('OpenSSL is needed to load the preview signatures on this computer.')
    result=subprocess.run([executable,'enc','-d','-aes-256-cbc','-K',key.hex(),'-iv',iv.hex()],input=cipher,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=40)
    if result.returncode:raise ValueError('Could not unlock local preview signatures.')
    return result.stdout

def unlock_signatures(value,root=ROOT):
    root=Path(root);enc,auth=preview_keys(value)
    bundle=(root/'preview-assets/mark-signatures.enc').read_bytes()
    if len(bundle)>4000000 or len(bundle)<len(MAGIC)+16+16+32 or not bundle.startswith(MAGIC):
        raise ValueError('Preview signature bundle is invalid. Run git pull --ff-only again.')
    message,tag=bundle[:-32],bundle[-32:]
    if not hmac.compare_digest(hmac.digest(auth,message,'sha256'),tag):
        raise ValueError('Signature preview key does not match, or the bundle changed. No files were written.')
    iv=message[len(MAGIC):len(MAGIC)+16];cipher=message[len(MAGIC)+16:]
    plain=decrypt(cipher,enc,iv)
    expected={'authorized.png','examiner.png'}
    with zipfile.ZipFile(io.BytesIO(plain)) as archive:
        if len(archive.infolist())!=2 or set(archive.namelist())!=expected:
            raise ValueError('The preview signature bundle has unexpected files.')
        assets={}
        for name in expected:
            if archive.getinfo(name).file_size>8000000:raise ValueError('The preview signature is too large.')
            data=archive.read(name)
            if not data.startswith(b'\x89PNG\r\n\x1a\n'):raise ValueError('The preview signature is not a PNG.')
            assets[name]=data
    destination=root/'private-assets/mark-signatures';destination.mkdir(parents=True,exist_ok=True,mode=0o700)
    for name,data in assets.items():
        path=destination/name
        with path.open('wb') as output:output.write(data)
        path.chmod(0o600)
    return destination
