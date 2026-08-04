const { test, expect } = require('@playwright/test');

test('DOM inspection', async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'Authorization': 'Bearer admin123456' });
  await page.goto('/admin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.fill('#login-email', 'xiaoshenqwq@gmail.com');
  await page.fill('#login-password', 'admin123456');
  await page.click('#login-form button[type="submit"]');
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-edit').classList.add('active');
    document.getElementById('logout-btn').style.display = 'inline-block';
    document.getElementById('change-pw-btn').style.display = 'inline-block';
    document.getElementById('user-email').textContent = 'xiaoshenqwq@gmail.com';
  });

  // Inspect toolbar buttons
  const toolbarHTML = await page.evaluate(() => {
    const toolbar = document.querySelector('.editor-toolbar');
    return toolbar ? toolbar.innerHTML.substring(0, 5000) : 'NO TOOLBAR';
  });
  console.log('=== TOOLBAR ===');
  console.log(toolbarHTML);

  // Inspect all buttons with data-action or data-md
  const buttons = await page.evaluate(() => {
    const btns = document.querySelectorAll('.editor-toolbar button, .editor-toolbar [data-action], .editor-toolbar [data-md]');
    return Array.from(btns).map(b => ({
      tag: b.tagName,
      dataMd: b.getAttribute('data-md'),
      dataAction: b.getAttribute('data-action'),
      classes: b.className,
      id: b.id,
      text: b.textContent.trim().substring(0, 50),
      outerHTML: b.outerHTML.substring(0, 300)
    }));
  });
  console.log('=== BUTTONS ===');
  console.log(JSON.stringify(buttons, null, 2));

  // Click link button and look for what appears
  const linkBtn = page.locator('.editor-toolbar [data-action="link"]').first();
  if (await linkBtn.isVisible()) {
    await linkBtn.click();
    await page.waitForTimeout(1000);
  }

  // Search for any new visible overlays, modals, dialogs
  const overlays = await page.evaluate(() => {
    const results = [];
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.display !== 'none' && rect.width > 100 && rect.height > 100) {
        const cls = el.className;
        const id = el.id;
        if (cls.toString().match(/dialog|modal|overlay|popup|picker|prompt/i) ||
            id.match(/dialog|modal|overlay|popup|picker|prompt/i)) {
          results.push({ id, cls: cls.toString().substring(0, 100), tag: el.tagName, display: style.display, visible: style.visibility });
        }
      }
    }
    return results;
  });
  console.log('=== OVERLAYS after link click ===');
  console.log(JSON.stringify(overlays, null, 2));

  // Look for prompt() dialogs - check if JS uses window.prompt or window.confirm
  const usesPrompt = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    let allText = '';
    scripts.forEach(s => { allText += s.textContent; });
    return {
      hasPrompt: allText.includes('window.prompt') || allText.includes('prompt('),
      hasConfirm: allText.includes('window.confirm') || allText.includes('confirm('),
      hasAlert: allText.includes('window.alert') || allText.includes('alert('),
    };
  });
  console.log('=== PROMPT/CONFIRM/ALERT usage ===');
  console.log(JSON.stringify(usesPrompt, null, 2));

  // Inspect the view-edit area
  const viewEditHTML = await page.evaluate(() => {
    const ve = document.getElementById('view-edit');
    return ve ? ve.innerHTML.substring(0, 3000) : 'NO view-edit';
  });
  console.log('=== VIEW-EDIT HTML ===');
  console.log(viewEditHTML);
});
