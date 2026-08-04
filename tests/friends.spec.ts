import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3001';
const FRIENDS_URL = `${BASE}/friends`;

async function openRightside(page: Page) {
  const configHide = page.locator('#rightside-config-hide');
  const classes = await configHide.getAttribute('class');
  if (!classes?.includes('open')) {
    await page.locator('#rightside-config').click();
    await page.waitForTimeout(300);
  }
}

test.describe('友链页 /friends 全按钮 E2E 深度断言', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRIENDS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.friend-card, .empty-state', { timeout: 15000 });
  });

  test.describe('友链卡片 .friend-card', () => {
    test('卡片链接 href 正确、target="_blank"、rel="noopener"', async ({ page }) => {
      const cards = page.locator('.friend-card');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const card = cards.nth(i);
        await expect(card).toHaveAttribute('target', '_blank');
        await expect(card).toHaveAttribute('rel', 'noopener');
        const href = await card.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).toMatch(/^https?:\/\//);
      }
    });

    test('友链名称和描述存在', async ({ page }) => {
      const cards = page.locator('.friend-card');
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        const card = cards.nth(i);
        const name = card.locator('.friend-info h3');
        await expect(name).toBeAttached();
        const nameText = await name.textContent();
        expect(nameText?.trim().length).toBeGreaterThan(0);

        const desc = card.locator('.friend-info p');
        await expect(desc).toBeAttached();
      }
    });

    test('友链卡片有 card reveal 类名', async ({ page }) => {
      const cards = page.locator('.friend-card');
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        const card = cards.nth(i);
        const classes = await card.getAttribute('class');
        expect(classes).toContain('card');
        expect(classes).toContain('reveal');
      }
    });
  });

  test.describe('友链头像', () => {
    test('头像 img src 正确且不为空', async ({ page }) => {
      const avatars = page.locator('.friend-avatar img');
      const count = await avatars.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const img = avatars.nth(i);
        const src = await img.getAttribute('src');
        expect(src).toBeTruthy();
        expect(src).toMatch(/^https?:\/\//);
      }
    });

    test('头像 alt 属性存在', async ({ page }) => {
      const avatars = page.locator('.friend-avatar img');
      const count = await avatars.count();

      for (let i = 0; i < count; i++) {
        const img = avatars.nth(i);
        const alt = await img.getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    });

    test('头像有 loading="lazy" 属性', async ({ page }) => {
      const avatars = page.locator('.friend-avatar img');
      const count = await avatars.count();

      for (let i = 0; i < count; i++) {
        const img = avatars.nth(i);
        await expect(img).toHaveAttribute('loading', 'lazy');
      }
    });
  });

  test.describe('友链名称/描述内容', () => {
    test('友链名称与配置一致', async ({ page }) => {
      const card = page.locator('.friend-card').first();
      const name = card.locator('.friend-info h3');
      await expect(name).toBeAttached();
      const text = (await name.textContent())?.trim();
      expect(text).toBe('zym2013的博客');
    });

    test('友链描述与配置一致', async ({ page }) => {
      const card = page.locator('.friend-card').first();
      const desc = card.locator('.friend-info p');
      await expect(desc).toBeAttached();
      const text = (await desc.textContent())?.trim();
      expect(text).toBe("zym 的博客");
    });
  });

  test.describe('空状态（如无友链）', () => {
    test('有友链时不显示空状态', async ({ page }) => {
      const emptyState = page.locator('.empty-state');
      await expect(emptyState).toHaveCount(0);
    });

    test('friends-grid 在有友链时存在', async ({ page }) => {
      const grid = page.locator('.friends-grid');
      await expect(grid).toBeAttached();
    });
  });

  test.describe('侧边栏', () => {
    test('侧边栏 #aside-content 存在', async ({ page }) => {
      const aside = page.locator('#aside-content');
      await expect(aside).toBeAttached();
    });

    test('侧边栏 author card 存在', async ({ page }) => {
      const authorCard = page.locator('#aside-content .card-info');
      await expect(authorCard).toBeAttached();
    });

    test('侧边栏公告卡片存在', async ({ page }) => {
      const announcement = page.locator('#aside-content .card-announcement');
      await expect(announcement).toBeAttached();
    });

    test('侧边栏网站信息卡片存在', async ({ page }) => {
      const webinfo = page.locator('#aside-content .card-webinfo');
      await expect(webinfo).toBeAttached();
    });
  });

  test.describe('暗黑模式', () => {
    test('点击暗黑模式按钮可切换主题', async ({ page }) => {
      const html = page.locator('html');

      const initialTheme = await html.getAttribute('data-theme');

      await openRightside(page);
      const darkBtn = page.locator('#darkmode');
      await expect(darkBtn).toBeVisible();
      await darkBtn.click();
      await page.waitForTimeout(300);
      const afterTheme = await html.getAttribute('data-theme');
      expect(afterTheme).not.toBe(initialTheme);

      await darkBtn.click();
      await page.waitForTimeout(300);
      const restoredTheme = await html.getAttribute('data-theme');
      expect(restoredTheme).toBe(initialTheme);
    });

    test('暗黑模式下 CSS 变量已切换', async ({ page }) => {
      const html = page.locator('html');
      await html.evaluate(el => el.setAttribute('data-theme', 'dark'));
      await page.waitForTimeout(200);

      const bgColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      });
      expect(bgColor).toBe('#1a1a2e');
    });

    test('暗黑模式按钮图标存在', async ({ page }) => {
      await openRightside(page);
      const btn = page.locator('#darkmode');
      const icon = btn.locator('i');
      await expect(icon).toHaveClass(/fa-adjust/);
    });
  });

  test.describe('响应式', () => {
    test('桌面端布局正常', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      const layout = page.locator('.layout');
      await expect(layout).toBeVisible();

      const aside = page.locator('#aside-content');
      const asideBox = await aside.boundingBox();
      expect(asideBox).not.toBeNull();
      if (asideBox) {
        expect(asideBox.width).toBeGreaterThan(0);
      }
    });

    test('移动端侧边栏菜单按钮可点击', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(FRIENDS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('#toggle-menu', { timeout: 10000 });

      const toggleMenu = page.locator('#toggle-menu');
      await expect(toggleMenu).toBeAttached();

      await toggleMenu.click();
      await page.waitForTimeout(300);

      const sidebar = page.locator('#sidebar');
      const classes = await sidebar.getAttribute('class');
      expect(classes).toContain('open');
    });

    test('移动端侧边栏有菜单项', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(FRIENDS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('#sidebar-menus', { timeout: 10000 });

      const menuItems = page.locator('#sidebar-menus .menus_item');
      const count = await menuItems.count();
      expect(count).toBeGreaterThan(0);
    });

    test('移动端遮罩层点击可关闭侧边栏', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(FRIENDS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('#toggle-menu', { timeout: 10000 });

      const toggleMenu = page.locator('#toggle-menu');
      await toggleMenu.click();
      await page.waitForTimeout(300);

      const sidebar = page.locator('#sidebar');
      let classes = await sidebar.getAttribute('class');
      expect(classes).toContain('open');

      const mask = page.locator('#menu-mask');
      await mask.click();
      await page.waitForTimeout(300);

      classes = await sidebar.getAttribute('class');
      expect(classes).not.toContain('open');
    });

    test('移动端友链卡片可点击', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(FRIENDS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('.friend-card', { timeout: 10000 });

      const card = page.locator('.friend-card').first();
      await expect(card).toBeAttached();
    });
  });

  test.describe('页面基础结构', () => {
    test('页面标题包含友链', async ({ page }) => {
      const title = await page.title();
      expect(title).toContain('友链');
    });

    test('#friend 容器存在', async ({ page }) => {
      const container = page.locator('#friend');
      await expect(container).toBeAttached();
    });

    test('导航栏存在', async ({ page }) => {
      const nav = page.locator('#nav');
      await expect(nav).toBeVisible();
    });

    test('导航栏有友链菜单项', async ({ page }) => {
      const links = page.locator('#menus a.site-page');
      const count = await links.count();
      let found = false;
      for (let i = 0; i < count; i++) {
        const text = await links.nth(i).textContent();
        if (text && text.includes('友链')) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

    test('footer 存在', async ({ page }) => {
      const footer = page.locator('#footer');
      await expect(footer).toBeAttached();
    });

    test('#rightside 按钮组存在', async ({ page }) => {
      const rightside = page.locator('#rightside');
      await expect(rightside).toBeAttached();
    });
  });

  test.describe('右侧按钮组', () => {
    test('单栏/双栏切换按钮可点击', async ({ page }) => {
      await openRightside(page);
      const hideAsideBtn = page.locator('#hide-aside-btn');
      await expect(hideAsideBtn).toBeVisible();

      const layout = page.locator('.layout');
      const initialClasses = await layout.getAttribute('class');

      await hideAsideBtn.click();
      await page.waitForTimeout(300);
      const afterClasses = await layout.getAttribute('class');

      if (initialClasses?.includes('hide-aside')) {
        expect(afterClasses).not.toContain('hide-aside');
      } else {
        expect(afterClasses).toContain('hide-aside');
      }
    });

    test('回到顶部按钮可点击', async ({ page }) => {
      const goUp = page.locator('#go-up');
      await expect(goUp).toBeAttached();
    });

    test('设置按钮可展开/收起配置', async ({ page }) => {
      const configBtn = page.locator('#rightside-config');
      await expect(configBtn).toBeAttached();

      const configHide = page.locator('#rightside-config-hide');
      await configBtn.click();
      await page.waitForTimeout(300);

      const classes = await configHide.getAttribute('class');
      expect(classes).toContain('open');
    });
  });
});
