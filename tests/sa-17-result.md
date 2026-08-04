# SA-17 全局 UI E2E 测试结果

## 断点续测状态
- 读取 `.e2e-status.json`: sa-17-global-ui 未存在，全部从头执行
- 写入状态: `sa-17-global-ui: { started: true, completed: true, lastTest: 'done' }`

## 测试通过情况
**51/51 通过 (3.0m)**

## 修复记录

### 第1轮: 3个失败
| 测试 | 失败原因 | 修复方式 |
|------|----------|----------|
| B12: #searchInput 获得焦点 | `setTimeout(100ms)` 焦点延迟，立即检查 `activeElement` 时焦点尚未设置 | 改用 `page.waitForFunction(() => document.activeElement?.id === 'searchInput', null, { timeout: 3000 })` |
| C23: 暗黑模式 data-theme 变化 | `#darkmode` 位于 `#rightside-config-hide` 内，初始不可见，需先点击 `#rightside-config` 展开 | 在点击 `#darkmode` 前先点击 `#rightside-config` 并断言 `#rightside-config-hide` 获得 `open` class |
| C24: 再次点击暗黑模式恢复 | 同上原因 | 同上修复 |

### 第2轮: 3个失败
| 测试 | 失败原因 | 修复方式 |
|------|----------|----------|
| C26: 单/双栏切换 class 切换 | `#hide-aside-btn` 位于 `#rightside-config-hide` 内，初始不可见 | 点击 `#rightside-config` 展开后再点击 `#hide-aside-btn` |
| I47: toggle-menu → sidebar.open | `#toggle-menu` 在桌面端(1920x1080)下 `display:none` 不可见 | 先设置 `page.setViewportSize({ width: 375, height: 812 })` 移动端视口再操作 |
| I48: menu-mask → sidebar 关闭 | 同上原因 | 同上修复 |

### 第3轮: 51/51 全部通过

## 真实 Runner 输出 (最终轮)

