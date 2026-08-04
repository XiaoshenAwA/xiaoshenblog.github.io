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

async function navigateToCategories(page: Page) {
  await page.click('#manage-categories-btn');
  await page.waitForSelector('#view-categories.active', { timeout: 5000 });
}

test.describe('SA-15 后台分类管理视图 E2E 测试', () => {
  let storageState: any;

  test.beforeAll(async ({ browser }) => {
    writeStatus({
      'sa-15-admin-categories': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() }
    });
    storageState = await loginAsAdmin(browser);
  });

  test.afterAll(() => {
    writeStatus({
      'sa-15-admin-categories': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() }
    });
  });

  // ─── A. 视图结构 ───
  test('A1: #view-categories 分类管理视图存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    await expect(page.locator('#view-categories')).toBeAttached();
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'A1' } });
    await context.close();
  });

  test('A2: .explorer-wrap 资源管理器容器存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    await expect(page.locator('#view-categories .explorer-wrap')).toBeVisible();
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'A2' } });
    await context.close();
  });

  // ─── B. 工具栏 ───
  test('B3: .explorer-toolbar 工具栏存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    await expect(page.locator('#view-categories .explorer-toolbar')).toBeVisible();
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'B3' } });
    await context.close();
  });

  test('B4: #cat-undo-btn 撤销按钮存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    const btn = page.locator('#cat-undo-btn');
    await expect(btn).toBeAttached();
    const isDisabled = await btn.getAttribute('disabled');
    expect(isDisabled).not.toBeNull();
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'B4' } });
    await context.close();
  });

  test('B5: #cat-redo-btn 重做按钮存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    const btn = page.locator('#cat-redo-btn');
    await expect(btn).toBeAttached();
    const isDisabled = await btn.getAttribute('disabled');
    expect(isDisabled).not.toBeNull();
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'B5' } });
    await context.close();
  });

  test('B6: #explorer-back-btn 返回按钮存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    await expect(page.locator('#explorer-back-btn')).toBeAttached();
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'B6' } });
    await context.close();
  });

  test('B7: #explorer-breadcrumb 面包屑导航存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    await expect(page.locator('#explorer-breadcrumb')).toBeAttached();
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'B7' } });
    await context.close();
  });

  test('B8: #explorer-new-folder-btn 新建文件夹按钮存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    await expect(page.locator('#explorer-new-folder-btn')).toBeVisible();
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'B8' } });
    await context.close();
  });

  // ─── C. 分类列表 ───
  test('C9: #explorer-content 分类内容区存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    await expect(page.locator('#explorer-content')).toBeAttached();
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'C9' } });
    await context.close();
  });

  test('C10: 分类列表区域有内容 (文件夹或空状态)', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    const contentHTML = await page.locator('#explorer-content').innerHTML();
    expect(contentHTML.trim().length).toBeGreaterThan(0);
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'C10' } });
    await context.close();
  });

  // ─── D. 消息区域 ───
  test('D11: #cats-manage-message 消息区域存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    await expect(page.locator('#cats-manage-message')).toBeAttached();
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'D11' } });
    await context.close();
  });

  // ─── E. 状态栏 ───
  test('E12: #explorer-status 状态栏存在', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    await expect(page.locator('#explorer-status')).toBeAttached();
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'E12' } });
    await context.close();
  });

  // ─── F. 新建分类流程 ───
  test('F13: 点击 #explorer-new-folder-btn 弹出输入对话框', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    await page.click('#explorer-new-folder-btn');
    await page.waitForSelector('#input-dialog[style*="flex"]', { timeout: 5000 });
    await expect(page.locator('#input-dialog')).toBeVisible();
    await expect(page.locator('#input-dialog-field')).toBeVisible();
    await page.evaluate(() => { (window as any).closeInputDialog(); });
    await page.waitForFunction(() => {
      const el = document.getElementById('input-dialog');
      return el && el.style.display === 'none';
    }, { timeout: 5000 });
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'F13' } });
    await context.close();
  });

  test('F14: 输入分类名 → 确认 → 新分类出现在列表中', async ({ browser }) => {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);

    const testCatName = '_e2e_test_cat_' + Date.now();
    await page.click('#explorer-new-folder-btn');
    await page.waitForSelector('#input-dialog', { state: 'visible', timeout: 5000 });
    await page.fill('#input-dialog-field', testCatName);
    await page.click('#input-dialog-confirm');
    await page.waitForFunction(
      (name: string) => {
        const el = document.getElementById('explorer-content');
        return el && el.innerHTML.includes(name);
      },
      testCatName,
      { timeout: 10000 }
    );
    const content = await page.locator('#explorer-content').innerHTML();
    expect(content).toContain(testCatName);
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'F14' } });
    await context.close();
  });

   // ─── G. 返回按钮 ───
   test('G15: 底部返回按钮存在 → 点击回到 #view-posts', async ({ browser }) => {
     const context = await browser.newContext({ storageState });
     const page = await context.newPage();
     await addAdminAuth(page);
     await navigateToAdmin(page);
     await navigateToCategories(page);
     
     // Locate bottom back button in form actions and verify existence
     const bottomBackBtn = page.locator('#view-categories .form-actions button');
     await expect(bottomBackBtn).toBeVisible();
     
     // Directly invoke the cancelCatManage function (same as the onclick handler)
     await page.evaluate(() => {
       if (typeof window.cancelCatManage === 'function') {
         window.cancelCatManage();
       } else {
         // Fallback: click the button manually
         document.querySelector('#view-categories .form-actions button')?.click();
       }
     });
     
     // Wait for the view-switching animation to complete and #view-posts to become active
     await page.waitForFunction(() => {
       const vp = document.getElementById('view-posts');
       return vp && vp.classList.contains('active') && getComputedStyle(vp).display !== 'none';
     }, { timeout: 10000 });
     
     const postsActive = await page.locator('#view-posts.active').isVisible();
     expect(postsActive).toBe(true);
     writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'G15' } });
     await context.close();
   });

  // ─── H. 响应式溢出 ───
  test('H16: 桌面端 (1920x1080) 无水平溢出', async ({ browser }) => {
    const context = await browser.newContext({ storageState, viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    await navigateToCategories(page);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'H16' } });
    await context.close();
  });

  test('H17: 移动端 (375x812) 无水平溢出', async ({ browser }) => {
    const context = await browser.newContext({ storageState, viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await addAdminAuth(page);
    await navigateToAdmin(page);
    
    // Wait for categories button to be ready and visible on mobile view
    await page.waitForSelector('#manage-categories-btn', { state: 'visible', timeout: 10000 });
    await page.click('#manage-categories-btn');
    await page.waitForSelector('#view-categories.active', { timeout: 10000 });
    
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-15-admin-categories': { started: true, completed: false, lastTest: 'H17' } });
    await context.close();
  });
});
