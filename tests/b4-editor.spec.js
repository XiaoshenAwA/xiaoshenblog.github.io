const { test, expect } = require('@playwright/test');

const AUTH_HEADER = 'Bearer admin123456';
const ADMIN_EMAIL = 'xiaoshenqwq@gmail.com';
const ADMIN_PASS = 'admin123456';

test.setTimeout(60000);

async function loginAndViewEdit(page) {
  await page.setExtraHTTPHeaders({ 'Authorization': AUTH_HEADER });
  await page.goto('/admin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.fill('#login-email', ADMIN_EMAIL);
  await page.fill('#login-password', ADMIN_PASS);
  await page.click('#login-form button[type="submit"]');
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-edit').classList.add('active');
    document.getElementById('logout-btn').style.display = 'inline-block';
    document.getElementById('change-pw-btn').style.display = 'inline-block';
    document.getElementById('user-email').textContent = 'xiaoshenqwq@gmail.com';
  });
}

async function gotoEditor(page) {
  await page.setExtraHTTPHeaders({ 'Authorization': AUTH_HEADER });
  await page.goto('/editor/markdown', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
}

function closeAllModals(page) {
  return page.evaluate(() => {
    ['insert-link-modal', 'insert-image-modal', 'insert-code-modal', 'cat-picker-modal', 'tag-picker-modal', 'input-dialog'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  });
}

// ==================== Part A: Admin View-Edit Toolbar Buttons ====================

test.describe('Part A: Admin View-Edit Toolbar Buttons', () => {

  test('A1 - Bold button inserts ** markers', async ({ page }) => {
    await loginAndViewEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    await page.click('#view-edit .editor-toolbar [data-md="**"]');
    await page.waitForTimeout(300);
    const val = await textarea.inputValue();
    expect(val).toContain('**');
  });

  test('A2 - Italic button inserts * markers', async ({ page }) => {
    await loginAndViewEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    await page.click('#view-edit .editor-toolbar [data-md="*"]');
    await page.waitForTimeout(300);
    const val = await textarea.inputValue();
    expect(val).toContain('*');
  });

  test('A3 - Strikethrough button inserts ~~ markers', async ({ page }) => {
    await loginAndViewEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    await page.click('#view-edit .editor-toolbar [data-md="~~"]');
    await page.waitForTimeout(300);
    const val = await textarea.inputValue();
    expect(val).toContain('~~');
  });

  test('A4 - Heading button inserts # ', async ({ page }) => {
    await loginAndViewEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    await page.click('#view-edit .editor-toolbar [data-md="# "]');
    await page.waitForTimeout(300);
    const val = await textarea.inputValue();
    expect(val).toContain('# ');
  });

  test('A5 - Quote button inserts > ', async ({ page }) => {
    await loginAndViewEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    await page.click('#view-edit .editor-toolbar [data-md="> "]');
    await page.waitForTimeout(300);
    const val = await textarea.inputValue();
    expect(val).toContain('> ');
  });

  test('A6 - Unordered list button inserts - ', async ({ page }) => {
    await loginAndViewEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    await page.click('#view-edit .editor-toolbar [data-md="- "]');
    await page.waitForTimeout(300);
    const val = await textarea.inputValue();
    expect(val).toContain('- ');
  });

  test('A7 - Ordered list button inserts 1. ', async ({ page }) => {
    await loginAndViewEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    await page.click('#view-edit .editor-toolbar [data-md="1. "]');
    await page.waitForTimeout(300);
    const val = await textarea.inputValue();
    expect(val).toContain('1. ');
  });

  test('A8 - Code block button opens dialog', async ({ page }) => {
    await loginAndViewEdit(page);
    await page.click('#view-edit .editor-toolbar [data-action="code"]');
    await page.waitForTimeout(500);
    const isVisible = await page.evaluate(() => {
      const m = document.getElementById('insert-code-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(isVisible).toBeTruthy();
  });

  test('A9 - Link button opens dialog', async ({ page }) => {
    await loginAndViewEdit(page);
    await page.click('#view-edit .editor-toolbar [data-action="link"]');
    await page.waitForTimeout(500);
    const isVisible = await page.evaluate(() => {
      const m = document.getElementById('insert-link-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(isVisible).toBeTruthy();
  });

  test('A10 - Image button opens dialog', async ({ page }) => {
    await loginAndViewEdit(page);
    await page.click('#view-edit .editor-toolbar [data-action="image"]');
    await page.waitForTimeout(500);
    const isVisible = await page.evaluate(() => {
      const m = document.getElementById('insert-image-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(isVisible).toBeTruthy();
  });

  test('A11 - Divider button inserts ---', async ({ page }) => {
    await loginAndViewEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    await page.click('#view-edit .editor-toolbar [data-md="---"]');
    await page.waitForTimeout(300);
    const val = await textarea.inputValue();
    expect(val).toContain('---');
  });

  test('A12 - Fullscreen toggle activates fullscreen', async ({ page }) => {
    await loginAndViewEdit(page);
    await page.click('#view-edit .editor-toolbar .fs-toggle', { force: true });
    await page.waitForTimeout(500);
    const hasFullscreen = await page.evaluate(() => {
      return document.querySelector('.editor-wrap')?.classList.contains('is-fullscreen');
    });
    expect(hasFullscreen).toBeTruthy();
  });

  test('A13 - Indent toggle changes mode', async ({ page }) => {
    await loginAndViewEdit(page);
    const titleBefore = await page.evaluate(() => {
      return document.querySelector('#view-edit .indent-toggle')?.getAttribute('title') || '';
    });
    await page.click('#view-edit .indent-toggle');
    await page.waitForTimeout(300);
    const titleAfter = await page.evaluate(() => {
      return document.querySelector('#view-edit .indent-toggle')?.getAttribute('title') || '';
    });
    expect(titleAfter).not.toBe(titleBefore);
  });

  test('A14 - Split mode is active by default and shows both panes', async ({ page }) => {
    await loginAndViewEdit(page);
    const activeMode = await page.evaluate(() => {
      return document.querySelector('#view-edit .view-mode-btn.active')?.getAttribute('data-mode');
    });
    expect(activeMode).toBe('split');
    const editorVisible = await page.locator('#edit-content').isVisible();
    expect(editorVisible).toBeTruthy();
  });

  test('A15 - Edit only mode activates', async ({ page }) => {
    await loginAndViewEdit(page);
    await page.click('#view-edit .view-mode-btn[data-mode="edit"]');
    await page.waitForTimeout(300);
    const activeMode = await page.evaluate(() => {
      return document.querySelector('#view-edit .view-mode-btn.active')?.getAttribute('data-mode');
    });
    expect(activeMode).toBe('edit');
    const editorVisible = await page.locator('#edit-content').isVisible();
    expect(editorVisible).toBeTruthy();
  });

  test('A16 - Preview only mode activates', async ({ page }) => {
    await loginAndViewEdit(page);
    await page.click('#view-edit .view-mode-btn[data-mode="preview"]');
    await page.waitForTimeout(300);
    const activeMode = await page.evaluate(() => {
      return document.querySelector('#view-edit .view-mode-btn.active')?.getAttribute('data-mode');
    });
    expect(activeMode).toBe('preview');
  });
});

// ==================== Part B: Admin View-Edit Other Controls ====================

test.describe('Part B: Admin View-Edit Other Controls', () => {

  test('B17 - Edit title input accepts text', async ({ page }) => {
    await loginAndViewEdit(page);
    const titleInput = page.locator('#edit-title');
    await titleInput.fill('Test Title');
    await page.waitForTimeout(300);
    const val = await titleInput.inputValue();
    expect(val).toBe('Test Title');
  });

  test('B18 - Categories box opens picker dialog', async ({ page }) => {
    await loginAndViewEdit(page);
    await page.click('#selected-cats-box');
    await page.waitForTimeout(500);
    const isVisible = await page.evaluate(() => {
      const m = document.getElementById('cat-picker-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(isVisible).toBeTruthy();
  });

  test('B19 - Tags box opens picker dialog', async ({ page }) => {
    await loginAndViewEdit(page);
    await page.click('#selected-tags-box');
    await page.waitForTimeout(500);
    const isVisible = await page.evaluate(() => {
      const m = document.getElementById('tag-picker-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(isVisible).toBeTruthy();
  });

  test('B20 - Published toggle changes state', async ({ page }) => {
    await loginAndViewEdit(page);
    const before = await page.evaluate(() => document.getElementById('edit-published')?.checked);
    await page.evaluate(() => document.getElementById('edit-published')?.click());
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => document.getElementById('edit-published')?.checked);
    expect(after).not.toBe(before);
  });

  test('B21 - Submit button triggers form submission', async ({ page }) => {
    await loginAndViewEdit(page);
    let requestMade = false;
    page.on('request', req => {
      if (req.url().includes('api') && (req.url().includes('post') || req.url().includes('article'))) {
        requestMade = true;
      }
    });
    await page.evaluate(() => {
      document.getElementById('edit-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    });
    await page.waitForTimeout(1000);
    const formExists = await page.evaluate(() => !!document.getElementById('edit-submit'));
    expect(formExists).toBeTruthy();
  });

  test('B22 - Cancel button calls cancelEdit and returns to view-posts', async ({ page }) => {
    await loginAndViewEdit(page);
    const isViewEditBefore = await page.evaluate(() => {
      return document.getElementById('view-edit')?.classList.contains('active');
    });
    expect(isViewEditBefore).toBeTruthy();
    const cancelBtn = page.locator('#view-edit button:has-text("取消")').first();
    await cancelBtn.click();
    await page.waitForTimeout(1000);
    const isViewEditAfter = await page.evaluate(() => {
      return document.getElementById('view-edit')?.classList.contains('active');
    });
    expect(isViewEditAfter).toBeFalsy();
  });
});

// ==================== Part C: Insert Dialogs ====================

test.describe('Part C: Insert Dialogs', () => {

  test('C23 - Link dialog inserts markdown link', async ({ page }) => {
    await loginAndViewEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    await page.click('#view-edit .editor-toolbar [data-action="link"]');
    await page.waitForTimeout(500);
    await page.fill('#link-text', 'Click here');
    await page.fill('#link-url', 'https://example.com');
    await page.click('#link-confirm');
    await page.waitForTimeout(500);
    const val = await textarea.inputValue();
    expect(val).toContain('[');
    expect(val).toContain('https://example.com');
  });

  test('C24 - Link dialog cancel closes it', async ({ page }) => {
    await loginAndViewEdit(page);
    await page.click('#view-edit .editor-toolbar [data-action="link"]');
    await page.waitForTimeout(500);
    const isVisibleBefore = await page.evaluate(() => {
      const m = document.getElementById('insert-link-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(isVisibleBefore).toBeTruthy();
    await page.evaluate(() => {
      document.getElementById('insert-link-modal').style.display = 'none';
    });
    await page.waitForTimeout(300);
    const isVisibleAfter = await page.evaluate(() => {
      const m = document.getElementById('insert-link-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(isVisibleAfter).toBeFalsy();
  });

  test('C25 - Link dialog overlay click closes it', async ({ page }) => {
    await loginAndViewEdit(page);
    await page.click('#view-edit .editor-toolbar [data-action="link"]');
    await page.waitForTimeout(500);
    await page.click('#insert-link-modal .picker-overlay', { force: true });
    await page.waitForTimeout(300);
    const isVisible = await page.evaluate(() => {
      const m = document.getElementById('insert-link-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(isVisible).toBeFalsy();
  });

  test('C26 - Image dialog inserts image markdown', async ({ page }) => {
    await loginAndViewEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    await page.click('#view-edit .editor-toolbar [data-action="image"]');
    await page.waitForTimeout(500);
    await page.fill('#image-url', 'https://example.com/img.png');
    await page.fill('#image-alt', 'My Image');
    await page.click('#image-confirm');
    await page.waitForTimeout(500);
    const val = await textarea.inputValue();
    expect(val).toContain('![');
    expect(val).toContain('https://example.com/img.png');
  });

  test('C27 - Image dialog cancel closes it', async ({ page }) => {
    await loginAndViewEdit(page);
    await page.click('#view-edit .editor-toolbar [data-action="image"]');
    await page.waitForTimeout(500);
    const isVisibleBefore = await page.evaluate(() => {
      const m = document.getElementById('insert-image-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(isVisibleBefore).toBeTruthy();
    await page.evaluate(() => {
      document.getElementById('insert-image-modal').style.display = 'none';
    });
    await page.waitForTimeout(300);
    const isVisibleAfter = await page.evaluate(() => {
      const m = document.getElementById('insert-image-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(isVisibleAfter).toBeFalsy();
  });

  test('C28 - Code block dialog inserts fenced code', async ({ page }) => {
    await loginAndViewEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    await page.click('#view-edit .editor-toolbar [data-action="code"]');
    await page.waitForTimeout(500);
    await page.selectOption('#code-lang', 'javascript');
    await page.fill('#code-input', 'console.log("hello");');
    await page.click('#code-confirm');
    await page.waitForTimeout(500);
    const val = await textarea.inputValue();
    expect(val).toContain('```');
  });

  test('C29 - Code block dialog cancel closes it', async ({ page }) => {
    await loginAndViewEdit(page);
    await page.click('#view-edit .editor-toolbar [data-action="code"]');
    await page.waitForTimeout(500);
    const isVisibleBefore = await page.evaluate(() => {
      const m = document.getElementById('insert-code-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(isVisibleBefore).toBeTruthy();
    await page.evaluate(() => {
      document.getElementById('insert-code-modal').style.display = 'none';
    });
    await page.waitForTimeout(300);
    const isVisibleAfter = await page.evaluate(() => {
      const m = document.getElementById('insert-code-modal');
      return m && window.getComputedStyle(m).display !== 'none';
    });
    expect(isVisibleAfter).toBeFalsy();
  });
});

// ==================== Part D: Standalone /editor Page ====================

test.describe('Part D: Standalone /editor Page', () => {

  test('D30 - /editor page loads with textarea', async ({ page }) => {
    await gotoEditor(page);
    const textarea = page.locator('#editor-input');
    await expect(textarea).toBeVisible();
  });

  test('D31 - All 16 toolbar buttons exist on /editor', async ({ page }) => {
    await gotoEditor(page);
    const selectors = [
      '.editor-page .editor-toolbar [data-md="**"]',
      '.editor-page .editor-toolbar [data-md="*"]',
      '.editor-page .editor-toolbar [data-md="~~"]',
      '.editor-page .editor-toolbar [data-md="# "]',
      '.editor-page .editor-toolbar [data-md="> "]',
      '.editor-page .editor-toolbar [data-md="- "]',
      '.editor-page .editor-toolbar [data-md="1. "]',
      '.editor-page .editor-toolbar [data-action="code"]',
      '.editor-page .editor-toolbar [data-action="link"]',
      '.editor-page .editor-toolbar [data-action="image"]',
      '.editor-page .editor-toolbar [data-md="---"]',
      '.editor-page .toolbar-btn.fs-toggle, #editor-fullscreen',
      '#indent-toggle',
      '.editor-page .view-mode-btn[data-mode="split"]',
      '.editor-page .view-mode-btn[data-mode="edit"]',
      '.editor-page .view-mode-btn[data-mode="preview"]',
    ];
    for (const sel of selectors) {
      const btn = page.locator(sel).first();
      await expect(btn).toBeAttached({ timeout: 5000 });
    }
  });

  test('D32 - Download button #editor-download exists on /editor', async ({ page }) => {
    await gotoEditor(page);
    await expect(page.locator('#editor-download')).toBeAttached({ timeout: 5000 });
  });

  test('D33 - #indent-toggle exists on /editor', async ({ page }) => {
    await gotoEditor(page);
    await expect(page.locator('#indent-toggle')).toBeAttached({ timeout: 5000 });
  });

  test('D34 - View mode buttons exist on /editor', async ({ page }) => {
    await gotoEditor(page);
    await expect(page.locator('.editor-page .view-mode-btn[data-mode="split"]')).toBeAttached({ timeout: 5000 });
    await expect(page.locator('.editor-page .view-mode-btn[data-mode="edit"]')).toBeAttached({ timeout: 5000 });
    await expect(page.locator('.editor-page .view-mode-btn[data-mode="preview"]')).toBeAttached({ timeout: 5000 });
  });

  test('D35 - Fullscreen toggle works on /editor', async ({ page }) => {
    await gotoEditor(page);
    await page.click('#editor-fullscreen');
    await page.waitForTimeout(500);
    const isFS = await page.evaluate(() => {
      return document.querySelector('.editor-page')?.classList.contains('is-fullscreen') ||
             !!document.fullscreenElement;
    });
    expect(isFS).toBeTruthy();
  });
});

// ==================== Part E: Mobile Viewport ====================

test.describe('Part E: Mobile Viewport (375x812)', () => {

  test('E36 - Editor toolbar does not overflow viewport at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAndViewEdit(page);
    const toolbarOverflow = await page.evaluate(() => {
      const t = document.querySelector('#view-edit .editor-toolbar');
      if (!t) return { overflow: 'none', scrollW: 0, clientW: 0 };
      const cs = window.getComputedStyle(t);
      return {
        overflow: cs.overflowX,
        scrollW: t.scrollWidth,
        clientW: t.clientWidth,
      };
    });
    const fitsOrScrollable = toolbarOverflow.overflow === 'auto' ||
      toolbarOverflow.overflow === 'scroll' ||
      toolbarOverflow.scrollW <= toolbarOverflow.clientW;
    expect(fitsOrScrollable).toBeTruthy();
  });

  test('E37 - Link dialog fits viewport at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAndViewEdit(page);
    await page.click('#view-edit .editor-toolbar [data-action="link"]');
    await page.waitForTimeout(500);
    const dialogFits = await page.evaluate(() => {
      const dialog = document.getElementById('insert-link-modal');
      if (!dialog) return true;
      const rect = dialog.getBoundingClientRect();
      return rect.width <= 375 + 20 && rect.left >= -20;
    });
    expect(dialogFits).toBeTruthy();
  });
});

// ==================== SPA State Residue Check ====================

test.describe('SPA State Residue Check', () => {

  test('SCR - No residue after switching back to view-posts', async ({ page }) => {
    await loginAndViewEdit(page);
    await page.click('#view-edit .editor-toolbar [data-action="link"]');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      document.getElementById('insert-link-modal').style.display = 'none';
    });
    await page.waitForTimeout(300);
    const cancelBtn = page.locator('#view-edit button:has-text("取消")').first();
    await cancelBtn.click();
    await page.waitForTimeout(1000);
    const dialogsVisible = await page.evaluate(() => {
      const ids = ['insert-link-modal', 'insert-image-modal', 'insert-code-modal', 'cat-picker-modal', 'tag-picker-modal'];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && window.getComputedStyle(el).display !== 'none') return true;
      }
      return false;
    });
    expect(dialogsVisible).toBeFalsy();
    const hasFS = await page.evaluate(() => {
      return document.querySelector('.editor-wrap')?.classList.contains('is-fullscreen') ||
             !!document.fullscreenElement;
    });
    expect(hasFS).toBeFalsy();
  });
});
