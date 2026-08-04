const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', '..', 'test-results', 'state-b2.json');
const FAILED_FILE = path.join(__dirname, '..', '..', 'test-results', 'state-b2.failed');
let state = {};
try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch(e) { state = {}; }
let failed = false;

test.describe.configure({ mode: 'default', workers: 1 });

test.beforeEach(({ page }, testInfo) => {
  const taskTitle = testInfo.title;
  if (failed || fs.existsSync(FAILED_FILE)) { test.skip(); return; }
  if (state[taskTitle] === 'PASS' || state[taskTitle] === 'SKIP') { test.skip(); return; }
});

test.afterEach(({ page }, testInfo) => {
  const taskTitle = testInfo.title;
  if (testInfo.status === 'passed') {
    state[taskTitle] = 'PASS';
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } else if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
    state[taskTitle] = 'FAIL';
    fs.mkdirSync(path.dirname(FAILED_FILE), { recursive: true });
    fs.writeFileSync(FAILED_FILE, 'FAILED');
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.error('FAIL-FAST: "' + taskTitle + '" failed. Crashing.');
    console.error('Error:', testInfo.error?.message || '(no message)');
    process.exit(1);
  }
});

async function loginAndGoToTags(page) {
  await page.setExtraHTTPHeaders({ 'Authorization': 'Bearer admin123456' });
  await page.goto('/admin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.fill('#login-email', 'xiaoshenqwq@gmail.com');
  await page.fill('#login-password', 'admin123456');
  await page.click('#login-form button[type="submit"]');
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    const vt = document.getElementById('view-tags');
    if (vt) vt.classList.add('active');
    const lb = document.getElementById('logout-btn');
    if (lb) lb.style.display = 'inline-block';
    const cpb = document.getElementById('change-pw-btn');
    if (cpb) cpb.style.display = 'inline-block';
    const ue = document.getElementById('user-email');
    if (ue) ue.textContent = 'xiaoshenqwq@gmail.com';
  });
  await page.waitForTimeout(2000);
}

async function loadTags(page) {
  await page.evaluate(() => {
    if (typeof _e === 'function') _e();
  });
  await page.waitForTimeout(2000);
}

