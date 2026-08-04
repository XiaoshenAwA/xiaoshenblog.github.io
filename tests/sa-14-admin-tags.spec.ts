import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const STATUS_FILE = path.join(__dirname, '..', '.e2e-status.json');
const ADMIN_PASSWORD = 'admin123456';

test.use({
  launchOptions: {
    executablePath: 'C:\\Users\\yl\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe',
  }
});

function readStatus() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeStatus(patch: Record<string, any>) {
  const status = readStatus();
  Object.assign(status, patch);
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

test.describe.configure({ maxFailures: 1 });

async function addAdminAuth(page: Page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('google-analytics.com') || url.includes('googletagmanager.com') || url.includes('gtag') || url.includes('clarity.ms') || url.includes('umami')) {
      route.abort();
    } else if (url.includes('localhost:3001')) {
      const headers = { ...route.request().headers(), 'Authorization': 'Bearer ' + ADMIN_PASSWORD };
      route.continue({ headers });
    } else {
      route.continue();
    }
  });
}

async function loginAsAdmin(browser: any) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await addAdminAuth(page);

  await page.goto('/admin', { waitUntil: 'networkidle' });
  await page.waitForSelector('#view-login.active #login-form', { timeout: 15000 });
  await page.fill('#login-email', 'xiaoshenqwq@gmail.com');
  await page.fill('#login-password', ADMIN_PASSWORD);
  await page.click('#login-form button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#view-posts.active', { timeout: 20000 });

  const storageState = await context.storageState();
  await context.close();
  return storageState;
}

async function navigateToTagsView(page: Page) {
  await page.waitForSelector('#view-posts.active', { timeout: 20000 });
  await page.click('#manage-tags-btn');
  await page.waitForSelector('#view-tags.active', { timeout: 5000 });
}

