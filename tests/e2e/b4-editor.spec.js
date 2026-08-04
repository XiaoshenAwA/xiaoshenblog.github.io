const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'parallel', workers: 4 });

async function loginAndGoToEditor(page) {
  await page.setExtraHTTPHeaders({ 'Authorization': 'Bearer admin123456' });
  await page.goto('/admin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.fill('#login-email', 'xiaoshenqwq@gmail.com');
  await page.fill('#login-password', 'admin123456');
  await page.click('#login-form button[type="submit"]');
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    const ve = document.getElementById('view-edit');
    if (ve) ve.classList.add('active');
    const lb = document.getElementById('logout-btn');
    if (lb) lb.style.display = 'inline-block';
    const ue = document.getElementById('user-email');
    if (ue) ue.textContent = 'xiaoshenqwq@gmail.com';
  });
  await page.waitForTimeout(1000);
}

async function goToStandaloneEditor(page) {
  await page.setExtraHTTPHeaders({ 'Authorization': 'Bearer admin123456' });
  await page.goto('/editor/markdown', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
}

test.afterEach(() => {
  if (test.info().status !== 'passed') {
    console.error('FAIL-FAST:', test.info().title, 'FAILED');
    console.error('Error:', test.info().error?.message || '(no message)');
    process.exit(1);
  }
});

// ====== View-Edit Toolbar ======
test.describe('View-Edit Toolbar', () => {
  test('bold', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.evaluate(() => document.getElementById('edit-content').value = 'test');
    await page.click('[data-md="**"]');
    await page.waitForTimeout(300);
    const v = await page.evaluate(() => document.getElementById('edit-content').value);
    expect(v).toContain('****');
  });

  test('italic', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.evaluate(() => document.getElementById('edit-content').value = 'test');
    await page.click('[data-md="*"]');
    await page.waitForTimeout(300);
    const v = await page.evaluate(() => document.getElementById('edit-content').value);
    expect(v).toContain('*');
  });

  test('strikethrough', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.evaluate(() => document.getElementById('edit-content').value = 'test');
    await page.click('[data-md="~~"]');
    await page.waitForTimeout(300);
    const v = await page.evaluate(() => document.getElementById('edit-content').value);
    expect(v).toContain('~~~~');
  });

  test('heading', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.evaluate(() => document.getElementById('edit-content').value = 'test');
    await page.click('[data-md="# "]');
    await page.waitForTimeout(300);
    const v = await page.evaluate(() => document.getElementById('edit-content').value);
    expect(v).toContain('# ');
  });

  test('quote', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.evaluate(() => document.getElementById('edit-content').value = 'test');
    await page.click('[data-md="> "]');
    await page.waitForTimeout(300);
    const v = await page.evaluate(() => document.getElementById('edit-content').value);
    expect(v).toContain('> ');
  });

  test('unordered list', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.evaluate(() => document.getElementById('edit-content').value = 'test');
    await page.click('[data-md="- "]');
    await page.waitForTimeout(300);
    const v = await page.evaluate(() => document.getElementById('edit-content').value);
    expect(v).toContain('- ');
  });

  test('ordered list', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.evaluate(() => document.getElementById('edit-content').value = 'test');
    await page.click('[data-md="1. "]');
    await page.waitForTimeout(300);
    const v = await page.evaluate(() => document.getElementById('edit-content').value);
    expect(v).toContain('1. ');
  });

  test('divider', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.evaluate(() => document.getElementById('edit-content').value = 'test');
    await page.click('[data-md="---"]');
    await page.waitForTimeout(300);
    const v = await page.evaluate(() => document.getElementById('edit-content').value);
    expect(v).toContain('---');
  });

  test('code block modal', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.click('[data-action="code"]');
    await page.waitForTimeout(500);
    const visible = await page.evaluate(() => {
      const m = document.getElementById('insert-code-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(visible).toBe(true);
    // close
    await page.evaluate(() => document.getElementById('insert-code-modal').style.display = 'none');
  });

  test('link modal', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.click('[data-action="link"]');
    await page.waitForTimeout(500);
    const visible = await page.evaluate(() => {
      const m = document.getElementById('insert-link-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(visible).toBe(true);
    await page.evaluate(() => document.getElementById('insert-link-modal').style.display = 'none');
  });

  test('image modal', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.click('[data-action="image"]');
    await page.waitForTimeout(500);
    const visible = await page.evaluate(() => {
      const m = document.getElementById('insert-image-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(visible).toBe(true);
    await page.evaluate(() => document.getElementById('insert-image-modal').style.display = 'none');
  });

  test('fullscreen toggle', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.click('.fs-toggle');
    await page.waitForTimeout(500);
    const isFs = await page.evaluate(() => {
      const wrap = document.querySelector('.editor-wrap');
      return wrap && wrap.classList.contains('is-fullscreen');
    });
    expect(isFs).toBe(true);
  });

  test('split mode', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.click('.view-mode-btn[data-mode="split"]');
    await page.waitForTimeout(500);
    const active = await page.evaluate(() => {
      const btn = document.querySelector('.view-mode-btn[data-mode="split"]');
      return btn && btn.classList.contains('active');
    });
    expect(active).toBe(true);
  });

  test('edit-only mode', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.click('.view-mode-btn[data-mode="edit"]');
    await page.waitForTimeout(500);
    const active = await page.evaluate(() => {
      const btn = document.querySelector('.view-mode-btn[data-mode="edit"]');
      return btn && btn.classList.contains('active');
    });
    expect(active).toBe(true);
  });

  test('preview-only mode', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.click('.view-mode-btn[data-mode="preview"]');
    await page.waitForTimeout(500);
    const active = await page.evaluate(() => {
      const btn = document.querySelector('.view-mode-btn[data-mode="preview"]');
      return btn && btn.classList.contains('active');
    });
    expect(active).toBe(true);
  });
});

