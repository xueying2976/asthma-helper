import asyncio
import re
from pathlib import Path
from playwright.async_api import async_playwright
async def run(p,width=1280,large=False):
 Path('/tmp/browser/judges').mkdir(parents=True,exist_ok=True)
 browser=await p.chromium.launch(headless=True)
 context=await browser.new_context(viewport={'width':width,'height':1800},timezone_id='America/Los_Angeles')
 page=await context.new_page(); errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
 await page.goto('http://localhost:8080',wait_until='networkidle')
 await page.wait_for_timeout(1200)
 assert await page.title() == 'Asthma Helper — Interactive Personal Change Demo'
 await page.get_by_role('heading',name='Asthma Helper · Dashboard',exact=True).wait_for()
 assert 'Cambridge, Massachusetts' in await page.locator('figure').inner_text()
 assert 'Oct 24, 7:00 PM' in await page.locator('figure').inner_text()
 visible=[]
 await page.get_by_role('button',name='How to try',exact=True).dispatch_event('click')
 await page.get_by_text('1. Open History:',exact=False).wait_for()
 if large:
  await page.get_by_role('button',name='Large',exact=True).click();await page.get_by_role('button',name='Dark',exact=True).click()
 await page.locator('figure').screenshot(path=f'/tmp/browser/judges/today-{width}.png')
 async def tab(name): await page.locator('nav').get_by_role('button',name=name,exact=True).click()
 await tab('History')
 await page.get_by_role('button',name='Add respiratory check-in',exact=True).click()
 await page.get_by_label('Date and time',exact=True).fill('2026-10-24T10:00')
 for label in ['Cough','Wheeze','Chest tightness','Breathlessness']:
  group=page.locator('div').filter(has=page.locator('p',has_text=label))
  # ChoiceGroup uses fieldset/legend? Discover through stable button nearest label
  await page.get_by_text(label,exact=True).locator('..').get_by_role('button',name='None',exact=True).click()
 await page.get_by_role('button',name='Save',exact=True).click()
 await tab('Today');await page.get_by_text('No sustained change detected.',exact=False).wait_for()
 await tab('History')
 await page.get_by_role('button',name='Cough: none',exact=False).first.click()
 await page.get_by_text('Cough',exact=True).locator('..').get_by_role('button',name='Mild',exact=True).click()
 await page.get_by_role('button',name='Save',exact=True).click()
 await tab('Today');assert await page.get_by_role('button',name='Respiratory rate',exact=False).count()>0
 await tab('Trends');await page.get_by_role('img',name='Respiratory rate daily series',exact=False).first.wait_for()
 await page.get_by_role('button',name='30 days',exact=True).click()
 await page.locator('figure').screenshot(path=f'/tmp/browser/judges/trends-{width}.png')
 await tab('Medications');await page.get_by_role('button',name='Record actual use',exact=True).click()
 await page.get_by_label('Medication name',exact=True).fill('Albuterol inhaler')
 await page.get_by_label('Amount used',exact=True).fill('2')
 await page.get_by_role('button',name='Save',exact=True).click()
 assert '12 puffs left' in await page.locator('figure').inner_text()
 await tab('History')
 await page.get_by_role('button',name='Albuterol inhaler · 2 puff',exact=False).first.click()
 await page.get_by_label('Amount used',exact=True).fill('3')
 await page.get_by_role('button',name='Save',exact=True).click()
 await tab('History');await page.get_by_role('button',name='Add note',exact=True).click()
 await page.get_by_label('Note',exact=True).fill('Fictional judge note')
 await page.get_by_role('button',name='Save note',exact=True).click()
 await page.reload(wait_until='networkidle');await tab('History');assert await page.get_by_role('button',name='Fictional judge note',exact=False).count()==1
 assert await page.get_by_role('button',name='Albuterol inhaler · 3 puff',exact=False).count()==1
 assert await page.get_by_role('button',name='Cough: mild',exact=False).count()>=1
 visible.append(await page.locator('figure').inner_text())
 await tab('More');await page.get_by_role('button',name='Prepare for a doctor visit',exact=True).click()
 await page.get_by_role('button',name='Custom dates',exact=True).click()
 await page.get_by_role('button',name='Yes · partial today',exact=True).click()
 await page.get_by_label('Start date',exact=True).fill('2026-10-22')
 await page.get_by_label('End date · inclusive',exact=True).fill('2026-10-24')
 await page.get_by_role('button',name='Fictional judge note',exact=False).click()
 await page.get_by_label('Question 1',exact=True).fill('Could we review inhaler technique?')
 await page.get_by_role('button',name='Prepare preview',exact=True).click()
 await page.locator('[data-doctor-preview]').wait_for()
 report=await page.locator('[data-doctor-preview]').inner_text()
 assert '3 days' in report and 'Fictional judge note' in report and 'Could we review inhaler technique?' in report
 assert 'Oct 22, 2026 – Oct 24, 2026' in report
 assert 'Cough: 3 positive / 3 known days' in report
 assert 'Total amount: 3' in report
 assert 'Cough after walking near the river.' not in report
 assert 'America/New_York' in report and '7:00:00 PM' in report
 assert 'Asthma Helper' in report
 visible.append(report)
 await page.locator('[data-doctor-preview]').screenshot(path=f'/tmp/browser/judges/report-{width}.png')
 await page.evaluate('window.__printCalls=0;window.print=()=>window.__printCalls++')
 await page.get_by_role('button',name='Print / Save PDF',exact=True).click()
 await page.wait_for_function('window.__printCalls >= 1')
 await page.emulate_media(media='print')
 await page.pdf(path=f'/tmp/browser/judges/report-{width}.pdf',prefer_css_page_size=True)
 await page.screenshot(path=f'/tmp/browser/judges/print-{width}.png')
 await page.emulate_media(media='screen')
 await page.get_by_role('dialog').locator('textarea').fill('Updated question')
 assert await page.get_by_role('dialog').locator('[data-doctor-preview]').count()==0
 await page.get_by_role('dialog').get_by_role('button',name='Close',exact=True).click()
 for name in ['Today','Medications','Trends','History','More']:
  await tab(name);visible.append(await page.locator('figure').inner_text())
 assert not re.search(r'sustainedPersonalDeviation|noSustainedChangeDetected|chestTightness|reportedRespiratoryChange|\d+\.\d{5,}|AeriDay', '\n'.join(visible))
 await page.get_by_role('button',name='Reset synthetic demo',exact=True).click();await page.get_by_role('button',name='Confirm reset example',exact=True).click()
 await tab('History');assert await page.get_by_role('button',name='Fictional judge note',exact=False).count()==0
 await page.get_by_label('Timeline day',exact=True).select_option('2026-09-20');await tab('Today');assert 'Sep 20' in await page.locator('figure').inner_text()
 assert not errors, errors
 print('PASS',width,'branding; symptom and amount edits persist after reload; Oct22–24 report cough 3/3, amount 3, selected note/question only; Cambridge/ET; no raw enums/long decimals; print/PDF; reset; errors',errors)
 await browser.close()
async def main():
 async with async_playwright() as p:
  await run(p);await run(p,390,True)
asyncio.run(main())
