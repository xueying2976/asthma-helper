import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/aeriday-v8'); ROOT=Path(__file__).parent
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  for width,large,dark in [(390,False,False),(320,True,True)]:
   c=await b.new_context(viewport={'width':width,'height':844},color_scheme='dark' if dark else 'light');await c.add_init_script(path=str(ROOT/'syntheticBridge.js'));page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));await page.goto('http://localhost:8090');await page.get_by_text('A synthetic sustained personal change.',exact=True).wait_for()
   if large:await page.get_by_role('button',name='Text',exact=True).click()
   for tab in ['Today','Medications','Trends','History','More']:
    await page.get_by_role('navigation').get_by_role('button',name=tab,exact=True).click();await page.wait_for_timeout(80);await page.screenshot(path=str(OUT/f'{tab}-{width}.png'))
    small=await page.evaluate('''()=>[...document.querySelectorAll('button,input,select,textarea,summary')].filter(e=>e.getClientRects().length&&!e.disabled).map(e=>({name:e.getAttribute('aria-label')||e.innerText,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(e=>e.w<43.9||e.h<43.9)''');assert not small,small
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   await page.get_by_role('navigation').get_by_role('button',name='Today',exact=True).click()
   for label in ['Health trends','Action plan','Anything unusual today?','Ask AI · Unavailable']:
    await page.get_by_text(label,exact=True).scroll_into_view_if_needed()
   await page.screenshot(path=str(OUT/f'Today-bottom-{width}.png'))
   await page.get_by_role('button',name='Action plan',exact=False).click();await page.get_by_text('No clinician-authored action plan is supplied',exact=False).wait_for();await page.screenshot(path=str(OUT/f'Plan-empty-{width}.png'));await page.get_by_role('dialog').get_by_role('button',name='Close',exact=True).click()
   await page.evaluate("window.__snapshot.isDemo=false;window.__snapshot.metrics=[];window.__snapshot.medications=[];window.__insights.isDemo=false;window.__insights.findings=[]")
   await page.get_by_role('navigation').get_by_role('button',name='Trends',exact=True).click();await page.get_by_role('button',name='Refresh insights',exact=True).click();await page.get_by_text('No findings supplied. This does not mean it is safe to wait.',exact=True).wait_for();await page.get_by_role('navigation').get_by_role('button',name='Today',exact=True).click();await page.get_by_text('Personal data',exact=True).wait_for();assert await page.get_by_text('Trial inhaler',exact=True).count()==0;assert await page.get_by_text('18 breaths/min',exact=False).count()==0;await page.screenshot(path=str(OUT/f'Personal-empty-{width}.png'));assert not errors,errors
   print('PASS v8 five tabs, 44px targets, composition, unavailable plan and personal empty:',width);await c.close()
  c=await b.new_context(viewport={'width':390,'height':844});page=await c.new_page();await page.goto('http://localhost:8080');await page.get_by_role('navigation').first.wait_for();await page.screenshot(path=str(OUT/'browser-reference.png'));await b.close()
asyncio.run(main())
