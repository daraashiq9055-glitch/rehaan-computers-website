"""Open the mark-card redesign directly using fictional students, never live Firebase."""
from pathlib import Path
import importlib.util
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('admin_preview',ROOT/'preview-admin.py')
preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
original=preview.preview_html
preview.preview_html=lambda:original().replace(b'</head>',b'<script data-preview-only src="/previews/admin-premium/mark-preview.js"></script></head>')
if __name__=='__main__':preview.main()
