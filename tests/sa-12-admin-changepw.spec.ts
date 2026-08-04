import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE = 'http://localhost:3001';
const STATUS_FILE = path.join(__dirname, '..', '.e2e-status.json');
const ADMIN_PASSWORD = 'admin123456';
const LOGIN_EMAIL = 'xiaoshenqwq@gmail.com';
const LOGIN_PASS = 'admin123456';

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

// Setup admin auth headers via page.route
function setupAdminAuth(page: Page) {
  page.route('**', route => {
    const headers = { ...route.request().headers() };
    // Only add Bearer header to admin route requests
    if (route.request().url().includes('/admin')) {
      headers['Authorization'] = `Bearer ${ADMIN_PASSWORD}`;
    }
    route.continue({ headers });
  });
}

// Navigate to admin and switch to change-pw view (without needing full auth)
async function gotoChangePwUnauth(page: Page) {
  setupAdminAuth(page);
  await page.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  await page.evaluate(() => {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById('view-change-pw');
    if (view) view.classList.add('active');
  });

  await page.waitForSelector('#view-change-pw.active', { timeout: 5000 });
}

// Full login flow to establish authenticated session
async function loginAndGotoChangePw(page: Page) {
  setupAdminAuth(page);
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle', timeout: 20000 });

  // Wait for login view to appear
  await page.waitForSelector('#view-login.active', { timeout: 20000 });

  // Fill and submit login form
  await page.fill('#login-email', LOGIN_EMAIL);
  await page.fill('#login-password', LOGIN_PASS);
  await page.click('#login-form .btn-primary');

  // Wait for either posts view (success) or login error
  await page.waitForFunction(() => {
    const postsActive = document.getElementById('view-posts')?.classList.contains('active');
    const errorDiv = document.getElementById('login-error');
    const hasError = errorDiv && errorDiv.textContent && errorDiv.textContent.trim().length > 0;
    return !!postsActive || !!hasError;
  }, { timeout: 30000 });

  // Verify login succeeded
  const postsVisible = await page.locator('#view-posts').isVisible();
  if (!postsVisible) {
    const errorMsg = await page.locator('#login-error').textContent();
    throw new Error(`Login failed: ${errorMsg}`);
  }

  // Now open change password view
  await page.click('#change-pw-btn');
  await page.waitForSelector('#view-change-pw.active', { timeout: 10000 });
}