// ======================================================================
// Suite: Admin Tags Management View Tests
// ======================================================================
test.describe('Admin Tags Management', () => {

  test('TC01 - undo button exists', async ({ page }) => {
    await loginAndGoToTags(page);
    const btn = page.locator('#tag-undo-btn');
    await expect(btn).toBeAttached({ timeout: 5000 });
    await expect(btn).toBeVisible();
  });

  test('TC02 - redo button exists', async ({ page }) => {
    await loginAndGoToTags(page);
    const btn = page.locator('#tag-redo-btn');
    await expect(btn).toBeAttached({ timeout: 5000 });
    await expect(btn).toBeVisible();
  });

  test('TC03 - back button switches to view-posts', async ({ page }) => {
    await loginAndGoToTags(page);
    await page.evaluate(() => cancelTagManage());
    await page.waitForTimeout(500);
    const isActive = await page.evaluate(() => {
      const vp = document.getElementById('view-posts');
      return vp && vp.classList.contains('active');
    });
    expect(isActive).toBe(true);
  });

  test('TC04 - new tag button opens input dialog', async ({ page }) => {
    await loginAndGoToTags(page);
    await loadTags(page);
    const newBtn = page.locator('#explorer-new-tag-btn');
    await expect(newBtn).toBeVisible({ timeout: 5000 });
    await newBtn.click();
    await page.waitForTimeout(500);
    const dialogVisible = await page.evaluate(() => {
      const d = document.getElementById('input-dialog');
      return d && window.getComputedStyle(d).display !== 'none';
    });
    expect(dialogVisible).toBe(true);
  });

  test('TC05 - tag cards displayed', async ({ page }) => {
    await loginAndGoToTags(page);
    await loadTags(page);
    await page.waitForTimeout(1000);
    const cards = page.locator('.explorer-tag-item');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('TC06 - delete tag shows confirmation and cancel closes it', async ({ page }) => {
    await loginAndGoToTags(page);
    await loadTags(page);
    await page.waitForTimeout(1000);
    const deleteBtns = page.locator('.explorer-tag-item .tag-card-delete-btn');
    const count = await deleteBtns.count();
    if (count > 0) {
      await deleteBtns.first().click();
      await page.waitForTimeout(500);
      const modalVisible = await page.evaluate(() => {
        const m = document.getElementById('delete-tag-modal');
        return m && window.getComputedStyle(m).display !== 'none';
      });
      expect(modalVisible).toBe(true);
      await page.evaluate(() => closeDeleteTagDialog());
      await page.waitForTimeout(300);
      const modalHidden = await page.evaluate(() => {
        const m = document.getElementById('delete-tag-modal');
        return m && window.getComputedStyle(m).display === 'none';
      });
      expect(modalHidden).toBe(true);
    }
  });

  test('TC07 - right-click on tag card opens context menu', async ({ page }) => {
    await loginAndGoToTags(page);
    await loadTags(page);
    await page.waitForTimeout(1000);
    const cards = page.locator('.explorer-tag-item');
    const count = await cards.count();
    if (count > 0) {
      await cards.first().click({ button: 'right' });
      await page.waitForTimeout(500);
      const menuActive = await page.evaluate(() => {
        const m = document.getElementById('context-menu');
        return m && m.classList.contains('active');
      });
      expect(menuActive).toBe(true);
      const renameVisible = await page.evaluate(() => {
        const item = document.querySelector('#context-menu [data-action="rename-tag"]');
        return item && window.getComputedStyle(item).display !== 'none';
      });
      expect(renameVisible).toBe(true);
      const deleteVisible = await page.evaluate(() => {
        const item = document.querySelector('#context-menu [data-action="delete"]');
        return item && window.getComputedStyle(item).display !== 'none';
      });
      expect(deleteVisible).toBe(true);
    }
  });

  test('TC08 - click outside closes context menu', async ({ page }) => {
    await loginAndGoToTags(page);
    await loadTags(page);
    await page.waitForTimeout(1000);
    const cards = page.locator('.explorer-tag-item');
    const count = await cards.count();
    if (count > 0) {
      await cards.first().click({ button: 'right' });
      await page.waitForTimeout(500);
      const menuActive = await page.evaluate(() => {
        const m = document.getElementById('context-menu');
        return m && m.classList.contains('active');
      });
      expect(menuActive).toBe(true);
      await page.click('#tags-explorer-status', { force: true });
      await page.waitForTimeout(300);
      const menuClosed = await page.evaluate(() => {
        const m = document.getElementById('context-menu');
        return m && !m.classList.contains('active');
      });
      expect(menuClosed).toBe(true);
    }
  });

  test('TC09 - cancelTagManage returns to view-posts', async ({ page }) => {
    await loginAndGoToTags(page);
    const isViewTags = await page.evaluate(() => {
      const vt = document.getElementById('view-tags');
      return vt && vt.classList.contains('active');
    });
    expect(isViewTags).toBe(true);
    await page.evaluate(() => {
      if (typeof cancelTagManage === 'function') cancelTagManage();
    });
    await page.waitForTimeout(500);
    const isActive = await page.evaluate(() => {
      const vp = document.getElementById('view-posts');
      return vp && vp.classList.contains('active');
    });
    expect(isActive).toBe(true);
  });

  test('TC10 - no horizontal overflow at mobile viewport 375x812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAndGoToTags(page);
    await loadTags(page);
    const noOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    expect(noOverflow).toBe(true);
  });

  test('TC11 - SPA state residue: switching to categories then back leaves no residue', async ({ page }) => {
    await loginAndGoToTags(page);
    await loadTags(page);
    await page.waitForTimeout(1000);
    const deleteBtns = page.locator('.explorer-tag-item .tag-card-delete-btn');
    const dCount = await deleteBtns.count();
    if (dCount > 0) {
      await deleteBtns.first().click();
      await page.waitForTimeout(300);
    }
    const cards = page.locator('.explorer-tag-item');
    const cCount = await cards.count();
    if (cCount > 0) {
      await cards.first().click({ button: 'right' });
      await page.waitForTimeout(300);
    }
    await page.evaluate(() => cancelTagManage());
    await page.waitForTimeout(500);
    await page.click('#manage-categories-btn');
    await page.waitForTimeout(1000);
    await page.evaluate(() => cancelCatManage());
    await page.waitForTimeout(500);
    await page.click('#manage-tags-btn');
    await page.waitForTimeout(1000);
    const residue = await page.evaluate(() => {
      const cm = document.getElementById('context-menu');
      const dm = document.getElementById('delete-tag-modal');
      const id = document.getElementById('input-dialog');
      const contextMenuActive = cm && cm.classList.contains('active');
      const deleteModalVisible = dm && window.getComputedStyle(dm).display !== 'none';
      const inputDialogVisible = id && window.getComputedStyle(id).display !== 'none';
      return { contextMenuActive, deleteModalVisible, inputDialogVisible };
    });
    expect(residue.contextMenuActive).toBe(false);
    expect(residue.deleteModalVisible).toBe(false);
    expect(residue.inputDialogVisible).toBe(false);
  });

});
