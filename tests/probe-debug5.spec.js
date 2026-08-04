const { test, expect } = require('@playwright/test');

test('probe - CSP fix verification', async ({ page }) => {
  test.setTimeout(45000);

  await page.setExtraHTTPHeaders({
    'Authorization': 'Bearer admin123456'
  });

  const consoleMsgs = [];
  page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto('/admin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Check CSP header
  const response = await page.goto('/admin', { waitUntil: 'networkidle', timeout: 15000 });
  const csp = response?.headers()?.['content-security-policy'] || 'no CSP header';
  console.log('CSP header:', csp);

  // Check if connect-src now includes supabase
  const hasSupabase = csp.includes('eacieurozwzligrxnyos.supabase.co');
  console.log('CSP includes Supabase URL:', hasSupabase);

  // Check login form
  const loginVisible = await page.locator('#login-email').isVisible().catch(() => false);
  console.log('Login form visible:', loginVisible);

  if (loginVisible) {
    await page.fill('#login-email', 'xiaoshenqwq@gmail.com');
    await page.fill('#login-password', 'admin123456');
    await page.click('#login-form button[type="submit"]');
    await page.waitForTimeout(8000);

    const activeView = await page.evaluate(() => {
      const active = document.querySelector('.admin-view.active');
      return active ? active.id : 'none';
    });
    console.log('Active view after login:', activeView);

    const errorText = await page.evaluate(() => document.getElementById('login-error')?.textContent);
    console.log('Login error:', errorText);
  }

  // Print console errors
  const errors = consoleMsgs.filter(m => m.includes('[error]'));
  console.log('\n--- Console Errors ---');
  errors.forEach(m => console.log(m));
});
