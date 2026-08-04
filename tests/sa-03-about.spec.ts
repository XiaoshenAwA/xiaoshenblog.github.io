import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ABOUT_URL = '/about';
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

test.describe('SA-03 关于页 /about E2E 测试', () => {
  test.beforeAll(() => {
    writeStatus({
      'sa-03-about': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() }
    });
  });

  test.afterAll(() => {
    writeStatus({
      'sa-03-about': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() }
    });
  });

  // ─── A. 页面基础结构 ───
  test('A1: DOCTYPE html 存在', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const doctype = await page.evaluate(() => {
      const node = document.doctype;
      return node ? node.name : null;
    });
    expect(doctype).toBe('html');
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'A1' } });
  });

  test('A2: <title> 包含 "关于"', async ({ page }) => {
    await page.goto(ABOUT_URL);
    await expect(page).toHaveTitle(/关于/);
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'A2' } });
  });

  test('A3: <nav> 导航栏存在', async ({ page }) => {
    await page.goto(ABOUT_URL);
    await expect(page.locator('#nav')).toBeVisible();
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'A3' } });
  });

  test('A4: #content-inner 主内容区存在', async ({ page }) => {
    await page.goto(ABOUT_URL);
    await expect(page.locator('#content-inner')).toBeVisible();
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'A4' } });
  });

  // ─── B. Hero 区域 ───
  test('B5: .about-hero 存在', async ({ page }) => {
    await page.goto(ABOUT_URL);
    await expect(page.locator('.about-hero')).toBeVisible();
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'B5' } });
  });

  test('B6: 头像图片 .about-avatar-img 可见', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const avatar = page.locator('.about-avatar-img');
    await expect(avatar).toBeVisible();
    const tagName = await avatar.evaluate(el => el.tagName);
    expect(tagName).toBe('IMG');
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'B6' } });
  });

  test('B7: h1 作者名称存在且内容正确', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const h1 = page.locator('.about-hero h1');
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('博主');
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'B7' } });
  });

  test('B8: .about-tagline 作者简介存在', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const tagline = page.locator('.about-tagline');
    await expect(tagline).toBeVisible();
    await expect(tagline).toContainText('热爱技术');
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'B8' } });
  });

  // ─── C. 社交链接 ───
  test('C9: GitHub 社交链接存在且 href 正确', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const gh = page.locator('.social-links a').filter({ has: page.locator('.fa-github') });
    await expect(gh).toHaveCount(1);
    await expect(gh).toHaveAttribute('href', 'https://github.com/XiaoshenAwA');
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'C9' } });
  });

  test('C10: Twitter 社交链接存在且 href 正确', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const tw = page.locator('.social-links a').filter({ has: page.locator('.fa-twitter') });
    await expect(tw).toHaveCount(1);
    await expect(tw).toHaveAttribute('href', 'https://x.com/XiaoshenAwA');
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'C10' } });
  });

  // ─── D. 内容区 ───
  test('D11: .about-content 内容容器存在', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const content = page.locator('.about-content');
    await expect(content).toBeVisible();
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'D11' } });
  });

  test('D12: 内容区有 HTML 渲染内容 (非空)', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const content = page.locator('.about-content');
    const innerHTML = await content.innerHTML();
    expect(innerHTML.trim().length).toBeGreaterThan(0);
    const pTag = page.locator('.about-content p');
    await expect(pTag).toBeVisible();
    await expect(pTag).toHaveText('hello');
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'D12' } });
  });

  // ─── E. 导航栏 ───
  test('E13: #blog-info .nav-site-title Logo 链接存在', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const logoLink = page.locator('#blog-info .nav-site-title');
    await expect(logoLink).toBeVisible();
    const href = await logoLink.getAttribute('href');
    expect(href).toBe('/');
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'E13' } });
  });

  test('E14: #menus .menus_items 菜单项存在', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const menuItems = page.locator('#menus .menus_items');
    await expect(menuItems).toBeVisible();
    const items = page.locator('#menus .menus_items .menus_item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(5);
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'E14' } });
  });

  test('E15: 搜索按钮 #searchBtn 存在', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const searchBtn = page.locator('#searchBtn');
    await expect(searchBtn).toBeAttached();
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'E15' } });
  });

  // ─── F. 侧边栏布局 ───
  test('F16: #content-inner 有 hide-aside class', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const layout = page.locator('#content-inner');
    const cls = await layout.getAttribute('class');
    expect(cls).toContain('hide-aside');
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'F16' } });
  });

  // ─── G. Footer ───
  test('G17: #footer 存在', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const footer = page.locator('#footer');
    await expect(footer).toBeAttached();
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'G17' } });
  });

  test('G18: 版权信息存在', async ({ page }) => {
    await page.goto(ABOUT_URL);
    const copyright = page.locator('.copyright');
    await expect(copyright).toBeVisible();
    await expect(copyright).toContainText('博主');
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'G18' } });
  });

  // ─── H. 响应式溢出检查 ───
  test('H19: 桌面端 (1920x1080) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(ABOUT_URL);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'H19' } });
  });

  test('H20: 移动端 (375x812) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ABOUT_URL);
    await page.waitForTimeout(500);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
    writeStatus({ 'sa-03-about': { started: true, completed: false, lastTest: 'H20' } });
  });
});
