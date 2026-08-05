const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://localhost:3000/posts/21/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => {
    const out = { headings: [], toc: [] };
    document.querySelectorAll('.post-content h1,.post-content h2,.post-content h3').forEach((h, i) => {
      out.headings.push({ i, tag: h.tagName, text: (h.textContent || '').slice(0, 30) });
    });
    document.querySelectorAll('#toc-content .toc-item').forEach((li) => {
      const child = li.querySelector(':scope > .toc-child');
      const cs = child ? getComputedStyle(child) : null;
      out.toc.push({
        level: li.className,
        text: (li.querySelector('.toc-text') || {}).textContent,
        hasChild: !!child,
        childDisplay: cs ? cs.display : null,
        active: li.classList.contains('active')
      });
    });
    out.tocContentClass = document.getElementById('toc-content').className;
    out.scrollY = window.scrollY;
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
