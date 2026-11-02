"""Run release unit checks in an isolated CRLF checkout; never touches live services."""
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

def main():
    files = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
    with tempfile.TemporaryDirectory(prefix='rehaan-crlf-') as directory:
        checkout = Path(directory)
        for name in filter(None, files):
            source = ROOT / name
            if not source.is_file():
                continue
            target = checkout / name
            target.parent.mkdir(parents=True, exist_ok=True)
            data = source.read_bytes()
            # Match Git's Windows text conversion, without changing binary assets.
            if b'\0' not in data:
                try:
                    data.decode('utf-8')
                    data = data.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
                except UnicodeDecodeError:
                    pass
            target.write_bytes(data)
        subprocess.run([shutil.which('node') or 'node', '--test',
                        *map(str, sorted((checkout / 'tests').glob('*.test.mjs')))],
                       cwd=checkout, check=True)
        print('PASS: release unit checks accept Windows CRLF with unchanged code/rules baselines.')

if __name__ == '__main__':
    main()
