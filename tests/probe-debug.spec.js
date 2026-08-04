const { test, expect } = require('@playwright/test');

test('probe debug - check current admin state', async ({ page }) => {
  test.setTimeout(30000);

  await page.goto('/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'tests/probe-debug.png', fullPage: true });

  // Dump which view is active
  const activeViews = await page.evaluate(() => {
    const views = document.querySelectorAll('.admin-view');
    return Array.from(views).map(v => ({
      id: v.id,
      hasActive: v.classList.contains('active'),
      display: window.getComputedStyle(v).display,
      visible: v.offsetHeight > 0
    }));
  });
  console.log('Views state:', JSON.stringify(activeViews, null, 2));

  // Check if login form exists at all
  const loginFormExists = await page.evaluate(() => !!document.getElementById('login-form'));
  console.log('login-form exists:', loginFormExists);

  // Check if new-post-btn exists
  const newPostBtnExists = await page.evaluate(() => !!document.getElementById('new-post-btn'));
  console.log('new-post-btn exists:', newPostBtnExists);

  // Check localStorage/sessionStorage
  const storage = await page.evaluate(() => ({
    admin: sessionStorage.getItem('admin'),
    localStorage: Object.keys(localStorage).slice(0, 10)
  }));
  console.log('Storage:', JSON.stringify(storage));

  // Check for Supabase auth
  const authState = await page.evaluate(async () => {
    // Check if supabase client exists
    return {
      html: document.documentElement.outerHTML.substring(0, 500),
      bodyClasses: document.body.className,
      activeElement: document.activeElement?.id || 'none'
    };
  });
  console.log('Auth state:', JSON.stringify(authState));
});
