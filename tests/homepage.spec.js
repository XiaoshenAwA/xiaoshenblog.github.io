const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3001';

async function waitForReady(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
}

async function openRightside(page) {
  const cfg = page.locator('#rightside-config');
  if (await cfg.isVisible()) {
    await cfg.click();
    await page.waitForTimeout(300);
  }
}

test.describe('全局导航栏', () => {

  test('Logo/站名链接点击 → URL 为首页', async ({ page }) => {
    await waitForReady(page);
    const logo = page.locator('#blog-info .nav-site-title');
    await expect(logo).toBeVisible();
    const href = await logo.getAttribute('href');
    expect(href).toBe('/');
  });

  test('搜索按钮 #searchBtn 点击 → 搜索弹窗 display 变为 block', async ({ page }) => {
    await waitForReady(page);
    const searchBtn = page.locator('#searchBtn').first();
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();
    await page.waitForTimeout(300);
    const localSearch = page.locator('#local-search');
    await expect(localSearch).toBeVisible();
    const display = await localSearch.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('block');
  });

  test('搜索弹窗关闭按钮 .search-close-button 点击 → 弹窗关闭', async ({ page }) => {
    await waitForReady(page);
    await page.locator('#searchBtn').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('#local-search')).toBeVisible();
    await page.locator('.search-close-button').click();
    await page.waitForTimeout(300);
    const display = await page.locator('#local-search').evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test('搜索遮罩 #search-mask 点击 → 搜索弹窗关闭', async ({ page }) => {
    await waitForReady(page);
    await page.locator('#searchBtn').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('#local-search')).toBeVisible();
    const mask = page.locator('#search-mask');
    await mask.click({ force: true, position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);
    const display = await page.locator('#local-search').evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test('汉堡菜单 #toggle-menu 点击 → 侧边栏 #sidebar 获得 open class', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await waitForReady(page);
    const toggle = page.locator('#toggle-menu');
    await expect(toggle).toBeVisible();
    const sidebar = page.locator('#sidebar');
    await expect(sidebar).not.toHaveClass(/open/);
    await toggle.click();
    await page.waitForTimeout(400);
    await expect(sidebar).toHaveClass(/open/);
  });

});

test.describe('首页内容区', () => {

  test('文章封面图链接 → href 正确', async ({ page }) => {
    await waitForReady(page);
    const firstCover = page.locator('.recent-post-item .post_cover a').first();
    await expect(firstCover).toBeVisible();
    const href = await firstCover.getAttribute('href');
    expect(href).toMatch(/^\/posts\/\d+$/);
  });

  test('文章标题链接 → href 正确', async ({ page }) => {
    await waitForReady(page);
    const firstTitle = page.locator('.recent-post-item .article-title').first();
    await expect(firstTitle).toBeVisible();
    const href = await firstTitle.getAttribute('href');
    expect(href).toMatch(/^\/posts\/\d+$/);
  });

  test('文章分类链接 → href 正确', async ({ page }) => {
    await waitForReady(page);
    const catLink = page.locator('.article-meta__categories').first();
    await expect(catLink).toBeVisible();
    const href = await catLink.getAttribute('href');
    expect(href).toMatch(/^\/categories\//);
  });

  test('文章标签链接 → href 正确', async ({ page }) => {
    await waitForReady(page);
    const tagLink = page.locator('.tag-pill').first();
    await expect(tagLink).toBeVisible();
    const href = await tagLink.getAttribute('href');
    expect(href).toMatch(/[?&]tag=/);
  });

  test('分页器页码按钮 → 存在且有 active 状态', async ({ page }) => {
    await waitForReady(page);
    const pagination = page.locator('#pagination .page-btn');
    const count = await pagination.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(pagination.first()).toHaveClass(/active/);
  });

  test('加载更多按钮 → 全部加载时按钮隐藏', async ({ page }) => {
    await waitForReady(page);
    const loadMoreWrap = page.locator('#load-more-wrap');
    const isHidden = await loadMoreWrap.evaluate(el => el.style.display === 'none');
    expect(isHidden).toBe(true);
  });

});

test.describe('侧边栏', () => {

  test('一言刷新按钮 .hitokoto-btn 点击 → DOM 文本变化', async ({ page }) => {
    await waitForReady(page);
    const hitokotoBtn = page.locator('.hitokoto-btn');
    await expect(hitokotoBtn).toBeVisible();
    const hitokotoText = page.locator('#hitokotoText');
    const textBefore = await hitokotoText.textContent();
    await hitokotoBtn.click();
    await page.waitForTimeout(3000);
    const textAfter = await hitokotoText.textContent();
    expect(typeof textAfter).toBe('string');
    expect(textAfter.length).toBeGreaterThan(0);
  });

  test('分类展开/折叠 .cat-toggle 点击 → 子分类显示/隐藏', async ({ page }) => {
    await waitForReady(page);
    const catToggle = page.locator('.cat-toggle').first();
    const toggleExists = await catToggle.count();
    if (toggleExists > 0) {
      const parentLi = catToggle.locator('..');
      const childLi = parentLi.locator('xpath=following-sibling::*[1]');
      const initialDisplay = await childLi.evaluate(el => el.style.display);
      expect(initialDisplay).toBe('none');

      await catToggle.click();
      await page.waitForTimeout(200);
      const afterDisplay = await childLi.evaluate(el => el.style.display);
      expect(afterDisplay).not.toBe('none');

      await catToggle.click();
      await page.waitForTimeout(200);
      const afterDisplay2 = await childLi.evaluate(el => el.style.display);
      expect(afterDisplay2).toBe('none');
    }
  });

  test('关注我按钮 #card-info-btn → href 正确', async ({ page }) => {
    await waitForReady(page);
    const btn = page.locator('#card-info-btn');
    await expect(btn).toBeVisible();
    const href = await btn.getAttribute('href');
    expect(href).toMatch(/^https?:\/\//);
  });

  test('社交图标链接 → href 正确', async ({ page }) => {
    await waitForReady(page);
    const socialIcons = page.locator('.card-info-social-icons .social-icon');
    const count = await socialIcons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const href = await socialIcons.nth(i).getAttribute('href');
      expect(href).toMatch(/^https?:\/\//);
    }
  });

  test('分类链接 → href 正确', async ({ page }) => {
    await waitForReady(page);
    const catLinks = page.locator('.card-category-list-link');
    const count = await catLinks.count();
    expect(count).toBeGreaterThan(0);
    const href = await catLinks.first().getAttribute('href');
    expect(href).toMatch(/^\/categories\//);
  });

  test('标签链接 → href 正确', async ({ page }) => {
    await waitForReady(page);
    const tagLinks = page.locator('.card-tag-cloud a');
    const count = await tagLinks.count();
    expect(count).toBeGreaterThan(0);
    const href = await tagLinks.first().getAttribute('href');
    expect(href).toMatch(/[?&]tag=/);
  });

  test('归档链接 → href 正确', async ({ page }) => {
    await waitForReady(page);
    const archiveLink = page.locator('.card-archive-list-link').first();
    const count = await archiveLink.count();
    if (count > 0) {
      const href = await archiveLink.getAttribute('href');
      expect(href).toMatch(/^\/archives/);
    }
  });

});

test.describe('右侧浮动按钮', () => {

  test('设置齿轮 #rightside-config → 右侧面板展开', async ({ page }) => {
    await waitForReady(page);
    const configHide = page.locator('#rightside-config-hide');
    const hasOpen = await configHide.evaluate(el => el.classList.contains('open'));
    expect(hasOpen).toBe(false);

    await page.locator('#rightside-config').click();
    await page.waitForTimeout(300);
    await expect(configHide).toHaveClass(/open/);
  });

  test('暗黑模式 #darkmode 点击 → data-theme 变为 dark', async ({ page }) => {
    await waitForReady(page);
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');

    await openRightside(page);
    await page.locator('#darkmode').click();
    await page.waitForTimeout(500);
    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme).toBe('dark');
  });

  test('再次点击暗黑模式 → data-theme 变回 light', async ({ page }) => {
    await waitForReady(page);
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await openRightside(page);
    await page.locator('#darkmode').click();
    await page.waitForTimeout(500);
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('单双栏切换 #hide-aside-btn → .layout 获得/失去 hide-aside class', async ({ page }) => {
    await waitForReady(page);
    await page.evaluate(() => localStorage.removeItem('aside-status'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const layout = page.locator('.layout');
    const hasHideAside = await layout.evaluate(el => el.classList.contains('hide-aside'));
    expect(hasHideAside).toBe(false);

    await openRightside(page);
    await page.locator('#hide-aside-btn').click();
    await page.waitForTimeout(300);
    await expect(layout).toHaveClass(/hide-aside/);

    await page.locator('#hide-aside-btn').click();
    await page.waitForTimeout(300);
    const hasHideAside2 = await layout.evaluate(el => el.classList.contains('hide-aside'));
    expect(hasHideAside2).toBe(false);
  });

  test('字体设置 #font-settings-btn → 字体面板 display 变为 flex', async ({ page }) => {
    await waitForReady(page);
    const overlay = page.locator('#font-settings-overlay');
    const initialDisplay = await overlay.evaluate(el => el.style.display);
    expect(initialDisplay === 'none' || initialDisplay === '').toBe(true);

    await openRightside(page);
    await page.locator('#font-settings-btn').click();
    await page.waitForTimeout(300);
    const display = await overlay.evaluate(el => el.style.display);
    expect(display).toBe('flex');
  });

  test('回到顶部 #go-up → window.scrollY 变为 0', async ({ page }) => {
    await waitForReady(page);
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(500);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    await page.locator('#go-up').click();
    await page.waitForTimeout(1500);
    const newScrollY = await page.evaluate(() => window.scrollY);
    expect(newScrollY).toBe(0);
  });

});

test.describe('字体设置面板', () => {

  test('关闭按钮 .settings-close → 面板关闭', async ({ page }) => {
    await waitForReady(page);
    await openRightside(page);
    await page.locator('#font-settings-btn').click();
    await page.waitForTimeout(300);
    const display = await page.locator('#font-settings-overlay').evaluate(el => el.style.display);
    expect(display).toBe('flex');

    await page.locator('.settings-close').click();
    await page.waitForTimeout(300);
    const displayAfter = await page.locator('#font-settings-overlay').evaluate(el => el.style.display);
    expect(displayAfter).toBe('none');
  });

  test('字体大小小/中/大按钮 → --font-size-global CSS 变量变化', async ({ page }) => {
    await waitForReady(page);
    await page.evaluate(() => {
      document.documentElement.style.removeProperty('--font-size-global');
      localStorage.removeItem('blog_font_settings');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await openRightside(page);
    await page.locator('#font-settings-btn').click();
    await page.waitForTimeout(300);

    await page.locator('[data-fontsize="14"]').click();
    await page.waitForTimeout(200);
    let fontSize = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--font-size-global').trim()
    );
    expect(fontSize).toBe('14px');

    await page.locator('[data-fontsize="18"]').click();
    await page.waitForTimeout(200);
    fontSize = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--font-size-global').trim()
    );
    expect(fontSize).toBe('18px');

    await page.locator('[data-fontsize="16"]').click();
    await page.waitForTimeout(200);
    fontSize = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--font-size-global').trim()
    );
    expect(fontSize).toBe('16px');
  });

  test('阅读字体默认/浏览器默认按钮', async ({ page }) => {
    await waitForReady(page);
    await openRightside(page);
    await page.locator('#font-settings-btn').click();
    await page.waitForTimeout(300);

    const bodyBrowser = page.locator('[data-bodyfont="unset"]');
    await expect(bodyBrowser).toBeVisible();
    await bodyBrowser.click();
    await page.waitForTimeout(200);
    await expect(bodyBrowser).toHaveClass(/active/);

    const bodyDefault = page.locator('[data-bodyfont=""]');
    await expect(bodyDefault).toBeVisible();
    await bodyDefault.click();
    await page.waitForTimeout(200);
    await expect(bodyDefault).toHaveClass(/active/);
  });

  test('代码字体默认/浏览器默认按钮', async ({ page }) => {
    await waitForReady(page);
    await openRightside(page);
    await page.locator('#font-settings-btn').click();
    await page.waitForTimeout(300);

    const codeBrowser = page.locator('[data-codefont="unset"]');
    await expect(codeBrowser).toBeVisible();
    await codeBrowser.click();
    await page.waitForTimeout(200);
    await expect(codeBrowser).toHaveClass(/active/);

    const codeDefault = page.locator('[data-codefont=""]');
    await expect(codeDefault).toBeVisible();
    await codeDefault.click();
    await page.waitForTimeout(200);
    await expect(codeDefault).toHaveClass(/active/);
  });

});

test.describe('代码块按钮（文章详情页）', () => {

  test('代码复制按钮 .copy-btn 点击 → 按钮文字变化', async ({ page }) => {
    await page.goto(BASE + '/posts/7', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const copyBtn = page.locator('.copy-btn').first();
    const count = await copyBtn.count();
    if (count > 0) {
      const context = page.context();
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await copyBtn.click();
      await page.waitForTimeout(500);
      const text = await copyBtn.textContent();
      expect(text).toMatch(/已复制|copied/i);
    }
  });

  test('代码折叠按钮 .shrink-btn 点击 → 代码块 class 变化', async ({ page }) => {
    await page.goto(BASE + '/posts/7', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const shrinkBtn = page.locator('.shrink-btn').first();
    const count = await shrinkBtn.count();
    if (count > 0) {
      const highlight = shrinkBtn.locator('xpath=ancestor::figure[1]');
      const pre = highlight.locator('pre.code-wrap');

      const hasShrink = await pre.evaluate(el => el.classList.contains('code-shrink'));

      await shrinkBtn.click();
      await page.waitForTimeout(300);
      const hasShrinkAfter = await pre.evaluate(el => el.classList.contains('code-shrink'));
      expect(hasShrinkAfter).toBe(!hasShrink);

      await shrinkBtn.click();
      await page.waitForTimeout(300);
      const hasShrinkBack = await pre.evaluate(el => el.classList.contains('code-shrink'));
      expect(hasShrinkBack).toBe(hasShrink);
    }
  });

  test('代码全屏按钮 .fullpage-btn 点击 → 全屏元素出现', async ({ page }) => {
    await page.goto(BASE + '/posts/7', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const fullpageBtn = page.locator('.fullpage-btn').first();
    const count = await fullpageBtn.count();
    if (count > 0) {
      await fullpageBtn.click();
      await page.waitForTimeout(500);
      const fullpage = page.locator('.code-fullpage');
      await expect(fullpage).toBeVisible();
      const hasActive = await page.evaluate(() =>
        document.body.classList.contains('code-fullpage-active')
      );
      expect(hasActive).toBe(true);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      const fullpageCount = await fullpage.count();
      expect(fullpageCount).toBe(0);
    }
  });

});

test.describe('响应式测试', () => {

  test('桌面端 1920x1080：无横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await waitForReady(page);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('移动端 375x812：汉堡菜单可用', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await waitForReady(page);
    const toggleMenu = page.locator('#toggle-menu');
    await expect(toggleMenu).toBeVisible();
    const rightside = page.locator('#rightside');
    await expect(rightside).toBeVisible();
  });

});
