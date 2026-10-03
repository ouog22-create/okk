"""Compare computed styles against a local baseline on the disposable review server."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('mode', choices=['record', 'compare'])
parser.add_argument('--baseline', default='/tmp/okk-refactor-styles.json')
args = parser.parse_args()
base = os.getenv('OKK_REVIEW_URL', 'http://127.0.0.1:3098')
properties = '''display position width height min-width max-width min-height max-height
margin-top margin-right margin-bottom margin-left padding-top padding-right padding-bottom padding-left
font-family font-size font-weight line-height letter-spacing color background-color background-image
border-top-width border-right-width border-bottom-width border-left-width border-radius border-color
box-shadow opacity visibility overflow-x overflow-y gap row-gap column-gap grid-template-columns
align-items justify-content flex-direction flex-wrap object-fit aspect-ratio transform top right bottom left'''.split()
snapshots = {}
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(reduced_motion='reduce')
    page.on('pageerror', lambda error: errors.append(str(error)))

    def capture(name, target=None):
        target = target or page
        target.locator('body').wait_for()
        target.evaluate('document.fonts.ready')
        snapshots[name] = target.evaluate('''properties => [...document.body.querySelectorAll('*')]
            .filter(el => !['SCRIPT', 'LINK'].includes(el.tagName))
            .map(el => ({tag: el.tagName, id: el.id, classes: el.className,
                style: Object.fromEntries(properties.map(key => [key, getComputedStyle(el).getPropertyValue(key)]))}))''', properties)

    for width in [320, 390, 768, 1440, 1700]:
        page.set_viewport_size({'width': width, 'height': 1000})
        for path in ['/okk/', '/okk/about', '/okk/works', '/okk/works/project-01']:
            page.goto(base + path, wait_until='networkidle')
            page.locator('main h1').wait_for()
            capture(f'{width}:{path}')
        page.goto(base + '/okk/', wait_until='networkidle')
        page.locator('nav [data-contact]').click()
        capture(f'{width}:contact')
        page.locator('#contact .close').click()

    page.goto(base + '/admin/', wait_until='networkidle')
    capture('admin:login')
    page.locator('#login-form [name=username]').fill('test-editor')
    page.locator('#login-form [name=password]').fill('temporary-check-password')
    page.locator('#login-form button').click()
    page.locator('#list .row').first.wait_for()
    for width in [320, 390, 768, 1440]:
        page.set_viewport_size({'width': width, 'height': 1000})
        page.locator('#nav-work').click()
        page.locator('#list-title').wait_for()
        capture(f'{width}:admin:list')
        page.locator('#new').click()
        page.frame_locator('#preview-frame').locator('.detail').wait_for()
        capture(f'{width}:admin:editor')
        capture(f'{width}:preview:detail', page.frames[1])
        page.locator('#preview-mode').select_option('card')
        page.frame_locator('#preview-frame').locator('.preview-card').wait_for()
        capture(f'{width}:preview:card', page.frames[1])
        page.locator('#preview-mode').select_option('detail')
        page.locator('#nav-clients').click()
        page.locator('#clients-title').wait_for()
        capture(f'{width}:admin:clients')
        page.locator('#client-new').click()
        capture(f'{width}:admin:client-editor')
    assert not errors, errors
    browser.close()

path = Path(args.baseline)
if args.mode == 'record':
    path.write_text(json.dumps(snapshots, ensure_ascii=False))
    print(f'Recorded {len(snapshots)} screen/viewport states in {path}')
else:
    previous = json.loads(path.read_text())
    differences = []
    for name, elements in snapshots.items():
        before = previous[name]
        if len(before) != len(elements):
            differences.append({'screen': name, 'elements': [len(before), len(elements)]})
            continue
        for i, (old, new) in enumerate(zip(before, elements)):
            changed = {key: [old['style'][key], value] for key, value in new['style'].items() if old['style'][key] != value}
            if changed:
                differences.append({'screen': name, 'element': f"{i}:{new['tag']}#{new['id']}.{new['classes']}", 'changes': changed})
    Path('/tmp/okk-refactor-style-diff.json').write_text(json.dumps(differences, ensure_ascii=False, indent=2))
    print(json.dumps({'screens': len(snapshots), 'differences': len(differences), 'sample': differences[:5]}, ensure_ascii=False))
    assert not differences, 'See /tmp/okk-refactor-style-diff.json'
