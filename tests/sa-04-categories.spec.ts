import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const CATEGORIES_URL = '/categories';
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

test.describe('SA-04 分类总览页 /categories E2E 测试', () => {
  test.beforeAll(() => {
    writeStatus({
      'sa-04-categories': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() }
    });
  });

  test.afterAll(() => {
    writeStatus({
      'sa-04-categories': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() }
    });
  });

  // ─── A. 页面基础结构 ───
  test('A1: DOCTYPE html 存在', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    const doctype = await page.evaluate(() => {
      const node = document.doctype;
      return node ? node.name : null;
    });
    expect(doctype).toBe('html');
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'A1' } });
  });

  test('A2: <title> 包含 "分类"', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    await expect(page).toHaveTitle(/分类/);
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'A2' } });
  });

  test('A3: <nav> 导航栏存在', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    await expect(page.locator('#nav')).toBeVisible();
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'A3' } });
  });

  test('A4: #content-inner 主内容区存在', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    await expect(page.locator('#content-inner')).toBeVisible();
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'A4' } });
  });

  // ─── B. 分类树结构 ───
  test('B5: .category-lists 分类列表容器存在', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    await expect(page.locator('.category-lists')).toBeVisible();
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'B5' } });
  });

  test('B6: .category-list 根 <ul> 存在', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    const catList = page.locator('ul.category-list');
    const catLists = page.locator('.category-lists');
    const innerHTML = await catLists.innerHTML();
    const hasEmpty = innerHTML.includes('empty-state');
    if (!hasEmpty) {
      await expect(catList).toBeVisible();
    } else {
      const count = await catList.count();
      expect(count).toBe(0);
    }
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'B6' } });
  });

  test('B7: .category-list-item 分类项数量 > 0', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    const items = page.locator('.category-list-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'B7' } });
  });

  test('B8: .category-list-link href 包含 /categories/', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    const links = page.locator('.category-list-link');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toMatch(/\/categories\//);
    }
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'B8' } });
  });

  test('B9: .category-list-count 分类计数数字存在', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    const counts = page.locator('.category-list-count');
    const count = await counts.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const text = await counts.nth(i).textContent();
      expect(text).toMatch(/^\d+$/);
    }
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'B9' } });
  });

  test('B10: 嵌套子分类 .category-list-child 存在 (多级分类)', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    const childLists = page.locator('.category-list-child');
    const childCount = await childLists.count();
    if (childCount > 0) {
      for (let i = 0; i < childCount; i++) {
        await expect(childLists.nth(i)).toBeAttached();
      }
    } else {
      test.skip(true, '无嵌套分类，跳过');
    }
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'B10' } });
  });

  // ─── C. 空状态 ───
  test('C11: .empty-state 存在 (如果 categoryTree 为空)', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    const catList = page.locator('.category-list');
    const listCount = await catList.count();
    const emptyState = page.locator('.empty-state');
    if (listCount === 0) {
      await expect(emptyState).toBeVisible();
    } else {
      expect(await emptyState.count()).toBe(0);
    }
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'C11' } });
  });

  // ─── D. 导航栏 ───
  test('D12: #blog-info .nav-site-title Logo 链接', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    const logoLink = page.locator('#blog-info .nav-site-title');
    await expect(logoLink).toBeVisible();
    const href = await logoLink.getAttribute('href');
    expect(href).toBe('/');
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'D12' } });
  });

  test('D13: #menus .menus_items 菜单项', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    const menuItems = page.locator('#menus .menus_items');
    await expect(menuItems).toBeVisible();
    const items = page.locator('#menus .menus_items .menus_item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(5);
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'D13' } });
  });

  test('D14: 搜索按钮 #searchBtn 存在', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    const searchBtn = page.locator('#searchBtn');
    await expect(searchBtn).toBeAttached();
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'D14' } });
  });

  // ─── E. 侧边栏 ───
  test('E15: #aside-content 存在', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    await expect(page.locator('#aside-content')).toBeAttached();
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'E15' } });
  });

  test('E16: 作者卡片 .card-info 存在', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    const cardInfo = page.locator('.card-info');
    if (await cardInfo.count() > 0) {
      await expect(cardInfo).toBeVisible();
    } else {
      const aside = page.locator('#aside-content');
      const cardWidgets = aside.locator('.card-widget');
      const count = await cardWidgets.count();
      expect(count).toBeGreaterThan(0);
    }
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'E16' } });
  });

  // ─── F. Footer ───
  test('F17: #footer 存在', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    const footer = page.locator('#footer');
    await expect(footer).toBeAttached();
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'F17' } });
  });

  // ─── G. 溢出检查 ───
  test('G18: 桌面端 (1920x1080) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(CATEGORIES_URL);
    await page.waitForLoadState('domcontentloaded');
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'G18' } });
  });

  test('G19: 移动端 (375x812) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(CATEGORIES_URL);
    await page.waitForLoadState('domcontentloaded');
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'G19' } });
  });

  // ─── H. 分类链接跳转 ───
  test('H20: 点击第一个分类链接跳转成功', async ({ page }) => {
    await page.goto(CATEGORIES_URL);
    const firstLink = page.locator('.category-list-link').first();
    await expect(firstLink).toBeVisible();
    await firstLink.click();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toMatch(/\/categories\//);
    writeStatus({ 'sa-04-categories': { started: true, completed: false, lastTest: 'H20' } });
  });
});
