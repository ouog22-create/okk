"""Playwright smoke checks for B-1. Set OKK_PREVIEW_URL to the preview URL."""
from playwright.sync_api import sync_playwright
import json, os
BASE = os.environ.get("OKK_PREVIEW_URL", "http://localhost:3000/b-1/")
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 page=b.new_page(viewport={'width':1440,'height':1000})
 errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None)
 page.goto(BASE,wait_until='networkidle')
 assert page.locator('body.sprite-ready').count()==1
 page.screenshot(path='/tmp/b1-desktop.png',full_page=True)
 player=page.locator('.play-player')
 game=page.locator('.playground')
 game.focus(); x=player.bounding_box()['x']
 page.keyboard.down('ArrowRight');page.wait_for_timeout(450);page.keyboard.up('ArrowRight');page.wait_for_timeout(100)
 assert player.bounding_box()['x']>x+80
 x=player.bounding_box()['x'];page.wait_for_timeout(200);assert abs(player.bounding_box()['x']-x)<2
 floor=player.bounding_box()['y'];page.keyboard.press('Space');page.wait_for_timeout(160)
 assert player.bounding_box()['y']<floor-30
 page.screenshot(path='/tmp/b1-jump.png')
 page.wait_for_timeout(900);assert abs(player.bounding_box()['y']-floor)<2
 page.keyboard.down('ArrowLeft');page.wait_for_timeout(2200);page.keyboard.up('ArrowLeft');page.wait_for_timeout(100)
 assert player.bounding_box()['x']>=0
 page.locator('.play-reset').click()
 for i in range(3):
  star=page.locator(f'[data-spark="{i}"]')
  sx=star.evaluate('(e)=>e.offsetLeft')
  page.locator('.play-world').click(position={'x':sx,'y':20})
  page.wait_for_timeout(1400)
  page.keyboard.press('Space');page.wait_for_timeout(1000)
 assert page.locator('#play-score').inner_text()=='3 / 3',page.locator('#play-score').inner_text()
 page.locator('.play-reset').click();assert page.locator('#play-score').inner_text()=='0 / 3'
 for width,height in [(390,844),(320,740),(768,1024),(844,390)]:
  page.set_viewport_size({'width':width,'height':height})
  page.goto(BASE,wait_until='networkidle')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  page.screenshot(path=f'/tmp/b1-{width}.png')
  btn=page.locator('[data-move="1"]');btn.scroll_into_view_if_needed();box=btn.bounding_box()
  x=player.bounding_box()['x'];page.mouse.move(box['x']+20,box['y']+20);page.mouse.down();page.wait_for_timeout(300);page.mouse.up();page.wait_for_timeout(100)
  assert player.bounding_box()['x']>x+20,width
  x=player.bounding_box()['x'];page.wait_for_timeout(150);assert abs(player.bounding_box()['x']-x)<2
  page.locator('[data-jump]').click();page.wait_for_timeout(120)
  assert 'translate3d' in player.get_attribute('style')
 page.set_viewport_size({'width':1440,'height':1000})
 page.goto(BASE + '#works',wait_until='networkidle')
 page.locator('[data-project="okk"]').click();assert page.locator('#project-dialog').evaluate('(e)=>e.open')
 page.keyboard.press('Escape');page.wait_for_timeout(250)
 page.locator('nav a[href="#contact"]').click();page.wait_for_timeout(1200)
 assert page.locator('#contact footer').count()==1
 page.locator('.submit').click();assert page.locator('input[aria-invalid="true"]').count()==4
 page.emulate_media(reduced_motion='reduce')
 page.goto(BASE,wait_until='networkidle')
 game.focus();x=player.bounding_box()['x'];page.keyboard.down('KeyD');page.wait_for_timeout(250);page.keyboard.up('KeyD')
 assert player.bounding_box()['x']>x+20
 assert not errors,errors
 assert not failed,failed
 print(json.dumps({'result':'PASS','js_errors':errors,'failed_requests':failed,'checks':['keyboard movement','jump and landing','bounds','3 stars and reset','pointer controls','5 viewport sizes','modal','form validation','reduced motion']},ensure_ascii=False))
 b.close()
