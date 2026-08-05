const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto('http://localhost:3000/editor/markdown', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__editorInitialized === true, null, { timeout: 30000 }).catch(() => console.log('editor NOT initialized'));
  await page.waitForTimeout(1500);

  const overlay = page.locator('#local-search');

  // 1) open search, check results for a common query
  await page.locator('#searchBtn').first().click();
  await page.waitForTimeout(400);
  console.log('[1] display:', await overlay.evaluate(el => getComputedStyle(el).display), '| focused:', await page.evaluate(() => document.activeElement.id));
  const input = page.locator('#searchInput');
  await input.fill('的');
  await page.waitForTimeout(1500);
  console.log('[1] results len:', (await page.locator('#local-search-results').innerText()).length, '| stats:', JSON.stringify(await page.locator('#local-search-stats').innerText()));
  console.log('[1] activeElement:', await page.evaluate(() => document.activeElement.id));

  // close via Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  console.log('[1] after Esc display:', await overlay.evaluate(el => getComputedStyle(el).display));

  // 2) focus monaco editor, then click search button
  await page.locator('#editor-input').click();
  await page.waitForTimeout(400);
  console.log('[2] monaco focused:', await page.evaluate(() => { const a = document.activeElement; return a ? a.tagName + '.' + String(a.className).slice(0, 40) : 'none'; }));
  await page.locator('#searchBtn').first().click();
  await page.waitForTimeout(400);
  console.log('[2] display:', await overlay.evaluate(el => getComputedStyle(el).display), '| focused:', await page.evaluate(() => document.activeElement.id));
  await input.fill('的');
  await page.waitForTimeout(1200);
  console.log('[2] results len:', (await page.locator('#local-search-results').innerText()).length);
  console.log('[2] activeElement:', await page.evaluate(() => document.activeElement.id));
  await page.keyboard.press('Escape');

  // 3) check search.json loaded properly
  const idx = await page.evaluate(async () => {
    const r = await fetch('/search.json');
    const d = await r.json();
    return { count: d.length, sample: d[0] ? d[0].title : null };
  }).catch(e => ({ error: e.message }));
  console.log('[3] search.json:', JSON.stringify(idx));

  console.log('---- errors ----');
  errors.forEach(e => console.log(e));
  if (errors.length === 0) console.log('(none)');

  await browser.close();
})();
