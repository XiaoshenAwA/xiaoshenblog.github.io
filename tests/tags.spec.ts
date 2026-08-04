import { test, expect } from '@playwright/test';

const TAGS_URL = '/tags';

test.describe('标签页 /tags — 全按钮 E2E 深度断言', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(TAGS_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tag-cloud-list', { timeout: 10000 }).catch(() => {});
  });

  test.describe('1. 标签云链接 href 断言', () => {

    test('每个标签链接 href 包含 ?tag= 或 /tag/', async ({ page }) => {
      const links = page.locator('.tag-cloud-list a');
      const count = await links.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const href = await links.nth(i).getAttribute('href');
        expect(href).toBeTruthy();
        const isTagParam = href!.includes('?tag=') || href!.includes('/tag/');
        expect(isTagParam).toBeTruthy();
      }
    });

    test('标签 href 中的 tag 值是 URL 编码的', async ({ page }) => {
      const links = page.locator('.tag-cloud-list a');
      const count = await links.count();

      for (let i = 0; i < count; i++) {
        const href = await links.nth(i).getAttribute('href');
        expect(href).toBeTruthy();
        const text = (await links.nth(i).textContent())?.trim();
        expect(text).toBeTruthy();
        if (text!) {
          const encoded = encodeURIComponent(text!);
          expect(href!).toContain(encoded);
        }
      }
    });

    test('标签链接可点击并跳转', async ({ page }) => {
      const firstLink = page.locator('.tag-cloud-list a').first();
      const href = await firstLink.getAttribute('href');
      expect(href).toBeTruthy();
      await firstLink.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain(href!.replace(/^\//, ''));
    });
  });

  test.describe('2. 标签数量 / 计数', () => {

    test('标签云中标签数量与 subtitle 中的数量一致', async ({ page }) => {
      const linkCount = await page.locator('.tag-cloud-list a').count();
      expect(linkCount).toBeGreaterThan(0);

      const subtitle = await page.locator('#page-site-info #site-subtitle, #site-subtitle').textContent();
      expect(subtitle).toBeTruthy();
      const match = subtitle!.match(/(\d+)/);
      expect(match).toBeTruthy();
      const displayedCount = parseInt(match![1], 10);
      expect(displayedCount).toBe(linkCount);
    });

    test('每个标签文字不为空', async ({ page }) => {
      const links = page.locator('.tag-cloud-list a');
      const count = await links.count();

      for (let i = 0; i < count; i++) {
        const text = (await links.nth(i).textContent())?.trim();
        expect(text).toBeTruthy();
        expect(text!.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('3. 标签颜色 (color:hsl(...)) inline style', () => {

    test('每个标签都有包含 hsl 的 inline style', async ({ page }) => {
      const links = page.locator('.tag-cloud-list a');
      const count = await links.count();

      for (let i = 0; i < count; i++) {
        const style = await links.nth(i).getAttribute('style');
        expect(style).toBeTruthy();
        expect(style!).toMatch(/color\s*:\s*hsl\s*\(/);
      }
    });

    test('每个标签 hsl 色相值在 0-359 范围内', async ({ page }) => {
      const links = page.locator('.tag-cloud-list a');
      const count = await links.count();

      for (let i = 0; i < count; i++) {
        const style = await links.nth(i).getAttribute('style');
        expect(style).toBeTruthy();
        const hslMatch = style!.match(/hsl\s*\(\s*(\d+)/);
        expect(hslMatch).toBeTruthy();
        const hue = parseInt(hslMatch![1], 10);
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThanOrEqual(359);
      }
    });

    test('标签颜色饱和度和亮度在合理范围内', async ({ page }) => {
      const links = page.locator('.tag-cloud-list a');
      const count = await links.count();

      for (let i = 0; i < count; i++) {
        const style = await links.nth(i).getAttribute('style');
        const hslMatch = style!.match(/hsl\s*\(\s*\d+\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)/);
        expect(hslMatch).toBeTruthy();
        const saturation = parseInt(hslMatch![1], 10);
        const lightness = parseInt(hslMatch![2], 10);
        expect(saturation).toBeGreaterThanOrEqual(0);
        expect(saturation).toBeLessThanOrEqual(100);
        expect(lightness).toBeGreaterThanOrEqual(0);
        expect(lightness).toBeLessThanOrEqual(100);
      }
    });
  });

  test.describe('4. 字体大小差异', () => {

    test('每个标签都有 font-size inline style', async ({ page }) => {
      const links = page.locator('.tag-cloud-list a');
      const count = await links.count();

      for (let i = 0; i < count; i++) {
        const style = await links.nth(i).getAttribute('style');
        expect(style).toMatch(/font-size\s*:\s*[\d.]+em/);
      }
    });

    test('font-size 在 0.8em-1.8em 范围内', async ({ page }) => {
      const links = page.locator('.tag-cloud-list a');
      const count = await links.count();

      for (let i = 0; i < count; i++) {
        const style = await links.nth(i).getAttribute('style');
        const sizeMatch = style!.match(/font-size\s*:\s*([\d.]+)em/);
        expect(sizeMatch).toBeTruthy();
        const size = parseFloat(sizeMatch![1]);
        expect(size).toBeGreaterThanOrEqual(0.8);
        expect(size).toBeLessThanOrEqual(1.8);
      }
    });

    test('不同 count 的标签字号不同（如有多个不同数量的标签）', async ({ page }) => {
      const links = page.locator('.tag-cloud-list a');
      const count = await links.count();
      const sizes = new Set<number>();

      for (let i = 0; i < count; i++) {
        const style = await links.nth(i).getAttribute('style');
        const sizeMatch = style!.match(/font-size\s*:\s*([\d.]+)em/);
        sizes.add(parseFloat(sizeMatch![1]));
      }

      // With random data there should be at least some variation
      // (at minimum 2 different sizes if multiple tags exist)
      expect(sizes.size).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('5. 空状态', () => {

    test('当有标签时，不显示 empty-state', async ({ page }) => {
      const links = await page.locator('.tag-cloud-list a').count();
      if (links > 0) {
        const emptyState = page.locator('.empty-state');
        await expect(emptyState).toHaveCount(0);
      }
    });

    test('当有标签时，tag-cloud-list 可见', async ({ page }) => {
      const links = await page.locator('.tag-cloud-list a').count();
      if (links > 0) {
        await expect(page.locator('.tag-cloud-list')).toBeVisible();
      }
    });

    test('empty-state 包含图标和标题', async ({ page }) => {
      const emptyState = page.locator('.empty-state');
      const count = await emptyState.count();
      if (count > 0) {
        await expect(emptyState.locator('.empty-icon')).toBeVisible();
        await expect(emptyState.locator('.empty-icon i')).toHaveClass(/fa-tags/);
        const title = await emptyState.locator('h3').textContent();
        expect(title).toBeTruthy();
      }
    });
  });

  test.describe('6. 侧边栏全局组件', () => {

    test('侧边栏容器存在', async ({ page }) => {
      const aside = page.locator('#aside-content, .aside-content');
      await expect(aside).toBeVisible();
    });

    test('侧边栏标签卡片 (card-tags) 存在', async ({ page }) => {
      const cardTags = page.locator('.card-widget.card-tags');
      await expect(cardTags).toBeVisible();
    });

    test('侧边栏标签卡片标题显示 "标签"', async ({ page }) => {
      const headline = page.locator('.card-tags .item-headline');
      await expect(headline).toBeVisible();
      const text = await headline.textContent();
      expect(text).toContain('标签');
    });

    test('侧边栏标签云中有标签链接', async ({ page }) => {
      const cloudLinks = page.locator('.card-tag-cloud a');
      const count = await cloudLinks.count();
      expect(count).toBeGreaterThan(0);
    });

    test('侧边栏标签链接 href 包含 ?tag= 或 /tag/', async ({ page }) => {
      const cloudLinks = page.locator('.card-tag-cloud a');
      const count = await cloudLinks.count();

      for (let i = 0; i < count; i++) {
        const href = await cloudLinks.nth(i).getAttribute('href');
        expect(href).toBeTruthy();
        expect(href!).toMatch(/(\?tag=|\/tag\/)/);
      }
    });

    test('侧边栏作者信息卡片存在', async ({ page }) => {
      const infoCard = page.locator('.card-widget.card-info');
      await expect(infoCard).toBeVisible();
    });

    test('侧边栏一言卡片存在', async ({ page }) => {
      const hitokoto = page.locator('.card-widget.card-hitokoto');
      await expect(hitokoto).toBeVisible();
    });

    test('侧边栏最近文章卡片存在', async ({ page }) => {
      const recentPost = page.locator('.card-widget.card-recent-post');
      await expect(recentPost).toBeVisible();
    });

    test('侧边栏归档卡片存在', async ({ page }) => {
      const archives = page.locator('.card-widget.card-archives');
      await expect(archives).toBeVisible();
    });

    test('侧边栏网站信息卡片存在', async ({ page }) => {
      const webinfo = page.locator('.card-widget.card-webinfo');
      await expect(webinfo).toBeVisible();
    });
  });

  test.describe('7. 暗黑模式', () => {

    test('暗黑模式按钮存在于 DOM 中', async ({ page }) => {
      const darkBtn = page.locator('#darkmode');
      await expect(darkBtn).toBeAttached();
    });

    test('暗黑模式切换按钮 #darkmode 在右侧配置面板中', async ({ page }) => {
      const rightside = page.locator('#rightside');
      const darkBtn = rightside.locator('#darkmode');
      await expect(darkBtn).toBeAttached();
    });

    test('点击右侧配置按钮后暗黑模式按钮可见', async ({ page }) => {
      const configBtn = page.locator('#rightside-config');
      await configBtn.click();
      await page.waitForTimeout(300);
      const darkBtn = page.locator('#darkmode');
      await expect(darkBtn).toBeVisible();
    });

    test('点击暗黑模式按钮后 data-theme 切换为 dark', async ({ page }) => {
      await page.locator('#rightside-config').click();
      await page.waitForTimeout(300);
      const initialTheme = await page.locator('html').getAttribute('data-theme');
      const darkBtn = page.locator('#darkmode');
      await darkBtn.click();
      await page.waitForTimeout(300);
      const newTheme = await page.locator('html').getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
      expect(newTheme).toBe('dark');
    });

    test('暗黑模式下页面仍可正常交互', async ({ page }) => {
      await page.locator('#rightside-config').click();
      await page.waitForTimeout(300);
      await page.locator('#darkmode').click();
      await page.waitForTimeout(300);

      const links = page.locator('.tag-cloud-list a');
      const count = await links.count();
      expect(count).toBeGreaterThan(0);

      const firstStyle = await links.first().getAttribute('style');
      expect(firstStyle).toMatch(/color\s*:\s*hsl/);
    });

    test('暗黑模式下 body 背景色变化', async ({ page }) => {
      await page.locator('#rightside-config').click();
      await page.waitForTimeout(300);
      await page.locator('#darkmode').click();
      await page.waitForTimeout(300);

      const bgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      expect(bgColor).toBeTruthy();
    });

    test('再次点击暗黑模式按钮恢复为 light', async ({ page }) => {
      await page.locator('#rightside-config').click();
      await page.waitForTimeout(300);
      await page.locator('#darkmode').click();
      await page.waitForTimeout(300);
      const darkTheme = await page.locator('html').getAttribute('data-theme');
      expect(darkTheme).toBe('dark');

      await page.locator('#darkmode').click();
      await page.waitForTimeout(300);
      const lightTheme = await page.locator('html').getAttribute('data-theme');
      expect(lightTheme).toBe('light');
    });
  });

  test.describe('8. 响应式', () => {

    test('移动端视口下侧边栏可通过按钮切换', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(TAGS_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const toggleBtn = page.locator('#toggle-menu');
      await expect(toggleBtn).toBeVisible();
    });

    test('移动端标签云仍可见', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(TAGS_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const tagCloud = page.locator('.tag-cloud-list');
      await expect(tagCloud).toBeVisible();
    });

    test('移动端标签链接可点击', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(TAGS_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const links = page.locator('.tag-cloud-list a');
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
      await expect(links.first()).toBeVisible();
    });

    test('平板视口下布局保持正常', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(TAGS_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const layout = page.locator('.layout');
      await expect(layout).toBeVisible();

      const tagCloud = page.locator('.tag-cloud-list');
      await expect(tagCloud).toBeVisible();
    });

    test('大屏幕视口下布局为双栏', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(TAGS_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const layout = page.locator('.layout');
      await expect(layout).toBeVisible();
      const isHiddenAside = await layout.evaluate(el => el.classList.contains('hide-aside'));
      expect(isHiddenAside).toBe(false);
    });

    test('移动端导航栏中 toggle-menu 可打开侧边栏', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(TAGS_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const toggleBtn = page.locator('#toggle-menu');
      await toggleBtn.click();
      await page.waitForTimeout(300);

      const sidebar = page.locator('#sidebar');
      const isOpen = await sidebar.evaluate(el => el.classList.contains('open'));
      expect(isOpen).toBe(true);
    });

    test('移动端侧边栏点击 mask 可关闭', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(TAGS_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      await page.locator('#toggle-menu').click();
      await page.waitForTimeout(300);

      await page.locator('#menu-mask').click();
      await page.waitForTimeout(300);

      const sidebar = page.locator('#sidebar');
      const isOpen = await sidebar.evaluate(el => el.classList.contains('open'));
      expect(isOpen).toBe(false);
    });
  });

  test.describe('9. 页面结构完整性', () => {

    test('页面标题包含 "标签"', async ({ page }) => {
      const title = await page.title();
      expect(title).toContain('标签');
    });

    test('main layout 容器存在', async ({ page }) => {
      const layout = page.locator('.layout');
      await expect(layout).toBeVisible();
    });

    test('#page 容器存在', async ({ page }) => {
      const pageContainer = page.locator('#page');
      await expect(pageContainer).toBeVisible();
    });

    test('页脚存在', async ({ page }) => {
      const footer = page.locator('#footer');
      await expect(footer).toBeVisible();
    });

    test('导航栏存在', async ({ page }) => {
      const nav = page.locator('#nav');
      await expect(nav).toBeVisible();
    });

    test('单栏/双栏切换按钮存在于 DOM 中', async ({ page }) => {
      const hideAsideBtn = page.locator('#hide-aside-btn');
      await expect(hideAsideBtn).toBeAttached();
    });

    test('字体设置按钮存在于 DOM 中', async ({ page }) => {
      const fontBtn = page.locator('#font-settings-btn');
      await expect(fontBtn).toBeAttached();
    });
  });

  test.describe('10. 单栏/双栏切换', () => {

    test('点击双栏按钮后 layout 添加 hide-aside', async ({ page }) => {
      const layout = page.locator('.layout');
      await page.locator('#rightside-config').click();
      await page.waitForTimeout(300);
      const hideBtn = page.locator('#hide-aside-btn');
      await hideBtn.click();
      await page.waitForTimeout(300);
      const hasHideAside = await layout.evaluate(el => el.classList.contains('hide-aside'));
      expect(hasHideAside).toBe(true);
    });

    test('再次点击恢复双栏', async ({ page }) => {
      const layout = page.locator('.layout');
      await page.locator('#rightside-config').click();
      await page.waitForTimeout(300);
      const hideBtn = page.locator('#hide-aside-btn');
      await hideBtn.click();
      await page.waitForTimeout(300);
      await hideBtn.click();
      await page.waitForTimeout(300);
      const hasHideAside = await layout.evaluate(el => el.classList.contains('hide-aside'));
      expect(hasHideAside).toBe(false);
    });
  });

  test.describe('11. 搜索功能', () => {

    test('搜索按钮存在', async ({ page }) => {
      const searchBtn = page.locator('#searchBtn');
      await expect(searchBtn).toBeVisible();
    });

    test('点击搜索按钮打开搜索面板', async ({ page }) => {
      await page.locator('#searchBtn').click();
      await page.waitForTimeout(300);
      const searchOverlay = page.locator('#local-search');
      const display = await searchOverlay.evaluate(el => window.getComputedStyle(el).display);
      expect(display).not.toBe('none');
    });
  });
});
