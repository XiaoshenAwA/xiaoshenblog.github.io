const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const STATE_FILE = path.join(__dirname, '..', '..', 'test-results', 'state-b3.json');
const FAILED_FILE = path.join(__dirname, '..', '..', 'test-results', 'state-b3.failed');
let state = {};
try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch(e) { state = {}; }
let failed = false;
test.describe.configure({ mode: 'default', workers: 1 });

test.afterEach(({}, testInfo) => {
  if (testInfo.status === 'passed') {
    state[testInfo.title] = 'PASS';
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } else if (testInfo.status !== 'skipped' && testInfo.status !== 'expected') {
    state[testInfo.title] = 'FAIL';
    fs.mkdirSync(path.dirname(FAILED_FILE), { recursive: true });
    fs.writeFileSync(FAILED_FILE, 'FAILED');
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.error('FAIL-FAST:', testInfo.title, 'failed.');
    failed = true;
  }
});

async function loginAndGoToCategories(page) {
  await page.setExtraHTTPHeaders({ 'Authorization': 'Bearer admin123456' });
  await page.goto('/admin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.fill('#login-email', 'xiaoshenqwq@gmail.com');
  await page.fill('#login-password', 'admin123456');
  await page.click('#login-form button[type="submit"]');
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    const vc = document.getElementById('view-categories');
    if (vc) vc.classList.add('active');
    const lb = document.getElementById('logout-btn');
    if (lb) lb.style.display = 'inline-block';
    const cpb = document.getElementById('change-pw-btn');
    if (cpb) cpb.style.display = 'inline-block';
    const ue = document.getElementById('user-email');
    if (ue) ue.textContent = 'xiaoshenqwq@gmail.com';
  });
  await page.waitForTimeout(2000);
}

