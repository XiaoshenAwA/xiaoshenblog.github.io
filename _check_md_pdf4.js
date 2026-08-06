const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  try {
    await page.goto('http://localhost:3002/editor/markdown', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__editorInitialized === true, null, { timeout: 60000 });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const ed = window.__monacoEditor;
      ed.setValue('# 标题\n\n段落文本内容\n\n```js\nconsole.log("hello")\n```\n\n公式 $x^2+y^2=1$');
    });
    await page.waitForTimeout(1200);
    const dl = page.waitForEvent('download', { timeout: 90000 }).catch(() => null);
    await page.evaluate(() => document.getElementById('editor-export-pdf').click());
    const download = await dl;
    if (!download) { console.log('NO DOWNLOAD'); return; }
    const p = path.join(os.tmpdir(), 'export-check.pdf');
    await download.saveAs(p);
    const buf = fs.readFileSync(p);
    console.log('pdf bytes:', buf.length);

    const pdfjsPath = 'file:///' + path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.mjs').replace(/\\/g, '/');
    await page.goto('about:blank');
    await page.evaluate(async pdfjsPath => {
      const pdfjs = await import(pdfjsPath);
      const r = await fetch('file:///' + 'PLACEHOLDER');
    }, pdfjsPath).catch(() => {});
  } catch (e) {
    console.log('ERROR:', e.message.split('\n')[0]);
  }
  await browser.close();
})();