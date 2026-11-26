"""Exercise the existing student screen with two isolated portal views.

The browser Auth module is stubbed here; Firestore identity and rules are tested
separately by student-portal-rules.cjs in the emulator.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import base64

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1] / "public"
STUB = """
const make=(uid,name,admission,course,phone)=>({
 uid,enabled:true,profile:{name,admissionNumber:admission,course,batch:'Afternoon',studentPhone:phone,
 status:'Active',guardian:'Guardian',joined:'2026-11-01'},
 fees:{admissionStatus:'paid',admissionAmount:100,periods:[{due:'2026-11-10',received:500,concession:0}],
 receipts:[{id:'receipt-'+uid,number:'RC-'+admission,date:'2026-11-10',amount:500}]},
 attendance:[{month:'2026-11',attended:18,classes:20}],journey:{course,topics:[{title:'Introduction',done:true}]}
});
const views={alpha:make('student-alpha','Aisha Test','101','MS Word','9000000001'),
 beta:make('student-beta','Bilal Test','102','MS Excel','9000000002')};
const updates={'student-alpha':[{id:'update-alpha',category:'Class notes',title:'Aisha lesson note',details:'Practice tables.',author:'Teacher',createdAt:'2026-11-24T00:00:00Z',image:'__TEST_IMAGE__',readByStudent:false,savedByStudent:false}],
 'student-beta':[{id:'update-beta',category:'Homework',title:'Bilal homework',details:'Practice formulas.',author:'Teacher',createdAt:'2026-11-24T00:00:00Z',image:'',readByStudent:false,savedByStudent:false}]};
const messages={'student-alpha':[{id:'reply-alpha',sender:'admin',text:'Aisha centre reply',readByStudent:false,createdAt:{seconds:1795478400}}],
 'student-beta':[{id:'reply-beta',sender:'admin',text:'Bilal centre reply',readByStudent:false,createdAt:{seconds:1795478400}}]};
