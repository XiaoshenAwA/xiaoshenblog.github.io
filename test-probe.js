const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text().substring(0, 500)}`));
  page.on('pageerror', err => logs.push(`[PAGE_ERROR] ${err.message.substring(0, 500)}`));

  await page.goto('http://localhost:3001/editor/typst', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);

  const content = '= Hello\n\nIntro paragraph.\n\n';
  await page.evaluate((c) => {
    const models = window.monaco?.editor?.getModels?.();
    if (models && models.length > 0) models[0].setValue(c);
  }, content);

  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000);
    const s = await page.evaluate(() => ({
      pages: document.querySelectorAll('.canvas-page').length,
      errors: document.querySelectorAll('.typst-error').length,
      errorText: (document.querySelector('.typst-error')?.textContent || '').substring(0, 400),
      status: document.querySelector('.typst-status')?.textContent || '',
      wrap: !!document.querySelector('.typst-page-wrap'),
      html: document.querySelector('#editor-preview')?.innerHTML?.substring(0, 200) || ''
    }));
    console.log(`[${i + 1}s]`, JSON.stringify(s));
    if (s.pages > 0 || s.errors > 0) break;
  }
  console.log('\n=== Console ===');
  logs.forEach(l => console.log(l));
  await browser.close();
})();
