import asyncio, os
from pathlib import Path
ROOT=Path(__file__).parent
OUT=Path(os.environ.get("AERIDAY_SCREENSHOTS","/tmp/browser/v6-source"))
OUT.mkdir(parents=True,exist_ok=True)
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  for width in [390,320]:
   context=await browser.new_context(viewport={'width':width,'height':844},color_scheme='dark');await context.add_init_script(path=str(ROOT/'syntheticBridge.js'));page=await context.new_page();await page.goto('http://localhost:8090');await page.get_by_text('A synthetic sustained personal change.',exact=True).wait_for()
   if width==320:await page.get_by_role('button',name='Text',exact=True).click()
   assert await page.evaluate('window.__insights.context.reportedRespiratoryChange') is False
   await page.get_by_role('navigation').get_by_role('button',name='More',exact=True).click();group=page.get_by_role('group',name='Respiratory rate source',exact=True);assert await group.get_by_role('button').count()==3
   await group.get_by_role('button',name='Automatic',exact=True).click();await page.get_by_text('Multiple sources · Choose a source. No sources are merged.',exact=True).wait_for();assert await page.evaluate('window.__insights.sourceOptions[0].selectedSourceId') is None
   await page.get_by_role('navigation').get_by_role('button',name='Trends',exact=True).click();await page.get_by_text('Respiratory rate: Multiple sources · Choose a source in More.',exact=True).wait_for();await page.get_by_role('button',name='Respiratory rate',exact=True).first.click();await page.get_by_role('dialog').get_by_text('Multiple sources · Choose a source in More. No sources are merged.',exact=True).wait_for();assert await page.get_by_role('img').count()==0;await page.get_by_role('dialog').get_by_role('button',name='Close',exact=True).click()
   await page.get_by_role('navigation').get_by_role('button',name='More',exact=True).click();await page.evaluate('window.__failWrite=true');await group.get_by_role('button',name='Synthetic phone',exact=True).click();await page.get_by_text('Could not complete the change. Current records refreshed; check for a partial save before retrying.',exact=True).wait_for();assert await group.get_by_role('button',name='Synthetic phone',exact=True).get_attribute('aria-pressed')=='true';await group.screenshot(path=str(OUT/f'source-{width}.png'))
   await page.get_by_role('navigation').get_by_role('button',name='Trends',exact=True).click();await page.get_by_role('button',name='Respiratory rate',exact=True).first.click();await page.get_by_text('MAD: 1 breaths/min · 24 valid days',exact=True).wait_for();assert await page.get_by_text('Experimental historical reference band:',exact=False).count()==0
   await page.evaluate('window.__band=true');await page.get_by_role('dialog').get_by_role('button',name='30 days',exact=True).click();await page.get_by_role('dialog').get_by_text('Experimental historical reference band:',exact=False).wait_for();await page.screenshot(path=str(OUT/f'reference-{width}.png'));assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth');print('PASS sources, ambiguity, partial readback, reference/band',width);await context.close()
  await browser.close()
asyncio.run(main())
