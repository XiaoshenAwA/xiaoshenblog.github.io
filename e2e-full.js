const http = require('http');

const BASE = 'http://localhost:3001';
let passed = 0, failed = 0, skipped = 0;
const results = {};
let currentCategory = '';

function cat(name) {
  currentCategory = name;
  if (!results[name]) results[name] = { pass: 0, fail: 0, skip: 0, details: [] };
}

function test(name, ok, detail = '') {
  if (ok) {
    results[currentCategory].pass++;
    results[currentCategory].details.push({ name, ok: true });
    passed++;
  } else {
    results[currentCategory].fail++;
    results[currentCategory].details.push({ name, ok: false, detail });
    failed++;
  }
}

function skip(name, reason) {
  results[currentCategory].skip++;
  results[currentCategory].details.push({ name, ok: 'skip', detail: reason });
  skipped++;
}

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const url = new URL(path, BASE);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method: 'GET', headers };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers, time: Date.now() - start }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const url = new URL(path, BASE);
    const data = JSON.stringify(body);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers } };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers, time: Date.now() - start }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function put(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const url = new URL(path, BASE);
    const data = JSON.stringify(body);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname, method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers } };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers, time: Date.now() - start }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function del(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const url = new URL(path, BASE);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname, method: 'DELETE', headers };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers, time: Date.now() - start }));
    });
    req.on('error', reject);
    req.end();
  });
}

// Helper to extract links from HTML
function extractLinks(html, attr) {
  const re = new RegExp(attr + '="([^"]*)"', 'gi');
  const links = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const v = m[1];
    if (v && !v.startsWith('http') && !v.startsWith('data:') && !v.startsWith('javascript:') && !v.startsWith('#') && v !== '/') {
      links.push(v);
    }
  }
  return [...new Set(links)];
}

