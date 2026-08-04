import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ARCHIVES_URL = '/archives';
const STATUS_FILE = path.join(__dirname, '..', '.e2e-status.json');

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

test.describe('SA-06 归档页 /archives E2E 测试', () => {
  test.beforeAll(() => {
    writeStatus({
      'sa-06-archives': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() }
    });
  });

  test.afterAll(() => {
    writeStatus({
      'sa-06-archives': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() }
    });
  });

  // ─── A. 页面基础结构 ───
  test('A1: DOCTYPE html 存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const doctype = await page.evaluate(() => {
      const node = document.doctype;
      return node ? node.name : null;
    });
    expect(doctype).toBe('html');
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'A1' } });
  });

  test('A2: <title> 包含 "归档"', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    await expect(page).toHaveTitle(/归档/);
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'A2' } });
  });

  test('A3: <nav> 导航栏存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    await expect(page.locator('#nav')).toBeVisible();
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'A3' } });
  });

  test('A4: #content-inner 主内容区存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    await expect(page.locator('#content-inner')).toBeVisible();
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'A4' } });
  });

  test('A5: #archive 归档容器存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    await expect(page.locator('#archive')).toBeVisible();
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'A5' } });
  });

  // ─── B. 归档时间线 ───
  test('B6: .article-sort 时间线容器存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const emptyState = page.locator('.empty-state');
    const articleSort = page.locator('.article-sort');
    if (await emptyState.count() > 0) {
      test.skip(true, '显示空状态，跳过时间线测试');
      return;
    }
    await expect(articleSort).toBeVisible();
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'B6' } });
  });

  test('B7: .article-sort-item.year 年份头存在且数量 > 0', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const emptyState = page.locator('.empty-state');
    if (await emptyState.count() > 0) {
      test.skip(true, '显示空状态');
      return;
    }
    const yearItems = page.locator('.article-sort-item.year');
    const count = await yearItems.count();
    expect(count).toBeGreaterThan(0);
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'B7' } });
  });

  test('B8: .article-sort-item (非年份) 文章条目存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const emptyState = page.locator('.empty-state');
    if (await emptyState.count() > 0) {
      test.skip(true, '显示空状态');
      return;
    }
    const items = page.locator('.article-sort-item:not(.year)');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'B8' } });
  });

  test('B9: 每个条目的 .article-sort-item-img 封面图存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const emptyState = page.locator('.empty-state');
    if (await emptyState.count() > 0) {
      test.skip(true, '显示空状态');
      return;
    }
    const items = page.locator('.article-sort-item:not(.year)');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const img = items.nth(i).locator('.article-sort-item-img');
      await expect(img).toBeAttached();
    }
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'B9' } });
  });

  test('B10: 每个条目的 .article-sort-item-title 标题链接存在且 href 包含 /posts/', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const emptyState = page.locator('.empty-state');
    if (await emptyState.count() > 0) {
      test.skip(true, '显示空状态');
      return;
    }
    const titles = page.locator('.article-sort-item-title');
    const count = await titles.count();
    for (let i = 0; i < count; i++) {
      const href = await titles.nth(i).getAttribute('href');
      expect(href).toContain('/posts/');
    }
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'B10' } });
  });

  test('B11: 每个条目的 .article-sort-item-time 时间显示存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const emptyState = page.locator('.empty-state');
    if (await emptyState.count() > 0) {
      test.skip(true, '显示空状态');
      return;
    }
    const times = page.locator('.article-sort-item-time');
    const count = await times.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(times.nth(i)).toBeVisible();
    }
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'B11' } });
  });

  // ─── C. 空状态 ───
  test('C12: 如果 archives 为空则 .empty-state 存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const articles = page.locator('.article-sort-item:not(.year)');
    const articleCount = await articles.count();
    if (articleCount > 0) {
      test.skip(true, '有文章时跳过空状态测试');
      return;
    }
    await expect(page.locator('.empty-state')).toBeVisible();
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'C12' } });
  });

  // ─── D. 导航栏 ───
  test('D13: #blog-info .nav-site-title Logo 存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const logo = page.locator('#blog-info .nav-site-title');
    await expect(logo).toBeVisible();
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'D13' } });
  });

  test('D14: #menus .menus_items 菜单项存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const menuItems = page.locator('#menus .menus_items');
    await expect(menuItems).toBeVisible();
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'D14' } });
  });

  test('D15: 搜索按钮 #searchBtn 存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const searchBtn = page.locator('#searchBtn');
    await expect(searchBtn).toBeAttached();
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'D15' } });
  });

  // ─── E. 侧边栏 ───
  test('E16: #aside-content 存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const sidebar = page.locator('#aside-content');
    await expect(sidebar).toBeAttached();
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'E16' } });
  });

  // ─── F. Footer ───
  test('F17: #footer 存在', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const footer = page.locator('#footer');
    await expect(footer).toBeAttached();
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'F17' } });
  });

  // ─── G. 溢出检查 ───
  test('G18: 桌面端 (1920x1080) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(ARCHIVES_URL);
    await page.waitForLoadState('networkidle');
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'G18' } });
  });

  test('G19: 移动端 (375x812) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ARCHIVES_URL);
    await page.waitForLoadState('networkidle');
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'G19' } });
  });

  // ─── H. 文章链接跳转 ───
  test('H20: 点击第一个 .article-sort-item-title，断言 URL 包含 /posts/ 且页面导航成功', async ({ page }) => {
    await page.goto(ARCHIVES_URL);
    const emptyState = page.locator('.empty-state');
    if (await emptyState.count() > 0) {
      test.skip(true, '显示空状态，无法测试链接');
      return;
    }
    const firstTitle = page.locator('.article-sort-item-title').first();
    const href = await firstTitle.getAttribute('href');
    expect(href).toContain('/posts/');
    await firstTitle.click();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/posts/');
    writeStatus({ 'sa-06-archives': { started: true, completed: false, lastTest: 'H20' } });
  });
});
