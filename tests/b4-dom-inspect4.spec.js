const { test } = require('@playwright/test');

test('Inspect view-edit panes', async ({ page }) => {
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
  });

  // Get the full view-edit HTML to find preview pane
  const panes = await page.evaluate(() => {
    const viewEdit = document.getElementById('view-edit');
    // Find all textareas and preview containers
    const textareas = viewEdit.querySelectorAll('textarea');
    const divs = viewEdit.querySelectorAll('.editor-pane, #editor-edit, .preview, [id*="preview"], [id*="view"]');
    return {
      textareas: Array.from(textareas).map(t => ({ id: t.id, cls: t.className })),
      divs: Array.from(divs).map(d => ({ id: d.id, cls: d.className, display: window.getComputedStyle(d).display, innerHTML: d.innerHTML.substring(0, 100) })),
    };
  });
  console.log('=== VIEW-EDIT PANES ===');
  console.log(JSON.stringify(panes, null, 2));

  // Get all children of the editor-wrap
  const editorWrap = await page.evaluate(() => {
    const wrap = document.querySelector('#view-edit .editor-wrap');
    if (!wrap) return null;
    return {
      children: Array.from(wrap.children).map(c => ({
        tag: c.tagName,
        id: c.id,
        cls: c.className,
        display: window.getComputedStyle(c).display,
        html: c.outerHTML.substring(0, 300)
      }))
    };
  });
  console.log('=== EDITOR WRAP CHILDREN ===');
  console.log(JSON.stringify(editorWrap, null, 2));

  // Check all modes and their class changes
  await page.click('#view-edit .view-mode-btn[data-mode="edit"]');
  await page.waitForTimeout(300);
  const editClasses = await page.evaluate(() => {
    const wrap = document.querySelector('#view-edit .editor-wrap');
    const activeBtn = document.querySelector('#view-edit .view-mode-btn.active');
    return {
      wrapClass: wrap?.className,
      activeMode: activeBtn?.getAttribute('data-mode'),
    };
  });
  console.log('=== EDIT MODE ===');
  console.log(JSON.stringify(editClasses, null, 2));

  await page.click('#view-edit .view-mode-btn[data-mode="preview"]');
  await page.waitForTimeout(300);
  const previewClasses = await page.evaluate(() => {
    const wrap = document.querySelector('#view-edit .editor-wrap');
    const activeBtn = document.querySelector('#view-edit .view-mode-btn.active');
    return {
      wrapClass: wrap?.className,
      activeMode: activeBtn?.getAttribute('data-mode'),
    };
  });
  console.log('=== PREVIEW MODE ===');
  console.log(JSON.stringify(previewClasses, null, 2));

  await page.click('#view-edit .view-mode-btn[data-mode="split"]');
  await page.waitForTimeout(300);
  const splitClasses = await page.evaluate(() => {
    const wrap = document.querySelector('#view-edit .editor-wrap');
    const activeBtn = document.querySelector('#view-edit .view-mode-btn.active');
    return {
      wrapClass: wrap?.className,
      activeMode: activeBtn?.getAttribute('data-mode'),
    };
  });
  console.log('=== SPLIT MODE ===');
  console.log(JSON.stringify(splitClasses, null, 2));

  // Check indent-toggle behavior
  const indentBefore = await page.evaluate(() => {
    const btn = document.querySelector('#view-edit .indent-toggle');
    return btn?.getAttribute('data-use-spaces') ?? btn?.dataset;
  });
  console.log('=== INDENT BEFORE ===');
  console.log(JSON.stringify(indentBefore));
  
  await page.click('#view-edit .indent-toggle');
  await page.waitForTimeout(300);
  
  const indentAfter = await page.evaluate(() => {
    const btn = document.querySelector('#view-edit .indent-toggle');
    const ta = document.getElementById('edit-content');
    return { btnHTML: btn?.outerHTML.substring(0, 200), taSpaces: ta?.getAttribute('data-use-spaces') };
  });
  console.log('=== INDENT AFTER ===');
  console.log(JSON.stringify(indentAfter, null, 2));

  // Check submit button behavior
  const submitState = await page.evaluate(() => {
    const form = document.getElementById('edit-form');
    return {
      formAction: form?.action,
      formMethod: form?.method,
      submitType: document.getElementById('edit-submit')?.type,
    };
  });
  console.log('=== SUBMIT STATE ===');
  console.log(JSON.stringify(submitState, null, 2));
});
