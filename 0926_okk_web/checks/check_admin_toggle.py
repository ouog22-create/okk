"""Run against checks/serve_review.py with Playwright and a local AXE_SCRIPT."""
import json
import os
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = os.getenv('OKK_REVIEW_URL', 'http://127.0.0.1:3098')
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width':1440,'height':1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE+'/admin/', wait_until='networkidle')
    page.locator('#login-form [name=username]').fill(os.getenv('OKK_TEST_USERNAME','test-editor'))
    page.locator('#login-form [name=password]').fill(os.getenv('OKK_TEST_PASSWORD','temporary-check-password'))
    page.locator('#login-form button').click()
    page.locator('.row').first.wait_for()
    page.locator('#new').click()
    toggle = page.get_by_role('switch', name='프로젝트 공개')
    assert not toggle.is_checked()
    assert page.locator('[name=subtitle],[name=color]').count()==0
    assert page.locator('#save').inner_text()=='저장'
    assert not page.locator('#editor-state').is_visible()
    assert page.locator('#editor .editor-actions > :last-child').get_attribute('id')=='save'
    assert page.locator('.editor-actions #featured').count()==1
    assert page.locator('#featured').evaluate('(e)=>e.form.id')=='project-form'
    page.locator('#featured').uncheck()
    page.locator('#editor .publish-control').click()
    page.get_by_text('필수 입력 항목을 확인해주세요.',exact=True).wait_for()
    assert not toggle.is_checked()
    assert page.locator('[name=title]').evaluate('(e)=>e===document.activeElement')
    page.locator('[name=title]').fill('토글 확인 프로젝트')
    assert page.locator('[name=slug]').count() == 0
    with page.expect_response(lambda response: response.url.endswith('/api/admin/projects') and response.request.method == 'POST') as saved:
        page.locator('#save').click()
    slug = saved.value.json()['project']['draft']['slug']
    assert slug.startswith('project-')
    page.get_by_text('저장했습니다. 현재 비공개 상태입니다.',exact=True).wait_for()
    assert page.locator('#notice').evaluate('(e)=>getComputedStyle(e).position')=='fixed'
    toast_box=page.locator('#notice').bounding_box()
    assert toast_box['y'] <= 25
    assert toast_box['x']+toast_box['width'] >= 1400
    page.wait_for_function("document.querySelector('#notice').textContent === ''",timeout=4500)
    assert not page.locator('#notice').is_visible()
    def public():
        return page.request.get(BASE+'/api/projects').json()['projects']
    assert not any(x['slug']==slug for x in public())
    assert '1,600 × 1,200px' in page.locator('#thumbnail-help').inner_text()
    assert '1,920 × 1,080px' in page.locator('#cover-help').inner_text()
    assert '3,200px' in page.locator('#gallery-help').inner_text()
    preview=page.frame_locator('#preview-frame')
    preview.locator('.eyebrow').get_by_text('STUDIO OKK / WORK',exact=True).wait_for()
    toggle.focus()
    page.keyboard.press('Space')
    page.get_by_text('공개했습니다.',exact=False).wait_for()
    assert toggle.is_checked()
    assert any(x['slug']==slug for x in public())
    assert next(x for x in public() if x['slug']==slug)['featured'] is False
    page.locator('#featured').check()
    page.locator('[name=title]').fill('공개 중 수정 저장')
    page.locator('#save').click()
    page.get_by_text('저장했습니다. 변경사항이 사이트에 반영되었습니다.',exact=True).wait_for()
    assert next(x for x in public() if x['slug']==slug)['title']=='공개 중 수정 저장'
    assert next(x for x in public() if x['slug']==slug)['featured'] is True
    page.locator('[name=title]').fill('아직 저장하지 않은 제목')
    page.route('**/api/admin/projects/*',lambda route:route.fulfill(status=500,content_type='application/json',body='{"error":"테스트 저장 실패"}'))
    page.locator('#editor .publish-control').click()
    page.get_by_text('테스트 저장 실패',exact=True).wait_for()
    assert toggle.is_checked()
    page.unroute('**/api/admin/projects/*')
    page.locator('#editor .publish-control').click()
    page.get_by_text('비공개로 전환했습니다.',exact=False).wait_for()
    assert not toggle.is_checked()
    assert page.locator('[name=title]').input_value()=='아직 저장하지 않은 제목'
    assert not any(x['slug']==slug for x in public())
    page.locator('#save').click()
    page.get_by_text('저장했습니다. 현재 비공개 상태입니다.',exact=True).wait_for()
    page.locator('#back').click()
    page.locator('.row').filter(has_text='아직 저장하지 않은 제목').locator('[data-action=edit]').click()
    assert not toggle.is_checked()
    if os.getenv('AXE_SCRIPT'):
        page.add_script_tag(path=os.environ['AXE_SCRIPT'])
        violations=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']}})).violations.map(v=>v.id)")
        assert not violations,violations
    for width in [320,390,768]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),width
    page.set_viewport_size({'width':1440,'height':1000})
    page.evaluate('scrollTo(0,0)')
    page.screenshot(path='/tmp/okk-admin-toggle.png',full_page=True)
    page.locator('#back').click()
    page.locator('#new').click()
    assert not toggle.is_checked()
    page.locator('[name=title]').fill('바로 공개하는 새 프로젝트')
    assert page.locator('[name=slug]').count() == 0
    page.locator('#editor .publish-control').click()
    page.get_by_text('공개했습니다.',exact=False).wait_for()
    assert toggle.is_checked()
    assert not errors,errors
    print(json.dumps({'result':'PASS','checks':['toolbar order','external featured save','hidden editor state','toast position and timeout','removed fields','fixed subtitle','image specifications','default OFF','invalid rollback','keyboard ON','public save','failed OFF rollback','OFF preserves input','persisted OFF','new project ON','mobile widths','axe editor'],'js_errors':errors},ensure_ascii=False))
    browser.close()
