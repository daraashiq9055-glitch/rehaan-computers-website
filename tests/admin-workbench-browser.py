"""Remaining premium features: local-only lifecycle/progress, two-admin prefs and demo history."""
import importlib.util,json
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('launcher',ROOT/'preview-admin.py');launcher=importlib.util.module_from_spec(spec);spec.loader.exec_module(launcher)
OUT=ROOT/'tests/artifacts/admin-workbench'

def run():
 OUT.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(launcher.PreviewHandler,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   context=browser.new_context(viewport={'width':1512,'height':1100},reduced_motion='reduce',accept_downloads=True)
   errors,external,writes,failed=[],[],[],[]
   def route(r):
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
    elif r.request.url.startswith(base+'/'):r.continue_()
    else:external.append(r.request.url);r.abort()
   context.route('**/*',route)
   page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)));page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None);page.on('dialog',lambda d:d.accept())
   page.goto(base+launcher.PREVIEW);expect(page.locator('[data-workbench=journeys]')).to_be_enabled();before=page.evaluate('structuredClone(__adminPreview.records)')
   assert page.evaluate('(__adminPreview.audit||[]).length')==0
   def open_view(name):
    if page.viewport_size['width']<=760:page.locator('#menuToggle').click()
    page.locator('[data-workbench='+name+']').click();expect(page.locator('#adminWorkbench')).to_be_visible()
   open_view('journeys');page.locator('[data-journey-student="demo-1"]').click()
   for stage in ['Completed','Archived','Active']:
    page.locator('#lifecycleStage').select_option(stage);page.locator('#lifecycleReason').fill('Reviewed this student journey');page.locator('#lifecycleForm [type=submit]').click();expect(page.locator('#lifecycleStatus')).to_contain_text('Stage saved')
   record=page.evaluate('__adminPreview.records["demo-1"]');assert record['studentLifecycle']['stage']=='Active';assert len(record['studentLifecycle']['events'])==3
   for key,value in before['demo-1'].items():assert record[key]==value,key
   page.locator('[data-journey-tab=learning]').click();page.locator('[data-learning-index="0"]').check();page.locator('[data-learning-index="1"]').check();page.locator('#learningSave').click();expect(page.locator('#learningStatus')).to_contain_text('Checklist saved')
   page.locator('#learningNewTopic').fill('Independent practical task');page.locator('#learningAddTopic').click();page.locator('#learningTopics input').last.check();page.locator('#learningSave').click();expect(page.locator('#learningStatus')).to_contain_text('Checklist saved')
   record=page.evaluate('__adminPreview.records["demo-1"]');progress=next(iter(record['learningProgress']['byCourse'].values()));assert sum(t['done'] for t in progress['topics'])==3
   for key,value in before['demo-1'].items():assert record[key]==value,key
   assert len(page.evaluate('__adminPreview.audit'))==5
   page.locator('[data-learning-index="0"]').uncheck();page.evaluate('''const key=Object.keys(__adminPreview.records['demo-1'].learningProgress.byCourse)[0];__adminPreview.records['demo-1'].learningProgress.byCourse[key].topics[2].done=true''');changed=page.evaluate('structuredClone(__adminPreview.records["demo-1"])')
   page.locator('#learningSave').click();expect(page.locator('#learningStatus')).to_contain_text('Another administrator');assert page.evaluate('__adminPreview.records["demo-1"]')==changed;assert len(page.evaluate('__adminPreview.audit'))==5
   page.locator('#learningReload').click();expect(page.locator('#learningSave')).to_be_disabled();expect(page.locator('[data-learning-index="2"]')).to_be_checked()
   print('PASS: complete/archive/restore and course checklist preserve every original field; stale progress is rejected, reload recovers, and only successful saves create history',flush=True)
   open_view('history');expect(page.locator('.history-events>button')).to_have_count(5);expect(page.locator('.journey-intro')).to_contain_text('secure server-controlled log is still required')
   page.locator('.history-events>button').last.click();expect(page.locator('.history-dialog')).to_contain_text('Student lifecycle');expect(page.locator('.history-dialog')).to_contain_text('Reviewed this student journey');page.locator('[aria-label="Close history details"]').click()
   with page.expect_download() as download:page.locator('#historyExport').click()
   log=json.loads(Path(download.value.path()).read_text());assert log['previewOnly'] is True and len(log['events'])==5 and log['events'][0]['actor']=='preview-admin'
   print('PASS: preview journal retains before/after values, reasons, timestamps and actor identity; read-only export is clearly labelled as a demo',flush=True)
   open_view('preferences');form=page.locator('#workspacePreferences');form.locator('[name=start]').select_option('today');form.locator('[name=density]').select_option('compact');form.locator('[name=layout]').select_option('cards');form.locator('[name=motion]').select_option('reduced')
   for checkbox in form.locator('[name=favourites]').all():checkbox.uncheck()
   form.locator('[name=favourites][value=today]').check();form.locator('[name=favourites][value=records]').check();form.locator('[type=submit]').click();expect(page.locator('#preferencesStatus')).to_contain_text('saved')
   expect(page.locator('body')).to_have_class('admin-page admin-premium-preview signed-in workbench-open workspace-compact workspace-reduced-motion')
   preferences=page.evaluate('JSON.parse(localStorage.getItem("rehaan-preview-ui-v1:preview-admin"))');assert set(preferences)=={'start','density','layout','motion','favourites'};assert preferences['favourites']==['today','records']
   page.locator('[data-section=fees]').click();assert page.locator('.rc-fees').evaluate('el=>el.getBoundingClientRect().width > document.querySelector("#applicationsList").getBoundingClientRect().width*.9')
   open_view('preferences')
   record_snapshot=page.evaluate('structuredClone(__adminPreview.records)');page.locator('#switchDemoAdmin').click();expect(page.locator('#workspaceProfile')).to_contain_text('admin2@rehaan.example');expect(page.locator('body')).not_to_have_class(__import__('re').compile('workspace-compact'))
   page.locator('[data-section=students]').click();page.locator('[data-application-id="demo-1"] [data-act=details]').click();page.locator('.admin-toggle-edit').click();page.locator('.admin-edit-note').fill('Reviewed by demo administrator 2');page.locator('.admin-save-edits').click();expect(page.locator('#adminDetailsModal')).to_be_hidden()
   assert page.evaluate('__adminPreview.audit.at(-1).actor')=='preview-admin-2'
   record_snapshot=page.evaluate('structuredClone(__adminPreview.records)')
   open_view('preferences');expect(page.locator('#workspacePreferences [name=start]')).to_have_value('overview');page.locator('#workspacePreferences [name=start]').select_option('fees');page.locator('#workspacePreferences [type=submit]').click();page.locator('#switchDemoAdmin').click();expect(page.locator('#workspaceProfile')).to_contain_text('preview@rehaan.example');expect(page.locator('[data-operations=today]')).to_have_attribute('aria-current','page')
   open_view('preferences');expect(page.locator('#workspacePreferences [name=start]')).to_have_value('today');page.locator('#preferencesReset').click();assert page.evaluate('__adminPreview.records')==record_snapshot
   print('PASS: two demo administrators keep separate browser preferences; switching/reloading layouts does not change shared student records',flush=True)
   for action in ['profile','fees','marks','receipts']:
    page.keyboard.press('Control+k');page.locator('#finderQuery').fill('Sara');button=page.locator('[data-quick-student="demo-1"][data-quick-action='+action+']');expect(button).to_be_visible();button.click()
    if action in ['profile','receipts']:
     expect(page.locator('#profileName')).to_have_text('Sara Khan')
     if action=='receipts':expect(page.locator('[data-profile-tab=fees]')).to_have_attribute('aria-selected','true')
     page.locator('.profile-close').click()
    elif action=='marks':expect(page.locator('#rcMarkStudent')).to_have_value('demo-1')
    else:expect(page.locator('#rcFeeFilter')).to_be_visible();expect(page.locator('.rc-fee-row')).to_have_count(1)
   assert page.evaluate('__adminPreview.records')==record_snapshot
   open_view('history');page.locator('#historyActor').select_option('preview-admin-2');expect(page.locator('.history-events>button')).to_have_count(1);expect(page.locator('.history-events>button')).to_contain_text('Student details updated');page.locator('#historyActor').select_option('')
   print('PASS: Ctrl+K opens the correct student profile, filtered fees, mark card and personal receipt section without saving records',flush=True)
   for width in [320,390,768,1024,1512]:
    page.set_viewport_size({'width':width,'height':1000})
    for view in ['journeys','history','preferences']:
     open_view(view);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(view,width)
     if view=='journeys':page.locator('[data-journey-student="demo-1"]').click();page.locator('[data-journey-tab=learning]').click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('learning',width)
     if width in [390,1512]:page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(OUT/f'{view}-{width}.png'),full_page=True)
   page.set_viewport_size({'width':1512,'height':1100});open_view('journeys');page.locator('[data-journey-student="demo-1"]').click();page.locator('[data-journey-tab=lifecycle]').click();page.locator('#lifecycleStage').select_option('Completed');page.locator('#lifecycleReason').fill('Permission failure example');page.evaluate('__adminPreview.failWrite=true');unchanged=page.evaluate('structuredClone(__adminPreview.records)');count=page.evaluate('__adminPreview.audit.length');page.locator('#lifecycleForm [type=submit]').click();expect(page.locator('#lifecycleStatus')).to_contain_text('not confirmed');assert page.evaluate('__adminPreview.records')==unchanged and page.evaluate('__adminPreview.audit.length')==count;page.evaluate('__adminPreview.failWrite=false')
   open_view('history');page.locator('.history-events>button').first.click();page.evaluate('document.querySelector("#adminLogoutBtn").click()');expect(page.locator('#adminDashboard')).to_be_hidden();expect(page.locator('.history-dialog')).to_have_count(0);assert page.locator('#adminWorkbench').inner_text()=='';assert page.locator('#personalShortcuts').inner_text()=='';assert page.locator('[data-quick-student-group]').count()==0
   blocked=browser.new_context(reduced_motion='reduce');blocked.route('**/*',route);private_page=blocked.new_page();private_page.on('pageerror',lambda error:errors.append(str(error)))
   private_page.add_init_script('Storage.prototype.getItem=Storage.prototype.setItem=Storage.prototype.removeItem=function(){throw new DOMException("Storage unavailable","SecurityError")}')
   private_page.goto(base+launcher.PREVIEW);expect(private_page.locator('[data-workbench=preferences]')).to_be_enabled();private_page.locator('[data-workbench=preferences]').click();private_page.locator('#workspacePreferences [type=submit]').click();expect(private_page.locator('#preferencesStatus')).to_contain_text('Saved for this session');assert private_page.evaluate('__adminPreview.writes.length')==0;blocked.close()
   assert not errors,errors;assert not external,external;assert not writes,writes;assert not failed,failed
   print('PASS: all new views fit five widths; denied saves create no history; logout clears private panels and dialogs; zero external requests or network writes',flush=True)
   browser.close()
 finally:server.shutdown()
if __name__=='__main__':run()