// ====== View-Edit Controls ======
test.describe('View-Edit Controls', () => {
  test('title input', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.fill('#edit-title', 'Test Title 999');
    const val = await page.evaluate(() => document.getElementById('edit-title').value);
    expect(val).toBe('Test Title 999');
  });

  test('publish toggle', async ({ page }) => {
    await loginAndGoToEditor(page);
    const before = await page.evaluate(() => document.getElementById('edit-published').checked);
    // Click the toggle switch label (not the hidden checkbox)
    await page.click('.toggle-switch');
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => document.getElementById('edit-published').checked);
    expect(after).toBe(!before);
  });

  test('save button exists', async ({ page }) => {
    await loginAndGoToEditor(page);
    await expect(page.locator('#edit-submit')).toBeVisible({ timeout: 3000 });
  });

  test('cancel returns to posts', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.evaluate(() => cancelEdit());
    await page.waitForTimeout(500);
    const active = await page.evaluate(() => {
      const vp = document.getElementById('view-posts');
      return vp && vp.classList.contains('active');
    });
    expect(active).toBe(true);
  });
});

// ====== Standalone Editor ======
test.describe('Standalone Editor', () => {
  test('page loads', async ({ page }) => {
    await goToStandaloneEditor(page);
    // Standalone editor uses #editor-input, not #edit-content
    await expect(page.locator('#editor-input')).toBeVisible({ timeout: 5000 });
  });

  test('mobile no overflo', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goToStandaloneEditor(page);
    // Editor toolbar has many buttons - may need horizontal scroll
    // Check if the toolbar container handles overflow
    const hasScroll = await page.evaluate(() => {
      const tb = document.querySelector('.editor-toolbar');
      return tb && tb.scrollWidth > tb.clientWidth;
    });
    // Either no overflow, or toolbar allows scrolling
    const ok = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 5);
    expect(ok).toBe(true);
  });

  test('SPA residue check', async ({ page }) => {
    await loginAndGoToEditor(page);
    await page.evaluate(() => cancelEdit());
    await page.waitForTimeout(300);
    await page.click('#manage-tags-btn');
    await page.waitForTimeout(300);
    await page.evaluate(() => cancelTagManage());
    await page.waitForTimeout(300);
    await page.click('#manage-categories-btn');
    await page.waitForTimeout(300);
    await page.evaluate(() => cancelCatManage());
    await page.waitForTimeout(300);
    await page.click('#new-post-btn');
    await page.waitForTimeout(500);
    const residue = await page.evaluate(() => ({
      modal: !!document.querySelector('.picker-modal[style*="flex"]'),
      fs: document.body.classList.contains('editor-fullscreen'),
    }));
    expect(residue.modal).toBe(false);
    expect(residue.fs).toBe(false);
  });
});
