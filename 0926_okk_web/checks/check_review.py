"""Browser review against an isolated test server; AXE_SCRIPT points to a local axe-core file."""
import json
import os
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.getenv('OKK_REVIEW_URL', 'http://127.0.0.1:3098')
AXE = os.environ['AXE_SCRIPT']
TITLE = "접근성 검토 프로젝트 " + uuid.uuid4().hex[:8]
report = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def audit(name, target=None):
        target = target or page
        target.add_script_tag(path=AXE)
        result = target.evaluate('''async () => {
            const result = await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});
            return {violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),manual:result.incomplete.map(v=>({id:v.id,count:v.nodes.length}))};
        }''')
        report.append({'page':name,**result})

    for path in ['/okk/','/okk/about','/okk/works','/okk/works/project-01','/b/','/b-1/','/admin/']:
        page.goto(BASE + path, wait_until='networkidle')
        audit(path)
        for width in [320,390,768]:
            page.set_viewport_size({'width':width,'height':844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (path,width)
        page.set_viewport_size({'width':1440,'height':1000})

    page.goto(BASE+'/okk/',wait_until='networkidle')
    page.keyboard.press('Tab')
    assert page.locator('.skip').evaluate('(e)=>e===document.activeElement')
    page.keyboard.press('Enter')
    assert page.locator('#main').evaluate('(e)=>e===document.activeElement')
    page.locator('a[href="#selected"]').click()
    assert page.locator('#selected').evaluate('(e)=>e===document.activeElement')
    page.locator('nav [data-contact]').click()
    page.keyboard.press('Shift+Tab')
    assert page.locator('#contact').evaluate('(e)=>e.contains(document.activeElement)')
    page.keyboard.press('Escape')
    assert page.locator('nav [data-contact]').evaluate('(e)=>e===document.activeElement')
    page.locator('nav [data-contact]').click()
    audit('contact-dialog')
    page.keyboard.press('Escape')

    page.emulate_media(reduced_motion='no-preference')
    page.goto(BASE+'/okk/',wait_until='networkidle')
    page.locator('.hero-motion').click()
    assert page.locator('.mascot-image').first.get_attribute('src').endswith('-cutout.png')
    page.locator('.hero-motion').click()
    assert page.locator('.mascot-image').first.get_attribute('src').endswith('-loop.webp')
    page.locator('a[href="#selected"]').click()
    page.wait_for_function("document.querySelector('.mascot-image').getAttribute('src').endsWith('-cutout.png')")
    for path in ['/b/','/b-1/']:
        page.goto(BASE+path,wait_until='networkidle')
        page.locator('nav a[href="#clients"]').click()
        page.locator('.logos-motion').click()
        assert page.locator('#logos').evaluate('(e)=>getComputedStyle(e).animationPlayState')=='paused'
        page.locator('nav a[href="#works"]').click()
        assert page.locator('#logos').evaluate('(e)=>getComputedStyle(e).animationPlayState')=='paused'
    page.emulate_media(reduced_motion='reduce')

    page.goto(BASE+'/admin/',wait_until='networkidle')
    page.locator('#login-form [name=username]').fill(os.getenv('OKK_TEST_USERNAME','test-editor'))
    page.locator('#login-form [name=password]').fill(os.getenv('OKK_TEST_PASSWORD','temporary-check-password'))
    page.locator('#login-form button').click()
    page.locator('.row').first.wait_for()
    assert page.locator('#list-title').evaluate('(e)=>e===document.activeElement')
    audit('admin-list')
    first = page.locator('.row').first.get_attribute('data-id')
    page.locator('.row').first.locator('[data-action=down]').click()
    page.wait_for_function("document.activeElement?.dataset.action==='down'")
    assert page.evaluate('document.activeElement.closest("[data-id]").dataset.id')==first
    page.locator('#new').click()
    assert page.locator('#editor-title').evaluate('(e)=>e===document.activeElement')
    page.locator('#save').click()
    assert page.locator('[name=title]').evaluate('(e)=>e===document.activeElement')
    page.locator('[name=title]').fill(TITLE)
    page.locator('[name=slug]').fill('review-' + uuid.uuid4().hex[:8])
    image = str(Path(__file__).resolve().parents[1]/'public/assets/star_b.png')
    page.locator('#gallery-upload').set_input_files([image,image])
    page.locator('#gallery .image-block').nth(1).wait_for()
    page.locator('#gallery [data-index="1"] [data-image=up]').click()
    assert page.evaluate('document.activeElement.closest("[data-index]").dataset.index')=='0'
    assert page.evaluate('document.activeElement.dataset.image')=='up'
    page.locator('#save').click()
    page.get_by_text('초안을 저장했습니다.',exact=True).wait_for()
    audit('admin-editor')
    preview = page.frame_locator('#preview-frame')
    preview.locator('h1').filter(has_text=TITLE).wait_for()
    audit('preview-detail', page.frames[1])
    page.locator('#preview-mode').select_option('card')
    preview.locator('.preview-label').wait_for()
    audit('preview-card', page.frames[1])
    page.evaluate("document.querySelector('#relogin').showModal()")
    audit('admin-relogin')
    page.keyboard.press('Escape')
    for width in [320,390,768]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), ('editor',width)
    page.set_viewport_size({'width':1440,'height':1000})
    page.on('dialog', lambda dialog: dialog.accept())
    page.locator('#publish').click()
    page.get_by_text('공개했습니다.',exact=False).wait_for()
    page.evaluate('scrollTo(0,0)')
    page.screenshot(path='/tmp/okk-review-editor.png', full_page=True)
    page.locator('#back').click()
    page.locator('#list').wait_for()
    page.screenshot(path='/tmp/okk-review-list.png', full_page=True)
    row=page.locator('.row').filter(has_text=TITLE)
    row.locator('[data-action=edit]').click()
    page.locator('#back').click()
    page.wait_for_function("document.activeElement?.dataset.action==='edit'")
    row.locator('[data-action=trash]').click()
    page.get_by_text('변경했습니다.',exact=True).wait_for()
    page.locator('#filter').select_option('trash')
    page.locator('[data-action=restore]').click()
    page.get_by_text('초안으로 복구했습니다.',exact=True).wait_for()
    assert not errors, errors
    destination=Path(os.getenv('OKK_REVIEW_REPORT','/tmp/okk-review-result.json'))
    destination.write_text(json.dumps({'pages':report,'js_errors':errors},ensure_ascii=False,indent=2))
    print(json.dumps({'pages':len(report),'violations':sum(len(r['violations']) for r in report),'js_errors':errors,'report':str(destination)},ensure_ascii=False))
    assert all(not r['violations'] for r in report), report
    browser.close()
