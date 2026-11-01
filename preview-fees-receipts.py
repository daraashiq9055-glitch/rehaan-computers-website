"""Preview monthly fee cards and updated receipts with fictional records only."""
from pathlib import Path
import importlib.util
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('fees_preview',ROOT/'preview-admin.py')
preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
original=preview.preview_html
preview.preview_html=lambda:original().replace(b'</head>',b'<script data-preview-only src="/previews/admin-premium/fees-receipts-demo.js"></script></head>')
if __name__=='__main__':
 print('Monthly fee cards + photo/signature/colour receipt preview. Fictional records only.',flush=True)
 print('Open Monthly status for Ayaan Mir; View receipts opens sample receipt 1000.',flush=True)
 print('Edit / correct receipt includes a background colour picker. Nothing is deployed.',flush=True)
 preview.main()
