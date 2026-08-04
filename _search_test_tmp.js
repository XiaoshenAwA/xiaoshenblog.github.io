const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto('http://localhost:3000/editor/markdown', { waitUntil: 'domcontentloaded', timeout: 30000 });
  // wait for monaco + shiki to fully initialize
  await page.waitForFunction(() => window.__editorInitialized === true, null, { timeout: 30000 }).catch(() => console.log('editor not initialized'));
  await page.waitForTimeout(3000);

  await page.locator('#searchBtn').first().click();
  await page.waitForTimeout(500);

  const overlay = page.locator('#local-search');
  console.log('display after click:', await overlay.evaluate(el => getComputedStyle(el).display));
  console.log('searchInput focused:', await page.evaluate(() => document.activeElement && document.activeElement.id));

  // type into search
  const input = page.locator('#searchInput');
  await input.type('测试', { delay: 50 });
  await page.waitForTimeout(1500);
  const results = await page.locator('#local-search-results').innerText();
  const stats = await page.locator('#local-search-stats').innerText();
  console.log('results:', JSON.stringify(results.slice(0, 200)));
  console.log('stats:', JSON.stringify(stats));

  // check if search.json is loaded
  const fuseStatus = await page.evaluate(() => window.__fuseDebug || 'n/a');

  // check active element after typing
  console.log('activeElement after typing:', await page.evaluate(() => document.activeElement && document.activeElement.id + '/' + document.activeElement.tagName));

  // Now test with monaco focused: click inside editor then click search button
  await page.locator('#editor-input').click();
  await page.waitForTimeout(300);
  console.log('monaco focused:', await page.evaluate(() => {
    const a = document.activeElement;
    return a && (a.className && String(a.className).includes('monaco')) ? 'yes' : (a ? a.tagName + '.' + a.className : 'none');
  }));

  await page.locator('#searchBtn').first().click();
  await page.waitForTimeout(500);
  console.log('display after click while monaco focused:', await overlay.evaluate(el => getComputedStyle(el).display));
  console.log('activeElement:', await page.evaluate(() => document.activeElement && document.activeElement.id + '/' + document.activeElement.tagName));

  console.log('---- errors ----');
  errors.forEach(e => console.log(e));
  if (errors.length === 0) console.log('(none)');

  await browser.close();
})();
