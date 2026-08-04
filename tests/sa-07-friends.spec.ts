import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const FRIENDS_URL = '/friends';
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

test.describe('SA-07 友链页 /friends E2E 测试', () => {
  test.beforeAll(() => {
    writeStatus({
      'sa-07-friends': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() }
    });
  });

  test.afterAll(() => {
    writeStatus({
      'sa-07-friends': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() }
    });
  });

  // ─── A. 页面基础结构 ───
  test('A1: DOCTYPE html 存在', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    const doctype = await page.evaluate(() => {
      const node = document.doctype;
      return node ? node.name : null;
    });
    expect(doctype).toBe('html');
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'A1' } });
  });

  test('A2: <title> 包含 "友链"', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    await expect(page).toHaveTitle(/友链/);
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'A2' } });
  });

  test('A3: <nav> 导航栏存在', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    await expect(page.locator('#nav')).toBeVisible();
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'A3' } });
  });

  test('A4: #content-inner 主内容区存在', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    await expect(page.locator('#content-inner')).toBeVisible();
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'A4' } });
  });

  test('A5: #friend 友链容器存在', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    await expect(page.locator('#friend')).toBeVisible();
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'A5' } });
  });

  // ─── B. 友链卡片 ───
  test('B6: .friends-grid 网格容器存在', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    await expect(page.locator('.friends-grid')).toBeVisible();
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'B6' } });
  });

  test('B7: .friend-card 友链卡片存在且数量 >= 1', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    const cards = page.locator('.friend-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'B7' } });
  });

  test('B8: 每个卡片的头像 img 存在且 src 不为空', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    const avatars = page.locator('.friend-avatar img');
    const count = await avatars.count();
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < count; i++) {
      const src = await avatars.nth(i).getAttribute('src');
      expect(src).toBeTruthy();
      expect(src!.length).toBeGreaterThan(0);
    }
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'B8' } });
  });

  test('B9: 每个卡片的名称 h3 存在', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    const names = page.locator('.friend-info h3');
    const count = await names.count();
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < count; i++) {
      const text = await names.nth(i).textContent();
      expect(text!.trim().length).toBeGreaterThan(0);
    }
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'B9' } });
  });

  test('B10: 每个卡片的描述 p 存在', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    const descs = page.locator('.friend-info p');
    const count = await descs.count();
    expect(count).toBeGreaterThanOrEqual(1);
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'B10' } });
  });

  test('B11: 每个卡片外链 target="_blank"', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    const cards = page.locator('.friend-card');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toHaveAttribute('target', '_blank');
    }
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'B11' } });
  });

  // ─── D. 导航栏 ───
  test('D12: #blog-info .nav-site-title Logo 存在', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    const logoLink = page.locator('#blog-info .nav-site-title');
    await expect(logoLink).toBeVisible();
    const href = await logoLink.getAttribute('href');
    expect(href).toBe('/');
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'D12' } });
  });

  test('D13: #menus .menus_items 菜单项存在', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    const menuItems = page.locator('#menus .menus_items');
    await expect(menuItems).toBeVisible();
    const items = page.locator('#menus .menus_items .menus_item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(5);
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'D13' } });
  });

  test('D14: 搜索按钮 #searchBtn 存在', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    const searchBtn = page.locator('#searchBtn');
    await expect(searchBtn).toBeAttached();
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'D14' } });
  });

  // ─── E. 侧边栏 ───
  test('E15: #aside-content 存在', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    const aside = page.locator('#aside-content');
    await expect(aside).toBeAttached();
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'E15' } });
  });

  // ─── F. Footer ───
  test('F16: #footer 存在', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    const footer = page.locator('#footer');
    await expect(footer).toBeAttached();
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'F16' } });
  });

  // ─── G. 溢出检查 ───
  test('G17: 桌面端 (1920x1080) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(FRIENDS_URL);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'G17' } });
  });

  test('G18: 移动端 (375x812) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(FRIENDS_URL);
    await page.waitForLoadState('networkidle');
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'G18' } });
  });

  // ─── H. 友链卡片点击 ───
  test('H19: 点击第一个友链卡片触发新标签页', async ({ page }) => {
    await page.goto(FRIENDS_URL);
    const firstCard = page.locator('.friend-card').first();
    await expect(firstCard).toBeVisible();

    const [newPage] = await Promise.all([
      page.waitForEvent('popup', { timeout: 10000 }),
      firstCard.click(),
    ]);
    expect(newPage).toBeTruthy();
    await newPage.waitForLoadState('domcontentloaded');
    const url = newPage.url();
    expect(url).toMatch(/^https?:\/\//);
    await newPage.close();
    writeStatus({ 'sa-07-friends': { started: true, completed: false, lastTest: 'H19' } });
  });
});