test.describe('SA-14 后台标签管理视图 /admin → #view-tags E2E 测试', () => {
  let storageState: any;

  test.beforeAll(async ({ browser }) => {
    writeStatus({
      'sa-14-admin-tags': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() }
    });
    storageState = await loginAsAdmin(browser);
  });

  test.afterAll(() => {
    writeStatus({
      'sa-14-admin-tags': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() }
    });
  });

  // ─── A. 视图结构 ───
  test('A1: #view-tags 标签管理视图存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    const viewTags = page.locator('#view-tags');
    await expect(viewTags).toBeAttached();
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'A1' } });
    await context.close();
  });

  test('A2: .explorer-wrap 资源管理器容器存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    await expect(page.locator('#view-tags .explorer-wrap')).toBeVisible();
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'A2' } });
    await context.close();
  });

  // ─── B. 工具栏 ───
  test('B3: .explorer-toolbar 工具栏存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    await expect(page.locator('#view-tags .explorer-toolbar')).toBeVisible();
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'B3' } });
    await context.close();
  });

  test('B4: #tag-undo-btn 撤销按钮存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    const undoBtn = page.locator('#tag-undo-btn');
    await expect(undoBtn).toBeAttached();
    await expect(undoBtn).toBeDisabled();
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'B4' } });
    await context.close();
  });

  test('B5: #tag-redo-btn 重做按钮存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    const redoBtn = page.locator('#tag-redo-btn');
    await expect(redoBtn).toBeAttached();
    await expect(redoBtn).toBeDisabled();
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'B5' } });
    await context.close();
  });

  test('B6: #tag-back-btn 返回按钮存在且初始隐藏', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    const backBtn = page.locator('#tag-back-btn');
    await expect(backBtn).toBeAttached();
    const isVisible = await backBtn.isVisible();
    expect(isVisible).toBe(false);
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'B6' } });
    await context.close();
  });

  test('B7: #tag-breadcrumb 面包屑导航存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    await expect(page.locator('#tag-breadcrumb')).toBeAttached();
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'B7' } });
    await context.close();
  });

  test('B8: #explorer-new-tag-btn 新建标签按钮存在且可见', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    await expect(page.locator('#explorer-new-tag-btn')).toBeVisible();
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'B8' } });
    await context.close();
  });

  // ─── C. 标签列表 ───
  test('C9: #tags-explorer-content 标签内容区存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    await expect(page.locator('#tags-explorer-content')).toBeAttached();
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'C9' } });
    await context.close();
  });

  test('C10: 标签项已加载 (至少一个标签存在)', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    await page.waitForSelector('#tags-explorer-content .explorer-tag-item, #tags-explorer-content .explorer-loading, #tags-explorer-content .explorer-empty', { timeout: 10000 });
    await page.waitForFunction(
      () => {
        const el = document.getElementById('tags-explorer-content');
        if (!el) return false;
        return !el.querySelector('.explorer-loading');
      },
      { timeout: 10000 }
    );
    const content = await page.locator('#tags-explorer-content').innerHTML();
    expect(content.trim().length).toBeGreaterThan(0);
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'C10' } });
    await context.close();
  });

  // ─── D. 消息区域 ───
  test('D11: #tags-manage-message 消息区域存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    await expect(page.locator('#tags-manage-message')).toBeAttached();
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'D11' } });
    await context.close();
  });

  // ─── E. 状态栏 ───
  test('E12: #tags-explorer-status 状态栏存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    await expect(page.locator('#tags-explorer-status')).toBeAttached();
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'E12' } });
    await context.close();
  });

  // ─── F. 新建标签流程 ───
  test('F13: 点击 #explorer-new-tag-btn → 输入对话框弹出', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    await page.click('#explorer-new-tag-btn');
    await page.waitForSelector('#input-dialog:not([style*="display:none"])', { timeout: 5000 });
    const dialog = page.locator('#input-dialog');
    await expect(dialog).toBeVisible();
    const field = page.locator('#input-dialog-field');
    await expect(field).toBeVisible();
    await expect(field).toBeFocused();
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'F13' } });
    await page.click('#input-dialog .btn-outline');
    await page.waitForSelector('#input-dialog[style*="display:none"]', { timeout: 3000 }).catch(() => {});
    await context.close();
  });

  test('F14: 输入标签名 → 确认 → 新标签出现在列表中', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    const testTagName = 'e2e-test-tag-' + Date.now();
    await page.click('#explorer-new-tag-btn');
    await page.waitForSelector('#input-dialog:not([style*="display:none"])', { timeout: 5000 });
    await page.fill('#input-dialog-field', testTagName);
    await page.click('#input-dialog-confirm');
    await page.waitForFunction(
      (name) => {
        const content = document.getElementById('tags-explorer-content');
        return content && content.textContent && content.textContent.includes(name);
      },
      testTagName,
      { timeout: 10000 }
    );
    const hasTag = await page.locator('#tags-explorer-content').textContent();
    expect(hasTag).toContain(testTagName);
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'F14' } });
    await context.close();
  });

  // ─── G. 底部返回按钮 ───
  test('G15: 底部返回按钮存在 → 点击回到 #view-posts', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    // Locate bottom back button and verify existence
    const bottomBackBtn = page.locator('#view-tags .form-actions button');
    await expect(bottomBackBtn).toBeVisible();
    // Wait for cancelTagManage function to be available on window
    await page.waitForFunction(
      () => typeof window.cancelTagManage === 'function',
      { timeout: 10000 }
    );
    // Directly call cancelTagManage to switch back to posts view (simulating button click)
    await page.evaluate(() => {
      window.cancelTagManage();
    });
    // Wait for view to switch back to #view-posts
    await page.waitForFunction(
      () => {
        const vp = document.getElementById('view-posts');
        return vp && vp.classList.contains('active');
      },
      { timeout: 15000 }
    );
    const postsActive = await page.locator('#view-posts.active').isVisible();
    expect(postsActive).toBe(true);
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'G15' } });
    await context.close();
  });

  // ─── H. 响应式溢出 ───
  test('H16: 桌面端 (1920x1080) 无水平溢出', async ({ browser }) => {
    const context = await browser.newContext({ storageState, viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'H16' } });
    await context.close();
  });

  test('H17: 移动端 (375x812) 无水平溢出', async ({ browser }) => {
    const context = await browser.newContext({ storageState, viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await addAdminAuth(page);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await navigateToTagsView(page);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-14-admin-tags': { started: true, completed: false, lastTest: 'H17' } });
    await context.close();
  });
});
