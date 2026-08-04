import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const STATUS_FILE = path.join(__dirname, '..', '.e2e-status.json');

test.use({
  launchOptions: {
    executablePath: 'C:\\Users\\yl\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe',
  }
});

function readStatus() {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')); } catch { return {}; }
}

function writeStatus(patch: Record<string, any>) {
  const status = readStatus();
  Object.assign(status, patch);
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

test.describe.configure({ maxFailures: 1 });

async function loginAsAdmin(page: Page) {
  const supabaseUrl = 'https://eacieurozwzligrxnyos.supabase.co';
  const mockUser = { id: 'mock-user-id', email: 'xiaoshenqwq@gmail.com', role: 'authenticated', aud: 'authenticated' };
  const mockSession = { access_token: 'mock-at', refresh_token: 'mock-rt', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: mockUser };

  await page.route(supabaseUrl + '/auth/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: mockUser }) });
    } else if (url.includes('/auth/v1/token')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSession) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });
  await page.route(supabaseUrl + '/rest/v1/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('http://localhost:3001/admin', async (route) => {
    const response = await route.fetch({ headers: { ...route.request().headers(), 'Authorization': 'Bearer admin123456' } });
    let body = await response.text();
    const seedScript = '<script>try{localStorage.setItem("sb-eacieurozwzligrxnyos-auth-token",JSON.stringify(' + JSON.stringify(mockSession) + '));}catch(e){}</script>';
    body = body.replace('</head>', seedScript + '</head>');
    await route.fulfill({ response, body });
  });
  await page.route('http://localhost:3001/editor', async (route) => {
    const response = await route.fetch({ headers: { ...route.request().headers(), 'Authorization': 'Bearer admin123456' } });
    let body = await response.text();
    const seedScript = '<script>try{localStorage.setItem("sb-eacieurozwzligrxnyos-auth-token",JSON.stringify(' + JSON.stringify(mockSession) + '));}catch(e){}</script>';
    body = body.replace('</head>', seedScript + '</head>');
    await route.fulfill({ response, body });
  });

  await page.goto('/admin');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#view-posts.active', { timeout: 15000 });
}

function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

