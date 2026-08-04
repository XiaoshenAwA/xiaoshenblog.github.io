const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text().substring(0, 400)}`));
  page.on('pageerror', err => logs.push(`[PAGE_ERROR] ${err.message.substring(0, 400)}`));

  await page.goto('http://localhost:3001/editor/typst', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);

  const result = await page.evaluate(async () => {
    const out = {};
    const $typst = window.__$typst;
    const src = '= Hi\n\nHello world.';

    // 1. baseline: snippet pdf
    try {
      const t0 = performance.now();
      const d1 = await $typst.pdf({ mainContent: src });
      out.baseline = { ms: Math.round(performance.now() - t0), len: d1 && d1.length, magic: d1 ? Array.from(d1.slice(0, 4)) : null };
    } catch (e) { out.baselineErr = String(e && e.message || e); }

    // 2. incremental via getCompiler
    try {
      const compiler = await $typst.getCompiler();
      const t0 = performance.now();
      compiler.addSource('/main.typ', src);
      const rawSrv = compiler.compiler.create_incr_server();
      const res = await compiler.compile({
        mainFilePath: '/main.typ',
        incrementalServer: rawSrv,
        format: 1,
        diagnostics: 'none'
      });
      out.incr = {
        ms: Math.round(performance.now() - t0),
        resKeys: res ? Object.keys(res) : null,
        len: res && res.result ? res.result.length : null,
        magic: res && res.result ? Array.from(res.result.slice(0, 4)) : null,
        diag: res && res.diagnostics ? JSON.stringify(res.diagnostics).substring(0, 300) : null
      };
      // validate with pdfjs
      try {
        const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(res.result) }).promise;
        out.incr.pdfValid = true;
        out.incr.numPages = pdf.numPages;
      } catch (pe) { out.incr.pdfValid = false; out.incr.pdfErr = String(pe && pe.message || pe); }
      // 3. second incremental compile (server reuse)
      const t1 = performance.now();
      compiler.addSource('/main.typ', src + '\n\nMore text.');
      const res2 = await compiler.compile({
        mainFilePath: '/main.typ',
        incrementalServer: rawSrv,
        format: 1,
        diagnostics: 'none'
      });
      out.incr2 = { ms: Math.round(performance.now() - t1), len: res2 && res2.result ? res2.result.length : null, magic: res2 && res2.result ? Array.from(res2.result.slice(0, 4)) : null };
      try {
        const pdf2 = await window.pdfjsLib.getDocument({ data: new Uint8Array(res2.result) }).promise;
        out.incr2.pdfValid = true;
        out.incr2.numPages = pdf2.numPages;
      } catch (pe) { out.incr2.pdfValid = false; out.incr2.pdfErr = String(pe && pe.message || pe); }
    } catch (e) {
      out.incrErr = String(e && e.message || e);
      out.incrErrFull = e ? e.toString() + ' | ' + JSON.stringify(e).substring(0, 400) : null;
    }
    return out;
  });
  console.log(JSON.stringify(result, null, 2));
  console.log('\n=== Console ===');
  logs.filter(l => !l.includes('Duplicate') && !l.includes('deprecated') && !l.includes('Indexing')).forEach(l => console.log(l));
  await browser.close();
})();
