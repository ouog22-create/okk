"""Run using a Python environment with Playwright; uses installed Chrome."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto('http://localhost:3000/b/',wait_until='networkidle')
 assert page.locator('body.sprite-ready').count()==1
 page.screenshot(path='/private/tmp/okk-b-desktop.png',full_page=True)
 page.locator('nav a[href="#studio"]').click()
 page.wait_for_timeout(1000)
 assert page.locator('#studio').evaluate('(e)=>!e.inert && getComputedStyle(e).opacity === "1"')
 page.screenshot(path='/private/tmp/okk-b-studio.png')
 frame=page.locator('.hero-character').evaluate('(e)=>e.style.getPropertyValue("--sprite-y")')
 assert frame=='100%'
 page.evaluate('scrollTo(0,700)');page.wait_for_timeout(150)
 mid=page.locator('.hero-character').get_attribute('style')
 page.evaluate('scrollTo(0,1100)');page.wait_for_timeout(150)
 page.evaluate('scrollTo(0,700)');page.wait_for_timeout(150)
 assert mid==page.locator('.hero-character').get_attribute('style')
 page.evaluate('scrollTo(0,0)');page.wait_for_timeout(150)
 assert page.locator('.hero-character').evaluate('(e)=>e.style.getPropertyValue("--sprite-y")')=='0%'
 page.locator('nav a[href="#works"]').click()
 page.wait_for_timeout(1000)
 page.locator('[data-project="okk"]').scroll_into_view_if_needed()
 page.wait_for_timeout(200)
 page.screenshot(path='/private/tmp/okk-b-works.png')
 before=page.evaluate('scrollY')
 page.locator('[data-project="okk"]').click()
 assert page.locator('#project-dialog').evaluate('(e)=>e.open')
 assert page.locator('#project-title').inner_text()=='오키키'
 page.keyboard.press('Escape');page.wait_for_timeout(300)
 assert not page.locator('#project-dialog').evaluate('(e)=>e.open')
 assert abs(page.evaluate('scrollY')-before)<5, {'before':before,'after':page.evaluate('scrollY'),'saved':page.evaluate('projectY'),'hash':page.evaluate('location.hash')}
 assert page.locator('[data-project="okk"]').evaluate('(e)=>document.activeElement===e')
 page.go_forward();page.wait_for_timeout(300)
 assert page.locator('#project-dialog').evaluate('(e)=>e.open')
 page.go_back();page.wait_for_timeout(300)
 page.locator('nav a[href="#contact"]').click();page.wait_for_timeout(1000)
 assert page.locator('#contact-dialog').count()==0
 assert page.locator('#contact input').count()==4
 assert page.locator('#contact textarea').count()==1
 assert page.locator('#contact').evaluate('(e)=>e.classList.contains("contact-entered")')
 page.screenshot(path='/private/tmp/okk-b-contact.png')
 page.locator('.submit').click()
 assert page.locator('input[aria-invalid="true"]').count()==4
 page.route('**/api/contact',lambda route:route.fulfill(status=503,content_type='application/json',body='{"error":"발송 준비 중입니다."}'))
 for name,value in {'company':'테스트 회사','name':'테스트','phone':'01012345678','email':'test@example.com'}.items():
  page.locator(f'input[name="{name}"]').fill(value)
 page.locator('textarea').fill('문의 내용 보존 확인')
 page.locator('.submit').click()
 page.wait_for_function("document.querySelector('#form-status').textContent.includes('발송 준비')")
 assert page.locator('textarea').input_value()=='문의 내용 보존 확인'
 assert page.locator('.submit').is_enabled()
 page.unroute('**/api/contact')
 for width,height in [(390,844),(320,740),(768,1024),(844,390)]:
  page.set_viewport_size({'width':width,'height':height})
  page.goto('http://localhost:3000/b/#studio',wait_until='networkidle')
  page.wait_for_timeout(200)
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(width,'overflow')
  assert page.locator('#studio').evaluate('(e)=>!e.inert')
  if width==390:
   boxes=page.evaluate('''()=>{let a=document.querySelector('#studio').getBoundingClientRect(),b=document.querySelector('.hero-character').getBoundingClientRect();return {textBottom:a.bottom,characterTop:b.top}}''')
   assert boxes['textBottom']<=boxes['characterTop'],boxes
   page.screenshot(path='/private/tmp/okk-b-mobile-studio.png')
   page.goto('http://localhost:3000/b/',wait_until='networkidle')
   page.screenshot(path='/private/tmp/okk-b-mobile.png',full_page=True)
   page.locator('.menu-toggle').click();page.locator('nav a[href="#works"]').click();page.wait_for_timeout(1000)
   assert page.locator('.menu-toggle').get_attribute('aria-expanded')=='false'
 page.set_viewport_size({'width':390,'height':844})
 page.goto('http://localhost:3000/b/#contact',wait_until='networkidle');page.wait_for_timeout(1100)
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 assert page.locator('#contact textarea').is_visible()
 page.locator('.contact-form-panel').screenshot(path='/private/tmp/okk-b-contact-mobile.png')
 page.emulate_media(reduced_motion='reduce')
 page.goto('http://localhost:3000/b/#studio',wait_until='networkidle')
 page.locator('body.static-hero').wait_for()
 assert page.locator('body.static-hero').count()==1
 assert not errors,errors
 browser.close()
 print(json.dumps({'result':'PASS','sizes':['1440x1000','390x844','320x740','768x1024','844x390'],'js_errors':errors,'checked':['anchors','sprite reversal endpoints','project modal','history','focus return','form validation','mobile menu','reduced motion','horizontal overflow']},ensure_ascii=False))