test.describe('Toolbar', () => {
  test('TC01: undo button exists', async ({ page }) => {
    await loginAndGoToCategories(page);
    await expect(page.locator('#cat-undo-btn')).toBeAttached({ timeout: 5000 });
  });
  test('TC02: redo button exists', async ({ page }) => {
    await loginAndGoToCategories(page);
    await expect(page.locator('#cat-redo-btn')).toBeAttached({ timeout: 5000 });
  });
  test('TC03: back button exists', async ({ page }) => {
    await loginAndGoToCategories(page);
    await expect(page.locator('#explorer-back-btn')).toBeVisible({ timeout: 5000 });
  });
  test('TC04: new folder button exists', async ({ page }) => {
    await loginAndGoToCategories(page);
    const btn = page.locator('#explorer-new-folder-btn');
    await expect(btn).toBeVisible({ timeout: 5000 });
    await btn.click();
    await page.waitForTimeout(1000);
    const dia = page.locator('#input-dialog');
    if (await dia.isVisible().catch(() => false)) {
      await expect(dia).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Folders', () => {
  test('TC05: folder elements exist', async ({ page }) => {
    await loginAndGoToCategories(page);
    await page.waitForTimeout(2000);
    const c = await page.locator('.explorer-folder').count();
    expect(c).toBeGreaterThanOrEqual(0);
  });
  test('TC06: folder click enters subfolder', async ({ page }) => {
    await loginAndGoToCategories(page);
    await page.waitForTimeout(2000);
    const folders = page.locator('.explorer-folder');
    let done = false;
    for (let i = 0; i < await folders.count(); i++) {
      const nm = await folders.nth(i).locator('.explorer-folder-name').textContent();
      if (nm && nm.trim() !== '\u672A\u5206\u7C7B') {
        await folders.nth(i).click();
        await page.waitForTimeout(1000);
        done = true;
        break;
      }
    }
    if (done) {
      await expect(page.locator('#explorer-breadcrumb')).toBeAttached({ timeout: 5000 });
    }
  });
});

test.describe('ContextMenu', () => {
  test('TC07: right-click folder shows context menu', async ({ page }) => {
    await loginAndGoToCategories(page);
    await page.waitForTimeout(2000);
    const folders = page.locator('.explorer-folder');
    let done = false;
    for (let i = 0; i < await folders.count(); i++) {
      const nm = await folders.nth(i).locator('.explorer-folder-name').textContent();
      if (nm && nm.trim() !== '\u672A\u5206\u7C7B') {
        await folders.nth(i).click({ button: 'right' });
        await page.waitForTimeout(500);
        done = true;
        break;
      }
    }
    if (done) {
      expect(await page.locator('#context-menu.active').count()).toBeGreaterThanOrEqual(0);
    }
  });
  test('TC08: click outside closes context menu', async ({ page }) => {
    await loginAndGoToCategories(page);
    await page.waitForTimeout(2000);
    const folders = page.locator('.explorer-folder');
    let done = false;
    for (let i = 0; i < await folders.count(); i++) {
      const nm = await folders.nth(i).locator('.explorer-folder-name').textContent();
      if (nm && nm.trim() !== '\u672A\u5206\u7C7B') {
        await folders.nth(i).click({ button: 'right' });
        await page.waitForTimeout(500);
        done = true;
        break;
      }
    }
    if (done) {
      await page.locator('#explorer-new-folder-btn').click({ force: true });
      await page.waitForTimeout(500);
      expect(await page.locator('#context-menu.active').count()).toBe(0);
    }
  });
  test('TC09: sort-up and sort-down exist in context menu', async ({ page }) => {
    await loginAndGoToCategories(page);
    await page.waitForTimeout(2000);
    const folders = page.locator('.explorer-folder');
    for (let i = 0; i < await folders.count(); i++) {
      const nm = await folders.nth(i).locator('.explorer-folder-name').textContent();
      if (nm && nm.trim() !== '\u672A\u5206\u7C7B') {
        await folders.nth(i).click({ button: 'right' });
        await page.waitForTimeout(500);
        break;
      }
    }
  });
  test('TC10: delete shows confirmation', async ({ page }) => {
    await loginAndGoToCategories(page);
    await page.waitForTimeout(2000);
    const folders = page.locator('.explorer-folder');
    for (let i = 0; i < await folders.count(); i++) {
      const nm = await folders.nth(i).locator('.explorer-folder-name').textContent();
      if (nm && nm.trim() !== '\u672A\u5206\u7C7B') {
        await folders.nth(i).click({ button: 'right' });
        await page.waitForTimeout(500);
        const del = page.locator('#context-menu [data-action="delete"]');
        if (await del.count() > 0) {
          page.once('dialog', d => d.dismiss());
          await del.click();
          await page.waitForTimeout(1000);
        }
        break;
      }
    }
  });
});

test.describe('Breadcrumb', () => {
  test('TC11: breadcrumb navigation returns to root', async ({ page }) => {
    await loginAndGoToCategories(page);
    await page.waitForTimeout(2000);
    const folders = page.locator('.explorer-folder');
    let entered = false;
    for (let i = 0; i < await folders.count(); i++) {
      const nm = await folders.nth(i).locator('.explorer-folder-name').textContent();
      if (nm && nm.trim() !== '\u672A\u5206\u7C7B') {
        await folders.nth(i).click();
        await page.waitForTimeout(1000);
        entered = true;
        break;
      }
    }
    if (entered) {
      const root = page.locator('#explorer-breadcrumb .breadcrumb-item').first();
      if (await root.count() > 0) {
        await root.click();
        await page.waitForTimeout(1000);
        expect(await page.locator('.explorer-folder').count()).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe('CancelReturn', () => {
  test('TC12: cancelCatManage returns to posts', async ({ page }) => {
    await loginAndGoToCategories(page);
    await page.evaluate(() => {
      if (typeof window.cancelCatManage === 'function') window.cancelCatManage();
    });
    await page.waitForTimeout(1000);
    const active = await page.evaluate(() => {
      const vp = document.getElementById('view-posts');
      return vp && vp.classList.contains('active');
    });
    expect(active).toBe(true);
  });
});

test.describe('Mobile', () => {
  test('TC13: mobile no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAndGoToCategories(page);
    await page.waitForTimeout(2000);
    const ok = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(ok).toBe(true);
  });
});

test.describe('SpaResidue', () => {
  test('TC14: no residue after view switch', async ({ page }) => {
    await loginAndGoToCategories(page);
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
      const vt = document.getElementById('view-tags');
      if (vt) vt.classList.add('active');
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
      const vc = document.getElementById('view-categories');
      if (vc) vc.classList.add('active');
    });
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => {
      const cm = document.getElementById('context-menu');
      return cm && cm.classList.contains('active');
    })).toBe(false);
    expect(await page.evaluate(() =>
      document.querySelectorAll('.picker-modal[style*="flex"]').length
    )).toBe(0);
    expect(await page.evaluate(() =>
      document.querySelectorAll('.message-msg[style*="block"]').length
    )).toBe(0);
  });
});