const selections={'student-alpha':{program:'MS Word'},'student-beta':{program:'MS Excel'}};
const updateWatch={},messageWatch={},selectionWatch={};
export async function signInStudent(username,password){if(password!=='StudentPass123'||!views[username])throw Error('Invalid student account');return {user:{uid:views[username].uid},view:views[username],ref:username};}
export async function restoreStudent(){return null;}
export async function watchStudent(ref,onValue){return ()=>{};}
export async function watchStudentUpdates(uid,onValue){updateWatch[uid]=onValue;onValue(updates[uid]);return ()=>{delete updateWatch[uid];};}
export async function setStudentUpdateState(uid,id,changes){Object.assign(updates[uid].find(item=>item.id===id),changes);updateWatch[uid]?.(updates[uid]);}
export async function watchStudentMessages(uid,onValue){messageWatch[uid]=onValue;onValue(messages[uid]);return ()=>{delete messageWatch[uid];};}
export async function sendStudentMessage(uid,value){messages[uid].push({id:'sent-'+uid,sender:'student',text:value,readByStudent:true,createdAt:{seconds:1795478400}});messageWatch[uid]?.(messages[uid]);}
export async function markStudentMessageRead(uid,id){messages[uid].find(item=>item.id===id).readByStudent=true;messageWatch[uid]?.(messages[uid]);}
export async function watchStudentSelection(uid,onValue){selectionWatch[uid]=onValue;onValue(selections[uid]);return ()=>{delete selectionWatch[uid];};}
export async function setStudentSelection(uid,program){selections[uid]={program};selectionWatch[uid]?.(selections[uid]);}
export async function studentIdToken(uid){return 'test-token-'+uid;}
export async function signOutStudent(){}
"""


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass


def main():
    test_image = 'data:image/jpeg;base64,' + base64.b64encode((ROOT.parent / 'tests/fixtures/photo-check.jpg').read_bytes()).decode()
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}/student.html"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
            try:
                for width in (320, 360, 390, 768, 1024, 1366):
                    page = browser.new_page(viewport={"width": width, "height": 780})
                    page.route("**/student-portal-auth.js*", lambda route: route.fulfill(status=200, content_type="text/javascript", body=STUB.replace('__TEST_IMAGE__', test_image)))
                    page.goto(url)
                    assert 'Leaderboard will appear after the first official quiz' in page.locator('.league-footnote').inner_text()
                    assert 'Sample A' not in page.locator('.portal-dashboard').inner_text()
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                    boxes={key:page.locator(selector).bounding_box() for key,selector in [('login','.login-section'),('league','.league-section'),('updates','.updates-section')]}
                    assert boxes['league']['y'] >= boxes['login']['y']+boxes['login']['height']
                    if width<760: assert boxes['updates']['y'] >= boxes['league']['y']+boxes['league']['height']
                    else: assert boxes['updates']['x'] > boxes['league']['x']
                    if width in (390,1366): page.screenshot(path=str(ROOT.parent/'build'/f'portal-landing-{width}.png'),full_page=True)
                    if width == 320:
                        page.locator('#studentId').fill('DEMO001');page.locator('#studentPassword').fill('Rehaan2026');page.locator('.login-submit').click()
                        page.locator('#loginStatus').get_by_text('Invalid student account').wait_for()
                        assert not page.locator('#demoInterior').is_visible()
                        compressed = page.evaluate("""async () => {const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1000;const context=canvas.getContext('2d');context.fillStyle='#d8b96f';context.fillRect(0,0,1800,1000);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const file=new File([blob],'class.png',{type:'image/png'});const module=await import('./student-portal-updates.js');return module.prepareStudentUpdateImage(file);}""")
                        assert compressed.startswith("data:image/jpeg;base64,") and len(compressed) <= 350000
                    for username, expected, other in (("alpha", "Aisha Test", "Bilal Test"), ("beta", "Bilal Test", "Aisha Test")):
                        page.locator("#studentId").fill(username)
                        page.locator("#studentPassword").fill("StudentPass123")
                        page.locator(".login-submit").click()
                        page.locator("#followCentre").click()
                        page.locator(".demo-head h1").get_by_text(f"Hello, {expected}").wait_for()
                        assert other not in page.locator("#demoInterior").inner_text()
                        assert "SAMPLE" not in page.locator("#demoContent").inner_text()
                        page.locator('[data-demo-tab="account"]').click()
                        assert expected in page.locator("#demoContent").inner_text()
                        assert other not in page.locator("#demoContent").inner_text()
                        if page.locator("#studentMessagesSection").get_attribute("open") is None:
                            page.locator("#studentMessagesSection summary").click()
                        page.locator(".student-message").get_by_text(f"{expected.split()[0]} centre reply").wait_for()
                        page.locator("#studentMessageText").fill(f"Message from {expected}")
                        page.locator("#studentMessageForm button").click()
                        page.locator(".student-message.mine").get_by_text(f"Message from {expected}").wait_for()
                        page.locator('[data-demo-tab="updates"]').click()
                        own_title = "Aisha lesson note" if username == "alpha" else "Bilal homework"
                        other_title = "Bilal homework" if username == "alpha" else "Aisha lesson note"
                        page.get_by_text(own_title).first.wait_for()
                        assert other_title not in page.locator("#demoContent").inner_text()
                        page.locator("[data-live-open]").click()
                        page.locator("#studentUpdateDialog").get_by_text(own_title).wait_for()
                        page.locator("#closeStudentUpdate").click()
                        if username == "alpha":
                            page.locator("[data-live-image]").click()
                            page.locator("#studentImageDialog img").wait_for(state="visible")
                            page.locator("#closeStudentImage").click()
                        page.locator('[data-update-filter="Teacher messages"]').click()
                        assert f"{expected.split()[0]} centre reply" in page.locator("#demoContent").inner_text()
                        page.locator('[data-update-filter="All"]').click()
                        page.locator('[data-demo-tab="journey"]').click()
                        assert "Introduction" in page.locator("#demoContent").inner_text()
                        assert "OFFICIAL LEARNING CHECKLIST" in page.locator("#demoContent").inner_text()
                        if width in (390,1366) and username=='alpha': page.screenshot(path=str(ROOT.parent/'build'/f'portal-journey-{width}.png'),full_page=True)
                        assert ("MS Word" if username == "alpha" else "MS Excel") in page.locator("#studentLearningProgram").input_value()
                        if username == "alpha":
                            page.locator("#journeyClassImage").click()
                            page.locator("#studentImageDialog img").wait_for(state="visible")
                            page.locator("#closeStudentImage").click()
                        page.locator('[data-demo-tab="account"]').click()
                        page.locator(".account-section").last.locator("summary").click()
                        page.locator("#demoLogout").click()
                        page.locator("#studentLoginForm").wait_for(state="visible")
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), f"Horizontal overflow at {width}px"
                    page.close()
            finally:
                browser.close()
        print("PASS: two distinct portal views stay separate; four tabs, logout and 320/360/390/1366px layouts work.")
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
