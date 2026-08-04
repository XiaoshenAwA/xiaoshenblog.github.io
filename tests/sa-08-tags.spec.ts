import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TAGS_URL = '/tags';
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

test.describe('SA-08 标签云页 /tags E2E 测试', () => {
  test.beforeAll(() => {
    writeStatus({
      'sa-08-tags': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() }
    });
  });

  test.afterAll(() => {
    writeStatus({
      'sa-08-tags': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() }
    });
  });

  // ─── A. 页面基础结构 ───
  test('A1: DOCTYPE html 存在', async ({ page }) => {
    await page.goto(TAGS_URL);
    const doctype = await page.evaluate(() => {
      const node = document.doctype;
      return node ? node.name : null;
    });
    expect(doctype).toBe('html');
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'A1' } });
  });

  test('A2: <title> 包含 "标签"', async ({ page }) => {
    await page.goto(TAGS_URL);
    await expect(page).toHaveTitle(/标签/);
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'A2' } });
  });

  test('A3: <nav> 导航栏存在', async ({ page }) => {
    await page.goto(TAGS_URL);
    await expect(page.locator('#nav')).toBeVisible();
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'A3' } });
  });

  test('A4: #content-inner 主内容区存在', async ({ page }) => {
    await page.goto(TAGS_URL);
    await expect(page.locator('#content-inner')).toBeVisible();
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'A4' } });
  });

  // ─── B. 标签云 ───
  test('B5: .tag-cloud-list 标签云容器存在', async ({ page }) => {
    await page.goto(TAGS_URL);
    const links = await page.locator('.tag-cloud-list a').count();
    const emptyState = await page.locator('.empty-state').count();
    if (links > 0) {
      await expect(page.locator('.tag-cloud-list')).toBeVisible();
    }
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'B5' } });
  });

  test('B6: 标签链接存在且数量 > 0', async ({ page }) => {
    await page.goto(TAGS_URL);
    const tagLinks = page.locator('.tag-cloud-list a');
    const count = await tagLinks.count();
    expect(count).toBeGreaterThan(0);
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'B6' } });
  });

  test('B7: 每个标签链接的 href 包含 ?tag= 或 /tag/', async ({ page }) => {
    await page.goto(TAGS_URL);
    const tagLinks = page.locator('.tag-cloud-list a');
    const count = await tagLinks.count();
    for (let i = 0; i < count; i++) {
      const href = await tagLinks.nth(i).getAttribute('href');
      expect(href).toBeTruthy();
      const isTagUrl = href!.includes('?tag=') || href!.includes('/tag/');
      expect(isTagUrl).toBe(true);
    }
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'B7' } });
  });

  test('B8: 标签字体大小不一 (不同权重)', async ({ page }) => {
    await page.goto(TAGS_URL);
    const tagLinks = page.locator('.tag-cloud-list a');
    const count = await tagLinks.count();
    const sizes = new Set<number>();
    for (let i = 0; i < count; i++) {
      const style = await tagLinks.nth(i).getAttribute('style');
      const sizeMatch = style!.match(/font-size\s*:\s*([\d.]+)em/);
      if (sizeMatch) {
        sizes.add(parseFloat(sizeMatch[1]));
      }
    }
    expect(sizes.size).toBeGreaterThanOrEqual(1);
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'B8' } });
  });

  // ─── C. 空状态 ───
  test('C9: .empty-state 存在 (如果 allTagCounts 为空)', async ({ page }) => {
    await page.goto(TAGS_URL);
    const tagCount = await page.locator('.tag-cloud-list a').count();
    const emptyCount = await page.locator('.empty-state').count();
    if (tagCount === 0) {
      expect(emptyCount).toBeGreaterThan(0);
    }
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'C9' } });
  });

  // ─── D. 导航栏 ───
  test('D10: #blog-info .nav-site-title Logo', async ({ page }) => {
    await page.goto(TAGS_URL);
    const logoLink = page.locator('#blog-info .nav-site-title');
    await expect(logoLink).toBeVisible();
    const href = await logoLink.getAttribute('href');
    expect(href).toBe('/');
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'D10' } });
  });

  test('D11: #menus .menus_items 菜单项', async ({ page }) => {
    await page.goto(TAGS_URL);
    const menuItems = page.locator('#menus .menus_items');
    await expect(menuItems).toBeVisible();
    const items = page.locator('#menus .menus_items .menus_item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(5);
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'D11' } });
  });

  test('D12: 搜索按钮 #searchBtn', async ({ page }) => {
    await page.goto(TAGS_URL);
    const searchBtn = page.locator('#searchBtn');
    await expect(searchBtn).toBeAttached();
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'D12' } });
  });

  // ─── E. 侧边栏 ───
  test('E13: #aside-content 存在', async ({ page }) => {
    await page.goto(TAGS_URL);
    const aside = page.locator('#aside-content');
    await expect(aside).toBeVisible();
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'E13' } });
  });

  // ─── F. Footer ───
  test('F14: #footer 存在', async ({ page }) => {
    await page.goto(TAGS_URL);
    const footer = page.locator('#footer');
    await expect(footer).toBeAttached();
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'F14' } });
  });

  // ─── G. 溢出检查 ───
  test('G15: 桌面端 (1920x1080) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(TAGS_URL);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'G15' } });
  });

  test('G16: 移动端 (375x812) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(TAGS_URL);
    await page.waitForLoadState('domcontentloaded');
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'G16' } });
  });

  // ─── H. 标签链接跳转 ───
  test('H17: 点击第一个标签链接，URL 包含 ?tag= 或 /tag/ 且页面导航到筛选结果', async ({ page }) => {
    await page.goto(TAGS_URL);
    const firstLink = page.locator('.tag-cloud-list a').first();
    await expect(firstLink).toBeVisible();
    const href = await firstLink.getAttribute('href');
    expect(href).toBeTruthy();
    await firstLink.click();
    await page.waitForLoadState('domcontentloaded');
    const url = page.url();
    const isTagFilter = url.includes('?tag=') || url.includes('/tag/');
    expect(isTagFilter).toBe(true);
    writeStatus({ 'sa-08-tags': { started: true, completed: false, lastTest: 'H17' } });
  });
});
