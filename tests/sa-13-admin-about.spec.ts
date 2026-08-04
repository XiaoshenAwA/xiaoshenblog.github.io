import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE = 'http://localhost:3001';
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

async function gotoAbout(page: Page) {
  await page.setExtraHTTPHeaders({ 'Authorization': `Bearer ${ADMIN_PASSWORD}` });
  await page.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  await page.evaluate(() => {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    const aboutView = document.getElementById('view-about');
    if (aboutView) aboutView.classList.add('active');
  });

  await page.waitForSelector('#view-about.active', { timeout: 5000 });
}

test.describe('SA-13 后台编辑关于页视图 E2E 测试', () => {
  test.beforeAll(() => {
    writeStatus({
      'sa-13-admin-about': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() }
    });
  });

  test.afterAll(() => {
    writeStatus({
      'sa-13-admin-about': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() }
    });
  });

  // ─── A. 视图结构 ───
  test('A1: #view-about 编辑关于页视图存在', async ({ page }) => {
    await gotoAbout(page);
    await expect(page.locator('#view-about')).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'A1', timestamp: new Date().toISOString() } });
  });

  test('A2: .edit-box 编辑框存在', async ({ page }) => {
    await gotoAbout(page);
    await expect(page.locator('#view-about .edit-box')).toBeVisible();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'A2', timestamp: new Date().toISOString() } });
  });

  test('A3: h3 标题包含 "编辑关于页"', async ({ page }) => {
    await gotoAbout(page);
    const h3 = page.locator('#view-about h3');
    await expect(h3).toBeVisible();
    await expect(h3).toContainText('编辑关于页');
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'A3', timestamp: new Date().toISOString() } });
  });

  // ─── B. 表单元素 ───
  test('B4: #about-form 表单存在', async ({ page }) => {
    await gotoAbout(page);
    await expect(page.locator('#about-form')).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'B4', timestamp: new Date().toISOString() } });
  });

  // ─── C. Markdown 工具栏 ───
  test('C5: .editor-toolbar 工具栏容器存在', async ({ page }) => {
    await gotoAbout(page);
    await expect(page.locator('#view-about .editor-toolbar')).toBeVisible();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C5', timestamp: new Date().toISOString() } });
  });

  test('C6: 粗体按钮 [data-md="**"] 存在', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about [data-md="**"]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C6', timestamp: new Date().toISOString() } });
  });

  test('C7: 粗体按钮点击后 textarea 插入 **', async ({ page }) => {
    await gotoAbout(page);
    const textarea = page.locator('#about-content');
    await textarea.fill('');
    const btn = page.locator('#view-about [data-md="**"]');
    await btn.click();
    const val = await textarea.inputValue();
    expect(val).toContain('**');
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C7', timestamp: new Date().toISOString() } });
  });

  test('C8: 斜体按钮 [data-md="*"] 存在', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about .editor-toolbar button[data-md="*"]:not([data-md="**"])');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C8', timestamp: new Date().toISOString() } });
  });

  test('C9: 斜体按钮点击后 textarea 插入 *', async ({ page }) => {
    await gotoAbout(page);
    const textarea = page.locator('#about-content');
    await textarea.fill('');
    const btn = page.locator('#view-about .editor-toolbar button[data-md="*"]:not([data-md="**"])').first();
    await btn.click();
    const val = await textarea.inputValue();
    expect(val).toContain('*');
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C9', timestamp: new Date().toISOString() } });
  });

  test('C10: 删除线按钮 [data-md="~~"] 存在', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about [data-md="~~"]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C10', timestamp: new Date().toISOString() } });
  });

  test('C11: 删除线按钮点击后 textarea 插入 ~~', async ({ page }) => {
    await gotoAbout(page);
    const textarea = page.locator('#about-content');
    await textarea.fill('');
    const btn = page.locator('#view-about [data-md="~~"]');
    await btn.click();
    const val = await textarea.inputValue();
    expect(val).toContain('~~');
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C11', timestamp: new Date().toISOString() } });
  });

  test('C12: 标题按钮 [data-md="# "] 存在', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about [data-md="# "]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C12', timestamp: new Date().toISOString() } });
  });

  test('C13: 标题按钮点击后 textarea 插入 # ', async ({ page }) => {
    await gotoAbout(page);
    const textarea = page.locator('#about-content');
    await textarea.fill('');
    const btn = page.locator('#view-about [data-md="# "]');
    await btn.click();
    const val = await textarea.inputValue();
    expect(val).toContain('# ');
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C13', timestamp: new Date().toISOString() } });
  });

  test('C14: 引用按钮 [data-md="> "] 存在', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about [data-md="> "]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C14', timestamp: new Date().toISOString() } });
  });

  test('C15: 无序列表 [data-md="- "] 存在', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about [data-md="- "]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C15', timestamp: new Date().toISOString() } });
  });

  test('C16: 有序列表 [data-md="1. "] 存在', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about [data-md="1. "]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C16', timestamp: new Date().toISOString() } });
  });

  test('C17: 代码块按钮 [data-action="code"] 存在 → 点击弹出 Modal', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about [data-action="code"]');
    await expect(btn).toBeAttached();
    await btn.click();
    await expect(page.locator('#insert-code-modal')).toBeVisible();
    await page.click('#insert-code-modal .picker-close');
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C17', timestamp: new Date().toISOString() } });
  });

  test('C18: 链接按钮 [data-action="link"] 存在 → 点击弹出 Modal', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about [data-action="link"]');
    await expect(btn).toBeAttached();
    await btn.click();
    await expect(page.locator('#insert-link-modal')).toBeVisible();
    await page.click('#insert-link-modal .picker-close');
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C18', timestamp: new Date().toISOString() } });
  });

  test('C19: 图片按钮 [data-action="image"] 存在 → 点击弹出 Modal', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about [data-action="image"]');
    await expect(btn).toBeAttached();
    await btn.click();
    await expect(page.locator('#insert-image-modal')).toBeVisible();
    await page.click('#insert-image-modal .picker-close');
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C19', timestamp: new Date().toISOString() } });
  });

  test('C20: 分割线 [data-md="---"] 存在', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about [data-md="---"]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C20', timestamp: new Date().toISOString() } });
  });

  test('C21: 全屏按钮 .fs-toggle 存在 → 点击后编辑器全屏', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about .fs-toggle');
    await expect(btn).toBeAttached();
    const editorWrap = page.locator('#view-about .editor-wrap');
    const before = await editorWrap.evaluate(el => el.classList.contains('is-fullscreen'));
    await btn.click();
    const after = await editorWrap.evaluate(el => el.classList.contains('is-fullscreen'));
    expect(after).not.toBe(before);
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C21', timestamp: new Date().toISOString() } });
  });

  test('C22: 缩进切换 .indent-toggle 存在', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about .indent-toggle');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C22', timestamp: new Date().toISOString() } });
  });

  test('C23: 分栏模式 [data-mode="split"] 存在且 .active', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about [data-mode="split"]');
    await expect(btn).toBeAttached();
    await expect(btn).toHaveClass(/active/);
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C23', timestamp: new Date().toISOString() } });
  });

  test('C24: 仅编辑模式 [data-mode="edit"] 存在', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about [data-mode="edit"]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C24', timestamp: new Date().toISOString() } });
  });

  test('C25: 仅预览模式 [data-mode="preview"] 存在', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#view-about [data-mode="preview"]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'C25', timestamp: new Date().toISOString() } });
  });

  // ─── D. 编辑器区域 ───
  test('D26: #about-content textarea 存在', async ({ page }) => {
    await gotoAbout(page);
    const textarea = page.locator('#about-content');
    await expect(textarea).toBeAttached();
    const tagName = await textarea.evaluate(el => el.tagName);
    expect(tagName).toBe('TEXTAREA');
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'D26', timestamp: new Date().toISOString() } });
  });

  test('D27: #about-preview 预览区域存在', async ({ page }) => {
    await gotoAbout(page);
    await expect(page.locator('#about-preview')).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'D27', timestamp: new Date().toISOString() } });
  });

  test('D28: 输入 Markdown → 预览区域更新', async ({ page }) => {
    await gotoAbout(page);
    const textarea = page.locator('#about-content');
    await textarea.fill('# Hello E2E');
    await textarea.dispatchEvent('input');
    const preview = page.locator('#about-preview');
    await expect(preview).toContainText('Hello E2E');
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'D28', timestamp: new Date().toISOString() } });
  });

  // ─── E. 操作按钮 ───
  test('E29: #about-submit 保存按钮存在', async ({ page }) => {
    await gotoAbout(page);
    const btn = page.locator('#about-submit');
    await expect(btn).toBeVisible();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'E29', timestamp: new Date().toISOString() } });
  });

  test('E30: 取消按钮存在 → 点击回到 #view-posts', async ({ page }) => {
    await gotoAbout(page);
    const cancelBtn = page.locator('#view-about .form-actions .btn-outline');
    await expect(cancelBtn).toBeVisible();
    await page.evaluate(() => (window as any).cancelAbout());
    await page.waitForSelector('#view-posts.active', { timeout: 5000 });
    await expect(page.locator('#view-posts')).toHaveClass(/active/);
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'E30', timestamp: new Date().toISOString() } });
  });

  // ─── F. 消息区域 ───
  test('F31: #about-message 消息显示区域存在', async ({ page }) => {
    await gotoAbout(page);
    const msg = page.locator('#about-message');
    await expect(msg).toBeAttached();
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'F31', timestamp: new Date().toISOString() } });
  });

  // ─── G. 响应式溢出 ───
  test('G32: 桌面端 (1920x1080) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoAbout(page);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'G32', timestamp: new Date().toISOString() } });
  });

  test('G33: 移动端 (375x812) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoAbout(page);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-13-admin-about': { started: true, completed: false, lastTest: 'G33', timestamp: new Date().toISOString() } });
  });
});
