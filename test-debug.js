const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text().substring(0, 300)}`));
  page.on('pageerror', err => logs.push(`[PAGE_ERROR] ${err.message.substring(0, 300)}`));

  await page.goto('http://localhost:3001/editor/typst', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);

  const result = await page.evaluate(async () => {
    const out = {};
    const $typst = window.__$typst;
    out.hasTypst = !!$typst;
    try {
      const compiler = await $typst.getCompiler();
      out.hasCompiler = !!compiler;
      out.hasInternal = !!(compiler && compiler.compiler);
      out.hasCreateIncr = !!(compiler && compiler.compiler && typeof compiler.compiler.create_incr_server === 'function');
      out.methods = compiler ? Object.getOwnPropertyNames(Object.getPrototypeOf(compiler)) : null;
      if (compiler.compiler) {
        out.internalMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(compiler.compiler)).filter(m => m.includes('incr') || m.includes('artifact') || m.includes('compile') || m.includes('snapshot'));
      }
    } catch (e) {
      out.getCompilerError = String(e && e.message || e);
    }
    try {
      const { IncrementalServer } = await import('@myriaddreamin/typst.ts/compiler');
      out.IncrementalServer = typeof IncrementalServer;
    } catch (e) {
      out.importError = String(e && e.message || e);
    }
    try {
      const compiler = await $typst.getCompiler();
      compiler.addSource('/main.typ', '= Hi\n\nHello world.');
      const srv = new (await import('@myriaddreamin/typst.ts/compiler')).IncrementalServer(compiler.compiler.create_incr_server());
      const res = await compiler.compile({
        mainFilePath: '/main.typ',
        incrementalServer: srv,
        format: 1,
        diagnostics: 'none'
      });
      out.resKeys = res ? Object.keys(res) : null;
      out.resultType = res && res.result ? res.result.constructor.name : null;
      out.resultLen = res && res.result ? res.result.length : null;
      out.resString = res ? JSON.stringify(res).substring(0, 200) : null;
    } catch (e) {
      out.compileError = String(e && e.message || e);
      out.compileErrorKeys = e ? Object.keys(e) : null;
      out.compileErrorFull = e ? e.toString() + ' | ' + JSON.stringify(e).substring(0, 300) : null;
    }
    return out;
  });
  console.log(JSON.stringify(result, null, 2));
  console.log('\n=== Console ===');
  logs.forEach(l => console.log(l));
  await browser.close();
})();
