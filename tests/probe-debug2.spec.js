const { test, expect } = require('@playwright/test');

test('probe - login debug', async ({ page }) => {
  test.setTimeout(45000);

  await page.setExtraHTTPHeaders({
    'Authorization': 'Bearer admin123456'
  });

  await page.goto('/admin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Check login form visibility
  const loginVisible = await page.locator('#login-email').isVisible().catch(() => false);
  console.log('Login email visible:', loginVisible);

  if (loginVisible) {
    await page.fill('#login-email', 'xiaoshenqwq@gmail.com');
    await page.fill('#login-password', 'admin123456');

    // Click submit
    await page.click('#login-form button[type="submit"]');

    // Wait a bit for response
    await page.waitForTimeout(5000);

    // Check for error message
    const errorText = await page.evaluate(() => {
      const el = document.getElementById('login-error');
      return el ? el.textContent : 'no error element';
    });
    console.log('Login error text:', errorText);

    // Check current active view
    const activeView = await page.evaluate(() => {
      const active = document.querySelector('.admin-view.active');
      return active ? active.id : 'none';
    });
    console.log('Active view after login attempt:', activeView);

    // Check if page reloaded (URL should still be /admin)
    console.log('Current URL:', page.url());

    // Take screenshot
    await page.screenshot({ path: 'tests/probe-login-result.png', fullPage: true });

    // Check if there's a network error or Supabase config issue
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    await page.waitForTimeout(2000);
    console.log('Console messages:', consoleMessages.join('\n'));
  }
});
