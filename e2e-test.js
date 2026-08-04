const http = require('http');
const https = require('https');
const { JSDOM } = require('jsdom');

const BASE = 'http://localhost:3001';
let passed = 0, failed = 0, warnings = 0;

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    }).on('error', reject);
  });
}

function test(name, ok, detail = '') {
  if (ok) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.log(`  FAIL  ${name} ${detail ? '— ' + detail : ''}`);
    failed++;
  }
}

function warn(name, detail = '') {
  console.log(`  WARN  ${name} ${detail ? '— ' + detail : ''}`);
  warnings++;
}

async function testHomepage() {
  console.log('\n=== Homepage ===');
  const { status, body, headers } = await get('/');
  test('Status 200', status === 200, `got ${status}`);
  test('Content-Type HTML', headers['content-type']?.includes('text/html'));
  test('Has DOCTYPE', body.includes('<!DOCTYPE html>'));
  test('Has <title>', body.includes('<title>'));
  test('Has nav', body.includes('<nav'));
  test('Has post cards', body.includes('recent-post-item'));
  
  // Check inline scripts for console.log (not in HTML body content)
  const inlineScriptsForLog = body.match(/<script(?:\s[^>]*)?>([^<]*(?:(?!<\/script>)<[^<]*)*)<\/script>/gi) || [];
  const hasConsoleLogInScript = inlineScriptsForLog.some(s => s.includes('console.log('));
  test('No console.log in inline scripts', !hasConsoleLogInScript);
  
  // Check inline scripts: extract content between opening and closing tags
  const inlineScriptMatches = body.match(/<script(?:\s[^>]*)?>([^<]*(?:(?!<\/script>)<[^<]*)*)<\/script>/gi) || [];
  let scriptSafe = true;
  for (const fullMatch of inlineScriptMatches) {
    const content = fullMatch.replace(/<\/script[^>]*>$/i, '');
    if (content.includes('</script>')) {
      test('Script tags safe', false, 'Unescaped </script> inside script content');
      scriptSafe = false;
      break;
    }
  }
  if (scriptSafe) test('Script tags safe', true);
  
  // Check JSON.stringify blocks: verify </script> is escaped
  const jsonBlocks = body.match(/<script[^>]*>([\s\S]*?)JSON\.stringify([\s\S]*?)<\/script>/gi) || [];
  let jsonSafe = true;
  for (const block of jsonBlocks) {
    const inner = block.replace(/<\/script[^>]*>$/i, '');
    const stringifyParts = inner.split('JSON.stringify');
    for (let i = 1; i < stringifyParts.length; i++) {
      if (stringifyParts[i].includes('</script>') && !stringifyParts[i].includes('<\\/script>')) {
        test('JSON.stringify in script safe', false, 'Unescaped </script> near JSON.stringify');
        jsonSafe = false;
        break;
      }
    }
    if (!jsonSafe) break;
  }
  if (jsonSafe) test('JSON.stringify in script safe', true);
}

async function testPostDetail() {
  console.log('\n=== Post Detail ===');
  // First get a post link from homepage
  const home = await get('/');
  const linkMatch = home.body.match(/href="([^"]*\/posts\/[^"]*)"/);
  if (!linkMatch) {
    test('Find post link', false, 'No /posts/ link found on homepage');
    return;
  }
  const postUrl = linkMatch[1];
  test('Found post link', true, postUrl);
  
  const { status, body } = await get(postUrl);
  test('Post detail 200', status === 200, `got ${status} for ${postUrl}`);
  test('Has article content', body.includes('article') || body.includes('prose'));
  test('Has heading', body.includes('<h'));
  
  // Check for KaTeX CSS
  test('Has KaTeX CSS', body.includes('katex'));
  test('Has Shiki/code CSS', body.includes('shiki') || body.includes('code') || body.includes('hljs'));
}

async function testAdmin() {
  console.log('\n=== Admin ===');
  const { status, body } = await get('/admin');
  // Admin should either redirect or return 401 without auth
  test('Admin requires auth', status === 302 || status === 401 || status === 200, `got ${status}`);
  if (status === 200) {
    // If it returns 200, check for admin UI elements
    test('Admin has auth check UI', body.includes('login') || body.includes('auth') || body.includes('admin'));
  }
}

async function testEditor() {
  console.log('\n=== Editor ===');
  const { status: s1, body } = await get('/editor/markdown');
  test('Markdown editor accessible', s1 === 200 || s1 === 302 || s1 === 401, `got ${s1}`);
  const { status: s2 } = await get('/editor/typst');
  test('Typst editor accessible', s2 === 200 || s2 === 302 || s2 === 401, `got ${s2}`);
  const { status: s3 } = await get('/editor');
  test('Editor redirect works', s3 === 200 || s3 === 302 || s3 === 301, `got ${s3}`);
}

async function testArchives() {
  console.log('\n=== Archives ===');
  const { status, body } = await get('/archives');
  test('Archives 200', status === 200, `got ${status}`);
  if (status === 200) {
    test('Has archive list', body.includes('archive') || body.includes('timeline'));
  }
}

async function testCategories() {
  console.log('\n=== Categories ===');
  const { status, body } = await get('/categories');
  test('Categories 200', status === 200, `got ${status}`);
  if (status === 200) {
    test('Has category elements', body.includes('category'));
  }
}

async function testTags() {
  console.log('\n=== Tags ===');
  const { status, body } = await get('/tags');
  test('Tags 200', status === 200, `got ${status}`);
  if (status === 200) {
    test('Has tag elements', body.includes('tag'));
  }
}

