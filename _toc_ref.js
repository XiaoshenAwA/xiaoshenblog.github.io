const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('https://xiaoshen-qwq.github.io/2025/08/27/8%E6%9C%8826%E6%97%A5%E8%80%83%E8%AF%95%E6%80%BB%E7%BB%93/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2500);
  async function snap(label) {
    const r = await page.evaluate(() => {
      const out = { scrollY: Math.round(window.scrollY), items: [] };
      document.querySelectorAll('#card-toc .toc-item').forEach((li) => {
        const child = li.querySelector(':scope > .toc-child');
        const cs = child ? getComputedStyle(child) : null;
        out.items.push({
          t: (li.querySelector('.toc-text') || {}).textContent,
          disp: cs ? cs.display : null,
          active: li.classList.contains('active')
        });
      });
      return out;
    });
    console.log(label, JSON.stringify(r));
  }
  const h = await page.evaluate(() => document.querySelector('#article-container').scrollHeight);
  await snap('start');
  for (let y = 300; y <= Math.min(h, 5000); y += 600) {
    await page.evaluate((yy) => { window.scrollTo(0, yy); }, y);
    await page.waitForTimeout(400);
    await snap('y=' + y);
  }
  await browser.close();
})();