```
Running 51 tests using 1 worker

  ok  1 [chromium] › tests\sa-17-global-ui.spec.ts:33:7 › SA-17 全局 UI E2E 测试 › A1: #nav 导航栏存在 (2.7s)
  ok  2 [chromium] › tests\sa-17-global-ui.spec.ts:36:7 › SA-17 全局 UI E2E 测试 › A2: Logo 链接 href="/"  (2.7s)
  ok  3 [chromium] › tests\sa-17-global-ui.spec.ts:41:7 › SA-17 全局 UI E2E 测试 › A3: Logo 图片 .site-icon 存在 (7.8s)
  ok  4 [chromium] › tests\sa-17-global-ui.spec.ts:46:7 › SA-17 全局 UI E2E 测试 › A4: .site-name 站点名称存在 (6.8s)
  ok  5 [chromium] › tests\sa-17-global-ui.spec.ts:51:7 › SA-17 全局 UI E2E 测试 › A5: #menus .menus_items 菜单容器存在 (2.0s)
  ok  6 [chromium] › tests\sa-17-global-ui.spec.ts:55:7 › SA-17 全局 UI E2E 测试 › A6: .menus_item 菜单项数量 > 0 (6.3s)
  ok  7 [chromium] › tests\sa-17-global-ui.spec.ts:60:7 › SA-17 全局 UI E2E 测试 › A7: 每个菜单项链接 href 有效 (3.4s)
  ok  8 [chromium] › tests\sa-17-global-ui.spec.ts:72:7 › SA-17 全局 UI E2E 测试 › A8: #toggle-menu 移动端菜单按钮存在 (2.4s)
  ok  9 [chromium] › tests\sa-17-global-ui.spec.ts:78:7 › SA-17 全局 UI E2E 测试 › B9: #searchBtn 搜索按钮存在且可见 (3.0s)
  ok 10 [chromium] › tests\sa-17-global-ui.spec.ts:82:7 › SA-17 全局 UI E2E 测试 › B10: 点击搜索按钮 → 搜索弹窗显示 (9.9s)
  ok 11 [chromium] › tests\sa-17-global-ui.spec.ts:87:7 › SA-17 全局 UI E2E 测试 › B11: 遮罩层 #search-mask 显示 (3.1s)
  ok 12 [chromium] › tests\sa-17-global-ui.spec.ts:92:7 › SA-17 全局 UI E2E 测试 › B12: #searchInput 获得焦点 (7.3s)
  ok 13 [chromium] › tests\sa-17-global-ui.spec.ts:99:7 › SA-17 全局 UI E2E 测试 › B13: .search-close-button 关闭按钮存在 (2.8s)
  ok 14 [chromium] › tests\sa-17-global-ui.spec.ts:104:7 › SA-17 全局 UI E2E 测试 › B14: 点击关闭按钮 → 搜索弹窗隐藏 (2.6s)
  ok 15 [chromium] › tests\sa-17-global-ui.spec.ts:111:7 › SA-17 全局 UI E2E 测试 › B15: 点击遮罩层 → 搜索弹窗隐藏 (2.7s)
  ok 16 [chromium] › tests\sa-17-global-ui.spec.ts:118:7 › SA-17 全局 UI E2E 测试 › B16: 键盘 / 快捷键打开搜索 (2.3s)
  ok 17 [chromium] › tests\sa-17-global-ui.spec.ts:123:7 › SA-17 全局 UI E2E 测试 › B17: Escape 关闭搜索 (2.4s)
  ok 18 [chromium] › tests\sa-17-global-ui.spec.ts:130:7 › SA-17 全局 UI E2E 测试 › B18: Ctrl+K 打开搜索 (2.6s)
  ok 19 [chromium] › tests\sa-17-global-ui.spec.ts:137:7 › SA-17 全局 UI E2E 测试 › C19: #rightside 存在 (4.6s)
  ok 20 [chromium] › tests\sa-17-global-ui.spec.ts:141:7 › SA-17 全局 UI E2E 测试 › C20: #rightside-config 设置齿轮按钮存在 (2.1s)
  ok 21 [chromium] › tests\sa-17-global-ui.spec.ts:145:7 › SA-17 全局 UI E2E 测试 › C21: 点击设置齿轮 → #rightside-config-hide 显示 (2.6s)
  ok 22 [chromium] › tests\sa-17-global-ui.spec.ts:150:7 › SA-17 全局 UI E2E 测试 › C22: #darkmode 暗黑模式按钮存在 (2.8s)
  ok 23 [chromium] › tests\sa-17-global-ui.spec.ts:154:7 › SA-17 全局 UI E2E 测试 › C23: 点击暗黑模式 → data-theme 变为 dark (4.2s)
  ok 24 [chromium] › tests\sa-17-global-ui.spec.ts:163:7 › SA-17 全局 UI E2E 测试 › C24: 再次点击暗黑模式 → data-theme 恢复 (4.7s)
  ok 25 [chromium] › tests\sa-17-global-ui.spec.ts:175:7 › SA-17 全局 UI E2E 测试 › C25: #hide-aside-btn 单/双栏切换按钮存在 (2.6s)
  ok 26 [chromium] › tests\sa-17-global-ui.spec.ts:179:7 › SA-17 全局 UI E2E 测试 › C26: 点击单/双栏切换 → .layout hide-aside class 切换 (4.1s)
  ok 27 [chromium] › tests\sa-17-global-ui.spec.ts:188:7 › SA-17 全局 UI E2E 测试 › C27: #font-settings-btn 字体设置按钮存在 (1.6s)
  ok 28 [chromium] › tests\sa-17-global-ui.spec.ts:192:7 › SA-17 全局 UI E2E 测试 › C28: #go-up 回到顶部按钮存在 (1.8s)
  ok 29 [chromium] › tests\sa-17-global-ui.spec.ts:196:7 › SA-17 全局 UI E2E 测试 › C29: 点击回到顶部 → scrollY 变为 0 (3.7s)
  ok 30 [chromium] › tests\sa-17-global-ui.spec.ts:203:7 › SA-17 全局 UI E2E 测试 › C30: .scroll-percent 滚动百分比数字存在 (2.4s)
  ok 31 [chromium] › tests\sa-17-global-ui.spec.ts:209:7 › SA-17 全局 UI E2E 测试 › D31: 点击字体设置 → #font-settings-overlay 显示 (2.5s)
  ok 32 [chromium] › tests\sa-17-global-ui.spec.ts:215:7 › SA-17 全局 UI E2E 测试 › D32: 字体设置面板包含字体大小选项 (3.6s)
  ok 33 [chromium] › tests\sa-17-global-ui.spec.ts:222:7 › SA-17 全局 UI E2E 测试 › D33: 点击字体大小按钮 → --font-size-global 变化 (3.2s)
  ok 34 [chromium] › tests\sa-17-global-ui.spec.ts:230:7 › SA-17 全局 UI E2E 测试 › D34: .settings-close 关闭按钮存在 (4.4s)
  ok 35 [chromium] › tests\sa-17-global-ui.spec.ts:236:7 › SA-17 全局 UI E2E 测试 › D35: 点击关闭 → 字体设置面板隐藏 (2.9s)
  ok 36 [chromium] › tests\sa-17-global-ui.spec.ts:246:7 › SA-17 全局 UI E2E 测试 › E36: #footer 存在 (2.0s)
  ok 37 [chromium] › tests\sa-17-global-ui.spec.ts:250:7 › SA-17 全局 UI E2E 测试 › E37: #footer-wrap 页脚内容存在 (2.3s)
  ok 38 [chromium] › tests\sa-17-global-ui.spec.ts:254:7 › SA-17 全局 UI E2E 测试 › E38: .copyright 版权信息存在 (3.1s)
  ok 39 [chromium] › tests\sa-17-global-ui.spec.ts:258:7 › SA-17 全局 UI E2E 测试 › E39: .framework-info 框架信息存在 (3.3s)
  ok 40 [chromium] › tests\sa-17-global-ui.spec.ts:264:7 › SA-17 全局 UI E2E 测试 › F40: #progressBar 进度条存在 (2.3s)
  ok 41 [chromium] › tests\sa-17-global-ui.spec.ts:268:7 › SA-17 全局 UI E2E 测试 › F41: 滚动页面 → 进度条宽度变化 (2.5s)
  ok 42 [chromium] › tests\sa-17-global-ui.spec.ts:278:7 › SA-17 全局 UI E2E 测试 › G42: #jinrishiciText 诗词文本容器存在 (2.8s)
  ok 43 [chromium] › tests\sa-17-global-ui.spec.ts:282:7 › SA-17 全局 UI E2E 测试 › G43: #jinrishiciSource 诗词来源存在 (5.9s)
  ok 44 [chromium] › tests\sa-17-global-ui.spec.ts:288:7 › SA-17 全局 UI E2E 测试 › H44: #preloader 加载动画存在 (2.4s)
  ok 45 [chromium] › tests\sa-17-global-ui.spec.ts:294:7 › SA-17 全局 UI E2E 测试 › I45: #sidebar 侧边栏容器存在 (3.4s)
  ok 46 [chromium] › tests\sa-17-global-ui.spec.ts:298:7 › SA-17 全局 UI E2E 测试 › I46: #menu-mask 遮罩存在 (1.8s)
  ok 47 [chromium] › tests\sa-17-global-ui.spec.ts:302:7 › SA-17 全局 UI E2E 测试 › I47: 点击 toggle-menu → sidebar.open 出现 (3.1s)
  ok 48 [chromium] › tests\sa-17-global-ui.spec.ts:309:7 › SA-17 全局 UI E2E 测试 › I48: 点击 menu-mask → sidebar 关闭 (3.1s)
  ok 49 [chromium] › tests\sa-17-global-ui.spec.ts:320:7 › SA-17 全局 UI E2E 测试 › J49: 页面滚动 > 60px → #nav.fixed (2.3s)
  ok 50 [chromium] › tests\sa-17-global-ui.spec.ts:331:7 › SA-17 全局 UI E2E 测试 › K50: 桌面端 (1920x1080) 无水平溢出 (4.1s)
  ok 51 [chromium] › tests\sa-17-global-ui.spec.ts:337:7 › SA-17 全局 UI E2E 测试 › K51: 移动端 (375x812) 无水平溢出 (5.7s)

  51 passed (3.0m)
```

## TS 源码

```typescript
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
```

## 代码修复记录
无需修改任何视图/样式文件。所有修复均为测试层调整:
1. B12: 改用 `waitForFunction` 等待焦点设置完成
2. C23/C24/C26: 操作前先点击 `#rightside-config` 展开隐藏面板
3. I47/I48: 操作前设置移动端 viewport (375x812)

## 无代码缺陷
本次测试确认全局 UI 组件全部正常工作，无需修改 `header.ejs`、`footer.ejs` 或 `main.css`。
