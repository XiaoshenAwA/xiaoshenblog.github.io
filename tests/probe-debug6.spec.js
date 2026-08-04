const { test, expect } = require('@playwright/test');

test('probe - supabase auth full error', async ({ page }) => {
  test.setTimeout(45000);

  await page.setExtraHTTPHeaders({
    'Authorization': 'Bearer admin123456'
  });

  const consoleMsgs = [];
  page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));

  // Intercept network requests to Supabase
  const requests = [];
  page.on('request', req => {
    if (req.url().includes('supabase')) {
      requests.push({ url: req.url(), method: req.method() });
    }
  });

  const responses = [];
  page.on('response', res => {
    if (res.url().includes('supabase')) {
      responses.push({ url: res.url(), status: res.status(), statusText: res.statusText() });
    }
  });

  await page.goto('/admin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Try login and intercept the Supabase response
  const loginResult = await page.evaluate(async () => {
    const cfg = window.__CONFIG__;
    if (!cfg) return { error: 'No __CONFIG__' };

    try {
      // Use fetch directly to Supabase auth endpoint to get full error
      const resp = await fetch(`${cfg.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: 'xiaoshenqwq@gmail.com',
          password: 'admin123456'
        })
      });
      const data = await resp.json();
      return {
        status: resp.status,
        statusText: resp.statusText,
        data: data,
        hasAccessToken: !!data.access_token,
        hasUser: !!data.user,
        errorMessage: data.error_description || data.error || data.msg || 'none'
      };
    } catch(e) {
      return { error: e.message, stack: e.stack?.substring(0, 300) };
    }
  });
  console.log('Supabase auth response:', JSON.stringify(loginResult, null, 2));

  // Also try the form-based login and capture the actual full error
  if (await page.locator('#login-email').isVisible().catch(() => false)) {
    await page.fill('#login-email', 'xiaoshenqwq@gmail.com');
    await page.fill('#login-password', 'admin123456');
    await page.click('#login-form button[type="submit"]');
    await page.waitForTimeout(5000);

    const errorText = await page.evaluate(() => document.getElementById('login-error')?.textContent);
    console.log('Form login error text:', JSON.stringify(errorText));
    
    const activeView = await page.evaluate(() => {
      const active = document.querySelector('.admin-view.active');
      return active ? active.id : 'none';
    });
    console.log('Active view:', activeView);
  }

  // Print network info
  console.log('\nSupabase requests:', JSON.stringify(requests, null, 2));
  console.log('\nSupabase responses:', JSON.stringify(responses, null, 2));

  // Print console errors only
  const errors = consoleMsgs.filter(m => m.includes('[error]'));
  console.log('\n--- Console Errors ---');
  errors.forEach(m => console.log(m));
});
