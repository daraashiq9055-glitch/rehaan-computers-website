"""Generated candidate, isolated private signature fixtures and no live services."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import importlib.util,json,tempfile,base64,struct
import fitz
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/artifacts/mark-premium-checks';OUT.mkdir(parents=True,exist_ok=True)
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
baseline=module('baseline',ROOT/'tests/admin-browser.py');builder=module('builder',ROOT/'prepare-admin-release.py')
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

def run():
 record=json.loads(json.dumps(baseline.FIXTURES['enrolled']));record['photo']='data:image/jpeg;base64,'+base64.b64encode((ROOT/'tests/fixtures/photo-check.jpg').read_bytes()).decode();record['markCard']={'title':'Assessment','date':'2026-10-20','subjects':[{'name':'Theory','max':100,'marks':92},{'name':'Practical','max':100,'marks':88},{'name':'Typing','max':100,'marks':95,'typing':{'speed':42,'accuracy':97.5}}]}
 with tempfile.TemporaryDirectory() as directory:
  output=builder.build(Path(directory)/'candidate');assert '__markSignaturePreview' not in (output/'public/admin.html').read_text();assert not list((output/'public').rglob('*authorized.png'));assert not list((output/'public').rglob('*examiner.png'))
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(output/'public')));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
  try:
   with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1512,'height':1100},accept_downloads=True,reduced_motion='reduce');context.set_default_timeout(15000);errors,external,writes,failed=[],[],[],[]
    def route(r):
     if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
     elif r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):r.fulfill(content_type='application/javascript',body=baseline.MOCK,headers={'Access-Control-Allow-Origin':'*'})
     elif r.request.url.startswith(base+'/'):r.continue_()
     else:external.append(r.request.url);r.abort()
    context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None)
    page.add_init_script('window.__fixture={records:'+json.dumps({'enrolled':record})+',writes:[],listeners:[],authorized:true,auth:{currentUser:null,authStateReady:async()=>{}}};window.print=()=>window.__printed=(window.__printed||0)+1;const c=document.createElement("canvas");c.width=120;c.height=60;const x=c.getContext("2d");x.strokeStyle="#182575";x.lineWidth=3;x.beginPath();x.moveTo(10,45);x.bezierCurveTo(30,3,55,55,100,10);x.stroke();window.__testSignature=c.toDataURL("image/png");__fixture.settings={markCardSignatures:{examiner:__testSignature,authorized:__testSignature,updatedAt:"2026-10-20T00:00:00Z",updatedBy:"admin-uid"}};')
    page.goto(base+'/admin.html');expect(page.locator('#adminLoginButton')).to_be_enabled();page.locator('#adminEmail').fill('admin@example.test');page.locator('#adminPassword').fill('valid-password');page.locator('#adminLoginButton').click();page.locator('[data-section=marks]').click();expect(page.locator('#rcMarkPreview [data-mark-signature=authorized]')).to_be_visible();expect(page.locator('#rcMarkPreview [data-mark-signature=examiner]')).to_be_visible();expect(page.locator('.mark-portrait-preview img')).to_have_css('object-fit','contain');expect(page.locator('.mark-address')).to_have_css('text-align','center');expect(page.locator('.mark-title')).to_have_css('text-align','center');expect(page.locator('.mark-subtitle')).to_have_css('text-align','center');assert 'MarkDisplay' in page.locator('.mark-identity h2').evaluate('el=>getComputedStyle(el).fontFamily');assert 'PREPARED ON' not in page.locator('#rcMarkPreview').inner_text()
    assert page.locator('#rcMarkPreview th').all_text_contents()==['SUBJECT','MAX.','MARKS','GRADE','RESULT'];expect(page.locator('.mark-typing-result')).to_have_text('42 WPM · 97.5% accuracy')
    original=page.evaluate('structuredClone(__fixture.records.enrolled)');page.locator('#rcMarkTheme').select_option('#eef4fb');expect(page.locator('[data-new=downloadMarks]')).to_be_disabled();page.locator('[data-subject=speed]').nth(2).fill('45.5');page.locator('[data-subject=accuracy]').nth(2).fill('98.25');page.locator('#rcMarksForm [type=submit]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('Marks saved securely');updated=page.evaluate('structuredClone(__fixture.records.enrolled)');assert updated['markCard']['paperColor']=='#eef4fb';assert updated['markCard']['subjects'][2]['typing']=={'speed':45.5,'accuracy':98.25}
    for key,value in original.items():
     if key not in ['markCard','updatedAt','updatedBy']:assert updated[key]==value,key
    page.evaluate('()=>{window.__texts=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(value,x,y){__texts.push({text:String(value),center:x+this.measureText(String(value)).width/2});return fill.call(this,value,x,y)};window.__draws=[];const original=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(image,x,y,w,h){__draws.push({signature:image.src===__testSignature,nw:image.naturalWidth,nh:image.naturalHeight,x,y,w,h});return original.call(this,image,x,y,w,h)};}')
    page.locator('#rcMarkImageWidth').select_option('1600');snapshot=page.evaluate('structuredClone(__fixture.records)');count=page.evaluate('__fixture.writes.length')
    with page.expect_download() as downloaded:page.locator('[data-new=downloadMarks]').click()
    png=Path(downloaded.value.path()).read_bytes();assert struct.unpack('>II',png[16:24])[0]==1600;(OUT/'full-card.png').write_bytes(png);draws=page.evaluate('__draws');signs=[d for d in draws if d['signature']];assert len(signs)==2 and signs[0]['x']<800<signs[1]['x'];assert all(abs(d['w']/d['h']-d['nw']/d['nh'])<.001 for d in draws)
    centered=page.evaluate('__texts.filter(row=>row.text==="Statement of Marks"||row.text==="Assessment"||row.text.startsWith("MAIN ROAD CHARANGAM"))');assert len(centered)==3 and all(abs(row['center']-800)<1 for row in centered),centered
    page.locator('[data-new=printMarks]').click();page.wait_for_function('window.__printed===1');pdf=page.pdf(prefer_css_page_size=True,print_background=True);(OUT/'full-card.pdf').write_bytes(pdf);doc=fitz.open(stream=pdf,filetype='pdf');assert len(doc)==1,len(doc);text=doc[0].get_text();assert 'GRADE' in text and '45.5 WPM' in text and '98.25%' in text and 'PREPARED ON' not in text and '9797205429' in text and 'rehaan-computers.web.app' in text
    for width in [320,390,768,1512]:
     page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width;assert page.locator('#rcMarkPreview .mark-paper').evaluate('el=>el.scrollWidth<=el.clientWidth');
     if width==390:page.locator('#rcMarkPreview .mark-paper').screenshot(path=str(OUT/'mobile.png'));assert page.locator('.mark-details strong').first.evaluate('el=>parseFloat(getComputedStyle(el).fontSize)>=16')
    assert page.evaluate('__fixture.records')==snapshot and page.evaluate('__fixture.writes.length')==count
    page.locator('.mark-signature-settings summary').click();data=base64.b64decode(page.evaluate('__testSignature').split(',')[1]);page.locator('#rcSignatureAuthorized').set_input_files({'name':'authorized.png','mimeType':'image/png','buffer':data});expect(page.locator('#rcSignatureStatus')).to_contain_text('Signature prepared');page.locator('#rcSignatureForm [type=submit]').click();expect(page.locator('#rcSignatureStatus')).to_contain_text('Saved institute signatures');assert page.evaluate('__fixture.records')==snapshot;assert page.evaluate('__fixture.settings.markCardSignatures.updatedBy')=='admin-uid'
    page.evaluate('__fixture.settings.markCardSignatures.updatedAt="2026-10-25T12:00:00Z"');shared=page.evaluate('structuredClone(__fixture.settings.markCardSignatures)');page.locator('#rcSignatureAuthorized').set_input_files({'name':'authorized.png','mimeType':'image/png','buffer':data});expect(page.locator('#rcSignatureStatus')).to_contain_text('Signature prepared');page.locator('#rcSignatureForm [type=submit]').click();expect(page.locator('#rcSignatureStatus')).to_contain_text('changed in another session');assert page.evaluate('__fixture.settings.markCardSignatures')==shared and page.evaluate('__fixture.records')==snapshot
    page.locator('#adminLogoutBtn').click();expect(page.locator('#adminDashboard')).to_be_hidden();assert page.locator('#rcMarkPreview img').count()==0
    assert not errors and not external and not writes and not failed,(errors,external,writes,failed);browser.close();print('PASS: premium mobile/print/image layout, subject grades/results, typing metrics, paper colours, proportional portrait/signatures, private shared settings, saved marks and unrelated payment preservation; no live requests or writes',flush=True)
  finally:server.shutdown()
if __name__=='__main__':run()
