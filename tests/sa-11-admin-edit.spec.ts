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

async function gotoAdminEdit(page: Page) {
  await page.setExtraHTTPHeaders({ 'Authorization': `Bearer ${ADMIN_PASSWORD}` });
  await page.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  await page.evaluate(() => {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    const editView = document.getElementById('view-edit');
    if (editView) editView.classList.add('active');
  });

  await page.waitForSelector('#view-edit.active', { timeout: 5000 });
}

test.describe('SA-11 后台文章编辑视图 E2E 测试', () => {
  test.beforeAll(() => {
    writeStatus({
      'sa-11-admin-edit': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() }
    });
  });

  test.afterAll(() => {
    writeStatus({
      'sa-11-admin-edit': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() }
    });
  });

  // ─── A. 编辑器头部 ───
  test('A1: #edit-heading 编辑标题存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const heading = page.locator('#edit-heading');
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text!.trim().length).toBeGreaterThan(0);
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'A1', timestamp: new Date().toISOString() } });
  });

  test('A2: #edit-form 表单存在', async ({ page }) => {
    await gotoAdminEdit(page);
    await expect(page.locator('#edit-form')).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'A2', timestamp: new Date().toISOString() } });
  });

  // ─── B. 标题输入 ───
  test('B3: #edit-title 标题输入框存在且可聚焦', async ({ page }) => {
    await gotoAdminEdit(page);
    const title = page.locator('#edit-title');
    await expect(title).toBeVisible();
    await title.focus();
    await expect(title).toBeFocused();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'B3', timestamp: new Date().toISOString() } });
  });

  test('B4: 输入标题后值正确', async ({ page }) => {
    await gotoAdminEdit(page);
    const title = page.locator('#edit-title');
    await title.fill('E2E测试文章标题');
    await expect(title).toHaveValue('E2E测试文章标题');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'B4', timestamp: new Date().toISOString() } });
  });

  // ─── C. Markdown 工具栏 ───
  test('C5: .editor-toolbar 工具栏容器存在', async ({ page }) => {
    await gotoAdminEdit(page);
    await expect(page.locator('#view-edit .editor-toolbar')).toBeVisible();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C5', timestamp: new Date().toISOString() } });
  });

  test('C6: 粗体按钮 [data-md="**"] 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit [data-md="**"]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C6', timestamp: new Date().toISOString() } });
  });

  test('C7: 粗体按钮点击后 textarea 插入 **', async ({ page }) => {
    await gotoAdminEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    const btn = page.locator('#view-edit [data-md="**"]');
    await btn.click();
    const val = await textarea.inputValue();
    expect(val).toContain('**');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C7', timestamp: new Date().toISOString() } });
  });

  test('C8: 斜体按钮 [data-md="*"] 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit .editor-toolbar button[data-md="*"]:not([data-md="**"])');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C8', timestamp: new Date().toISOString() } });
  });

  test('C9: 斜体按钮点击后 textarea 插入 *', async ({ page }) => {
    await gotoAdminEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    const btn = page.locator('#view-edit .editor-toolbar button[data-md="*"]:not([data-md="**"])').first();
    await btn.click();
    const val = await textarea.inputValue();
    expect(val).toContain('*');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C9', timestamp: new Date().toISOString() } });
  });

  test('C10: 删除线按钮 [data-md="~~"] 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit [data-md="~~"]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C10', timestamp: new Date().toISOString() } });
  });

  test('C11: 删除线按钮点击后 textarea 插入 ~~', async ({ page }) => {
    await gotoAdminEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    const btn = page.locator('#view-edit [data-md="~~"]');
    await btn.click();
    const val = await textarea.inputValue();
    expect(val).toContain('~~');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C11', timestamp: new Date().toISOString() } });
  });

  test('C12: 标题按钮 [data-md="# "] 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit [data-md="# "]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C12', timestamp: new Date().toISOString() } });
  });

  test('C13: 标题按钮点击后 textarea 插入 # ', async ({ page }) => {
    await gotoAdminEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('');
    const btn = page.locator('#view-edit [data-md="# "]');
    await btn.click();
    const val = await textarea.inputValue();
    expect(val).toContain('# ');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C13', timestamp: new Date().toISOString() } });
  });

  test('C14: 引用按钮 [data-md="> "] 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit [data-md="> "]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C14', timestamp: new Date().toISOString() } });
  });

  test('C15: 无序列表 [data-md="- "] 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit [data-md="- "]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C15', timestamp: new Date().toISOString() } });
  });

  test('C16: 有序列表 [data-md="1. "] 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit [data-md="1. "]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C16', timestamp: new Date().toISOString() } });
  });

  test('C17: 代码块按钮 [data-action="code"] 存在 → 点击弹出 Modal', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit [data-action="code"]');
    await expect(btn).toBeAttached();
    await btn.click();
    await expect(page.locator('#insert-code-modal')).toBeVisible();
    await page.click('#insert-code-modal .picker-close');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C17', timestamp: new Date().toISOString() } });
  });

  test('C18: 链接按钮 [data-action="link"] 存在 → 点击弹出 Modal', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit [data-action="link"]');
    await expect(btn).toBeAttached();
    await btn.click();
    await expect(page.locator('#insert-link-modal')).toBeVisible();
    await page.click('#insert-link-modal .picker-close');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C18', timestamp: new Date().toISOString() } });
  });

  test('C19: 图片按钮 [data-action="image"] 存在 → 点击弹出 Modal', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit [data-action="image"]');
    await expect(btn).toBeAttached();
    await btn.click();
    await expect(page.locator('#insert-image-modal')).toBeVisible();
    await page.click('#insert-image-modal .picker-close');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C19', timestamp: new Date().toISOString() } });
  });

  test('C20: 分割线 [data-md="---"] 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit [data-md="---"]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C20', timestamp: new Date().toISOString() } });
  });

  test('C21: 全屏按钮 .fs-toggle 存在 → 点击后编辑器全屏', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit .fs-toggle');
    await expect(btn).toBeAttached();
    const editorWrap = page.locator('#view-edit .editor-wrap');
    const before = await editorWrap.evaluate(el => el.classList.contains('is-fullscreen'));
    await btn.click();
    const after = await editorWrap.evaluate(el => el.classList.contains('is-fullscreen'));
    expect(after).not.toBe(before);
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C21', timestamp: new Date().toISOString() } });
  });

  test('C22: 缩进切换 .indent-toggle 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit .indent-toggle');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C22', timestamp: new Date().toISOString() } });
  });

  test('C23: 分栏模式 [data-mode="split"] 存在且 .active', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit [data-mode="split"]');
    await expect(btn).toBeAttached();
    await expect(btn).toHaveClass(/active/);
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C23', timestamp: new Date().toISOString() } });
  });

  test('C24: 仅编辑模式 [data-mode="edit"] 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit [data-mode="edit"]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C24', timestamp: new Date().toISOString() } });
  });

  test('C25: 仅预览模式 [data-mode="preview"] 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#view-edit [data-mode="preview"]');
    await expect(btn).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'C25', timestamp: new Date().toISOString() } });
  });

  // ─── D. 编辑器区域 ───
  test('D26: #edit-content textarea 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const textarea = page.locator('#edit-content');
    await expect(textarea).toBeAttached();
    const tagName = await textarea.evaluate(el => el.tagName);
    expect(tagName).toBe('TEXTAREA');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'D26', timestamp: new Date().toISOString() } });
  });

  test('D27: #edit-preview 预览区域存在', async ({ page }) => {
    await gotoAdminEdit(page);
    await expect(page.locator('#edit-preview')).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'D27', timestamp: new Date().toISOString() } });
  });

  test('D28: 输入 Markdown → 预览区域更新', async ({ page }) => {
    await gotoAdminEdit(page);
    const textarea = page.locator('#edit-content');
    await textarea.fill('# Hello E2E');
    await textarea.dispatchEvent('input');
    const preview = page.locator('#edit-preview');
    await expect(preview).toContainText('Hello E2E');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'D28', timestamp: new Date().toISOString() } });
  });

  // ─── E. 分类选择 ───
  test('E29: #selected-cats-box 分类选择框存在', async ({ page }) => {
    await gotoAdminEdit(page);
    await expect(page.locator('#selected-cats-box')).toBeVisible();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'E29', timestamp: new Date().toISOString() } });
  });

  test('E30: 点击分类选择框 → #cat-picker-modal 弹窗打开', async ({ page }) => {
    await gotoAdminEdit(page);
    await page.evaluate(() => { (window as any).openCategoryPicker(); });
    await expect(page.locator('#cat-picker-modal')).toBeVisible();
    await page.click('#cat-picker-modal .picker-close');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'E30', timestamp: new Date().toISOString() } });
  });

  test('E31: #edit-category hidden input 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const input = page.locator('#edit-category');
    await expect(input).toBeAttached();
    const type = await input.getAttribute('type');
    expect(type).toBe('hidden');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'E31', timestamp: new Date().toISOString() } });
  });

  // ─── F. 标签选择 ───
  test('F32: #selected-tags-box 标签选择框存在', async ({ page }) => {
    await gotoAdminEdit(page);
    await expect(page.locator('#selected-tags-box')).toBeVisible();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'F32', timestamp: new Date().toISOString() } });
  });

  test('F33: 点击标签选择框 → #tag-picker-modal 弹窗打开', async ({ page }) => {
    await gotoAdminEdit(page);
    await page.evaluate(() => { (window as any).openTagPicker(); });
    await expect(page.locator('#tag-picker-modal')).toBeVisible();
    await page.click('#tag-picker-modal .picker-close');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'F33', timestamp: new Date().toISOString() } });
  });

  test('F34: #edit-tags hidden input 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const input = page.locator('#edit-tags');
    await expect(input).toBeAttached();
    const type = await input.getAttribute('type');
    expect(type).toBe('hidden');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'F34', timestamp: new Date().toISOString() } });
  });

  // ─── G. 封面图 ───
  test('G35: #edit-cover 封面图 URL 输入框存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const input = page.locator('#edit-cover');
    await expect(input).toBeAttached();
    await expect(input).toBeVisible();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'G35', timestamp: new Date().toISOString() } });
  });

  // ─── H. 发布状态 ───
  test('H36: #edit-published 发布开关 checkbox 存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const checkbox = page.locator('#edit-published');
    await expect(checkbox).toBeAttached();
    const type = await checkbox.getAttribute('type');
    expect(type).toBe('checkbox');
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'H36', timestamp: new Date().toISOString() } });
  });

  test('H37: 点击发布开关 → checked 状态切换', async ({ page }) => {
    await gotoAdminEdit(page);
    const checkbox = page.locator('#edit-published');
    const beforeChecked = await checkbox.isChecked();
    await page.locator('#view-edit .toggle-switch').first().click();
    const afterChecked = await checkbox.isChecked();
    expect(afterChecked).not.toBe(beforeChecked);
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'H37', timestamp: new Date().toISOString() } });
  });

  test('H38: #edit-published-label 标签文字显示正确', async ({ page }) => {
    await gotoAdminEdit(page);
    const label = page.locator('#edit-published-label');
    await expect(label).toBeVisible();
    const text = await label.textContent();
    expect(text!.trim()).toMatch(/公开|不公开/);
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'H38', timestamp: new Date().toISOString() } });
  });

  // ─── I. 操作按钮 ───
  test('I39: #edit-submit 保存按钮存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const btn = page.locator('#edit-submit');
    await expect(btn).toBeVisible();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'I39', timestamp: new Date().toISOString() } });
  });

  test('I40: 取消按钮存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const cancelBtn = page.locator('#view-edit .form-actions .btn-outline');
    await expect(cancelBtn).toBeVisible();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'I40', timestamp: new Date().toISOString() } });
  });

  // ─── J. 错误处理 ───
  test('J41: #edit-error 错误提示区域存在', async ({ page }) => {
    await gotoAdminEdit(page);
    const errorDiv = page.locator('#edit-error');
    await expect(errorDiv).toBeAttached();
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'J41', timestamp: new Date().toISOString() } });
  });

  // ─── K. 响应式溢出 ───
  test('K42: 桌面端 (1920x1080) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoAdminEdit(page);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'K42', timestamp: new Date().toISOString() } });
  });

  test('K43: 移动端 (375x812) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoAdminEdit(page);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-11-admin-edit': { started: true, completed: false, lastTest: 'K43', timestamp: new Date().toISOString() } });
  });
});