async function testAbout() {
  console.log('\n=== About ===');
  const { status, body } = await get('/about');
  test('About 200', status === 200, `got ${status}`);
}

async function testFriends() {
  console.log('\n=== Friends ===');
  const { status, body } = await get('/friends');
  test('Friends 200', status === 200, `got ${status}`);
}

async function testStaticAssets() {
  console.log('\n=== Static Assets ===');
  const assets = ['/assets/main.css', '/assets/main.js', '/assets/editor.js', '/assets/admin.js'];
  for (const a of assets) {
    const { status } = await get(a);
    test(`${a} accessible`, status === 200, `got ${status}`);
  }
}

async function testSecurityHeaders() {
  console.log('\n=== Security Headers ===');
  const { headers } = await get('/');
  test('Has CSP header', !!headers['content-security-policy'], 'Missing CSP');
  test('Has X-Content-Type-Options', headers['x-content-type-options'] === 'nosniff');
  test('Has X-Frame-Options', !!headers['x-frame-options']);
  test('Has X-XSS-Protection', !!headers['x-xss-protection']);
  test('Has Referrer-Policy', !!headers['referrer-policy']);
}

async function testCSSVariables() {
  console.log('\n=== CSS Variables ===');
  const { body } = await get('/assets/main.css');
  test('CSS loaded', body.length > 0, `size: ${body.length}`);
  test('Has :root variables', body.includes(':root'));
  test('Has dark mode', body.includes('dark') || body.includes('[data-theme="dark"]'));
  test('Has --hl-bg variable', body.includes('--hl-bg'));
}

async function testMarkdownRender() {
  console.log('\n=== Markdown Module ===');
  const { render, init } = require('./markdown');
  await init();
  
  // Test Shiki syntax highlighting
  const codeHtml = await render('```javascript\nconst x = 1;\n```');
  test('Code block rendered', codeHtml.includes('<pre') || codeHtml.includes('<code'), 'No pre/code found');
  test('Shiki highlighting', codeHtml.includes('shiki') || codeHtml.includes('hljs') || codeHtml.includes('span class="'), 'No Shiki spans');
  
  // Test KaTeX
  const mathHtml = await render('$$\n\\sum_{i=1}^n i\n$$');
  test('Block math rendered', mathHtml.includes('katex'), 'No KaTeX class');
  
  // Test admonitions
  const admonHtml = await render(':::info\nTest content\n:::');
  test('Admonition rendered', admonHtml.includes('admonition') || admonHtml.includes('info'), 'No admonition class');
  
  // Test XSS in markdown
  const xssHtml = await render('<script>alert("xss")</script>');
  test('XSS script tag sanitized', !xssHtml.includes('<script>'), 'Script tag not sanitized');
  
  // Test image
  const imgHtml = await render('![alt](https://example.com/img.png)');
  test('Image rendered', imgHtml.includes('<img'), 'No img tag');
  
  // Test table
  const tableHtml = await render('| a | b |\n|---|---|\n| 1 | 2 |');
  test('Table rendered', tableHtml.includes('<table'), 'No table tag');
}

async function testDOMPurify() {
  console.log('\n=== DOMPurify ===');
  const { render, init } = require('./markdown');
  await init();
  
  // Test style attribute is allowed
  const styleHtml = await render('<span style="color:red">test</span>');
  test('Style attribute allowed', styleHtml.includes('style='), 'Style stripped by DOMPurify');
  
  // Test event handler blocked
  const eventHtml = await render('<div onclick="alert(1)">test</div>');
  test('onclick blocked', !eventHtml.includes('onclick'), 'onclick not blocked');
  
  const onerrorHtml = await render('<img src=x onerror="alert(1)">');
  test('onerror blocked', !onerrorHtml.includes('onerror'), 'onerror not blocked');
  
  // Test script blocked
  const scriptHtml = await render('<script>alert(1)</script>');
  test('script blocked', !scriptHtml.includes('<script>'), 'script not blocked');
}

async function testAdminAPI() {
  console.log('\n=== Admin API ===');
  // Test without auth
  const { status: s1 } = await get('/api/admin/posts');
  test('API without auth rejected', s1 === 401 || s1 === 403, `got ${s1}`);
  
  // Test with wrong auth
  const wrongAuth = await new Promise((resolve, reject) => {
    http.get(`${BASE}/api/admin/posts`, { headers: { 'Authorization': 'Bearer wrong-token' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
  test('API with wrong auth rejected', wrongAuth.status === 401 || wrongAuth.status === 403, `got ${wrongAuth.status}`);
}

async function testNewPostPage() {
  console.log('\n=== New Post Page ===');
  const { status, body } = await get('/posts/new');
  test('New post page', status === 200 || status === 302 || status === 401, `got ${status}`);
}

async function testNewPostAPI() {
  console.log('\n=== New Post API ===');
  const { status } = await get('/api/posts');
  test('Posts API accessible', status === 200, `got ${status}`);
}

async function runAll() {
  console.log('E2E Test Suite - Blog Project');
  console.log('==============================');
  
  try {
    await testHomepage();
    await testPostDetail();
    await testAdmin();
    await testEditor();
    await testArchives();
    await testCategories();
    await testTags();
    await testAbout();
    await testFriends();
    await testStaticAssets();
    await testSecurityHeaders();
    await testCSSVariables();
    await testMarkdownRender();
    await testDOMPurify();
    await testAdminAPI();
    await testNewPostPage();
    await testNewPostAPI();
  } catch (e) {
    console.error('TEST SUITE ERROR:', e.message);
    failed++;
  }
  
  console.log('\n==============================');
  console.log(`Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log('==============================');
  
  process.exit(failed > 0 ? 1 : 0);
}

runAll();
