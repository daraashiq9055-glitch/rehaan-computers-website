"""Test the generated real-service bundle with all service requests intercepted.

Unlike the design preview, the candidate contains no mock SDK, dummy users,
auto sign-in or demo history. Fixtures are injected exclusively by this test.
"""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import importlib.util, tempfile, json
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('builder',ROOT/'prepare-admin-release.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    with tempfile.TemporaryDirectory() as directory:
        output=builder.build(Path(directory)/'candidate')
        app=(output/'public/admin-app.js').read_text()
        assert app.startswith((ROOT/'public/admin-app.js').read_text())
        for path in (output/'public/admin-ui').glob('*.js'):
            assert '__adminPreview' not in path.read_text() and '/previews/' not in path.read_text(),path
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(output/'public')))
        Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
        mock=(ROOT/'previews/admin-premium/sdk.js').read_text()
        mock=mock.replace('export const getDocs = async () => {','''export const getDocs = async ref => {
          if(ref?.ref?.name==='applicationAudit') {
            state.auditReads=(state.auditReads||0)+1;
            if(state.delayAudit)await new Promise(resolve=>window.resolveAudit=resolve);
            let entries=state.serverHistory||[];
            const filter=ref.constraints.find(c=>c.kind==='where');if(filter)entries=entries.filter(e=>e.applicationId===filter.args[2]);
            const after=ref.constraints.find(c=>c.kind==='after');if(after)entries=entries.slice(entries.findIndex(e=>e.id===after.args[0].id)+1);
            const limit=ref.constraints.find(c=>c.kind==='limit').args[0];
            return {docs:entries.slice(0,limit).map(entry=>({id:entry.id,data:()=>entry}))};
          }
        ''')
        mock+='\nexport const query=(ref,...constraints)=>({ref,constraints}), where=(...args)=>({kind:"where",args}),orderBy=(...args)=>({kind:"order",args}),documentId=()=>"__name__",startAfter=(...args)=>({kind:"after",args}),limit=(...args)=>({kind:"limit",args});\n'
        setup=(ROOT/'previews/admin-premium/demo.js').read_text().split('  const notify =')[0]+'})();'
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
                errors,external,writes,failed=[],[],[],[]
                blocked=False;blocked_image=False
                def route(r):
                    if r.request.method not in ['GET','HEAD']:writes.append(r.request.url);r.abort()
                    elif r.request.url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):
                        r.fulfill(content_type='application/javascript',body=mock,headers={'Access-Control-Allow-Origin':'*'})
                    elif r.request.url.startswith(base+'/photo-storage'):
                        r.fulfill(content_type='application/javascript',body=(ROOT/'previews/admin-premium/photos.js').read_text())
                    elif r.request.url.startswith(base+'/'):
                        if blocked_image and '/admin-mark-image.js' in r.request.url:r.abort()
                        elif blocked and '/admin-ui/main.js' in r.request.url:r.abort()
                        else:r.continue_()
                    else:external.append(r.request.url);r.abort()
                context=browser.new_context(viewport={'width':1512,'height':1100},reduced_motion='reduce',accept_downloads=True)
                context.route('**/*',route);context.add_init_script(setup)
                page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept());page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None)
                def login():
                    page.goto(base+'/admin.html');expect(page.locator('#adminLoginButton')).to_be_enabled();expect(page.locator('#adminDashboard')).to_be_hidden()
                    page.locator('#adminEmail').fill('admin@example.test');page.locator('#adminPassword').fill('test-only');page.locator('#adminLoginButton').click();expect(page.locator('#adminDashboard')).to_be_visible()
                popups=[];page.on('popup',lambda popup:popups.append(popup.url))
                for entrance in ['brand','footer']:
                    page.goto(base+'/');expect(page.locator('.course-card')).to_have_count(7)
                    if entrance=='brand':page.locator('#brandMenuButton').click();page.locator('#brandAdminLogin').click()
                    else:page.locator('footer a[href="admin.html"]').click()
                    expect(page).to_have_url(base+'/admin.html');expect(page.locator('#adminLoginButton')).to_be_enabled();expect(page.locator('#adminDashboard')).to_be_hidden()
                assert not popups and len(context.pages)==1
                print('PASS: both homepage admin entrances open the generated upgraded sign-in in the same tab without saving records',flush=True)
                login();expect(page.locator('[data-workbench=journeys]')).to_be_enabled();expect(page.locator('.application-card')).to_have_count(8)
                assert page.locator('#switchDemoAdmin').count()==0 and page.locator('.demo-strip').count()==0
                assert page.locator('.application-card').evaluate_all('rows=>rows.map(row=>row.dataset.applicationId)')==['demo-'+str(i) for i in range(8)]
                page.locator('[data-records-centre]').click();expect(page.locator('#recordsSort')).to_have_value('admission');page.locator('[data-section=overview]').click()
                original=page.evaluate('structuredClone(__adminPreview.records)')
                for width in [320,390,768,1024,1512]:
                    page.set_viewport_size({'width':width,'height':1100})
                    for selector in ['[data-section='+name+']' for name in ['overview','admissions','students','fees','courses','batches','reports','settings','marks','statements']]+['[data-records-centre]','[data-operations=today]','[data-operations=accounts]','[data-workbench=journeys]','[data-workbench=history]','[data-workbench=preferences]']:
                        if width<=760:page.locator('#menuToggle').click()
                        page.locator(selector).click()
                        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,selector)
                assert page.evaluate('__adminPreview.records')==original and page.evaluate('__adminPreview.writes.length')==0
                page.locator('[data-workbench=history]').click();expect(page.locator('#adminWorkbench')).to_contain_text('Secure history is not enabled yet');assert page.evaluate('__adminPreview.auditReads||0')==0
                print('PASS: candidate requires manual sign-in, contains no demo controls, retains all 16 views at five widths and never reads unconfigured history or writes while browsing',flush=True)
                page.locator('[data-workbench=journeys]').click();page.locator('[data-journey-student="demo-1"]').click();page.locator('#lifecycleStage').select_option('Completed');page.locator('#lifecycleReason').fill('Candidate lifecycle test');page.locator('#lifecycleForm [type=submit]').click();expect(page.locator('#lifecycleStatus')).to_contain_text('Stage saved')
                page.locator('[data-journey-tab=learning]').click();page.locator('[data-learning-index="0"]').check();page.locator('#learningSave').click();expect(page.locator('#learningStatus')).to_contain_text('Checklist saved')
                updated=page.evaluate('__adminPreview.records["demo-1"]')
                for key,value in original['demo-1'].items():assert updated[key]==value,key
                page.locator('[data-workbench=preferences]').click();page.locator('#workspacePreferences [name=density]').select_option('compact');page.locator('#workspacePreferences [type=submit]').click();expect(page.locator('#preferencesStatus')).to_contain_text('saved')
                assert page.evaluate('localStorage.getItem("rehaan-admin-ui-v1:preview-admin")')
                page.locator('[data-section=students]').click();page.locator('#workspaceAdd').click();page.locator('#addName').fill('Candidate Added Student');page.locator('#addPhone').fill('9000000099');page.locator('#addCourse').select_option('One Year Computer Diploma Course');page.locator('#addPhotoInput').set_input_files(ROOT/'tests/fixtures/photo-check.jpg');page.locator('#applyStudentCrop').click();page.locator('#addSaveBtn').click();expect(page.locator('#addMsg')).to_contain_text('Student saved');page.locator('#adminAddModal .admin-modal-close').click()
                added=page.evaluate('Object.values(__adminPreview.records).find(r=>r.fullName==="Candidate Added Student")');assert added['photo'].startswith('data:image/jpeg;base64,') and added['payment']['amount']==100
                page.locator('[data-section=fees]').click();page.locator('[data-fee-pay="demo-1"]').click();page.locator('#rcPaymentAmount').fill('400');page.locator('#rcPaymentMethod').select_option('UPI');page.locator('#rcPaymentReference').fill('LOCAL-REFERENCE');page.locator('#rcPaymentForm [type=submit]').click();expect(page.locator('#rcPaymentMessage')).to_contain_text('Payment saved');page.locator('#rcOpenSavedReceipt').click();expect(page.locator('.receipt-number')).to_have_text('1000');expect(page.locator('.receipt-school')).to_have_css('display','block');expect(page.locator('.receipt-school p')).to_have_text('MAIN ROAD CHARANGAM BEERWAH BUDGAM KASHMIR 193411')
                page.locator('[data-new=editReceipt]').click();form=page.locator('#rcReceiptEditForm');form.locator('[name=amount]').fill('300');form.locator('[name=reason]').fill('Candidate correction test');form.locator('[name=confirmed]').check();form.locator('[type=submit]').click();expect(page.locator('#rcFeatureDialog')).to_contain_text('Correction history (1)')
                with page.expect_download() as download:page.locator('[data-new=image]').click()
                import struct
                receipt_image=Path(download.value.path()).read_bytes();assert receipt_image.startswith(b'\x89PNG') and struct.unpack('>II',receipt_image[16:24])==(3200,2240);page.locator('[data-new=close]').click()
                updated=page.evaluate('__adminPreview.records["demo-1"]');receipt=next(iter(updated['feeReceipts'].values()));assert receipt['number']=='1000' and page.evaluate('__adminPreview.counters.tuition.last')==1000 and receipt['amount']==30000 and receipt['amendments'][0]['before']['amount']==40000 and sum(updated['monthlyFees'].values())==300
                for key,value in original['demo-1'].items():
                    if key not in ['monthlyFees','feeReceipts','updatedAt','updatedBy']:assert updated[key]==value,key
                page.locator('[data-section=marks]').click();page.locator('#rcMarkStudent').select_option('demo-1')
                for field in page.locator('[data-subject=marks]').all():field.fill('80')
                page.locator('#rcMarksForm [type=submit]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('Marks saved securely')
                snapshot=page.evaluate('structuredClone(__adminPreview.records)');write_count=page.evaluate('__adminPreview.writes.length')
                with page.expect_download() as downloaded:page.locator('[data-new=downloadMarks]').click()
                import struct
                png=Path(downloaded.value.path()).read_bytes();assert png.startswith(b'\x89PNG');image_width,image_height=struct.unpack('>II',png[16:24]);assert image_width==3840 and image_height>=5424
                assert page.evaluate('__adminPreview.records')==snapshot and page.evaluate('__adminPreview.writes.length')==write_count
                page.locator('#rcExamTitle').fill('Unsaved assessment change');expect(page.locator('[data-new=downloadMarks]')).to_be_disabled()
                page.locator('#rcExamTitle').fill('Progress assessment');page.locator('#rcMarksForm [type=submit]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('Marks saved securely')
                for width in [320,390,768]:
                    page.set_viewport_size({'width':width,'height':1100})
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
                    if width<=760:
                        assert page.locator('#rcMarkPreview .mark-details').evaluate('el=>parseFloat(getComputedStyle(el).fontSize)>=16')
                        assert page.locator('#rcMarkPreview .mark-paper').evaluate('el=>el.scrollWidth<=el.clientWidth'),width
                page.set_viewport_size({'width':1512,'height':1100})
                long_card=page.evaluate(r"""async()=>{
                  const {markCardPNG}=await import('/admin-mark-image.js?v=test');
                  const card={title:'Long assessment '+ 'X'.repeat(100),date:'2026-10-20',subjects:Array.from({length:12},(_,i)=>({name:'SUBJECT_'+(i+1)+' '+ 'W'.repeat(80),max:1000,marks:i===11?null:950}))};
                  const entry={data:{fullName:'N'.repeat(120),parentName:'P'.repeat(120),admissionNumber:'RC/001',rollNumber:'001',coursePreference:'C'.repeat(120),batch:'Morning'}};
                  const original=CanvasRenderingContext2D.prototype.fillText,calls=[];
                  CanvasRenderingContext2D.prototype.fillText=function(value,x,y){calls.push({text:String(value),end:x+this.measureText(String(value)).width,y,bottom:y+parseFloat(this.font.match(/([\d.]+)px/)[1])});return original.call(this,value,x,y)};
                  try{const blob=await markCardPNG(entry,card,{outputWidth:1600}),image=await createImageBitmap(blob);const result={width:image.width,height:image.height,calls};image.close();return result;}finally{CanvasRenderingContext2D.prototype.fillText=original;}
                }""")
                assert long_card['width']==1600 and long_card['height']>2260
                assert any(call['text']=='SUBJECT_12' for call in long_card['calls'])
                assert any(call['text']=='Incomplete' for call in long_card['calls'])
                assert all(call['end']<=1570 and call['y']>=30 and call['bottom']<=long_card['height']-30 for call in long_card['calls'])
                print('PASS: HD saved-mark PNG has full dimensions and preserves records; unsaved edits disable export; mobile text is readable; long names and all 12 subject rows fit the full image',flush=True)

                page.locator('#adminLogoutBtn').click();expect(page.locator('#adminDashboard')).to_be_hidden();assert page.locator('#adminWorkbench').inner_text()==''
                print('PASS: generated release saves lifecycle/checklists, preferences, offline student with cropped photo, atomic payment, corrected receipt/PNG and marks using existing guarded modules; logout clears private panels',flush=True)
                assert not errors and not external and not writes and not failed,(errors,external,writes,failed)
                blocked_image=True;page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
                page.add_init_script("document.addEventListener('DOMContentLoaded',()=>{__adminPreview.records['demo-1'].markCard={title:'Saved fixture',date:'2026-10-20',subjects:[{name:'Practical',max:100,marks:80}]};});")
                login();page.locator('[data-section=marks]').click();page.locator('#rcMarkStudent').select_option('demo-1');before_download=page.evaluate('structuredClone(__adminPreview.records)')
                page.locator('[data-new=downloadMarks]').click();expect(page.locator('#rcMarksStatus')).to_contain_text('Failed to fetch');assert page.evaluate('__adminPreview.records')==before_download
                page.locator('[data-section=fees]').click();expect(page.locator('#rcFeeFilter')).to_be_visible();assert page.evaluate('__adminPreview.writes.length')==0
                blocked_image=False
                print('PASS: missing optional HD image renderer cannot block sign-in, alter saved marks or disable the fee register',flush=True)
                # Trusted-history UI is tested with simulated server responses, not the demo journal.
                (output/'public/admin-ui/audit-config.js').write_text('export const auditConfig={enabled:true};')
                page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));login()
                page.evaluate('''__adminPreview.serverHistory=Array.from({length:35},(_,i)=>({id:'server-'+i,applicationId:i===34?'demo-2':'demo-1',operation:'updated',occurredAt:'2026-10-20T10:00:00Z',actor:{principal:'server-admin',type:'unknown'},changedFieldCount:1,changes:[{field:'monthlyFees.2026-10-12',before:{present:true,value:100},after:{present:true,value:200}}]}))''')
                page.locator('[data-workbench=history]').click();expect(page.locator('[data-secure-event]')).to_have_count(30);page.locator('#secureHistoryMore').click();expect(page.locator('[data-secure-event]')).to_have_count(35);page.locator('#secureHistoryStudent').select_option('demo-2');expect(page.locator('[data-secure-event]')).to_have_count(1);page.locator('[data-secure-event]').click();expect(page.locator('.history-dialog')).to_contain_text('server-admin');expect(page.locator('.history-dialog')).to_contain_text('200');page.locator('[aria-label="Close history details"]').click()
                with page.expect_download() as download:page.locator('#secureHistoryExport').click()
                exported=json.loads(Path(download.value.path()).read_text());assert exported['scope']=='loaded pages only' and len(exported['events'])==1
                page.evaluate('__adminPreview.delayAudit=true');page.locator('#secureHistoryRefresh').click();page.locator('[data-workbench=journeys]').click();page.evaluate('resolveAudit()');expect(page.locator('#adminWorkbench')).to_contain_text('Progress with context.');page.locator('#adminLogoutBtn').click();expect(page.locator('#adminDashboard')).to_be_hidden();expect(page.locator('#adminWorkbench')).to_be_empty()
                print('PASS: server history pages/filter/details/export work; delayed reads cannot replace another view or survive sign-out',flush=True)
                blocked=True;page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));login();expect(page.locator('#adminDashboard .startup-error')).to_contain_text('workspace tools could not load');page.locator('[data-section=fees]').click();expect(page.locator('#rcFeeFilter')).to_be_visible()
                assert not errors and not external and not writes,(errors,external,writes)
                print('PASS: missing optional workspace assets do not break original admin sign-in or fee register; no live requests, records or payments',flush=True)
                browser.close()
        finally:server.shutdown()

if __name__=='__main__':run()
