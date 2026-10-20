"""Build with Windows' cp1252 default and compare the complete UTF-8 output."""
from pathlib import Path
from unittest.mock import patch
import importlib.util
import json
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('release_builder',ROOT/'prepare-admin-release.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)

class ReleaseEncodingTest(unittest.TestCase):
    def test_windows_default_does_not_change_or_corrupt_the_release(self):
        original_open=Path.open
        def windows_open(path,mode='r',buffering=-1,encoding=None,errors=None,newline=None):
            if 'b' not in mode and encoding is None:encoding='cp1252'
            return original_open(path,mode,buffering,encoding,errors,newline)
        with tempfile.TemporaryDirectory() as directory:
            folder=Path(directory)
            normal=builder.build(folder/'normal')
            with patch.object(Path,'open',windows_open):
                windows=builder.build(folder/'windows')
            normal_files={path.relative_to(normal):path.read_bytes() for path in normal.rglob('*') if path.is_file()}
            windows_files={path.relative_to(windows):path.read_bytes() for path in windows.rglob('*') if path.is_file()}
            self.assertEqual(normal_files,windows_files)
            self.assertIn('₹', (windows/'public/admin-app.js').read_text(encoding='utf-8'))
            self.assertIn('”', (windows/'public/admin-ui/shell.js').read_text(encoding='utf-8'))
            self.assertFalse(json.loads((windows/'RELEASE.json').read_text(encoding='utf-8'))['auditEnabled'])
            self.assertNotIn('firestore',json.loads((windows/'firebase.json').read_text(encoding='utf-8')))

if __name__=='__main__':unittest.main()
