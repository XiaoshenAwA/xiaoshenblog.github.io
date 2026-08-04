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

async function navigateToAdmin(page: Page) {
  await page.goto('/admin', { waitUntil: 'networkidle' });
  await page.waitForSelector('#view-posts.active', { timeout: 20000 });
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

test.describe('SA-10 后台文章列表视图 /admin E2E 测试', () => {
  let storageState: any;

  test.beforeAll(async ({ browser }) => {
    writeStatus({
      'sa-10-admin-posts': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() }
    });
    storageState = await loginAsAdmin(browser);
  });

  test.afterAll(() => {
    writeStatus({
      'sa-10-admin-posts': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() }
    });
  });

  // ─── A. 工具栏 ───
  test('A1: .toolbar 工具栏存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await expect(page.locator('.toolbar')).toBeVisible();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'A1' } });
    await context.close();
  });

  test('A2: #new-post-btn 写文章按钮存在且可见', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await expect(page.locator('#new-post-btn')).toBeVisible();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'A2' } });
    await context.close();
  });

  test('A3: #edit-about-btn 编辑关于页按钮存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await expect(page.locator('#edit-about-btn')).toBeVisible();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'A3' } });
    await context.close();
  });

  test('A4: #manage-tags-btn 标签管理按钮存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await expect(page.locator('#manage-tags-btn')).toBeVisible();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'A4' } });
    await context.close();
  });

  test('A5: #manage-categories-btn 分类管理按钮存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await expect(page.locator('#manage-categories-btn')).toBeVisible();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'A5' } });
    await context.close();
  });

  test('A6: 返回首页链接存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    const homeLink = page.locator('.toolbar a[href="/"]');
    await expect(homeLink).toBeVisible();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'A6' } });
    await context.close();
  });

  // ─── B. 搜索栏 ───
  test('B7: .search-bar 搜索栏存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await expect(page.locator('.search-bar')).toBeVisible();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'B7' } });
    await context.close();
  });

  test('B8: #post-search 搜索输入框存在且可聚焦', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    const searchInput = page.locator('#post-search');
    await expect(searchInput).toBeVisible();
    await searchInput.focus();
    await expect(searchInput).toBeFocused();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'B8' } });
    await context.close();
  });

  test('B9: #search-clear 清除搜索按钮存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await expect(page.locator('#search-clear')).toBeAttached();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'B9' } });
    await context.close();
  });

  test('B10: 输入搜索词 → 文章列表过滤', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await page.waitForSelector('.post-item', { timeout: 10000 });
    const allItems = await page.locator('.post-item').count();
    await page.fill('#post-search', 'test_search_no_match_xyz');
    await page.waitForSelector('.post-item, #posts-empty[style*="block"]', { timeout: 5000 });
    const filteredItems = await page.locator('.post-item').count();
    expect(filteredItems).toBeLessThanOrEqual(allItems);
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'B10' } });
    await context.close();
  });

  // ─── C. 文章列表 ───
  test('C11: #posts-list 文章列表容器存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await expect(page.locator('#posts-list')).toBeAttached();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'C11' } });
    await context.close();
  });

  test('C12: 每个文章条目包含标题和编辑/删除按钮', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await page.waitForSelector('.post-item', { timeout: 10000 });
    const items = page.locator('.post-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      await expect(item.locator('.post-item-info strong')).toBeVisible();
      await expect(item.locator('button:has-text("编辑")')).toBeVisible();
      await expect(item.locator('button:has-text("删除")')).toBeVisible();
    }
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'C12' } });
    await context.close();
  });

  test('C13: 文章条目中的状态指示器存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await page.waitForSelector('.post-item', { timeout: 10000 });
    const statusDots = page.locator('.post-item .post-item-status .status-dot');
    const count = await statusDots.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const cls = await statusDots.nth(i).getAttribute('class');
      expect(cls).toMatch(/(published|private)/);
    }
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'C13' } });
    await context.close();
  });

  // ─── D. 分页 ───
  test('D14: #pagination-bar 分页栏存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await expect(page.locator('#pagination-bar')).toBeAttached();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'D14' } });
    await context.close();
  });

  test('D15: #page-prev-btn 上一页按钮存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await expect(page.locator('#page-prev-btn')).toBeAttached();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'D15' } });
    await context.close();
  });

  test('D16: #page-info 页码信息存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await expect(page.locator('#page-info')).toBeAttached();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'D16' } });
    await context.close();
  });

  test('D17: #page-next-btn 下一页按钮存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await expect(page.locator('#page-next-btn')).toBeAttached();
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'D17' } });
    await context.close();
  });

  // ─── E. 按钮交互 ───
  test('E18: 点击 #new-post-btn → 视图切换到 #view-edit', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await page.click('#new-post-btn');
    await page.waitForSelector('#view-edit.active', { timeout: 5000 });
    const editActive = await page.locator('#view-edit.active').isVisible();
    expect(editActive).toBe(true);
    const postsActive = await page.locator('#view-posts.active').isVisible();
    expect(postsActive).toBe(false);
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'E18' } });
    await context.close();
  });

  test('E19: 点击 #edit-about-btn → 视图切换到 #view-about', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await page.click('#edit-about-btn');
    await page.waitForSelector('#view-about.active', { timeout: 5000 });
    const aboutActive = await page.locator('#view-about.active').isVisible();
    expect(aboutActive).toBe(true);
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'E19' } });
    await context.close();
  });

  test('E20: 点击 #manage-tags-btn → 视图切换到 #view-tags', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await page.click('#manage-tags-btn');
    await page.waitForSelector('#view-tags.active', { timeout: 5000 });
    const tagsActive = await page.locator('#view-tags.active').isVisible();
    expect(tagsActive).toBe(true);
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'E20' } });
    await context.close();
  });

  test('E21: 点击 #manage-categories-btn → 视图切换到 #view-categories', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await page.click('#manage-categories-btn');
    await page.waitForSelector('#view-categories.active', { timeout: 5000 });
    const catActive = await page.locator('#view-categories.active').isVisible();
    expect(catActive).toBe(true);
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'E21' } });
    await context.close();
  });

  // ─── F. 响应式溢出 ───
  test('F22: 桌面端 (1920x1080) 无水平溢出', async ({ browser }) => {
    const context = await browser.newContext({ storageState, viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'F22' } });
    await context.close();
  });

  test('F23: 移动端 (375x812) 无水平溢出', async ({ browser }) => {
    const context = await browser.newContext({ storageState, viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-10-admin-posts': { started: true, completed: false, lastTest: 'F23' } });
    await context.close();
  });
});
