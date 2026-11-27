"""Private management UI contract against isolated HTTP fixtures, six widths."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import ast,importlib.util,json
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('builder',ROOT/'prepare-student-review.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
output=builder.build_review('https://review.fixture.workers.dev')/'public'
tree=ast.parse((ROOT/'tests/portal-management-browser.py').read_text());harness=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='HARNESS' for t in n.targets))
harness=harness.replace("identity:()=>({uid:'admin-test'}),", "identity:()=>({uid:'admin-test'}),idToken:async()=> 'fixture-token',")
(output/'review-ui-test.html').write_text(harness)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(output)));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in [320,360,390,768,1024,1366]:
   page=browser.new_page(viewport={'width':width,'height':850});errors=[];page.on('pageerror',lambda error:errors.append(str(error)));page.on('dialog',lambda d:d.accept())
   questions=[dict(id='question-001',program='Computer basics',difficulty='Foundation',question='Which device enters text?',options=['Keyboard','Monitor','Speaker','Printer'],answer=0,explanation='A keyboard enters text.',status='Draft',updated_at='1')];publications=[]
   def api(route):
    request=route.request;path=request.url.split('.workers.dev')[1];body=request.post_data_json if request.post_data else {};result={}
    if path=='/admin/questions':
     if request.method=='POST':questions[0]={**body,'updated_at':str(int(questions[0]['updated_at'])+1)};result={'status':body['status']}
     else:result={'questions':questions,'readiness':[dict(program='Computer basics',approvedCurrent=0,approvedPrevious=0,currentNeeded=70,previousNeeded=0,missingCurrent=70,missingPrevious=0,ready=False)]}
    elif path=='/admin/questions/drafts':result={'version':1,'questions':[]}
    elif path=='/admin/questions/import':result={'imported':len(body['questions'])}
    elif path=='/admin/publications/preview':result={**body,'publicationId':'publication-001','recipients':[dict(id='beta',uid='beta-uid',name='Bilal Test',admissionNumber='102')]}
    elif path=='/admin/publications':
     if request.method=='POST':publications[:]=[dict(id='publication-001',payload=body['payload'],target=body['target'],recipients=[dict(uid='beta-uid')],scheduled_at=body['scheduledAt'],revision=1,state='scheduled')];result={'state':'scheduled'}
     else:result={'publications':publications}
    elif path.endswith('/reads'):result={'students':[dict(uid='beta-uid',name='Bilal Test',delivered=True,read=False)]}
    elif request.method=='DELETE':publications[0]['state']='deleted';result={'state':'deleting'}
    else:result={'enabled':False}
    route.fulfill(content_type='application/json',body=json.dumps(result))
   page.route('https://review.fixture.workers.dev/**',api)
   page.goto(f'http://127.0.0.1:{server.server_port}/review-ui-test.html');page.locator('[data-portal-quick=quiz]').first.click()
   page.locator('[data-review-route=schedule]').click();expect(page.locator('#activateReview')).to_be_disabled();expect(page.locator('#scheduleReadiness')).to_contain_text('Approve questions');page.locator('[data-review-route=bank]').click();page.get_by_text('Manage individual questions and imports',exact=True).click();expect(page.locator('#reviewQuestionForm')).to_be_visible()
   expect(page.locator('#bankReadiness')).to_contain_text('Need 70 current');page.locator('[data-edit]').click();page.locator('#reviewQuestionForm [name=status]').select_option('Review');page.locator('#reviewQuestionForm [type=submit]').click();page.locator('[data-approve]').click();expect(page.locator('#bankList')).to_contain_text('Approved')
   page.locator('#bankFilter').select_option('Draft');expect(page.locator('#bankList')).to_contain_text('No questions match');page.locator('#bankFilter').select_option('All')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.locator('[data-close]').click()
   page.locator('[data-portal-quick=broadcast]').click();page.wait_for_function("!document.querySelector('#reviewPublicationForm').inert");page.locator('#reviewPublicationForm [name=title]').fill('Scheduled classwork');page.locator('#reviewPublicationForm [name=details]').fill('Review the lesson tomorrow.');page.locator('#reviewPublicationForm [name=scheduledAt]').fill('2026-12-01T10:00');page.locator('#reviewPublicationForm [type=submit]').click();expect(page.locator('#reviewPublicationPreview')).to_contain_text('Bilal Test');page.locator('#confirmReviewPublication').click();expect(page.locator('#reviewPublicationList')).to_contain_text('scheduled')
   page.locator('[data-publication-reads]').click();expect(page.locator('[data-reads-for]')).to_contain_text('Unread');page.locator('[data-publication-edit]').click();expect(page.locator('#reviewPublicationForm [name=title]')).to_have_value('Scheduled classwork');page.locator('[data-publication-delete]').click();expect(page.locator('#reviewPublicationList')).to_contain_text('deleted')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert not errors,errors
   if width in [390,1366]:page.screenshot(path=str(ROOT/'build'/f'review-publishing-{width}.png'),full_page=True)
   page.close()
  browser.close()
 print('PASS: private question review/approval/filtering, scheduled publication preview, audience, reads, edit/delete UI at 320/360/390/768/1024/1366px, no horizontal overflow or script errors. HTTP fixtures only.')
finally:server.shutdown()