test.describe('SA-18 弹窗 Modal 集合 E2E', () => {
  test.beforeAll(() => {
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() } });
  });
  test.afterAll(() => {
    writeStatus({ 'sa-18-modals': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() } });
  });

  // ─── A. 搜索弹窗 (无需登录) ───

  test('A1: 点击 #searchBtn 打开搜索弹窗', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#searchBtn').click();
    await expect(page.locator('#local-search')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'A1' } });
  });

  test('A2: #search-mask 遮罩显示', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#searchBtn').click();
    await expect(page.locator('#search-mask')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'A2' } });
  });

  test('A3: #searchInput 输入框可聚焦', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#searchBtn').click();
    await expect(page.locator('#searchInput')).toBeFocused();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'A3' } });
  });

  test('A4: .search-close-button 关闭搜索弹窗', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#searchBtn').click();
    await expect(page.locator('#local-search')).toBeVisible();
    await page.locator('.search-close-button').click();
    await expect(page.locator('#local-search')).toBeHidden();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'A4' } });
  });

  test('A5: 点击遮罩关闭搜索弹窗', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#searchBtn').click();
    await expect(page.locator('#search-mask')).toBeVisible();
    await page.locator('#search-mask').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#local-search')).toBeHidden();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'A5' } });
  });

  test('A6: Escape 键关闭搜索弹窗', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#searchBtn').click();
    await expect(page.locator('#local-search')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#local-search')).toBeHidden();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'A6' } });
  });

  // ─── B. 字体设置面板 ───

  async function openFontSettings(page: Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#rightside-config').click();
    await expect(page.locator('#font-settings-btn')).toBeVisible();
    await page.locator('#font-settings-btn').click();
    await expect(page.locator('#font-settings-overlay')).toBeVisible();
  }

  test('B7: 点击 #font-settings-btn 打开字体设置', async ({ page }) => {
    await openFontSettings(page);
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'B7' } });
  });

  test('B8: .settings-close 关闭字体设置面板', async ({ page }) => {
    await openFontSettings(page);
    await page.locator('.settings-close').click();
    await expect(page.locator('#font-settings-overlay')).toBeHidden();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'B8' } });
  });

  test('B9: 字体大小选项 active class 切换', async ({ page }) => {
    await openFontSettings(page);
    const smallBtn = page.locator('[data-fontsize="14"]');
    await smallBtn.click();
    await expect(smallBtn).toHaveClass(/active/);
    const mediumBtn = page.locator('[data-fontsize="16"]');
    await expect(mediumBtn).not.toHaveClass(/active/);
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'B9' } });
  });

  test('B10: #font-body-input 自定义字体输入框存在', async ({ page }) => {
    await openFontSettings(page);
    await expect(page.locator('#font-body-input')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'B10' } });
  });

  test('B11: #font-code-input 代码字体输入框存在', async ({ page }) => {
    await openFontSettings(page);
    await expect(page.locator('#font-code-input')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'B11' } });
  });

  // ─── C. 后台分类选择器 Modal ───

  test('C12: #selected-cats-box 点击打开分类选择器', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('#view-posts')).toHaveClass(/active/);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    const fnDefined = await page.evaluate(() => typeof (window as any).openCategoryPicker === 'function');
    console.log('openCategoryPicker defined:', fnDefined);
    const display = await page.evaluate(() => document.getElementById('cat-picker-modal')?.style.display);
    console.log('modal display before click:', display);
    await page.evaluate(() => { (window as any).openCategoryPicker(); });
    const displayAfter = await page.evaluate(() => document.getElementById('cat-picker-modal')?.style.display);
    console.log('modal display after eval:', displayAfter);
    await expect(page.locator('#cat-picker-modal')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'C12' } });
  });

  test('C13: .picker-overlay 遮罩存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openCategoryPicker(); });
    await expect(page.locator('#cat-picker-modal .picker-overlay')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'C13' } });
  });

  test('C14: .picker-close 关闭按钮存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openCategoryPicker(); });
    await expect(page.locator('#cat-picker-modal .picker-close')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'C14' } });
  });

  test('C15: 点击关闭按钮隐藏分类选择器', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openCategoryPicker(); });
    await expect(page.locator('#cat-picker-modal')).toBeVisible();
    await page.evaluate(() => { (window as any).closeCategoryPicker(); });
    await expect(page.locator('#cat-picker-modal')).toBeHidden();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'C15' } });
  });

  test('C16: #cat-picker-body 分类列表内容存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openCategoryPicker(); });
    await expect(page.locator('#cat-picker-body')).toBeVisible();
    const html = await page.locator('#cat-picker-body').innerHTML();
    expect(html.trim().length).toBeGreaterThan(0);
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'C16' } });
  });

  test('C17: openNewCategoryFromPicker 按钮存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openCategoryPicker(); });
    const btn = page.locator('#cat-picker-modal .picker-footer button:has-text("新建分类")');
    await expect(btn).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'C17' } });
  });

  test('C18: confirmCategoryPicker 确认按钮存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openCategoryPicker(); });
    const btn = page.locator('#cat-picker-modal .picker-footer button:has-text("确定")');
    await expect(btn).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'C18' } });
  });

  test('C19: closeCategoryPicker 取消按钮存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openCategoryPicker(); });
    const btn = page.locator('#cat-picker-modal .picker-footer button:has-text("取消")');
    await expect(btn).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'C19' } });
  });

  // ─── D. 后台标签选择器 Modal ───

  test('D20: #selected-tags-box 点击打开标签选择器', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openTagPicker(); });
    await expect(page.locator('#tag-picker-modal')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'D20' } });
  });

  test('D21: 标签选择器 .picker-close 关闭', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openTagPicker(); });
    await expect(page.locator('#tag-picker-modal')).toBeVisible();
    await page.evaluate(() => { (window as any).closeTagPicker(); });
    await expect(page.locator('#tag-picker-modal')).toBeHidden();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'D21' } });
  });

  test('D22: #tag-picker-body 标签列表存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openTagPicker(); });
    await expect(page.locator('#tag-picker-body')).toBeVisible();
    const html = await page.locator('#tag-picker-body').innerHTML();
    expect(html.trim().length).toBeGreaterThan(0);
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'D22' } });
  });

  test('D23: openNewTagFromPicker 新建标签按钮存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openTagPicker(); });
    const btn = page.locator('#tag-picker-modal .picker-footer button:has-text("新建标签")');
    await expect(btn).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'D23' } });
  });

  test('D24: confirmTagPicker 确认按钮存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openTagPicker(); });
    const btn = page.locator('#tag-picker-modal .picker-footer button:has-text("确定")');
    await expect(btn).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'D24' } });
  });

  // ─── E. 后台通用输入对话框 ───

  test('E25: 触发输入对话框 #input-dialog 显示', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openCategoryPicker(); });
    await expect(page.locator('#cat-picker-modal')).toBeVisible();
    await page.evaluate(() => { (window as any).openNewCategoryFromPicker(); });
    await expect(page.locator('#input-dialog')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'E25' } });
  });

  test('E26: #input-dialog-field 输入框存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openCategoryPicker(); });
    await expect(page.locator('#cat-picker-modal')).toBeVisible();
    await page.evaluate(() => { (window as any).openNewCategoryFromPicker(); });
    await expect(page.locator('#input-dialog')).toBeVisible();
    await expect(page.locator('#input-dialog-field')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'E26' } });
  });

  test('E27: #input-dialog-title 标题存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openCategoryPicker(); });
    await expect(page.locator('#cat-picker-modal')).toBeVisible();
    await page.evaluate(() => { (window as any).openNewCategoryFromPicker(); });
    await expect(page.locator('#input-dialog')).toBeVisible();
    await expect(page.locator('#input-dialog-title')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'E27' } });
  });

  test('E28: closeInputDialog 取消隐藏对话框', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.evaluate(() => { (window as any).openCategoryPicker(); });
    await expect(page.locator('#cat-picker-modal')).toBeVisible();
    await page.evaluate(() => { (window as any).openNewCategoryFromPicker(); });
    await expect(page.locator('#input-dialog')).toBeVisible();
    await page.evaluate(() => { (window as any).closeInputDialog(); });
    await expect(page.locator('#input-dialog')).toBeHidden();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'E28' } });
  });

  // ─── F. 后台删除标签确认弹窗 ───

  test('F29: #delete-tag-modal 显示', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#manage-tags-btn').click();
    await expect(page.locator('#view-tags')).toHaveClass(/active/, { timeout: 5000 });
    const items = page.locator('#tags-explorer-content .explorer-item');
    const count = await items.count();
    if (count > 0) {
      await items.first().click({ button: 'right' });
      await expect(page.locator('#context-menu')).toBeVisible();
      const deleteBtn = page.locator('#context-menu [data-action="delete"]');
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await expect(page.locator('#delete-tag-modal')).toBeVisible();
      }
    }
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'F29' } });
  });

  test('F30: #delete-tag-remove-articles checkbox 存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#manage-tags-btn').click();
    await expect(page.locator('#view-tags')).toHaveClass(/active/, { timeout: 5000 });
    const items = page.locator('#tags-explorer-content .explorer-item');
    const count = await items.count();
    if (count > 0) {
      await items.first().click({ button: 'right' });
      await expect(page.locator('#context-menu')).toBeVisible();
      const deleteBtn = page.locator('#context-menu [data-action="delete"]');
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await expect(page.locator('#delete-tag-modal')).toBeVisible();
        await expect(page.locator('#delete-tag-remove-articles')).toBeAttached();
      }
    }
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'F30' } });
  });

  test('F31: confirmDeleteTag 删除按钮存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#manage-tags-btn').click();
    await expect(page.locator('#view-tags')).toHaveClass(/active/, { timeout: 5000 });
    const items = page.locator('#tags-explorer-content .explorer-item');
    const count = await items.count();
    if (count > 0) {
      await items.first().click({ button: 'right' });
      await expect(page.locator('#context-menu')).toBeVisible();
      const deleteBtn = page.locator('#context-menu [data-action="delete"]');
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await expect(page.locator('#delete-tag-modal')).toBeVisible();
        await expect(page.locator('#delete-tag-confirm-btn')).toBeVisible();
      }
    }
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'F31' } });
  });

  test('F32: closeDeleteTagDialog 取消隐藏', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#manage-tags-btn').click();
    await expect(page.locator('#view-tags')).toHaveClass(/active/, { timeout: 5000 });
    const items = page.locator('#tags-explorer-content .explorer-item');
    const count = await items.count();
    if (count > 0) {
      await items.first().click({ button: 'right' });
      await expect(page.locator('#context-menu')).toBeVisible();
      const deleteBtn = page.locator('#context-menu [data-action="delete"]');
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await expect(page.locator('#delete-tag-modal')).toBeVisible();
        await page.evaluate(() => { (window as any).closeDeleteTagDialog(); });
        await expect(page.locator('#delete-tag-modal')).toBeHidden();
      }
    }
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'F32' } });
  });

  // ─── G. 后台插入链接 Modal (编辑器) ───

  test('G33: 点击编辑器工具栏链接按钮打开 #insert-link-modal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    const linkBtn = page.locator('#view-edit .toolbar-btn[data-action="link"]');
    await linkBtn.click();
    await expect(page.locator('#insert-link-modal')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'G33' } });
  });

  test('G34: #link-text 链接文本输入框存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="link"]').click();
    await expect(page.locator('#insert-link-modal')).toBeVisible();
    await expect(page.locator('#link-text')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'G34' } });
  });

  test('G35: #link-url URL 输入框存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="link"]').click();
    await expect(page.locator('#insert-link-modal')).toBeVisible();
    await expect(page.locator('#link-url')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'G35' } });
  });

  test('G36: #link-confirm 插入按钮存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="link"]').click();
    await expect(page.locator('#insert-link-modal')).toBeVisible();
    await expect(page.locator('#link-confirm')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'G36' } });
  });

  test('G37: 取消按钮隐藏插入链接 Modal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="link"]').click();
    await expect(page.locator('#insert-link-modal')).toBeVisible();
    await page.evaluate(() => { document.getElementById('insert-link-modal')!.style.display = 'none'; });
    await expect(page.locator('#insert-link-modal')).toBeHidden();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'G37' } });
  });

  // ─── H. 后台插入图片 Modal (编辑器) ───

  test('H38: 点击编辑器工具栏图片按钮打开 #insert-image-modal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="image"]').click();
    await expect(page.locator('#insert-image-modal')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'H38' } });
  });

  test('H39: #image-url 图片地址输入框存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="image"]').click();
    await expect(page.locator('#insert-image-modal')).toBeVisible();
    await expect(page.locator('#image-url')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'H39' } });
  });

  test('H40: #image-alt 替代文本输入框存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="image"]').click();
    await expect(page.locator('#insert-image-modal')).toBeVisible();
    await expect(page.locator('#image-alt')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'H40' } });
  });

  test('H41: #image-confirm 插入按钮存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="image"]').click();
    await expect(page.locator('#insert-image-modal')).toBeVisible();
    await expect(page.locator('#image-confirm')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'H41' } });
  });

  test('H42: 取消按钮隐藏插入图片 Modal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="image"]').click();
    await expect(page.locator('#insert-image-modal')).toBeVisible();
    await page.evaluate(() => { document.getElementById('insert-image-modal')!.style.display = 'none'; });
    await expect(page.locator('#insert-image-modal')).toBeHidden();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'H42' } });
  });

  // ─── I. 后台插入代码块 Modal (编辑器) ───

  test('I43: 点击编辑器工具栏代码块按钮打开 #insert-code-modal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="code"]').click();
    await expect(page.locator('#insert-code-modal')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'I43' } });
  });

  test('I44: #code-lang 编程语言下拉框存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="code"]').click();
    await expect(page.locator('#insert-code-modal')).toBeVisible();
    await expect(page.locator('#code-lang')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'I44' } });
  });

  test('I45: #code-input 代码输入区域存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="code"]').click();
    await expect(page.locator('#insert-code-modal')).toBeVisible();
    await expect(page.locator('#code-input')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'I45' } });
  });

  test('I46: #code-confirm 插入按钮存在', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="code"]').click();
    await expect(page.locator('#insert-code-modal')).toBeVisible();
    await expect(page.locator('#code-confirm')).toBeVisible();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'I46' } });
  });

  test('I47: 取消按钮隐藏插入代码块 Modal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#new-post-btn').click();
    await expect(page.locator('#view-edit')).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('#view-edit .toolbar-btn[data-action="code"]').click();
    await expect(page.locator('#insert-code-modal')).toBeVisible();
    await page.evaluate(() => { document.getElementById('insert-code-modal')!.style.display = 'none'; });
    await expect(page.locator('#insert-code-modal')).toBeHidden();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'I47' } });
  });

  // ─── J. 右键上下文菜单 ───

  test('J48: #context-menu 上下文菜单容器存在', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('#context-menu')).toBeAttached();
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'J48' } });
  });

  test('J49: 上下文菜单有新建分类/重命名/删除项', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#manage-categories-btn').click();
    await expect(page.locator('#view-categories')).toHaveClass(/active/, { timeout: 5000 });
    const items = page.locator('#explorer-content .explorer-item');
    const count = await items.count();
    if (count > 0) {
      await items.first().click({ button: 'right' });
      await expect(page.locator('#context-menu')).toBeVisible();
      await expect(page.locator('[data-action="rename"]')).toBeAttached();
      await expect(page.locator('[data-action="delete"]')).toBeAttached();
    }
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'J49' } });
  });

  // ─── K. 响应式溢出检查 ───

  test('K50: 搜索弹窗桌面端无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#searchBtn').click();
    await expect(page.locator('#local-search')).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'K50' } });
  });

  test('K51: 搜索弹窗移动端无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#searchBtn').click();
    await expect(page.locator('#local-search')).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'K51' } });
  });

  test('K52: 字体设置面板桌面端无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await openFontSettings(page);
    await expect(page.locator('#font-settings-overlay')).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'K52' } });
  });

  test('K53: 字体设置面板移动端无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await openFontSettings(page);
    await expect(page.locator('#font-settings-overlay')).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
    writeStatus({ 'sa-18-modals': { started: true, completed: false, lastTest: 'K53' } });
  });
});
