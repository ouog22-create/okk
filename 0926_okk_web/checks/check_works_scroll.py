from playwright.sync_api import sync_playwright
from urllib.parse import urlsplit, parse_qs
import json
import os

BASE = os.getenv('OKK_REVIEW_URL', 'http://127.0.0.1:3098')

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1280,'height':800},reduced_motion='reduce')
    errors=[]; requests=[]; held=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    projects=[{'slug':f'work-{i}','title':f'Work {i}','summary':'Pagination check','color':'lavender'} for i in range(23)]
    fail=[True]
    def serve(route):
        query=parse_qs(urlsplit(route.request.url).query)
        assert query.get('limit')==['10'],route.request.url
        offset=int(query['offset'][0]);requests.append(offset)
        if offset==10 and fail[0]:
            fail[0]=False;route.fulfill(status=500,json={'error':'try again'});return
        if offset==10:
            held.append(route);return
        route.fulfill(json={'projects':projects[offset:offset+10],'next_offset':offset+10 if offset+10<23 else None})
    page.route('**/api/projects*',serve)
    page.goto(BASE + '/okk/works',wait_until='networkidle')
    assert page.locator('.work-card').count()==10
    assert requests==[0],requests
    page.locator('#works-sentinel').scroll_into_view_if_needed()
    page.get_by_role('button',name='다시 시도').wait_for()
    assert page.locator('.work-card').count()==10
    page.get_by_role('button',name='다시 시도').click()
    page.wait_for_timeout(200)
    assert len(held)==1
    page.evaluate('window.scrollBy(0,-30);window.scrollBy(0,30)')
    page.wait_for_timeout(200)
    assert requests==[0,10,10],requests
    held.pop().fulfill(json={'projects':projects[10:20],'next_offset':20})
    page.wait_for_function("document.querySelectorAll('.work-card').length===20")
    page.locator('#works-sentinel').scroll_into_view_if_needed()
    page.wait_for_function("document.querySelectorAll('.work-card').length===23")
    assert page.locator('#works-status').inner_text()=='모든 작업을 불러왔습니다.'
    page.evaluate('window.scrollBy(0,-100);window.scrollBy(0,100)')
    page.wait_for_timeout(200)
    assert requests==[0,10,10,20],requests
    assert len(set(page.locator('.work-card').evaluate_all('(els)=>els.map(el=>el.href)')))==23
    page.locator('nav a[href="/okk/about"]').click()
    page.go_back()
    page.wait_for_function("document.querySelectorAll('.work-card').length===23")
    assert requests==[0,10,10,20],requests
    assert not errors,errors
    browser.close()
    print(json.dumps({'cards':23,'requests':requests,'retry':'passed','duplicates':0,'history':'passed','js_errors':errors}))
