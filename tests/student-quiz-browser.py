"""UI contract for the disabled-by-default trusted quiz integration."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import importlib.util

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("live_test", ROOT / "tests/student-live-browser.py")
live_test = importlib.util.module_from_spec(spec)
spec.loader.exec_module(live_test)

QUIZ_STUB = """
export const quizServiceConfig={enabled:true};
const questions=Array.from({length:10},(_,index)=>({id:'question-'+index,program:'MS Word',question:'Question '+(index+1)+' about MS Word?',options:['Correct answer','Wrong B','Wrong C','Wrong D']}));
let result=null;
export async function quizRequest(path,{body}={}){
 if(path==='/quiz/me')return {streak:3,points:result?100:0,badges:result?['Perfect Quiz']:[],ranks:{weekly:result?{rank:1}:null,overall:null}};
 if(path==='/quiz/today')return result||{program:'MS Word',questions,completed:false};
 if(path==='/quiz/submit'){if(!result)result={program:'MS Word',questions,completed:true,score:body.answers.filter(answer=>answer===0).length,points:100,selectedAnswers:body.answers,correctAnswers:Array(10).fill(0)};return result;}
 throw Error('Unknown quiz route');
}
export async function publicLeaderboard(period){return {published:true,students:[{rank:1,name:'Aisha Test',score:period==='overall'?420:10,quizDays:1},{rank:2,name:'Bilal Test',score:period==='overall'?350:8,quizDays:1}]};}
"""


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT / "public")))
    Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}/student.html"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
            try:
                for width in (320, 360, 390):
                    page = browser.new_page(viewport={"width": width, "height": 780})
                    page.route("**/student-portal-auth.js*", lambda route: route.fulfill(status=200, content_type="text/javascript", body=live_test.STUB))
                    page.route("**/student-quiz-service.js*", lambda route: route.fulfill(status=200, content_type="text/javascript", body=QUIZ_STUB))
                    page.goto(url)
                    page.locator(".league-section").wait_for(state="visible")
                    page.locator('[data-league-period="overall"]').click()
                    page.locator(".podium.first b").get_by_text("420 pts").wait_for()
                    page.locator('[data-league-period="weekly"]').click()
                    page.locator(".podium.first b").get_by_text("100.0%").wait_for()
                    page.locator("#studentId").fill("alpha")
                    page.locator("#studentPassword").fill("StudentPass123")
                    page.locator(".login-submit").click()
                    page.locator("#liveQuizButton").get_by_text("Participate in quiz").wait_for()
                    page.locator("#liveQuizButton").click()
                    for index in range(10):
                        page.locator(".quiz-options button").first.wait_for()
                        assert page.locator(".quiz-options button").count() == 4
                        page.locator('[data-official-option="0"]').click()
                        page.locator("#officialNext").click()
                    page.get_by_text("10 / 10 correct").wait_for()
                    assert page.locator(".journey-step.done").count() == 10
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), width
                    page.close()
            finally:
                browser.close()
        print("PASS: trusted quiz UI shows ten four-choice questions, one final result and mobile fit at 320/360/390px.")
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
