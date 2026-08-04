const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:3001/editor/typst', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    const models = window.monaco?.editor?.getModels?.();
    if (models && models.length) models[0].setValue('= Warmup\n\nHello.');
  });

  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const ready = await page.evaluate(() => !!(window.__$typst && document.querySelectorAll('.canvas-page').length > 0));
    if (ready) break;
  }

  const result = await page.evaluate(async () => {
    const $typst = window.__$typst;
    const out = [];
    let src = '= Hi\n\nHello world.';
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      const d = await $typst.pdf({ mainContent: src });
      out.push({ n: i + 1, ms: Math.round(performance.now() - t0), len: d ? d.length : 0 });
      src += '\n\nParagraph number ' + (i + 1) + ' with math $x_{' + i + '}$ and a link https://typst.app.';
    }
    return out;
  });
  console.log(JSON.stringify(result, null, 1));
  await browser.close();
})();
