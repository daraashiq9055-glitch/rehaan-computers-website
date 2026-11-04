"""The WhatsApp-only deploy must use its verified candidate, never root/public."""
from pathlib import Path
from unittest.mock import patch as mock
import importlib.util,unittest,tempfile,json,io,sys
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('wa_patch',ROOT/'patches/whatsapp-current.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Guard(unittest.TestCase):
 def run_case(self,deploy=True,mismatch=False,patch_failure=False,windows_nested=False):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);source=root/('archives/monday/last-working' if windows_nested else 'build/monday');public=source/'public';(public/'admin-next').mkdir(parents=True)
   data={'admin.html':b'Monday approved layout\n','admin-app.js':b'payment code\n','admin-next/ui.js':b'reminder code\n'}
   for name,value in data.items():(public/name).write_bytes(value)
   (source/'firebase.json').write_text(json.dumps({'hosting':{'public':'public'}}))
   def read(request,**kwargs):
    url=request if isinstance(request,str) else request.full_url
    name=url.removeprefix(m.LIVE);value=data[name]
    if windows_nested:value=value.replace(b'\n',b'\r\n')
    if mismatch and name=='admin-app.js':value=b'changed live file'
    return io.BytesIO(value)
   with mock.object(m,'ROOT',root),mock.object(m.urllib.request,'urlopen',side_effect=read),mock.object(m,'patch',side_effect=ValueError('patch mismatch') if patch_failure else None),mock.object(m.shutil,'which',return_value='npx.cmd'),mock.object(m.subprocess,'run') as run,mock.object(sys,'argv',['patch.py']+(['--deploy'] if deploy else [])):
    if mismatch or patch_failure:
     with self.assertRaises(ValueError):m.main()
     run.assert_not_called()
    else:
     m.main()
     if deploy:
      run.assert_called_once();self.assertEqual(run.call_args.kwargs['cwd'],root/'build/whatsapp-release');self.assertEqual(run.call_args.args[0][-4:],['--only','hosting','--project','rehaan-computers']);self.assertTrue(run.call_args.kwargs['check'])
     else:run.assert_not_called()
    self.assertEqual((public/'admin-app.js').read_bytes(),b'payment code\n')
 def test_windows_line_endings_in_nested_archive(self):self.run_case(windows_nested=True)
 def test_code_differences_are_not_normalized(self):self.assertFalse(m.same_file(b"amount=100\n",b"amount=999\r\n","app.js"))
 def test_verified_deploy_uses_candidate_folder(self):self.run_case()
 def test_no_deploy_by_default(self):self.run_case(deploy=False)
 def test_live_mismatch_blocks_deploy(self):self.run_case(mismatch=True)
 def test_patch_failure_blocks_deploy(self):self.run_case(patch_failure=True)
if __name__=='__main__':unittest.main()
