const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('http://localhost:3001/editor/typst', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);

  const longDoc = Array.from({ length: 10 }, (_, i) =>
    '= Section ' + i + '\n\nLong paragraph with math $a^2 + b^2 = c^2$ and a link https://typst.app.\n\n').join('');

  async function setAndWait(content) {
    return await page.evaluate(async (c) => {
      const models = window.monaco?.editor?.getModels?.();
      if (!models || !models.length) return -1;
      const t0 = performance.now();
      models[0].setValue(c);
      const deadline = Date.now() + 30000;
      let last = 0;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 100));
        const wrap = document.querySelector('.typst-page-wrap');
        const pages = document.querySelectorAll('.canvas-page').length;
        if (!wrap) { last = 0; continue; }
        const rendered = wrap.scrollHeight > 0 && pages > 0;
        if (rendered && pages === last) break; // stable for 2 polls
        last = pages;
      }
      return { ms: performance.now() - t0, pages: last };
    }, content);
  }

  const r1 = await setAndWait(longDoc);
  console.log('first compile+render:', JSON.stringify(r1));

  const r2 = await setAndWait(longDoc.replace('Section 0', 'Section zero'));
  console.log('edit 1 (incremental):', JSON.stringify(r2));

  const r3 = await setAndWait(longDoc.replace('Section zero', 'Section 0') + '\n\nExtra tail paragraph.');
  console.log('edit 2 (incremental):', JSON.stringify(r3));

  // --- scroll preservation ---
  const scrollTest = await page.evaluate(async () => {
    const wrap = document.querySelector('.typst-page-wrap');
    wrap.scrollTop = wrap.scrollHeight * 0.5;
    const before = wrap.scrollTop / (wrap.scrollHeight - wrap.clientHeight);
    const models = window.monaco?.editor?.getModels?.();
    models[0].setValue(models[0].getValue() + '\n\nMore content to grow the doc.');
    const deadline = Date.now() + 30000;
    let pages = 0;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 100));
      const wrap2 = document.querySelector('.typst-page-wrap');
      const p = document.querySelectorAll('.canvas-page').length;
      if (wrap2 && p > 0 && p === pages) break;
      pages = p;
    }
    const wrap2 = document.querySelector('.typst-page-wrap');
    return {
      ratioBefore: before,
      ratioAfter: wrap2.scrollHeight > wrap2.clientHeight ? wrap2.scrollTop / (wrap2.scrollHeight - wrap2.clientHeight) : 0,
      scrollTopAfter: wrap2.scrollTop
    };
  });
  console.log('scroll preservation:', JSON.stringify(scrollTest));

  // --- scroll sync: preview -> editor ---
  const syncTest = await page.evaluate(async () => {
    const wrap = document.querySelector('.typst-page-wrap');
    const editor = window.monaco.editor;
    const models = editor.getModels();
    const ed = editor.getEditors()[0];
    const editorMax = ed.getScrollHeight() - ed.getLayoutInfo().height;
    wrap.scrollTop = (wrap.scrollHeight - wrap.clientHeight) * 0.9;
    await new Promise(r => setTimeout(r, 300));
    const editorTop = ed.getScrollTop();
    const editorRatio = editorMax > 0 ? editorTop / editorMax : 0;
    // editor -> preview
    ed.setScrollPosition({ scrollTop: editorMax * 0.2 });
    await new Promise(r => setTimeout(r, 300));
    const wrapTop = wrap.scrollTop;
    const wrapRatio = (wrap.scrollHeight - wrap.clientHeight) > 0 ? wrapTop / (wrap.scrollHeight - wrap.clientHeight) : 0;
    return { editorRatio, wrapRatio, editorMax, wrapMax: wrap.scrollHeight - wrap.clientHeight };
  });
  console.log('scroll sync:', JSON.stringify(syncTest));

  console.log('page errors:', errors.length ? errors : 'none');
  await browser.close();
})();
