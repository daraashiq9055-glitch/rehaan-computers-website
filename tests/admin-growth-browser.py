"""Premium growth-suite preview: isolated sample data, no live services."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright,expect
import importlib.util
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('preview',ROOT/'preview-admin.py');preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path.split('?')[0] in ['/previews/admin-premium/','/previews/admin-premium/admin.html']:
   body=preview.preview_html(group_marks=True);self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
  elif self.path.split('?')[0]=='/public/admin-preview-app.js':
   body=((ROOT/'public/admin-app.js').read_text()+'\n'+(ROOT/'previews/admin-premium/bridge-exports.js').read_text()).encode();self.send_response(200);self.send_header('Content-Type','application/javascript');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
  else:super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];external=[]
  page.on('pageerror',lambda error:errors.append(str(error)));page.on('requestfailed',lambda request:external.append(request.url) if not request.url.startswith(base) else None);page.on('dialog',lambda dialog:dialog.accept())
  def route(r):
   if r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):r.fulfill(content_type='application/javascript',body=(ROOT/'previews/admin-premium/sdk.js').read_text(),headers={'Access-Control-Allow-Origin':'*'})
   elif r.request.url.startswith(base+'/photo-storage'):r.fulfill(content_type='application/javascript',body=(ROOT/'previews/admin-premium/photos.js').read_text())
   elif r.request.url.startswith(base):r.continue_()
   else:r.abort()
  page.context.route('**/*',route);page.goto(base+'/previews/admin-premium/');expect(page.locator('#adminDashboard')).to_be_visible();expect(page.locator('.admin-tabs')).to_be_hidden()
  # Fixture may open group sheet; close it before testing the league workspace.
  try: page.locator('[data-group-close]').click(timeout=2500)
  except: pass
  # Provisional registry stays outside the applications collection.
  page.locator('.nav-more summary').click();page.locator('[data-growth=prospects]').click();expect(page.locator('#growthWorkspace')).to_be_visible();expect(page.locator('.prospect-rows article')).to_have_count(1);page.locator('#prospectAdd').click();form=page.locator('#prospectForm');form.locator('[name=name]').fill('Fictional Visitor');form.locator('[name=phone]').fill('9000000199');form.locator('[name=course]').fill('Excel practical');form.locator('button.primary').click();expect(page.locator('.prospect-rows article')).to_have_count(2);assert page.evaluate("Object.keys(__adminPreview.growth.growthProspects).length")==2;assert 'Fictional Visitor' not in page.evaluate("JSON.stringify(__adminPreview.records)")
  page.locator('[data-admit-prospect]').first.click();expect(page.locator('#addName')).to_have_value('Aamir Shah');expect(page.locator('#addPhone')).to_have_value('9000000101');page.locator('#addSaveBtn').click();expect(page.locator('#addMsg')).to_contain_text('Student saved');page.locator('#adminAddModal .admin-modal-close').click();expect(page.locator('.prospect-rows')).to_contain_text('Admitted')
  # Manual income appears in Accounts, with no expense fields.
  page.locator('[data-operations=accounts]').click();expect(page.locator('#operationsWorkspace')).to_be_visible();page.locator('#otherIncomeAdd').click();income=page.locator('#incomeForm');income.locator('[name=amount]').fill('250');income.locator('[name=category]').fill('Certificate fee');income.locator('[name=method]').select_option(label='UPI');income.locator('button.primary').click();expect(page.locator('#accountsRows')).to_contain_text('Certificate fee');assert page.evaluate("Object.values(__adminPreview.growth.growthIncome)[0].amount")==25000;assert 'expense' not in page.evaluate("JSON.stringify(__adminPreview.growth.growthIncome)").lower()
  # A concession settles one month, remains separate from receipts and uses the preview PIN 2580.
  before=page.evaluate('structuredClone(__adminPreview.records)');page.locator('.nav [data-section=fees]').click();expect(page.locator('[data-fee-concession]').first).to_be_visible();page.locator('[data-fee-concession]').first.click();dialog=page.locator('#concessionForm');dialog.locator('[name=pin]').fill('1111');dialog.locator('[name=reason]').fill('Approved no-fee month after limited attendance.');dialog.locator('.confirm input').check();dialog.locator('button.primary').click();expect(page.locator('#concessionStatus')).to_contain_text('incorrect');dialog.locator('[name=pin]').fill('2580');dialog.locator('button.primary').click();expect(page.locator('#concessionForm')).to_have_count(0);after=page.evaluate('__adminPreview.records');changed=[key for key in after if after[key].get('feeConcessions')];assert len(changed)==1;sid=changed[0];assert after[sid]['monthlyFees'] and after[sid]['feeConcessions'];assert after[sid].get('feeReceipts',{})==before[sid].get('feeReceipts',{})
  # League gives a full premium SVG and private editable guidance.
  page.locator('[data-growth=league]').click();expect(page.locator('#leagueCreate')).to_be_enabled();page.locator('#leagueCreate').click();expect(page.locator('#leaguePreview img')).to_be_visible();expect(page.locator('.improvement-messages label')).to_have_count(3)
  with page.expect_download() as item:page.locator('#leagueDownload').click()
  png=Path(item.value.path()).read_bytes();assert png[:8]==b'\x89PNG\r\n\x1a\n';assert int.from_bytes(png[16:20],'big')==2400
  page.locator('#leagueSave').click();expect(page.locator('#leagueStatus')).to_contain_text('saved');assert len(page.evaluate('__adminPreview.growth.growthLeagues'))==1
  # One bottom navigation on phones, with the remaining pages inside More.
  out=ROOT/'tests/artifacts/growth-suite';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/'league-desktop.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':844});expect(page.locator('.sidebar .nav')).to_be_visible();expect(page.locator('.nav-more')).to_be_visible();overflow=page.evaluate("[document.documentElement.scrollWidth,innerWidth,[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1}).slice(0,8).map(e=>[e.tagName,e.className,e.id,e.getBoundingClientRect().right])]");assert overflow[0]<=overflow[1],overflow;page.screenshot(path=str(out/'league-mobile.png'),full_page=True)
  assert not errors,errors;assert not external,external;browser.close();print('PASS: premium navigation, provisional registry, income-only accounts, PIN concession and weekly league preview; no live services.')
finally:server.shutdown()
