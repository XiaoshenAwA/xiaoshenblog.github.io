const { test } = require('@playwright/test');

test('DOM inspection part 2', async ({ page }) => {
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

  // Click image button
  const imgBtn = page.locator('.editor-toolbar [data-action="image"]').first();
  if (await imgBtn.isVisible()) {
    await imgBtn.click();
    await page.waitForTimeout(1000);
  }
  const imgOverlays = await page.evaluate(() => {
    const results = [];
    const els = document.querySelectorAll('.picker-modal, .picker-overlay, .picker-dialog, [id*="modal"], [id*="dialog"]');
    for (const el of els) {
      const style = window.getComputedStyle(el);
      if (style.display !== 'none') {
        results.push({ id: el.id, cls: el.className, tag: el.tagName, innerHTML: el.innerHTML.substring(0, 500) });
      }
    }
    return results;
  });
  console.log('=== IMAGE MODAL ===');
  console.log(JSON.stringify(imgOverlays, null, 2));

  // Close and click code button
  await page.evaluate(() => {
    document.querySelectorAll('.picker-modal').forEach(m => m.style.display = 'none');
  });
  await page.waitForTimeout(300);
  
  const codeBtn = page.locator('.editor-toolbar [data-action="code"]').first();
  if (await codeBtn.isVisible()) {
    await codeBtn.click();
    await page.waitForTimeout(1000);
  }
  const codeOverlays = await page.evaluate(() => {
    const results = [];
    const els = document.querySelectorAll('.picker-modal, [id*="modal"], [id*="dialog"]');
    for (const el of els) {
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.display !== '') {
        results.push({ id: el.id, cls: el.className, innerHTML: el.innerHTML.substring(0, 500) });
      }
    }
    return results;
  });
  console.log('=== CODE MODAL ===');
  console.log(JSON.stringify(codeOverlays, null, 2));

  // Inspect all modals in the page
  const allModals = await page.evaluate(() => {
    const modals = document.querySelectorAll('[id*="modal"], .picker-modal');
    return Array.from(modals).map(m => ({
      id: m.id,
      cls: m.className,
      display: window.getComputedStyle(m).display,
    }));
  });
  console.log('=== ALL MODALS ===');
  console.log(JSON.stringify(allModals, null, 2));

  // Check published toggle
  const pubToggle = await page.evaluate(() => {
    const el = document.getElementById('edit-published');
    if (!el) return { found: false };
    return {
      found: true,
      tag: el.tagName,
      type: el.type,
      checked: el.checked,
      cls: el.className,
      outerHTML: el.outerHTML.substring(0, 300),
    };
  });
  console.log('=== PUBLISHED TOGGLE ===');
  console.log(JSON.stringify(pubToggle, null, 2));

  // Check submit button
  const submitBtn = await page.evaluate(() => {
    const el = document.getElementById('edit-submit');
    if (!el) return { found: false };
    return {
      found: true,
      tag: el.tagName,
      text: el.textContent.trim().substring(0, 50),
      outerHTML: el.outerHTML.substring(0, 300),
    };
  });
  console.log('=== SUBMIT BUTTON ===');
  console.log(JSON.stringify(submitBtn, null, 2));

  // Check cancel button
  const cancelBtn = await page.evaluate(() => {
    const els = document.querySelectorAll('#view-edit button, #view-edit [role="button"]');
    const found = [];
    for (const el of els) {
      const text = el.textContent.trim().toLowerCase();
      if (text.includes('cancel') || text.includes('取消') || text.includes('返回')) {
        found.push({
          id: el.id,
          text: el.textContent.trim().substring(0, 50),
          outerHTML: el.outerHTML.substring(0, 300),
        });
      }
    }
    return found;
  });
  console.log('=== CANCEL BUTTONS ===');
  console.log(JSON.stringify(cancelBtn, null, 2));

  // Inspect fullscreen behavior  
  await page.click('.editor-toolbar .fs-toggle');
  await page.waitForTimeout(500);
  const fsState = await page.evaluate(() => {
    const bodyClasses = document.body.className;
    const fsBtn = document.querySelector('.editor-toolbar .fs-toggle');
    const btnClasses = fsBtn ? fsBtn.className : '';
    const editorWrap = document.querySelector('.editor-wrap');
    const editorWrapClasses = editorWrap ? editorWrap.className : '';
    const editorWrapStyle = editorWrap ? editorWrap.getAttribute('style') : '';
    return { bodyClasses, btnClasses, editorWrapClasses, editorWrapStyle };
  });
  console.log('=== FULLSCREEN STATE ===');
  console.log(JSON.stringify(fsState, null, 2));

  // Reset fullscreen
  await page.click('.editor-toolbar .fs-toggle');
  await page.waitForTimeout(300);

  // Check view-mode behavior
  await page.click('.view-mode-btn[data-mode="edit"]');
  await page.waitForTimeout(300);
  const editModeState = await page.evaluate(() => {
    const editorWrap = document.querySelector('.editor-wrap');
    const viewContent = document.querySelector('#view-content');
    return {
      editorWrapClasses: editorWrap?.className || '',
      viewContentDisplay: viewContent ? window.getComputedStyle(viewContent).display : 'N/A',
      viewContentClasses: viewContent?.className || '',
    };
  });
  console.log('=== EDIT MODE STATE ===');
  console.log(JSON.stringify(editModeState, null, 2));

  // Check standalone /editor page
  await page.goto('/editor/markdown', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  const editorPageHTML = await page.evaluate(() => {
    return document.body.innerHTML.substring(0, 5000);
  });
  console.log('=== /editor PAGE ===');
  console.log(editorPageHTML);
});
