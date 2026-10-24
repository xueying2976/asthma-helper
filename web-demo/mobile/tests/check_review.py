import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).parent
OUT=Path('/tmp/browser/v6-final')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  for width in [390,320]:
   context=await browser.new_context(viewport={'width':width,'height':844},color_scheme='dark' if width==320 else 'light')
   await context.add_init_script(path=str(ROOT/'syntheticBridge.js'))
   page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://localhost:8090');await page.get_by_text('A synthetic sustained personal change.',exact=True).wait_for()
   if width==320:await page.get_by_role('button',name='Text',exact=True).click()
   await page.evaluate("window.__insights.series[0].reference.reviewReason='Deleted reference input'; window.__insights.series[0].referenceBand={lower:13,upper:17}; window.__insights.findings[0].state='baselineReviewNeeded'")
   await page.get_by_role('navigation').get_by_role('button',name='Trends',exact=True).click();await page.get_by_role('button',name='Refresh insights',exact=True).click();await page.get_by_text('Reference needs review',exact=True).first.wait_for()
   await page.get_by_role('navigation').get_by_role('button',name='More',exact=True).click()
   await page.get_by_text('Reference needs review: Deleted reference input',exact=True).wait_for()
   assert await page.get_by_text('Experimental historical reference band:',exact=False).count()==0
   await page.get_by_role('button',name='Rebuild personal reference',exact=True).click();assert not await page.evaluate("window.__calls.some(x=>x.method==='reviewBaseline')")
   await page.get_by_role('button',name='Cancel rebuild',exact=True).click();assert not await page.evaluate("window.__calls.some(x=>x.method==='reviewBaseline')")
   await page.get_by_role('button',name='Rebuild personal reference',exact=True).click()
   btn=page.get_by_role('button',name='Confirm rebuild personal reference',exact=True)
   box=await btn.bounding_box();assert box['width']>=44 and box['height']>=44
   await btn.scroll_into_view_if_needed();await page.screenshot(path=str(OUT/f'confirmation-{width}.png'))
   await btn.click();await page.get_by_text('Saved. Current records refreshed.',exact=True).wait_for()
   assert await page.get_by_text('Reference needs review: Deleted reference input',exact=True).count()==0
   assert await page.evaluate("window.__calls.filter(x=>x.method==='reviewBaseline').every(x=>x.params.confirm===true)")
   calls=await page.evaluate('window.__calls.map(x=>x.method)');idx=calls.index('reviewBaseline');assert 'getInsights' in calls[idx+1:] and 'getSnapshot' in calls[idx+1:]
   assert await page.evaluate('window.__snapshot.medications[0].remainingDoses')==120
   # Committed error must read back rather than falsely claiming an unchanged reference.
   await page.evaluate("window.__insights.series[0].reference.reviewReason='Changed input';window.__failWrite=true")
   await page.get_by_role('button',name='Rebuild personal reference',exact=True).click();await page.get_by_role('button',name='Confirm rebuild personal reference',exact=True).click()
   await page.get_by_text('Could not complete the change. Current records refreshed; check for a partial save before retrying.',exact=True).wait_for()
   assert await page.evaluate('window.__insights.series[0].reference.reviewReason') is None
   # Series charts receive same review metadata and must not draw the band.
   await page.evaluate("window.__insights.series[0].reference.reviewReason='Deleted reference input';window.__band=true")
   await page.get_by_role('navigation').get_by_role('button',name='Trends',exact=True).click();await page.get_by_role('button',name='Respiratory rate',exact=True).first.click()
   await page.get_by_text('Reference needs review: Deleted reference input',exact=True).wait_for()
   assert await page.get_by_text('Experimental historical reference band:',exact=False).count()==0
   assert await page.locator('.recharts-reference-area').count()==0
   await page.screenshot(path=str(OUT/f'series-review-{width}.png'))
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
   print('PASS confirmation/cancel, getInsights+snapshot readback, partial error, band suppression, target, inventory unchanged',width)
   await context.close()
  await browser.close()
asyncio.run(main())
