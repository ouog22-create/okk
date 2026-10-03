"""Browser regressions for A routes, module lifecycle, async data, contact, and preview."""
import os
from playwright.sync_api import sync_playwright

base = os.getenv('OKK_REVIEW_URL', 'http://127.0.0.1:3098')
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script('''(() => {
        const Original = window.IntersectionObserver;
        const live = new Set();
        window.IntersectionObserver = class extends Original {
            observe(target) { live.add(this); super.observe(target); }
            disconnect() { live.delete(this); super.disconnect(); }
        };
        window.liveObservers = () => live.size;
    })();''')
    for path, heading in [('/', 'studio okk'), ('/okk/', 'studio okk'),
                          ('/about', 'A little different.'), ('/okk/about', 'A little different.'),
                          ('/works', 'Works'), ('/okk/works', 'Works'),
                          ('/works/project-01', 'Project 01'), ('/okk/works/project-01', 'Project 01')]:
        page.goto(base + path, wait_until='networkidle')
        title = page.locator('main h1')
        assert heading in (title.get_attribute('aria-label') or title.inner_text()), path
    page.goto(base + '/okk/?path=/works/project-01', wait_until='networkidle')
    assert page.url.endswith('/okk/works/project-01')
    page.goto(base + '/okk/works/does-not-exist', wait_until='networkidle')
    page.get_by_role('link', name='홈으로 돌아가기').click()
    assert page.url.endswith('/okk/')
    page.locator('.hero').wait_for()
    for _ in range(3):
        page.locator('nav a[href="/okk/about"]').click()
        assert page.evaluate('liveObservers()') == 0
        assert page.locator('#main').evaluate('(element) => element === document.activeElement')
        page.go_back()
        page.locator('.hero').wait_for()
        assert page.evaluate('liveObservers()') == 1
        assert page.locator('#site-header').count() == 1
    page.locator('nav a[href="/okk/works"]').click()
    page.locator('.work-card[href="/okk/works/project-01"]').click()
    assert page.url.endswith('/okk/works/project-01')
    page.go_back()
    page.locator('.work-grid').wait_for()

    data = page.request.get(base + '/api/projects').json()
    clients = page.request.get(base + '/api/clients').json()
    pending = []
    delayed = browser.new_page(reduced_motion='reduce')
    delayed.on('pageerror', lambda error: errors.append(str(error)))
    delayed.route('**/api/projects', lambda route: pending.append(('projects', route)))
    delayed.route('**/api/clients', lambda route: pending.append(('clients', route)))
    delayed.goto(base + '/okk/', wait_until='domcontentloaded')
    delayed.locator('.hero').wait_for()
    assert delayed.locator('.work-grid').inner_text() == '작업을 불러오는 중입니다.'
    delayed.locator('nav a[href="/okk/about"]').click()
    delayed.wait_for_timeout(100)
    assert len(pending) == 2
    for resource, route in pending:
        route.fulfill(json=data if resource == 'projects' else clients)
    delayed.wait_for_load_state('networkidle')
    assert 'A little different.' in delayed.locator('main h1').inner_text()
    delayed.locator('nav a[href="/okk/works"]').click()
    assert delayed.locator('.work-card').count() == len(data['projects'])
    delayed.close()

    failed = browser.new_page(reduced_motion='reduce')
    failed.on('pageerror', lambda error: errors.append(str(error)))
    failed.route('**/api/projects', lambda route: route.fulfill(status=500, json={'error': 'failure'}))
    failed.route('**/api/clients', lambda route: route.fulfill(status=500, json={'error': 'failure'}))
    failed.goto(base + '/okk/', wait_until='networkidle')
    assert '불러오지 못했습니다' in failed.locator('.work-grid').inner_text()
    assert '불러오지 못했습니다' in failed.locator('.logos').inner_text()
    failed.goto(base + '/okk/works/project-01', wait_until='networkidle')
    assert '불러오지 못했습니다' in failed.locator('main').inner_text()
    failed.close()

    page.locator('nav [data-contact]').click()
    page.locator('#contact .submit').click()
    assert page.locator('#contact [name=company]').evaluate('(element) => element === document.activeElement')
    fields = {'company': '테스트 회사', 'name': '테스트 담당자', 'phone': '01012345678',
              'email': 'test@example.com', 'message': '입력 보존 확인'}
    for name, value in fields.items(): page.locator(f'#contact [name={name}]').fill(value)
    page.route('**/api/contact', lambda route: route.fulfill(status=503, json={'error': '테스트 발송 실패'}))
    page.locator('#contact .submit').click()
    page.get_by_text('테스트 발송 실패', exact=True).wait_for()
    for name, value in fields.items(): assert page.locator(f'#contact [name={name}]').input_value() == value
    page.unroute('**/api/contact')
    page.route('**/api/contact', lambda route: route.fulfill(json={'ok': True}))
    page.locator('#contact .submit').click()
    page.get_by_text('문의가 접수되었습니다. 메일로 답변드리겠습니다.', exact=True).wait_for()
    for name in fields: assert page.locator(f'#contact [name={name}]').input_value() == ''
    page.keyboard.press('Escape')
    assert page.locator('nav [data-contact]').evaluate('(element) => element === document.activeElement')

    page.goto(base + '/admin/', wait_until='networkidle')
    page.locator('#login-form [name=username]').fill('test-editor')
    page.locator('#login-form [name=password]').fill('temporary-check-password')
    page.locator('#login-form button').click()
    page.locator('#new').click()
    page.locator('#project-form [name=title]').fill('<b>문자 그대로</b>')
    preview = page.frame_locator('#preview-frame')
    preview.locator('h1').filter(has_text='<b>문자 그대로</b>').wait_for()
    assert preview.locator('h1 b').count() == 0
    sheets = page.frames[1].evaluate('[...document.styleSheets].map(sheet => new URL(sheet.href).pathname)')
    assert sheets == ['/okk/styles/base.css', '/okk/styles/project.css', '/admin/preview.css'], sheets
    assert not errors, errors
    browser.close()
    print('PASS: URL aliases, redirects, history, hero cleanup, async/error data, contact preservation, shared preview and escaping')
