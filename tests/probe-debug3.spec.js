const { test, expect } = require('@playwright/test');

test('probe - check supabase config', async ({ page }) => {
  test.setTimeout(30000);

  await page.setExtraHTTPHeaders({
    'Authorization': 'Bearer admin123456'
  });

  await page.goto('/admin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Check Supabase config
  const config = await page.evaluate(() => {
    const cfg = window.__CONFIG__ || {};
    return {
      SUPABASE_URL: cfg.SUPABASE_URL,
      SUPABASE_ANON_KEY: cfg.SUPABASE_ANON_KEY ? cfg.SUPABASE_ANON_KEY.substring(0, 30) + '...' : 'undefined',
      hasSupabase: typeof window.__CONFIG__ !== 'undefined'
    };
  });
  console.log('Supabase config:', JSON.stringify(config, null, 2));

  // Check if supabase client exists
  const supabaseCheck = await page.evaluate(() => {
    // Try to access supabase client
    try {
      return {
        hasSupabase: typeof window.supabase !== 'undefined',
        // Check localStorage for supabase tokens
        localStorageKeys: Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('auth')),
      };
    } catch(e) {
      return { error: e.message };
    }
  });
  console.log('Supabase client check:', JSON.stringify(supabaseCheck));

  // Try to manually call supabase auth and capture the error
  const loginResult = await page.evaluate(async () => {
    try {
      const cfg = window.__CONFIG__;
      const { createClient } = await import(window.__SUPABASE_MODULE__ || '@supabase/supabase-js');
      // Actually, the supabase client is already created in admin.js
      // Let's try to use it directly by checking the error
      return {
        configUrl: cfg?.SUPABASE_URL,
        configKey: cfg?.SUPABASE_ANON_KEY?.substring(0, 20),
      };
    } catch(e) {
      return { error: e.message };
    }
  });
  console.log('Login result:', JSON.stringify(loginResult));

  // Check the actual page HTML for any error
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
  console.log('Body text:', bodyText);
});
