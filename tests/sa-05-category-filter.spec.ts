import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const CATEGORY_PATH = '/categories/%E6%B4%9B%E8%B0%B7/';
const HOME_PATH = '/';
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

test.describe('SA-05 分类筛选页 /categories/:path E2E', () => {
  test.beforeAll(() => {
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() } });
  });

  test.afterAll(() => {
    writeStatus({ 'sa-05-category-filter': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() } });
  });

  // ─── A. 筛选栏 ───
  test('A1: .tag-filter-bar 筛选栏存在', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    await expect(page.locator('.tag-filter-bar')).toBeVisible();
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'A1' } });
  });

  test('A2: .tag-filter-bar .tag-pill.active 显示当前分类名', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    const pill = page.locator('.tag-filter-bar .tag-pill.active');
    await expect(pill).toBeVisible();
    await expect(pill).toContainText('洛谷');
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'A2' } });
  });

  test('A3: .tag-filter-bar .tag-clear 清除筛选按钮存在', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    const clearBtn = page.locator('.tag-filter-bar .tag-clear');
    await expect(clearBtn).toBeVisible();
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'A3' } });
  });

  test('A4: 点击 .tag-clear 跳转回首页', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    const clearBtn = page.locator('.tag-filter-bar .tag-clear');
    await clearBtn.click();
    await page.waitForLoadState('domcontentloaded');
    const url = page.url();
    expect(url).not.toContain('/categories/');
    expect(url).toMatch(/localhost:3001\/$/);
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'A4' } });
  });

  // ─── B. 文章列表 ───
  test('B5: .recent-post-item 文章卡片存在', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    const items = page.locator('.recent-post-item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'B5' } });
  });

  test('B6: .article-title 文章标题链接存在', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    const title = page.locator('.article-title').first();
    await expect(title).toBeVisible();
    const href = await title.getAttribute('href');
    expect(href).toContain('/posts/');
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'B6' } });
  });

  test('B7: .post-bg 封面图存在', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    const cover = page.locator('.post-bg').first();
    await expect(cover).toBeAttached();
    const tagName = await cover.evaluate(el => el.tagName);
    expect(tagName).toBe('IMG');
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'B7' } });
  });

  // ─── C. 分页器 ───
  test('C8: #pagination 分页器存在', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    await expect(page.locator('#pagination')).toBeAttached();
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'C8' } });
  });

  test('C9: .page-btn 页码按钮存在', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    const btns = page.locator('.page-btn');
    const count = await btns.count();
    expect(count).toBeGreaterThanOrEqual(1);
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'C9' } });
  });

  // ─── D. 导航栏 ───
  test('D10: #blog-info .nav-site-title Logo 链接', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    const logo = page.locator('#blog-info .nav-site-title');
    await expect(logo).toBeVisible();
    const href = await logo.getAttribute('href');
    expect(href).toBe('/');
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'D10' } });
  });

  test('D11: #menus .menus_items 菜单项', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    const menuItems = page.locator('#menus .menus_items');
    await expect(menuItems).toBeVisible();
    const items = page.locator('#menus .menus_items .menus_item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(5);
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'D11' } });
  });

  test('D12: 搜索按钮 #searchBtn 存在', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    await expect(page.locator('#searchBtn')).toBeAttached();
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'D12' } });
  });

  // ─── E. 侧边栏 ───
  test('E13: #aside-content 侧边栏存在', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    await expect(page.locator('#aside-content')).toBeVisible();
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'E13' } });
  });

  // ─── F. 溢出检查 ───
  test('F14: 桌面端 (1920x1080) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(CATEGORY_PATH);
    await page.waitForLoadState('load');
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'F14' } });
  });

  test('F15: 移动端 (375x812) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(CATEGORY_PATH);
    await page.waitForLoadState('load');
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'F15' } });
  });

  // ─── G. 分页跳转 ───
  test('G16: 分页跳转 - 多页时点击下一页', async ({ page }) => {
    await page.goto(CATEGORY_PATH);
    const totalPages = await page.evaluate(() => {
      const el = document.querySelector('.recent-post-items');
      return parseInt(el?.getAttribute('data-total-pages') || '1');
    });
    if (totalPages > 1) {
      const nextBtn = page.locator('.page-btn.extend.next');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForLoadState('domcontentloaded');
        expect(page.url()).toContain('page=2');
        const items = page.locator('.recent-post-item');
        const count = await items.count();
        expect(count).toBeGreaterThanOrEqual(1);
      }
    }
    writeStatus({ 'sa-05-category-filter': { started: true, completed: false, lastTest: 'G16' } });
  });
});
