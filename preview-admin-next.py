"""Preview compact header, complete fee reminders/history and clearer attendance."""
import argparse
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util
from pathlib import Path
from urllib.parse import urlparse
import webbrowser
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('preview_base',ROOT/'preview-admin.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
original=base.preview_html
NEXT='/previews/admin-premium/next/'
def html():
 s=original().decode('utf-8')
 s=s.replace('src="'+base.PREVIEW+'demo.js"></script>','src="'+base.PREVIEW+'demo.js"></script><script src="'+NEXT+'fixtures.js"></script>')
 return s.replace('</head>','<link rel="stylesheet" href="'+NEXT+'style.css"><script type="module" src="'+NEXT+'ui.js"></script></head>').replace('DESIGN PREVIEW','NEXT ADMIN PREVIEW').encode('utf-8')
base.preview_html=html
class Handler(base.PreviewHandler):
 def do_GET(self):
  path=urlparse(self.path).path
  if path=='/public/admin-preview-app.js':
   source=(ROOT/'public/admin-app.js').read_text(encoding='utf-8')
   start=source.index('async function openTuitionReminder(');end=source.index('\nasync function recordMonthlyTuition(',start)
   source=source[:start]+'''async function openTuitionReminder(id) {
 requireAdmin(); const entry=adminState.apps.find(row=>row.id===id);
 if(entry) return (await import('/previews/admin-premium/next/ui.js')).openReminder(entry);
}
'''+source[end:]+ '\n'+(ROOT/'previews/admin-premium/bridge-exports.js').read_text(encoding='utf-8')
  elif path=='/public/admin-attendance-model.js':
   source=(ROOT/path.lstrip('/')).read_text(encoding='utf-8')
   source=source.replace("'Enter whole days from 0 to '+max+'.'", "'For '+monthLabel(month)+', enter a whole number from 0 to '+max+'. '+(month===today.slice(0,7)?'Only '+max+' calendar days have elapsed. For last month’s register, select Previous month.':'Use the total from this month’s register.')")
   source=source.replace("'Class days held must be at least days attended and within the month.'", "'Classes held must be a whole number from '+Math.max(1,Number(input.days))+' to '+max+' for '+monthLabel(month)+'. Do not enter planned future classes.'")
  else:return super().do_GET()
  data=source.encode('utf-8');self.send_response(200);self.send_header('Content-Type','application/javascript; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--no-browser',action='store_true');args=parser.parse_args()
 with ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT))) as server:
  url=f'http://127.0.0.1:{server.server_port}'+base.PREVIEW
  print('\nNEXT ADMIN PREVIEW — sample records only\nCompact header • all-due reminders + PNG • month-by-month receipts • attendance help\nOpen Fee Statements for the new monthly review. Nothing is deployed.\nReal messages, charges and student writes are disconnected.\n\n'+url+'\n\nKeep CMD open. Ctrl+C stops the preview.',flush=True)
  if not args.no_browser:webbrowser.open_new_tab(url)
  try:server.serve_forever()
  except KeyboardInterrupt:print('\nPreview stopped.')
if __name__=='__main__':main()
