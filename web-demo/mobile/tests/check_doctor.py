import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).parent; OUT=Path('/tmp/browser/v7')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  for width,large,dark in [(390,False,False),(320,True,True)]:
   context=await browser.new_context(viewport={'width':width,'height':844},color_scheme='dark' if dark else 'light')
   await context.add_init_script(path=str(ROOT/'syntheticBridge.js'));await context.add_init_script(path=str(ROOT/'doctorBridge.js'))
   page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://localhost:8090');await page.get_by_text('A synthetic sustained personal change.',exact=True).wait_for()
   if large:await page.get_by_role('button',name='Text',exact=True).click()
   await page.get_by_role('navigation').get_by_role('button',name='More',exact=True).click();await page.get_by_role('button',name='Prepare for a doctor visit',exact=True).click()
   async def audit():
    small=await page.evaluate('''() => [...document.querySelectorAll('button,input,select,textarea,summary')].filter(e=>e.getClientRects().length&&!e.disabled).map(e=>({name:e.getAttribute('aria-label')||e.innerText||e.labels?.[0]?.innerText,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(e=>e.w<43.9||e.h<43.9)''');assert not small,small
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    bad=await page.locator('[role=dialog]').evaluate('''e=>[...e.querySelectorAll('input,textarea,button,p,h2,h3')].filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+2).map(n=>({tag:n.tagName,text:n.textContent.slice(0,60),w:n.clientWidth,sw:n.scrollWidth}))''');assert not bad,bad
   await audit();await page.screenshot(path=str(OUT/f'options-{width}.png'))
   await page.get_by_label('Question 1',exact=True).fill('What does this synthetic change mean?')
   await page.evaluate("window.__reportCase='loading'");await page.get_by_role('button',name='Prepare preview',exact=True).click();await page.get_by_text('Reading on-device records…',exact=True).wait_for();await page.get_by_text('Doctor-visit summary',exact=True).wait_for()
   params=await page.evaluate("window.__calls.filter(r=>r.method==='getDoctorSummary').at(-1).params");assert params['range']=={'kind':'last7','includeToday':False};assert params['selectedNoteIds']==[]
   await page.get_by_text('Demo data · Synthetic report',exact=True).wait_for();await page.get_by_text('No notes selected.',exact=True).wait_for()
   assert await page.locator('[data-doctor-preview]').get_by_text('Synthetic private unselected note',exact=True).count()==0
   await page.get_by_text('Doctor-visit summary',exact=True).scroll_into_view_if_needed();await page.screenshot(path=str(OUT/f'preview-{width}.png'));await audit()
   # Edit invalidates token; notes only included by owner selection.
   await page.get_by_role('button',name='Synthetic selected note',exact=False).click();assert await page.get_by_role('button',name='Share PDF',exact=True).count()==0
   await page.evaluate("window.__reportCase='normal'");await page.get_by_role('button',name='Prepare preview',exact=True).click();await page.locator('[data-doctor-preview]').get_by_text('Synthetic selected note',exact=True).wait_for()
   await page.evaluate("window.__exportCase='stale'");count=await page.evaluate('window.__reportCount');await page.get_by_role('button',name='Share PDF',exact=True).click();await page.get_by_text('Records changed — regenerate',exact=True).wait_for();await page.get_by_role('button',name='Share PDF',exact=True).wait_for();assert await page.evaluate('window.__reportCount')==count+1
   await page.evaluate("window.__exportCase='cancel'");await page.get_by_role('button',name='Share PDF',exact=True).click();await page.get_by_text('Sharing canceled. The preview is unchanged.',exact=True).wait_for()
   await page.evaluate("window.__exportCase='error'");await page.get_by_role('button',name='Share PDF',exact=True).click();await page.get_by_text('Could not open PDF sharing. No export success is confirmed. Try again.',exact=True).wait_for()
   await page.evaluate("window.__exportCase='normal'");await page.get_by_role('button',name='Share PDF',exact=True).click();await page.get_by_text('Native PDF share request completed.',exact=False).wait_for()
   await page.get_by_role('button',name='Custom dates',exact=True).click();await page.get_by_label('Start date',exact=True).fill('2026-01-01');await page.get_by_label('End date · inclusive',exact=True).fill('2026-10-23');await page.get_by_text('Choose no more than 90 calendar days.',exact=True).wait_for();assert await page.get_by_role('button',name='Prepare preview',exact=True).is_disabled()
   await page.get_by_label('Start date',exact=True).fill('2026-10-17');await page.get_by_role('group',name='Include today · partial',exact=True).get_by_role('button',name='Yes · partial today',exact=True).click();await audit();await page.screenshot(path=str(OUT/f'custom-{width}.png'))
   await page.evaluate("window.__reportCase='error'");await page.get_by_role('button',name='Prepare preview',exact=True).click();await page.get_by_role('button',name='Retry preview',exact=True).wait_for();await page.screenshot(path=str(OUT/f'error-{width}.png'))
   await page.evaluate("window.__reportCase='empty'");await page.get_by_role('button',name='Retry preview',exact=True).click();await page.get_by_text('No symptom rows supplied.',exact=True).wait_for();await page.get_by_text('Synthetic insufficient data',exact=True).wait_for();await audit();await page.get_by_text('No symptom rows supplied.',exact=True).scroll_into_view_if_needed();await page.screenshot(path=str(OUT/f'empty-{width}.png'))
   params=await page.evaluate("window.__calls.filter(r=>r.method==='getDoctorSummary').at(-1).params");assert params['range']['start'].endswith('Z');assert params['range']['end'].endswith('Z');assert params['range']['end'][:10]==__import__('datetime').date.today().isoformat();assert params['selectedNoteIds']==['selected-1'];assert params['patientQuestions']==['What does this synthetic change mean?']
   assert not errors,errors;print('PASS v7',width,'large' if large else 'standard',params)
   await context.close()
  await browser.close()
asyncio.run(main())
