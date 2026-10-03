"""Check unsaved edits, failed navigation, and reauthentication on the review server."""
import os
from playwright.sync_api import sync_playwright

base = os.getenv('OKK_REVIEW_URL', 'http://127.0.0.1:3098')
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(base + '/admin/', wait_until='networkidle')
    page.locator('#login-form [name=username]').fill('test-editor')
    page.locator('#login-form [name=password]').fill('temporary-check-password')
    page.locator('#login-form button').click()
    page.locator('#new').click()
    page.locator('#project-form [name=title]').fill('Keep Work draft')
    dismiss = lambda dialog: dialog.dismiss()
    accept = lambda dialog: dialog.accept()
    page.on('dialog', dismiss)
    page.locator('#nav-clients').click()
    assert page.locator('#editor').is_visible()
    assert page.locator('#project-form [name=title]').input_value() == 'Keep Work draft'
    page.remove_listener('dialog', dismiss)
    page.on('dialog', accept)
    page.route('**/api/admin/clients', lambda route: route.fulfill(status=500, json={'error': 'Navigation failed'}))
    page.locator('#nav-clients').click()
    page.get_by_text('Navigation failed', exact=True).wait_for()
    assert page.locator('#editor').is_visible()
    assert page.locator('#project-form [name=title]').input_value() == 'Keep Work draft'
    page.unroute('**/api/admin/clients')
    page.locator('#nav-clients').click()
    page.locator('#client-new').click()
    page.locator('#client-form [name=name]').fill('Keep Clients draft')
    page.remove_listener('dialog', accept)
    page.on('dialog', dismiss)
    page.locator('#nav-work').click()
    assert page.locator('#client-form [name=name]').input_value() == 'Keep Clients draft'
    page.locator('#logout').click()
    assert page.locator('#client-editor').is_visible()
    page.remove_listener('dialog', dismiss)
    page.on('dialog', accept)
    page.route('**/api/admin/projects', lambda route: route.fulfill(status=401, json={'error': 'Session expired'}))
    page.locator('#nav-work').click()
    page.locator('#relogin').wait_for()
    assert page.locator('#client-form [name=name]').input_value() == 'Keep Clients draft'
    page.unroute('**/api/admin/projects')
    page.locator('#relogin-form [name=username]').fill('test-editor')
    page.locator('#relogin-form [name=password]').fill('temporary-check-password')
    page.locator('#relogin-form button').click()
    page.wait_for_function("!document.querySelector('#relogin').open")
    assert page.locator('#client-save').evaluate('(el) => el === document.activeElement')
    assert page.locator('#client-form [name=name]').input_value() == 'Keep Clients draft'
    page.locator('#nav-work').click()
    page.locator('#new').click()
    assert page.locator('#project-form [name=title]').input_value() == ''
    prompts = []
    page.remove_listener('dialog', accept)
    def unexpected(dialog):
        prompts.append(dialog.type)
        dialog.dismiss()
    page.on('dialog', unexpected)
    page.locator('#nav-clients').click()
    page.locator('#client-new').click()
    assert page.locator('#client-form [name=name]').input_value() == ''
    assert not prompts, prompts
    assert not errors, errors
    browser.close()
    print('PASS: independent drafts, cancelled/failed navigation, logout protection, reauthentication and reset')
