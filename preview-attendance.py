"""Open the isolated monthly attendance design preview."""
from pathlib import Path
import importlib.util
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('attendance_preview', ROOT / 'preview-fees-receipts.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
preview = module.preview
original = preview.preview_html
preview.preview_html = lambda: original().replace(b'</head>', b'<script data-preview-only src="/previews/admin-premium/attendance-demo.js"></script></head>')
if __name__ == '__main__':
    print('ATTENDANCE PREVIEW: monthly totals, editable notices and WhatsApp drafts.', flush=True)
    print('Fictional students only. Nothing is deployed. Attendance opens automatically.', flush=True)
    preview.main()
