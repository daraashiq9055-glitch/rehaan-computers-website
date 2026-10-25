"""Local encrypted preview assets; no credentials, records, messages or deployment."""
from pathlib import Path
import hashlib,importlib.util,shutil,tempfile,unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('preview_signatures',ROOT/'preview_signatures.py');helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
class PrivatePreviewTests(unittest.TestCase):
 def test_reject_invalid_or_incorrect_key_before_any_file_write(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);(root/'preview-assets').mkdir();shutil.copyfile(ROOT/'preview-assets/mark-signatures.enc',root/'preview-assets/mark-signatures.enc')
   for key in ['bad','x'*64,'00'*32]:
    with self.assertRaises(ValueError):helper.unlock_signatures(key,root)
   self.assertFalse((root/'private-assets').exists())
 def test_unlock_actual_bundle_is_byte_exact_and_tampering_is_rejected(self):
  keyfile=ROOT/'private-assets/preview-key.txt'
  if not keyfile.exists():self.skipTest('Private preview key is supplied separately, never committed.')
  key=keyfile.read_text().strip()
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);(root/'preview-assets').mkdir();target=root/'preview-assets/mark-signatures.enc';shutil.copyfile(ROOT/'preview-assets/mark-signatures.enc',target)
   output=helper.unlock_signatures(key,root)
   for name in ['examiner.png','authorized.png']:self.assertEqual(hashlib.sha256((output/name).read_bytes()).digest(),hashlib.sha256((ROOT/'private-assets/mark-signatures'/name).read_bytes()).digest())
   changed=bytearray(target.read_bytes());changed[100]^=1;target.write_bytes(changed);shutil.rmtree(root/'private-assets')
   with self.assertRaisesRegex(ValueError,'does not match'):helper.unlock_signatures(key,root)
   self.assertFalse((root/'private-assets').exists())
if __name__=='__main__':unittest.main()
