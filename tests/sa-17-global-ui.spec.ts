import { test, expect } from '@playwright/test';
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
  const s = readStatus(); Object.assign(s, patch); fs.writeFileSync(STATUS_FILE, JSON.stringify(s, null, 2));
}

test.describe.configure({ maxFailures: 1 });

const BASE = '/';

test.describe('SA-17 全局 UI E2E 测试', () => {
  test.beforeAll(() => {
    writeStatus({ 'sa-17-global-ui': { started: true, completed: false, lastTest: null, timestamp: new Date().toISOString() } });
  });
  test.afterAll(() => {
    writeStatus({ 'sa-17-global-ui': { started: true, completed: true, lastTest: 'done', timestamp: new Date().toISOString() } });
  });

  // ─── A. 导航栏 ───
  test('A1: #nav 导航栏存在', async ({ page }) => {
    await page.goto(BASE); await expect(page.locator('#nav')).toBeVisible();
  });
  test('A2: Logo 链接 href="/" ', async ({ page }) => {
    await page.goto(BASE);
    const link = page.locator('#blog-info .nav-site-title');
    await expect(link).toHaveAttribute('href', '/');
  });
  test('A3: Logo 图片 .site-icon 存在', async ({ page }) => {
    await page.goto(BASE);
    const icon = page.locator('.site-icon');
    await expect(icon).toBeAttached();
  });
  test('A4: .site-name 站点名称存在', async ({ page }) => {
    await page.goto(BASE);
    const name = page.locator('#blog-info .site-name');
    await expect(name).toBeVisible();
  });
  test('A5: #menus .menus_items 菜单容器存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#menus .menus_items')).toBeVisible();
  });
  test('A6: .menus_item 菜单项数量 > 0', async ({ page }) => {
    await page.goto(BASE);
    const count = await page.locator('#menus .menus_items .menus_item').count();
    expect(count).toBeGreaterThan(0);
  });
  test('A7: 每个菜单项链接 href 有效', async ({ page }) => {
    await page.goto(BASE);
    const items = page.locator('#menus .menus_items .menus_item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const link = items.nth(i).locator('a.site-page').first();
      if (await link.count() > 0) {
        const href = await link.getAttribute('href');
        expect(href && href.length > 0).toBeTruthy();
      }
    }
  });
  test('A8: #toggle-menu 移动端菜单按钮存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#toggle-menu')).toBeAttached();
  });

  // ─── B. 搜索功能 ───
  test('B9: #searchBtn 搜索按钮存在且可见', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#searchBtn')).toBeVisible();
  });
  test('B10: 点击搜索按钮 → 搜索弹窗显示', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#searchBtn').click();
    await expect(page.locator('#local-search')).toBeVisible();
  });
  test('B11: 遮罩层 #search-mask 显示', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#searchBtn').click();
    await expect(page.locator('#search-mask')).toBeVisible();
  });
  test('B12: #searchInput 获得焦点', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#searchBtn').click();
    await page.waitForFunction(() => document.activeElement?.id === 'searchInput', null, { timeout: 3000 });
    const focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('searchInput');
  });
  test('B13: .search-close-button 关闭按钮存在', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#searchBtn').click();
    await expect(page.locator('.search-close-button')).toBeVisible();
  });
  test('B14: 点击关闭按钮 → 搜索弹窗隐藏', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#searchBtn').click();
    await expect(page.locator('#local-search')).toBeVisible();
    await page.locator('.search-close-button').click();
    await expect(page.locator('#local-search')).toBeHidden();
  });
  test('B15: 点击遮罩层 → 搜索弹窗隐藏', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#searchBtn').click();
    await expect(page.locator('#local-search')).toBeVisible();
    await page.locator('#search-mask').click({ force: true });
    await expect(page.locator('#local-search')).toBeHidden();
  });
  test('B16: 键盘 / 快捷键打开搜索', async ({ page }) => {
    await page.goto(BASE);
    await page.keyboard.press('/');
    await expect(page.locator('#local-search')).toBeVisible();
  });
  test('B17: Escape 关闭搜索', async ({ page }) => {
    await page.goto(BASE);
    await page.keyboard.press('/');
    await expect(page.locator('#local-search')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#local-search')).toBeHidden();
  });
  test('B18: Ctrl+K 打开搜索', async ({ page }) => {
    await page.goto(BASE);
    await page.keyboard.press('Control+k');
    await expect(page.locator('#local-search')).toBeVisible();
  });

  // ─── C. 右侧面板 ───
  test('C19: #rightside 存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#rightside')).toBeAttached();
  });
  test('C20: #rightside-config 设置齿轮按钮存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#rightside-config')).toBeAttached();
  });
  test('C21: 点击设置齿轮 → #rightside-config-hide 显示', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#rightside-config').click();
    await expect(page.locator('#rightside-config-hide')).toHaveClass(/open/);
  });
  test('C22: #darkmode 暗黑模式按钮存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#darkmode')).toBeAttached();
  });
  test('C23: 点击暗黑模式 → data-theme 变为 dark', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#rightside-config').click();
    await expect(page.locator('#rightside-config-hide')).toHaveClass(/open/);
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.locator('#darkmode').click();
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(after).not.toBe(before);
  });
  test('C24: 再次点击暗黑模式 → data-theme 恢复', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#rightside-config').click();
    await expect(page.locator('#rightside-config-hide')).toHaveClass(/open/);
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.locator('#darkmode').click();
    const mid = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.locator('#darkmode').click();
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(after).toBe(before);
    expect(mid).not.toBe(before);
  });
  test('C25: #hide-aside-btn 单/双栏切换按钮存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#hide-aside-btn')).toBeAttached();
  });
  test('C26: 点击单/双栏切换 → .layout hide-aside class 切换', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#rightside-config').click();
    await expect(page.locator('#rightside-config-hide')).toHaveClass(/open/);
    const before = await page.evaluate(() => document.querySelector('.layout')?.classList.contains('hide-aside'));
    await page.locator('#hide-aside-btn').click();
    const after = await page.evaluate(() => document.querySelector('.layout')?.classList.contains('hide-aside'));
    expect(after).toBe(!before);
  });
  test('C27: #font-settings-btn 字体设置按钮存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#font-settings-btn')).toBeAttached();
  });
  test('C28: #go-up 回到顶部按钮存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#go-up')).toBeAttached();
  });
  test('C29: 点击回到顶部 → scrollY 变为 0', async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect.poll(async () => await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await page.locator('#go-up').click();
    await expect.poll(async () => await page.evaluate(() => window.scrollY), { timeout: 3000 }).toBe(0);
  });
  test('C30: .scroll-percent 滚动百分比数字存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#go-up .scroll-percent')).toBeAttached();
  });

  // ─── D. 字体设置面板 ───
  test('D31: 点击字体设置 → #font-settings-overlay 显示', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#rightside-config').click();
    await page.locator('#font-settings-btn').click();
    await expect(page.locator('#font-settings-overlay')).toBeVisible();
  });
  test('D32: 字体设置面板包含字体大小选项', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#rightside-config').click();
    await page.locator('#font-settings-btn').click();
    const opts = page.locator('#font-settings-overlay [data-fontsize]');
    expect(await opts.count()).toBe(3);
  });
  test('D33: 点击字体大小按钮 → --font-size-global 变化', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#rightside-config').click();
    await page.locator('#font-settings-btn').click();
    await page.locator('#font-settings-overlay [data-fontsize="14"]').click();
    const size = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-size-global').trim());
    expect(size).toBe('14px');
  });
  test('D34: .settings-close 关闭按钮存在', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#rightside-config').click();
    await page.locator('#font-settings-btn').click();
    await expect(page.locator('#font-settings-overlay .settings-close')).toBeVisible();
  });
  test('D35: 点击关闭 → 字体设置面板隐藏', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#rightside-config').click();
    await page.locator('#font-settings-btn').click();
    await expect(page.locator('#font-settings-overlay')).toBeVisible();
    await page.locator('#font-settings-overlay .settings-close').click();
    await expect(page.locator('#font-settings-overlay')).toBeHidden();
  });

  // ─── E. 页脚 ───
  test('E36: #footer 存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#footer')).toBeAttached();
  });
  test('E37: #footer-wrap 页脚内容存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#footer-wrap')).toBeAttached();
  });
  test('E38: .copyright 版权信息存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('.copyright')).toBeAttached();
  });
  test('E39: .framework-info 框架信息存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('.framework-info')).toBeAttached();
  });

  // ─── F. 阅读进度条 ───
  test('F40: #progressBar 进度条存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#progressBar')).toBeAttached();
  });
  test('F41: 滚动页面 → 进度条宽度变化', async ({ page }) => {
    await page.goto(BASE);
    const w0 = await page.evaluate(() => document.getElementById('progressBar')?.style.width || '0%');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    const w1 = await page.evaluate(() => document.getElementById('progressBar')?.style.width || '0%');
    expect(w1).not.toBe(w0);
  });

  // ─── G. 今日诗词 ───
  test('G42: #jinrishiciText 诗词文本容器存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#jinrishiciText')).toBeAttached();
  });
  test('G43: #jinrishiciSource 诗词来源存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#jinrishiciSource')).toBeAttached();
  });

  // ─── H. 页面加载动画 ───
  test('H44: #preloader 加载动画存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#preloader')).toBeAttached();
  });

  // ─── I. 移动端侧边栏 ───
  test('I45: #sidebar 侧边栏容器存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#sidebar')).toBeAttached();
  });
  test('I46: #menu-mask 遮罩存在', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#menu-mask')).toBeAttached();
  });
  test('I47: 点击 toggle-menu → sidebar.open 出现', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    await page.locator('#toggle-menu').click();
    await expect(page.locator('#sidebar')).toHaveClass(/open/);
  });
  test('I48: 点击 menu-mask → sidebar 关闭', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    await page.locator('#toggle-menu').click();
    await expect(page.locator('#sidebar')).toHaveClass(/open/);
    await page.locator('#menu-mask').click({ force: true });
    await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
  });

  // ─── J. 导航栏滚动效果 ───
  test('J49: 页面滚动 > 60px → #nav.fixed', async ({ page }) => {
    await page.goto(BASE);
    const hasFixedBefore = await page.evaluate(() => document.getElementById('nav')?.classList.contains('fixed'));
    expect(hasFixedBefore).toBe(false);
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(300);
    const hasFixedAfter = await page.evaluate(() => document.getElementById('nav')?.classList.contains('fixed'));
    expect(hasFixedAfter).toBe(true);
  });

  // ─── K. 响应式溢出 ───
  test('K50: 桌面端 (1920x1080) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
  test('K51: 移动端 (375x812) 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
});
