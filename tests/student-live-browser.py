"""Exercise the existing student screen with two isolated portal views.

The browser Auth module is stubbed here; Firestore identity and rules are tested
separately by student-portal-rules.cjs in the emulator.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

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
export async function signInStudent(username,password){if(password!=='StudentPass123'||!views[username])throw Error('Invalid student account');return {view:views[username],ref:username};}
export async function restoreStudent(){return null;}
export async function watchStudent(ref,onValue){return ()=>{};}
export async function signOutStudent(){}
"""


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}/student.html"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
            try:
                for width in (320, 360, 390):
                    page = browser.new_page(viewport={"width": width, "height": 780})
                    page.route("**/student-portal-auth.js*", lambda route: route.fulfill(status=200, content_type="text/javascript", body=STUB))
                    page.goto(url)
                    for username, expected, other in (("alpha", "Aisha Test", "Bilal Test"), ("beta", "Bilal Test", "Aisha Test")):
                        page.locator("#studentId").fill(username)
                        page.locator("#studentPassword").fill("StudentPass123")
                        page.locator(".login-submit").click()
                        page.locator(".demo-head h1").get_by_text(f"Hello, {expected}").wait_for()
                        assert other not in page.locator("#demoInterior").inner_text()
                        assert "SAMPLE" not in page.locator("#demoContent").inner_text()
                        page.locator('[data-demo-tab="account"]').click()
                        assert expected in page.locator("#demoContent").inner_text()
                        assert other not in page.locator("#demoContent").inner_text()
                        page.locator('[data-demo-tab="updates"]').click()
                        assert "No updates published yet" in page.locator("#demoContent").inner_text()
                        page.locator('[data-demo-tab="journey"]').click()
                        assert "Introduction" in page.locator("#demoContent").inner_text()
                        page.locator('[data-demo-tab="account"]').click()
                        page.locator(".account-section").last.locator("summary").click()
                        page.locator("#demoLogout").click()
                        page.locator("#studentLoginForm").wait_for(state="visible")
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), f"Horizontal overflow at {width}px"
                    page.close()
            finally:
                browser.close()
        print("PASS: two distinct portal views stay separate; four tabs, logout and 320/360/390px layouts work.")
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
