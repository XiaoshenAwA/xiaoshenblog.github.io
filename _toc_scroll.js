const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://localhost:3000/posts/21/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1200);
  async function snap(label) {
    const r = await page.evaluate(() => {
      const out = { scrollY: Math.round(window.scrollY), active: [] };
      document.querySelectorAll('#toc-content .toc-item.active').forEach((li) => {
        const child = li.querySelector(':scope > .toc-child');
        out.active.push({
          text: (li.querySelector('.toc-text') || {}).textContent,
          childDisplay: child ? getComputedStyle(child).display : null
        });
      });
      return out;
    });
    console.log(label, JSON.stringify(r));
  }
  const h = await page.evaluate(() => document.querySelector('.post-content').scrollHeight);
  for (let y = 0; y <= h; y += 400) {
    await page.evaluate((yy) => { window.scrollTo(0, yy); }, y);
    await page.waitForTimeout(200);
    await snap('y=' + y);
  }
  await browser.close();
})();