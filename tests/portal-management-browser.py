"""Exercise direct portal UI actions with isolated service fixtures; no live writes."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import importlib.util
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('builder',ROOT/'prepare-admin-release.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
import tempfile
HARNESS='''<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="admin-ui/workbench.css"><style>body{margin:0;background:#071827;color:#eef3f7;font:14px Arial;padding:16px;box-sizing:border-box}*{box-sizing:border-box}button,input,select{font:inherit}h2{font-size:24px}dialog{color:#fff}</style><main id="host"></main><script type="module">
import {renderPortalWorkspace} from './admin-ui/portal-workspace.js';
let rows=[{id:'alpha',data:{fullName:'Aisha Test',status:'Approved',admissionNumber:'101',coursePreference:'Office',phone:'9000000001',learningProgress:{byCourse:{Office:{course:'Office',currentProgram:'MS Word',topics:[{id:'n',title:'Notepad',done:true},{id:'w',title:'MS Word',done:false}]}}}}},{id:'beta',data:{fullName:'Bilal Test',status:'Approved',admissionNumber:'102',coursePreference:'Office',studentPortalAccount:{uid:'beta-uid',username:'beta',enabled:true},monthlyAttendance:{'2026-11':{days:10,totalDays:20,note:''}}}}];
window.calls=[];let published=[],messages=[];const app={identity:()=>({uid:'admin-test'}),snapshot:()=>({ready:true,records:structuredClone(rows)}),portalRows:()=>rows.filter(row=>row.data.studentPortalAccount).map(row=>({id:row.id,unread:0,view:{enabled:row.data.studentPortalAccount.enabled,fees:{statement:{due:499,received:500}},attendance:[{month:'2026-11',attended:10,classes:20}],updatedAt:'2026-11-26T01:00:00Z'}})),topics:()=>['Notepad','MS Word'],details:()=>{throw Error('Student Details must not be used');},portalManage:async(action,id,input)=>{calls.push({action,id,...(action==='create'?{username:input.username}: {input})});if(action==='broadcast')return {recipients:input.reviewedIds.length};const row=rows.find(row=>row.id===id);if(action==='learnedRequests'&&window.reviewEnabled)return {programs:['Notepad'],version:100};if(action==='reviewLearning'){row.data.learningProgress.byCourse.Office.topics[0].done=input.approved.includes('Notepad');return true;}if(action==='create')row.data.studentPortalAccount={uid:'alpha-uid',username:input.username,enabled:true};if(action==='access')row.data.studentPortalAccount.enabled=input.enabled;if(action==='updates')return published;if(action==='publish')published.push({...input,id:'note'});if(action==='attendance')row.data.monthlyAttendance={[input.month]:input.value};if(action==='message')messages.push({sender:'admin',text:input.text});},portalThread:async(id,next)=>{next(messages);return ()=>{};},progress:async(id,input)=>{calls.push({action:'progress',id,input});rows.find(row=>row.id===id).data.learningProgress.byCourse.Office.topics=input.topics;},portalProgram:async(id,program)=>{calls.push({action:'program',id,program});},payment:id=>calls.push({action:'payment',id}),statement:id=>calls.push({action:'statement',id}),receipt:(id,receipt)=>calls.push({action:'receipt',id,receipt})};
let query='';function render(){renderPortalWorkspace({host:document.querySelector('#host'),app,query,setQuery:value=>{query=value;render();document.querySelector('#portalSearch').focus();}});}render();window.app=app;
</script>'''
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
with tempfile.TemporaryDirectory() as temp:
 output=builder.build(Path(temp)/'candidate');(output/'public/test-management.html').write_text(HARNESS)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(output/'public')));Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   for width in [320,360,390,768,1024,1366]:
    page=browser.new_page(viewport={'width':width,'height':850});errors=[];page.on('pageerror',lambda error:errors.append(str(error)));page.on('dialog',lambda dialog:dialog.accept())
    page.goto(f'http://127.0.0.1:{server.server_port}/test-management.html')
    expect(page.locator('[data-portal-quick=create]')).to_be_visible();assert page.locator('.portal-admin-stats article').count()==7
    def open_action(action,student='alpha'):
     page.locator(f'[data-portal-quick="{action}"]').first.click()
     page.locator('.portal-picker select').select_option(student)
    def close():page.locator('[data-close]').click()
    def fit():assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
    fit();open_action('create');page.locator('#portalCreateLogin [name=username]').fill('alpha-test');page.locator('#portalCreateLogin [name=password]').fill('TemporaryTest123');page.locator('#portalCreateLogin button').click();expect(page.locator('[role=status]')).to_contain_text('created and linked');expect(page.locator('[name=password]')).to_have_value('');assert 'TemporaryTest123' not in str(page.evaluate('calls'));fit();close()
    page.locator('[data-portal-quick=broadcast]').click()
    page.locator('#centrePublishForm [name=title]').fill('Centre notice');page.locator('#centrePublishForm [name=details]').fill('Classes start at ten.');page.locator('#centrePublishForm [type=submit]').click()
    expect(page.locator('#broadcastPreview')).to_contain_text('2 recipients');expect(page.locator('#broadcastPreview')).to_contain_text('Rehaan Computers');fit()
    page.locator('#confirmCentrePublish').click();expect(page.locator('#broadcastStatus')).to_contain_text('Published to 2 students');close()
    open_action('access');page.locator('#portalToggleAccess').click();expect(page.locator('#portalToggleAccess')).to_have_text('Restore access');page.locator('#portalToggleAccess').click();expect(page.locator('#portalToggleAccess')).to_have_text('Disable access');close()
    for action,category in [('homework','Homework'),('notes','Class notes'),('notice','Announcements'),('exam','Exams'),('result','Results')]:
     open_action(action);expect(page.locator('#portalPublish [name=category]')).to_have_value(category);page.locator('[name=title]').fill('Private test update');page.locator('[name=details]').fill('Only for this student');page.locator('#portalPublish button').click();expect(page.locator('[role=status]')).to_contain_text('published');fit();close()
    open_action('attendance','beta');page.locator('[name=days]').fill('11');page.locator('[name=totalDays]').fill('20');page.locator('#portalAttendance button').click();expect(page.locator('[role=status]')).to_contain_text('Attendance saved');close()
    open_action('messages');page.locator('[name=text]').fill('Private reply');page.locator('#portalReply button').click();expect(page.locator('[role=status]')).to_contain_text('Reply sent');close()
    open_action('journey');assert page.locator('[data-topic]').count()==2;page.locator('[data-topic="1"]').check();page.locator('#portalJourney button').click();expect(page.locator('[role=status]')).to_contain_text('Official checklist saved');close()
    page.evaluate('window.reviewEnabled=true');open_action('journey');page.locator('[data-confirm-program]').check();page.locator('#saveLearningReview').click();expect(page.locator('#learningReviewStatus')).to_contain_text('Teacher review saved');expect(page.locator('[data-topic="0"]')).to_be_checked();close()
    open_action('fees');page.locator('#portalTakePayment').click();assert page.evaluate('calls.at(-1).action')=='payment'
    page.locator('[data-portal-quick=quiz]').first.click();expect(page.locator('.portal-disabled-banner')).to_have_text('Official quiz activation pending backend verification')
    page.locator('[name=question]').fill('Which key saves a document?')
    for index,value in enumerate(['Ctrl+S','Ctrl+P','Ctrl+X','Ctrl+F']):page.locator(f'[name=option{index}]').fill(value)
    page.locator('#quizDraftForm [type=submit]').click();expect(page.locator('[role=status]')).to_contain_text('Draft saved');page.locator('[data-review]').click();expect(page.locator('.quiz-draft')).to_contain_text('Reviewed draft');page.locator('[data-edit]').click();page.locator('[name=question]').fill('Which shortcut saves a document?');page.locator('#quizDraftForm [type=submit]').click();expect(page.locator('.quiz-draft')).to_contain_text('Needs review')
    page.locator('[data-workshop=schedule]').click();assert page.locator('.portal-week-plan article').count()==7;fit();page.locator('[data-workshop=results]').click();expect(page.locator('#quizWorkshopBody')).to_contain_text('No official results');close()
    if width in [390,1366]:page.screenshot(path=str(ROOT/'build'/f'management-admin-{width}.png'),full_page=True)
    assert not errors,errors;page.close()
   browser.close()
  print('PASS: 14 direct quick actions including reviewed centre publishing, login form/password clearing, access toggle, private categories, attendance, replies, official checklist, fees and quiz drafts at 320/360/390/768/1024/1366px; Student Details never invoked.')
 finally:server.shutdown()
