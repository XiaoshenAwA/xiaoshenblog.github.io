const { test } = require('@playwright/test');

test('Inspect /editor and link modal', async ({ page }) => {
  // Check standalone /editor
  await page.setExtraHTTPHeaders({ 'Authorization': 'Bearer admin123456' });
  await page.goto('/editor/markdown', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  
  const editorHTML = await page.evaluate(() => {
    const body = document.body.innerHTML;
    return body.substring(0, 8000);
  });
  console.log('=== /editor HTML ===');
  console.log(editorHTML);

  // Check buttons on /editor
  const editorBtns = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    return Array.from(btns).map(b => ({
      id: b.id,
      cls: b.className,
      dataMd: b.getAttribute('data-md'),
      dataAction: b.getAttribute('data-action'),
      dataMode: b.getAttribute('data-mode'),
      text: b.textContent.trim().substring(0, 50),
    }));
  });
  console.log('=== /editor BUTTONS ===');
  console.log(JSON.stringify(editorBtns, null, 2));

  // Check the editor textarea id
  const textareaInfo = await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    return ta ? { id: ta.id, cls: ta.className, placeholder: ta.placeholder } : null;
  });
  console.log('=== TEXTAREA ===');
  console.log(JSON.stringify(textareaInfo, null, 2));

  // Now check link modal fields
  await page.goto('/admin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.fill('#login-email', 'xiaoshenqwq@gmail.com');
  await page.fill('#login-password', 'admin123456');
  await page.click('#login-form button[type="submit"]');
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-edit').classList.add('active');
  });

  // Open link modal
  await page.click('#view-edit .editor-toolbar [data-action="link"]');
  await page.waitForTimeout(1000);
  
  const linkModal = await page.evaluate(() => {
    const modal = document.getElementById('insert-link-modal');
    if (!modal) return null;
    const inputs = modal.querySelectorAll('input, select, textarea');
    const buttons = modal.querySelectorAll('button');
    return {
      display: window.getComputedStyle(modal).display,
      inputs: Array.from(inputs).map(i => ({ id: i.id, type: i.type, placeholder: i.placeholder })),
      buttons: Array.from(buttons).map(b => ({ id: b.id, text: b.textContent.trim().substring(0, 30), onclick: b.getAttribute('onclick')?.substring(0, 100) })),
      innerHTML: modal.innerHTML.substring(0, 2000),
    };
  });
  console.log('=== LINK MODAL ===');
  console.log(JSON.stringify(linkModal, null, 2));

  // Check image modal fields
  await page.evaluate(() => document.getElementById('insert-link-modal').style.display = 'none');
  await page.click('#view-edit .editor-toolbar [data-action="image"]');
  await page.waitForTimeout(1000);
  const imgModal = await page.evaluate(() => {
    const modal = document.getElementById('insert-image-modal');
    if (!modal) return null;
    const inputs = modal.querySelectorAll('input, select, textarea');
    const buttons = modal.querySelectorAll('button');
    return {
      display: window.getComputedStyle(modal).display,
      inputs: Array.from(inputs).map(i => ({ id: i.id, type: i.type, placeholder: i.placeholder })),
      buttons: Array.from(buttons).map(b => ({ id: b.id, text: b.textContent.trim().substring(0, 30), onclick: b.getAttribute('onclick')?.substring(0, 100) })),
    };
  });
  console.log('=== IMAGE MODAL ===');
  console.log(JSON.stringify(imgModal, null, 2));

  // Check code modal fields
  await page.evaluate(() => document.getElementById('insert-image-modal').style.display = 'none');
  await page.click('#view-edit .editor-toolbar [data-action="code"]');
  await page.waitForTimeout(1000);
  const codeModal = await page.evaluate(() => {
    const modal = document.getElementById('insert-code-modal');
    if (!modal) return null;
    const inputs = modal.querySelectorAll('input, select, textarea');
    const buttons = modal.querySelectorAll('button');
    return {
      display: window.getComputedStyle(modal).display,
      inputs: Array.from(inputs).map(i => ({ id: i.id, type: i.type, placeholder: i.placeholder, options: i.tagName === 'SELECT' ? Array.from(i.options).map(o => o.value).slice(0,5) : undefined })),
      buttons: Array.from(buttons).map(b => ({ id: b.id, text: b.textContent.trim().substring(0, 30), onclick: b.getAttribute('onclick')?.substring(0, 100) })),
    };
  });
  console.log('=== CODE MODAL ===');
  console.log(JSON.stringify(codeModal, null, 2));

  // Check fullscreen toggle behavior
  await page.evaluate(() => document.getElementById('insert-code-modal').style.display = 'none');
  await page.waitForTimeout(300);
  await page.click('#view-edit .editor-toolbar .fs-toggle', { force: true });
  await page.waitForTimeout(500);
  const fsState = await page.evaluate(() => {
    return {
      bodyClass: document.body.className,
      editContentStyle: document.getElementById('edit-content')?.getAttribute('style')?.substring(0, 200),
      editorWrapClass: document.querySelector('.editor-wrap')?.className,
    };
  });
  console.log('=== FULLSCREEN STATE ===');
  console.log(JSON.stringify(fsState, null, 2));

  // Check split/edit/preview mode behavior
  await page.click('#view-edit .editor-toolbar .fs-toggle', { force: true }); // toggle back
  await page.waitForTimeout(300);

  // Split mode (default)
  await page.click('#view-edit .view-mode-btn[data-mode="split"]');
  await page.waitForTimeout(300);
  const splitState = await page.evaluate(() => {
    const ew = document.querySelector('#view-edit .editor-wrap');
    return { class: ew?.className, editDisplay: window.getComputedStyle(document.getElementById('edit-content')).display, viewDisplay: document.getElementById('view-content') ? window.getComputedStyle(document.getElementById('view-content')).display : 'N/A' };
  });
  console.log('=== SPLIT STATE ===');
  console.log(JSON.stringify(splitState, null, 2));

  // Edit only
  await page.click('#view-edit .view-mode-btn[data-mode="edit"]');
  await page.waitForTimeout(300);
  const editOnlyState = await page.evaluate(() => {
    return { editDisplay: window.getComputedStyle(document.getElementById('edit-content')).display, viewDisplay: document.getElementById('view-content') ? window.getComputedStyle(document.getElementById('view-content')).display : 'N/A' };
  });
  console.log('=== EDIT-ONLY STATE ===');
  console.log(JSON.stringify(editOnlyState, null, 2));

  // Preview only
  await page.click('#view-edit .view-mode-btn[data-mode="preview"]');
  await page.waitForTimeout(300);
  const previewOnlyState = await page.evaluate(() => {
    return { editDisplay: window.getComputedStyle(document.getElementById('edit-content')).display, viewDisplay: document.getElementById('view-content') ? window.getComputedStyle(document.getElementById('view-content')).display : 'N/A' };
  });
  console.log('=== PREVIEW-ONLY STATE ===');
  console.log(JSON.stringify(previewOnlyState, null, 2));
});