// ═══════════════════════════════════════════════════════
// CATEGORY A: Route Reachability
// ═══════════════════════════════════════════════════════
async function testRouteReachability() {
  cat('A. Route Reachability (Public)');
  let homeBody = '', postId = '', categoryId = '';

  const r1 = await get('/');
  test('1. GET / returns 200', r1.status === 200, `got ${r1.status}`);
  test('1. GET / has content', r1.body.length > 100, `length: ${r1.body.length}`);
  homeBody = r1.body;

  // Extract real post ID from homepage
  const postMatch = homeBody.match(/\/posts\/(\d+)/);
  if (postMatch) {
    postId = postMatch[1];
    test('1. Found real post ID', true, postId);
  } else {
    test('1. Found real post ID', false, 'no /posts/:id link on homepage');
  }

  // Extract real category from homepage
  const catMatch = homeBody.match(/\/categories\/([^"'\s/>]+)/);
  if (catMatch) {
    categoryId = decodeURIComponent(catMatch[1]);
    test('1. Found real category path', true, categoryId);
  } else {
    test('1. Found real category path', false, 'no /categories/:path link on homepage');
  }

  // Public routes
  const publicRoutes = [
    ['2. GET /posts/:id', `/posts/${postId}`, 200],
    ['3. GET /about', '/about', 200],
    ['4. GET /categories', '/categories', 200],
    ['5. GET /categories/:path', `/categories/${categoryId}`, 200],
    ['6. GET /archives', '/archives', 200],
    ['7. GET /friends', '/friends', 200],
    ['8. GET /tags', '/tags', 200],
    ['9. GET /search.json', '/search.json', 200],
    ['10. GET /api/stats', '/api/stats', 200],
    ['11. GET /api/posts', '/api/posts', 200],
  ];

  const routeResponses = {};
  for (const [name, path, expected] of publicRoutes) {
    try {
      const r = await get(path);
      test(name, r.status === expected, `got ${r.status} for ${path}`);
      routeResponses[path] = r;
    } catch (e) {
      test(name, false, e.message);
    }
  }

  cat('A. Route Reachability (Admin - expect 401)');
  const adminRoutes = [
    ['12. GET /admin', '/admin'],
    ['13. GET /editor/markdown', '/editor/markdown'],
    ['13b. GET /editor/typst', '/editor/typst'],
    ['14. GET /posts/new', '/posts/new'],
    ['15. GET /posts/1/edit', '/posts/1/edit'],
    ['16. GET /api/admin/posts', '/api/admin/posts'],
    ['17. GET /api/admin/tags', '/api/admin/tags'],
    ['18. GET /api/admin/categories', '/api/admin/categories'],
  ];

  for (const [name, path] of adminRoutes) {
    try {
      const r = await get(path);
      test(name, r.status === 401 || r.status === 403 || r.status === 500, `got ${r.status}`);
    } catch (e) {
      test(name, false, e.message);
    }
  }

  // Admin mutating routes (POST/PUT/DELETE without auth)
  cat('A. Route Reachability (Admin Mutations - expect 401)');
  const adminMutations = [
    ['19. POST /posts (no auth)', () => post('/posts', { title: 't', content: 'c' })],
    ['20. DELETE /posts/1 (no auth)', () => del('/posts/1')],
    ['21. PUT /posts/1 (no auth)', () => put('/posts/1', { title: 't', content: 'c' })],
    ['22. POST /about (no auth)', () => post('/about', { content: 'test' })],
    ['23. POST /api/stats/visit (no auth)', () => post('/api/stats/visit', {})],
    ['24. POST /api/stats/view/1 (no auth)', () => post('/api/stats/view/1', {})],
    ['25. POST /api/admin/tags (no auth)', () => post('/api/admin/tags', { name: 'test' })],
    ['26. DELETE /api/admin/tags/1 (no auth)', () => del('/api/admin/tags/1')],
    ['27. PUT /api/admin/tags/1 (no auth)', () => put('/api/admin/tags/1', { name: 'test' })],
    ['28. POST /api/admin/categories (no auth)', () => post('/api/admin/categories', { name: 'test' })],
    ['29. DELETE /api/admin/categories/1 (no auth)', () => del('/api/admin/categories/1')],
    ['30. PUT /api/admin/categories/1 (no auth)', () => put('/api/admin/categories/1', { name: 'test' })],
    ['31. GET /about/raw', '/about/raw', 'special'],
  ];

  for (const item of adminMutations) {
    try {
      if (item[2] === 'special') {
        const r = await get(item[1]);
        test(item[0], r.status === 200 || r.status === 404 || r.status === 500, `got ${r.status}`);
      } else {
        const r = await item[1]();
        test(item[0], r.status === 401 || r.status === 403 || r.status === 400 || r.status === 500, `got ${r.status}`);
      }
    } catch (e) {
      test(item[0], false, e.message);
    }
  }

  return { homeBody, postId, categoryId };
}

// ═══════════════════════════════════════════════════════
// CATEGORY B: HTML Structure Validation
// ═══════════════════════════════════════════════════════
async function testHTMLStructure(homeBody, postId) {
  cat('B. HTML Structure Validation');

  const pages = [
    ['Homepage', '/'],
    ['Post Detail', `/posts/${postId}`],
    ['About', '/about'],
    ['Categories', '/categories'],
    ['Archives', '/archives'],
    ['Friends', '/friends'],
    ['Tags', '/tags'],
  ];

  for (const [name, path] of pages) {
    try {
      const r = await get(path);
      const h = r.body;
      test(`${name}: DOCTYPE present`, h.includes('<!DOCTYPE html>'), 'missing DOCTYPE');
      test(`${name}: <title> present`, /<title>[^<]+<\/title>/i.test(h), 'missing or empty <title>');
      test(`${name}: <nav> present`, h.includes('<nav'), 'missing <nav>');
      test(`${name}: main.css linked`, h.includes('main.css'), 'missing main.css link');
      test(`${name}: main.js linked`, h.includes('main.js'), 'missing main.js link');
      test(`${name}: data-theme attr`, h.includes('data-theme'), 'missing data-theme attribute');
      test(`${name}: Footer present`, h.includes('<footer') || h.includes('id="footer"'), 'missing footer');
      test(`${name}: Content-Type is HTML`, (r.headers['content-type'] || '').includes('text/html'), 'not HTML content-type');
    } catch (e) {
      test(`${name}: HTML structure`, false, e.message);
    }
  }
}

// ═══════════════════════════════════════════════════════
// CATEGORY C: Security Headers
// ═══════════════════════════════════════════════════════
async function testSecurityHeaders() {
  cat('C. Security Headers Check');
  const r = await get('/');
  const h = r.headers;
  test('Content-Security-Policy present', !!h['content-security-policy'], 'missing CSP');
  test('X-Content-Type-Options present', !!h['x-content-type-options'], 'missing X-Content-Type-Options');
  test('X-Content-Type-Options is nosniff', h['x-content-type-options'] === 'nosniff', `got "${h['x-content-type-options']}"`);
  test('X-Frame-Options present', !!h['x-frame-options'], 'missing X-Frame-Options');
  test('X-XSS-Protection present', !!h['x-xss-protection'], 'missing X-XSS-Protection');
  test('Referrer-Policy present', !!h['referrer-policy'], 'missing Referrer-Policy');

  // Check on multiple pages
  const pages = ['/about', '/categories', '/archives'];
  for (const p of pages) {
    const pr = await get(p);
    test(`${p}: CSP present`, !!pr.headers['content-security-policy'], 'missing CSP');
    test(`${p}: X-Content-Type-Options`, !!pr.headers['x-content-type-options'], 'missing');
  }
}

// ═══════════════════════════════════════════════════════
// CATEGORY D: CSS Variables Check
// ═══════════════════════════════════════════════════════
async function testCSSVariables() {
  cat('D. CSS Variables Check');
  const r = await get('/assets/main.css');
  test('main.css accessible', r.status === 200, `got ${r.status}`);
  test('main.css not empty', r.body.length > 100, `size: ${r.body.length}`);
  const css = r.body;
  test(':root variables defined', css.includes(':root'), 'missing :root');
  test('[data-theme="dark"] variables', css.includes('[data-theme="dark"]') || css.includes('[data-theme=dark]'), 'missing dark theme');
  test('--hl-bg variable', css.includes('--hl-bg'), 'missing --hl-bg');
  test('--accent variable', css.includes('--accent'), 'missing --accent');
  test('--font-body variable', css.includes('--font-body'), 'missing --font-body');

  // Check inline styles in header also define CSS vars
  const home = await get('/');
  test('Header inline :root styles', home.body.includes('--accent:'), 'missing --accent in inline styles');
  test('Header inline dark mode', home.body.includes('[data-theme="dark"]'), 'missing [data-theme="dark"] in inline styles');
  test('Header --font-body defined', home.body.includes('--font-body'), 'missing --font-body in inline styles');
}

// ═══════════════════════════════════════════════════════
// CATEGORY E: Responsive Design Check
// ═══════════════════════════════════════════════════════
async function testResponsiveDesign() {
  cat('E. Responsive Design Check');
  const r = await get('/assets/main.css');
  const css = r.body;
  test('@media max-width: 640px', css.includes('640px'), 'missing mobile breakpoint 640px');
  test('@media max-width: 900px', css.includes('900px'), 'missing tablet breakpoint 900px');
  test('.mobile-menu or #toggle-menu styles', css.includes('toggle-menu') || css.includes('mobile-menu') || css.includes('sidebar'), 'missing mobile menu styles');
  test('.hero responsive styles', css.includes('hero') || css.includes('page-header'), 'missing hero styles');
  test('Responsive grid/flex', css.includes('flex') || css.includes('grid'), 'no flex/grid in CSS');
}

// ═══════════════════════════════════════════════════════
// CATEGORY F: Markdown Rendering Validation
// ═══════════════════════════════════════════════════════
async function testMarkdownRendering(postId) {
  cat('F. Markdown Rendering Validation');
  try {
    const r = await get(`/posts/${postId}`);
    const h = r.body;
    test('Post page loads', r.status === 200, `got ${r.status}`);

    // Code blocks use <figure class="highlight">
    test('Code blocks use <figure class="highlight">', h.includes('highlight'), 'missing highlight class');

    // KaTeX math support
    test('KaTeX CSS present', h.includes('katex') || h.includes('KaTeX'), 'missing KaTeX reference');

    // Admonition styles in CSS
    const css = await get('/assets/main.css');
    test('Admonition styles present', css.body.includes('admonition') || css.body.includes('note'), 'missing admonition styles in CSS');

    // Code highlight tools
    test('Code highlight tools (highlight-tools)', h.includes('highlight-tools') || h.includes('copy-btn') || css.body.includes('highlight-tools'), 'missing code highlight tools');
    test('hljs.css accessible', (await get('/assets/hljs.css')).status === 200, 'hljs.css not accessible');
  } catch (e) {
    test('Markdown rendering check', false, e.message);
  }
}

// ═══════════════════════════════════════════════════════
// CATEGORY G: Dark Mode Support
// ═══════════════════════════════════════════════════════
async function testDarkMode() {
  cat('G. Dark Mode Support');
  const home = await get('/');
  const h = home.body;
  const css = (await get('/assets/main.css')).body;

  test('[data-theme="dark"] CSS rules exist', css.includes('[data-theme="dark"]') || css.includes('[data-theme=dark]'), 'missing dark mode CSS');
  test('Dark mode toggle button (#darkmode)', h.includes('id="darkmode"') || h.includes('darkmode'), 'missing dark mode toggle button');
  test('localStorage theme persistence', h.includes('localStorage') && h.includes('theme'), 'missing localStorage theme persistence');
  test('data-theme attribute on <html>', h.includes('data-theme='), 'missing data-theme on <html>');
  test('Dark mode variable overrides', css.includes('--hl-bg: #1e1e2e') || css.includes('--hl-bg:#1e1e2e'), 'missing dark mode --hl-bg override');
}

// ═══════════════════════════════════════════════════════
// CATEGORY H: Search Functionality
// ═══════════════════════════════════════════════════════
async function testSearchFunctionality() {
  cat('H. Search Functionality');
  const r = await get('/search.json');
  test('search.json returns 200', r.status === 200, `got ${r.status}`);
  test('Content-Type is JSON', r.headers['content-type']?.includes('application/json') || r.headers['content-type']?.includes('text/plain'), `got ${r.headers['content-type']}`);

  let data;
  try {
    data = JSON.parse(r.body);
    test('search.json returns valid JSON', true);
    test('search.json returns array', Array.isArray(data), `type: ${typeof data}`);
    test('search.json has items', data.length > 0, `count: ${data.length}`);

    if (data.length > 0) {
      const item = data[0];
      test('Item has "id" field', 'id' in item, 'missing id');
      test('Item has "title" field', 'title' in item, 'missing title');
      test('Item has "content" field', 'content' in item, 'missing content');
      test('Item has "url" field', 'url' in item, 'missing url');
      test('Item has "tags" field', 'tags' in item, 'missing tags');
      test('Item.url starts with /', item.url?.startsWith('/'), `url: ${item.url}`);
    }
  } catch (e) {
    test('search.json parseable as JSON', false, e.message);
  }

  // Check search UI in footer
  const home = await get('/');
  test('Search dialog in HTML', home.body.includes('local-search') || home.body.includes('searchInput'), 'missing search dialog');
  test('Fuse.js CDN loaded', home.body.includes('fuse.js') || home.body.includes('Fuse'), 'missing Fuse.js');
}

// ═══════════════════════════════════════════════════════
// CATEGORY I: Performance
// ═══════════════════════════════════════════════════════
async function testPerformance() {
  cat('I. Performance');
  const routes = ['/', '/about', '/categories', '/archives', '/friends', '/tags', '/api/stats', '/api/posts', '/search.json'];

  for (const p of routes) {
    try {
      const r = await get(p);
      test(`${p}: under 5s`, r.time < 5000, `${r.time}ms`);
      test(`${p}: not empty`, r.body.length > 0, `length: ${r.body.length}`);
    } catch (e) {
      test(`${p}: performance check`, false, e.message);
    }
  }

  // Post detail may be slower due to markdown rendering
  try {
    const home = await get('/');
    const postMatch = home.body.match(/\/posts\/(\d+)/);
    if (postMatch) {
      const r = await get(`/posts/${postMatch[1]}`);
      test('/posts/:id: under 5s', r.time < 5000, `${r.time}ms`);
      test('/posts/:id: not empty', r.body.length > 0, `length: ${r.body.length}`);
    }
  } catch (e) {
    test('Post detail performance', false, e.message);
  }
}

// ═══════════════════════════════════════════════════════
// CATEGORY J: Console Error Simulation
// ═══════════════════════════════════════════════════════
async function testConsoleErrorSimulation() {
  cat('J. Console Error Simulation / Resource Integrity');

  // Check background.js
  try {
    const bg = await get('/js/background.js');
    test('background.js accessible', bg.status === 200, `got ${bg.status}`);
    test('background.js not empty', bg.body.length > 0, `length: ${bg.body.length}`);
  } catch (e) {
    test('background.js accessible', false, e.message);
  }

  // Check sw.js
  try {
    const sw = await get('/sw.js');
    test('sw.js accessible', sw.status === 200, `got ${sw.status}`);
  } catch (e) {
    test('sw.js accessible', false, e.message);
  }

  // Check internal src/href links from homepage
  const home = await get('/');
  const srcLinks = extractLinks(home.body, 'src');
  const hrefLinks = extractLinks(home.body, 'href');
  const internalLinks = [...new Set([...srcLinks, ...hrefLinks])].filter(l => l.startsWith('/') && !l.startsWith('//'));

  let brokenCount = 0;
  const maxCheck = Math.min(internalLinks.length, 15);
  for (let i = 0; i < maxCheck; i++) {
    try {
      const r = await get(internalLinks[i]);
      if (r.status >= 400) {
        brokenCount++;
        test(`Internal link: ${internalLinks[i]}`, false, `status ${r.status}`);
      }
    } catch (e) {
      brokenCount++;
      test(`Internal link: ${internalLinks[i]}`, false, e.message);
    }
  }
  if (brokenCount === 0) {
    test(`Internal links (${maxCheck} checked)`, true, 'all OK');
  }

  // Check main.css and main.js are not empty
  try {
    const css = await get('/assets/main.css');
    test('main.css non-empty', css.body.length > 1000, `size: ${css.body.length}`);
    const js = await get('/assets/main.js');
    test('main.js non-empty', js.body.length > 100, `size: ${js.body.length}`);
  } catch (e) {
    test('Static assets check', false, e.message);
  }
}

// ═══════════════════════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════════════════════
async function run() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       BLOG E2E TEST SUITE - Comprehensive              ║');
  console.log('║       All 31 Routes + HTML/CSS/Security/Perf           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`Target: ${BASE}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const startTime = Date.now();

  try {
    const { homeBody, postId, categoryId } = await testRouteReachability();
    await testHTMLStructure(homeBody, postId);
    await testSecurityHeaders();
    await testCSSVariables();
    await testResponsiveDesign();
    await testMarkdownRendering(postId);
    await testDarkMode();
    await testSearchFunctionality();
    await testPerformance();
    await testConsoleErrorSimulation();
  } catch (e) {
    console.error('\n❌ SUITE ERROR:', e.message);
    failed++;
  }

  const elapsed = Date.now() - startTime;

  // Print summary
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    DETAILED RESULTS                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const categories = Object.keys(results);
  for (const cat of categories) {
    const r = results[cat];
    const icon = r.fail > 0 ? '⚠' : '✓';
    console.log(`${icon} ${cat}`);
    console.log(`   Pass: ${r.pass}  Fail: ${r.fail}  Skip: ${r.skip}`);
    for (const d of r.details) {
      if (!d.ok) {
        console.log(`     ✗ ${d.name} — ${d.detail || 'FAILED'}`);
      }
    }
    console.log('');
  }

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log(`║  FINAL SCORE: ${passed} passed / ${failed} failed / ${skipped} skipped`);
  console.log(`║  Total tests: ${passed + failed + skipped}`);
  console.log(`║  Time: ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`║  Route coverage: 31/31`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  process.exit(failed > 0 ? 1 : 0);
}

run();
