const { test, expect } = require('@playwright/test');

test('probe - supabase auth debug', async ({ page }) => {
  test.setTimeout(45000);

  await page.setExtraHTTPHeaders({
    'Authorization': 'Bearer admin123456'
  });

  // Capture all console messages
  const consoleMsgs = [];
  page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto('/admin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Check __CONFIG__
  const cfg = await page.evaluate(() => {
    const c = window.__CONFIG__ || {};
    return {
      url: c.SUPABASE_URL,
      key: c.SUPABASE_ANON_KEY ? c.SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'MISSING',
      dbTable: c.DB_TABLE,
    };
  });
  console.log('Config:', JSON.stringify(cfg));

  // Try Supabase login directly via evaluate and capture full error
  const result = await page.evaluate(async () => {
    const cfg = window.__CONFIG__;
    if (!cfg) return { error: 'No __CONFIG__' };

    // Import supabase - it's already loaded in the page
    // Try using the existing supabase client from admin.js scope
    // Actually it's module-scoped, so we can't access it directly
    // Let's create a new one
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      const { data, error } = await sb.auth.signInWithPassword({
        email: 'xiaoshenqwq@gmail.com',
        password: 'admin123456'
      });
      return {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error ? { message: error.message, status: error.status, code: error.code } : null
      };
    } catch(e) {
      return { error: e.message, stack: e.stack?.substring(0, 500) };
    }
  });
  console.log('Direct Supabase auth result:', JSON.stringify(result, null, 2));

  // Also try the form-based login and capture the actual error displayed
  if (await page.locator('#login-email').isVisible().catch(() => false)) {
    await page.fill('#login-email', 'xiaoshenqwq@gmail.com');
    await page.fill('#login-password', 'admin123456');
    await page.click('#login-form button[type="submit"]');
    await page.waitForTimeout(5000);

    const errorText = await page.evaluate(() => document.getElementById('login-error')?.textContent);
    console.log('Form login error:', errorText);
  }

  // Print all console messages
  console.log('\n--- Browser Console ---');
  consoleMsgs.forEach(m => console.log(m));
});
