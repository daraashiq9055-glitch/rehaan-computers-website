"""Isolated admissions/payment regression: all Firebase, Razorpay, email and API calls mocked."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import importlib.util, json, random, struct, zlib, subprocess, sys
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/admin-browser.py')
fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
MOCK=fixture.MOCK+'''
export const query=x=>x, orderBy=()=>({});
export const createUserWithEmailAndPassword=async()=>{throw Error('Disabled')};
export const updateDoc=async()=>{throw Error('Unexpected public update')};
export const deleteDoc=async()=>{throw Error('Unexpected public deletion')};
export const addDoc=async(ref,data)=>{
 if(state.deny)throw Object.assign(Error('Missing or insufficient permissions'),{code:'permission-denied'});
 const id='test-application';state.records[id]=structuredClone(data);state.writes.push({id,data});return {id};
};
'''
SDK='''window.Razorpay=class{constructor(options){window.__checkout=options;} on(){} open(){window.__fixture.checkoutOpened=true;}};'''
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

def run(enabled=False, edge=False):
 # Payment implementation must remain byte-identical to the preceding preview.
 before=subprocess.check_output(['git','show','HEAD:public/script.js'],cwd=ROOT,text=True)
 after=(ROOT/'public/script.js').read_text()
 section=lambda s:s.split('let paymentApplicationId = null;',1)[1].split('function paymentLabel',1)[0]
 assert section(before)==section(after),'Payment implementation changed'
 rng=random.Random(42)
 raw=b''.join(b'\0'+rng.randbytes(300*3) for _ in range(300))
 def chunk(kind,data):return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
 png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',300,300,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'public')))
 Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
   cases = [('male','success'),('female','success'),('other','success'),('prefer_not_to_say','success'),('','success'),('female','denied'),('male','pending'),('female','reconcile')]+([('male','upload-failure')] if enabled else [])
   if edge:cases=[('male',mode) for mode in ['duplicate','order-failure','sdk-failure','verify-rejected','lost-verify','unconfirmed','already-paid','missing-record']]
   for gender,mode in cases:
    context=browser.new_context(reduced_motion='reduce');unexpected=[];errors=[];calls=[];uploads=[]
    stored_photo='https://res.cloudinary.com/salatmdv/image/authenticated/v123/student-photos/12345678-1234-4123-8123-123456789abc.jpg'
    def route_handler(route):
     url=route.request.url
     if url==base+'/photo-storage-config.js':
      route.fulfill(content_type='application/javascript',body='export const photoStorageConfig='+json.dumps({'enabled':enabled,'cloudName':'salatmdv','serviceUrl':'https://photos.example.test'})+';')
     elif url=='https://photos.example.test/upload':
      uploads.append(url)
      assert route.request.post_data_buffer[:3]==b'\xff\xd8\xff'
      assert route.request.headers.get('content-type')=='image/jpeg'
      route.fulfill(status=503 if mode=='upload-failure' else 200,content_type='application/json',body=json.dumps({'error':'Photo service unavailable'} if mode=='upload-failure' else {'photo':stored_photo}),headers={'Access-Control-Allow-Origin':'*'})
     elif url.startswith(base):route.continue_()
     elif url.startswith('https://www.gstatic.com/firebasejs/12.2.1/'):
      route.fulfill(content_type='application/javascript',body=MOCK,headers={'Access-Control-Allow-Origin':'*'})
     elif url.startswith('https://cdn.jsdelivr.net/npm/@emailjs/browser@4/'):
      route.fulfill(content_type='application/javascript',body='window.emailjs={init(){},send(){throw Error("No emails allowed")}};')
     elif url.startswith('https://fonts.googleapis.com/'):
      route.fulfill(content_type='text/css',body='')
     elif url=='https://checkout.razorpay.com/v1/checkout.js' and mode=='sdk-failure':route.abort()
     elif url=='https://checkout.razorpay.com/v1/checkout.js':route.fulfill(content_type='application/javascript',body=SDK)
     elif url.startswith('https://rehaan-razorpay-live.daraashiq9055.workers.dev/'):
      body=route.request.post_data_json;endpoint=url.rsplit('/',1)[1];calls.append((endpoint,body))
      assert body['appId']=='test-application' and len(body['paymentToken'])>=16
      response={'create-order':{'orderId':'order_test','keyId':'key_test','amount':10000,'currency':'INR'},'verify':{'verified':True},'status':{'finalized':mode in ['reconcile','lost-verify'],'status':'Pending Payment'}}[endpoint]
      code=200
      if endpoint=='verify' and mode=='lost-verify':route.abort();return
      if endpoint=='create-order' and mode=='order-failure':response={'error':'Payment gateway temporarily unavailable'};code=503
      if endpoint=='create-order' and mode=='already-paid':response={'alreadyPaid':True}
      if endpoint=='create-order' and mode=='missing-record':response={'error':'Application not found'};code=404
      if endpoint=='verify' and mode=='verify-rejected':response={'error':'Signature could not be verified'};code=400
      if endpoint=='verify' and mode=='unconfirmed':response={'verified':False};code=202
      if endpoint=='verify' and mode=='reconcile':response={'verified':False};code=202
      route.fulfill(status=code,content_type='application/json',body=json.dumps(response),headers={'Access-Control-Allow-Origin':'*'})
     else:unexpected.append(url);route.abort()
    context.route('**/*',route_handler)
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('window.__fixture={records:{},writes:[],listeners:[],authorized:false,deny:'+str(mode=='denied').lower()+',auth:{currentUser:null,authStateReady:async()=>{}}};')
    page.goto(base+'/index.html');expect(page.locator('#courseGrid .course-card')).to_have_count(7)
    assert page.locator('#gender').get_attribute('required') is None
    for selector,value in [('#fullName','Test Student'),('#parentName','Test Parent'),('#phone','9876543210'),('#email','student@example.test'),('#dob','2005-01-01'),('#address','Test address only')]:page.locator(selector).fill(value)
    expect(page.locator('#admissionServiceState')).to_have_text('SECURE APPLICATION')
    page.locator('#gender').select_option(gender);page.locator('#qualification').select_option('12th')
    page.locator('#applicationSubmit').click();expect(page.locator('#formStepLabel')).to_have_text('STEP 02 / 05')
    page.locator('#coursePreference').select_option(index=1);page.locator('#batch').select_option('Morning')
    page.locator('#applicationSubmit').click();expect(page.locator('#formStepLabel')).to_have_text('STEP 03 / 05')
    page.locator('#studentPhoto').set_input_files({'name':'fixture.png','mimeType':'image/png','buffer':png})
    expect(page.locator('#photoPreview')).to_be_visible()
    page.locator('#applicationSubmit').click();expect(page.locator('#applicationReview')).to_contain_text('Test Student')
    page.locator('#applicationSubmit').click();expect(page.locator('#formStepLabel')).to_have_text('STEP 05 / 05')
    page.locator('#agreement').check()
    assert not calls and page.evaluate('__fixture.writes.length')==0 and not uploads
    page.locator('#applicationSubmit').click()
    if mode=='duplicate':page.evaluate('document.querySelector("#applicationForm").requestSubmit();document.querySelector("#applicationForm").requestSubmit()')
    if mode in ['denied','upload-failure']:
     expect(page.locator('#applicationMessage')).to_contain_text('permissions' if mode=='denied' else 'Photo service unavailable')
     expect(page.locator('#fullName')).to_have_value('Test Student')
     assert page.evaluate('__fixture.writes.length')==0 and not calls
     expect(page.locator('#applicationSubmit')).to_be_enabled()
    else:
     expect(page.locator('#paymentModal')).to_be_visible()
     data=page.evaluate('__fixture.writes[0].data')
     assert data.get('gender','')==gender
     if not gender:assert 'gender' not in data
     assert data['payment']=={'status':'awaiting','amount':100} and data['status']=='Pending Payment'
     assert data['photo']==stored_photo if enabled else data['photo'].startswith('data:image/jpeg;base64,')
     pending=page.evaluate('JSON.parse(localStorage.getItem("rehaan-pending-admission"))')
     assert pending['appId']=='test-application' and pending['token']==data['paymentToken']
     if mode=='unconfirmed':page.clock.install()
     page.locator('#razorpayPayBtn').click()
     if mode in ['order-failure','sdk-failure','missing-record']:
      if mode=='missing-record':
       expect(page.locator('#applicationMessage')).to_contain_text('no longer available')
       assert page.evaluate('localStorage.getItem("rehaan-pending-admission")') is None
      else:
       expect(page.locator('#razorpayStatus')).to_contain_text('temporarily unavailable' if mode=='order-failure' else 'Could not load')
       assert page.evaluate('localStorage.getItem("rehaan-pending-admission")')
       expect(page.locator('#razorpayPayBtn')).to_be_enabled()
      expect(page.locator('#paymentSuccessModal')).to_be_hidden()
      assert not page.evaluate('__fixture.checkoutOpened || false')
      assert [e for e,b in calls].count('create-order')==1
     elif mode=='already-paid':
      expect(page.locator('#paymentSuccessModal')).to_be_visible()
      assert not page.evaluate('__fixture.checkoutOpened || false')
      assert page.evaluate('localStorage.getItem("rehaan-pending-admission")') is None
      assert [e for e,b in calls]==['create-order']
     else:
      page.wait_for_function('__fixture.checkoutOpened===true')
      assert page.evaluate('__checkout.amount')==10000
      assert page.evaluate('__fixture.writes.length')==1
      if mode=='pending':
       page.evaluate('__checkout.modal.ondismiss()')
       expect(page.locator('#paymentSuccessModal')).to_be_hidden()
       assert page.evaluate('localStorage.getItem("rehaan-pending-admission")')
       expect(page.locator('#paymentModal')).to_be_hidden()
       page.locator('#resumeAdmissionPayment').click();expect(page.locator('#paymentModal')).to_be_visible()
       page.locator('#paymentClose').click();expect(page.locator('#paymentModal')).to_be_hidden()
       page.locator('#resumeAdmissionPayment').click();expect(page.locator('#paymentModal')).to_be_visible()
       assert [endpoint for endpoint,body in calls].count('create-order')==1
       page.reload();expect(page.locator('#paymentModal')).to_be_visible()
       assert [endpoint for endpoint,body in calls].count('create-order')==1
       assert [endpoint for endpoint,body in calls].count('status')==3
      elif mode=='unconfirmed':
       page.evaluate('void __checkout.handler({razorpay_order_id:"order_test",razorpay_payment_id:"payment_test",razorpay_signature:"signature_test"})')
       page.wait_for_function('document.querySelector("#razorpayStatus").textContent.includes("verifying")')
       for _ in range(14):page.clock.fast_forward(3000);page.wait_for_timeout(100)
       expect(page.locator('#applicationMessage')).to_contain_text('being confirmed')
       expect(page.locator('#paymentSuccessModal')).to_be_hidden()
       assert page.evaluate('localStorage.getItem("rehaan-pending-admission")')
       assert [e for e,b in calls].count('status')==12
       assert [e for e,b in calls].count('create-order')==1
      else:
       page.evaluate('__checkout.handler({razorpay_order_id:"order_test",razorpay_payment_id:"payment_test",razorpay_signature:"signature_test"})')
       if mode=='verify-rejected':
        expect(page.locator('#applicationMessage')).to_contain_text('Signature could not be verified')
        expect(page.locator('#paymentSuccessModal')).to_be_hidden()
        assert page.evaluate('localStorage.getItem("rehaan-pending-admission")')
       else:
        expect(page.locator('#paymentSuccessModal')).to_be_visible(timeout=10000)
        assert page.evaluate('localStorage.getItem("rehaan-pending-admission")') is None
        expect(page.locator('#gender')).to_have_value('')
       verify=next(body for endpoint,body in calls if endpoint=='verify')
       assert verify['razorpayOrderId']=='order_test' and verify['razorpaySignature']=='signature_test'
     # Reload creates a fresh browser fixture; the draft was checked before reloading.
     assert page.evaluate('__fixture.writes.length')==(0 if mode=='pending' else 1)
     if mode!='pending':assert page.evaluate('__fixture.writes[0].data.payment.status')=='awaiting'
    assert len(uploads)==(1 if enabled else 0),uploads
    assert not errors,errors
    assert not unexpected,unexpected
    print(f'PASS: cloudinary={enabled}, gender={gender or "omitted"}, {mode}; no live writes, emails or payments',flush=True)
    context.close()
   browser.close()
 finally:server.shutdown()
if __name__=='__main__':
 if '--failures' in sys.argv:run(True,edge=True)
 else:
  run()
  run(True)
  run(True,edge=True)