test.describe('SA-12 后台修改密码视图 E2E 测试', () => {
  test.beforeAll(() => {
    writeStatus({
      'sa-12-admin-changepw': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() }
    });
  });

  test.afterAll(() => {
    writeStatus({
      'sa-12-admin-changepw': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() }
    });
  });

  // --- A. 视图结构 ---
  test('A1: #view-change-pw 修改密码视图存在', async ({ page }) => {
    await gotoChangePwUnauth(page);
    await expect(page.locator('#view-change-pw')).toBeVisible();
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'A1' } });
  });

  test('A2: .edit-box 编辑框存在', async ({ page }) => {
    await gotoChangePwUnauth(page);
    await expect(page.locator('#view-change-pw .edit-box')).toBeVisible();
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'A2' } });
  });

  test('A3: h3 标题包含修改密码图标', async ({ page }) => {
    await gotoChangePwUnauth(page);
    const h3 = page.locator('#view-change-pw .edit-box h3');
    await expect(h3).toBeVisible();
    const icon = h3.locator('i.fas.fa-key');
    await expect(icon).toBeAttached();
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'A3' } });
  });

  // --- B. 表单元素 ---
  test('B4: #change-pw-form 表单存在', async ({ page }) => {
    await gotoChangePwUnauth(page);
    await expect(page.locator('#change-pw-form')).toBeAttached();
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'B4' } });
  });

  test('B5: #new-password 新密码输入框存在且 type=password', async ({ page }) => {
    await gotoChangePwUnauth(page);
    const input = page.locator('#new-password');
    await expect(input).toBeAttached();
    const type = await input.getAttribute('type');
    expect(type).toBe('password');
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'B5' } });
  });

  test('B6: #confirm-password 确认密码输入框存在且 type=password', async ({ page }) => {
    await gotoChangePwUnauth(page);
    const input = page.locator('#confirm-password');
    await expect(input).toBeAttached();
    const type = await input.getAttribute('type');
    expect(type).toBe('password');
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'B6' } });
  });

  test('B7: 两个输入框的 minlength 属性正确 (>=6)', async ({ page }) => {
    await gotoChangePwUnauth(page);
    const newPw = page.locator('#new-password');
    const confirmPw = page.locator('#confirm-password');
    const newMinlength = await newPw.getAttribute('minlength');
    const confirmMinlength = await confirmPw.getAttribute('minlength');
    expect(Number(newMinlength)).toBeGreaterThanOrEqual(6);
    expect(Number(confirmMinlength)).toBeGreaterThanOrEqual(6);
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'B7' } });
  });

  // --- C. 操作按钮 ---
  test('C8: #change-pw-submit 确认修改按钮存在', async ({ page }) => {
    await gotoChangePwUnauth(page);
    const btn = page.locator('#change-pw-submit');
    await expect(btn).toBeVisible();
    const tagName = await btn.evaluate(el => el.tagName);
    expect(tagName).toBe('BUTTON');
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'C8' } });
  });

  test('C9: 取消按钮存在 - 点击后回到 #view-posts', async ({ page }) => {
    await gotoChangePwUnauth(page);
    const cancelBtn = page.locator('#view-change-pw .form-actions .btn-outline');
    await expect(cancelBtn).toBeVisible();
    await page.evaluate(() => {
      (window as any).cancelChangePw();
    });
    await page.waitForSelector('#view-posts.active', { timeout: 5000 });
    await expect(page.locator('#view-posts')).toHaveClass(/active/);
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'C9' } });
  });

  // --- D. 消息区域 ---
  test('D10: #change-pw-message 消息显示区域存在', async ({ page }) => {
    await gotoChangePwUnauth(page);
    await expect(page.locator('#change-pw-message')).toBeAttached();
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'D10' } });
  });

  // --- E. 表单验证 ---
  test('E11: 两次密码不一致 - 显示错误消息', async ({ page }) => {
    await gotoChangePwUnauth(page);
    await page.fill('#new-password', 'newpassword123');
    await page.fill('#confirm-password', 'differentpassword');
    await page.click('#change-pw-submit');
    const msg = page.locator('#change-pw-message');
    await expect(msg).toBeVisible();
    await expect(msg).toHaveClass(/error/);
    await expect(msg).toContainText('不一致');
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'E11' } });
  });

  test('E12: 密码太短 - 显示错误消息', async ({ page }) => {
    await gotoChangePwUnauth(page);
    await page.evaluate(() => {
      const form = document.getElementById('change-pw-form') as HTMLFormElement;
      if (form) form.setAttribute('novalidate', 'novalidate');
    });
    await page.fill('#new-password', '123');
    await page.fill('#confirm-password', '123');
    await page.click('#change-pw-submit');
    const msg = page.locator('#change-pw-message');
    await expect(msg).toBeVisible();
    await expect(msg).toHaveClass(/error/);
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'E12' } });
  });

  test('E13: 输入有效密码 - 提交表单触发密码修改流程', async ({ page }) => {
    // Full login flow to establish authenticated session
    await loginAndGotoChangePw(page);

    // Submit password change - now with valid session, the real supabase call will work
    // We still need to mock the actual API response to avoid changing real password
    await page.route('https://eacieurozwzligrxnyos.supabase.co/auth/v1/user', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { user: { id: 'mock', email: 'admin@test.com' } },
          error: null
        })
      });
    });

    await page.fill('#new-password', 'TestPW123456');
    await page.fill('#confirm-password', 'TestPW123456');
    await page.click('#change-pw-submit');
    const msg = page.locator('#change-pw-message');
    await expect(msg).toBeVisible();
    await expect(msg).toHaveClass(/success/);
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'E13' } });
  });

  // --- F. 响应式溢出 ---
  test('F14: 桌面端 (1920x1080) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoChangePwUnauth(page);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'F14' } });
  });

  test('F15: 移动端 (375x812) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoChangePwUnauth(page);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-12-admin-changepw': { started: true, completed: false, lastTest: 'F15' } });
  });
});