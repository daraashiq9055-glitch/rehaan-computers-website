"""Open the mark-card redesign directly using fictional students, never live Firebase."""
from pathlib import Path
import importlib.util
import argparse
import sys
ROOT=Path(__file__).resolve().parent
helper_spec=importlib.util.spec_from_file_location('mark_preview_signatures',ROOT/'preview_signatures.py')
helper=importlib.util.module_from_spec(helper_spec);helper_spec.loader.exec_module(helper)
unlock_signatures=helper.unlock_signatures
spec=importlib.util.spec_from_file_location('admin_preview',ROOT/'preview-admin.py')
preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
original=preview.preview_html
preview.preview_html=lambda:original().replace(b'</head>',b'<script data-preview-only src="/previews/admin-premium/mark-preview.js"></script></head>')
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--signature-key',help='Load the supplied private signatures from the encrypted preview bundle.')
    parser.add_argument('--no-browser',action='store_true')
    args=parser.parse_args()
    if args.signature_key:
        try:unlock_signatures(args.signature_key)
        except (ValueError,OSError,TimeoutError) as error:parser.exit(1,str(error)+'\n')
        print('Both institute signatures loaded locally. No live website or records were contacted.',flush=True)
    sys.argv=[sys.argv[0]]+(['--no-browser'] if args.no_browser else [])
    preview.main()
