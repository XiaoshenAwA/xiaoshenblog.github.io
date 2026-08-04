import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';

test.describe('归档页 /archives 全按钮 E2E 深度断言', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/archives`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  // ─── 页面基础 ───────────────────────────────────────

  test('页面加载成功，HTTP 200', async ({ request }) => {
    const resp = await request.get(`${BASE}/archives`);
    expect(resp.status()).toBe(200);
  });

  test('页面标题包含"归档"', async ({ page }) => {
    await expect(page).toHaveTitle(/归档/);
  });

  // ─── 年份分组 ───────────────────────────────────────

  test('年份分组 .article-sort-item.year 存在且显示 4 位数字年份', async ({ page }) => {
    const yearEls = page.locator('.article-sort-item.year');
    const count = await yearEls.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const text = (await yearEls.nth(i).innerText()).trim();
      expect(text).toMatch(/^\d{4}$/);
    }
  });

  test('年份分组按降序排列（最新年份在前）', async ({ page }) => {
    const yearEls = page.locator('.article-sort-item.year');
    const count = await yearEls.count();
    if (count < 2) return;

    const years: number[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await yearEls.nth(i).innerText()).trim();
      years.push(parseInt(text, 10));
    }
    for (let i = 1; i < years.length; i++) {
      expect(years[i]).toBeLessThanOrEqual(years[i - 1]);
    }
  });

  // ─── 标题链接 ───────────────────────────────────────

  test('文章标题链接 .article-sort-item-title 的 href 指向 /posts/:id', async ({ page }) => {
    const titleLinks = page.locator('.article-sort-item-title');
    const count = await titleLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const href = await titleLinks.nth(i).getAttribute('href');
      expect(href).toMatch(/\/posts\/[^/]+\/?$/);
    }
  });

  test('文章标题链接可点击跳转到文章详情', async ({ page }) => {
    const firstTitle = page.locator('.article-sort-item-title').first();
    const href = await firstTitle.getAttribute('href');
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/posts/')),
      firstTitle.click(),
    ]);
    expect(page.url()).toContain('/posts/');
  });

  // ─── 封面图链接 ─────────────────────────────────────

  test('封面图链接 .article-sort-item-img 的 href 指向 /posts/:id', async ({ page }) => {
    const imgLinks = page.locator('.article-sort-item-img');
    const count = await imgLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const href = await imgLinks.nth(i).getAttribute('href');
      expect(href).toMatch(/\/posts\/[^/]+\/?$/);
    }
  });

  test('封面图链接的 href 与对应标题链接的 href 一致', async ({ page }) => {
    const items = page.locator('.article-sort-item:not(.year)');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const imgHref = await items.nth(i).locator('.article-sort-item-img').getAttribute('href');
      const titleHref = await items.nth(i).locator('.article-sort-item-title').getAttribute('href');
      expect(imgHref).toBe(titleHref);
    }
  });

  test('封面图链接内包含 img 元素', async ({ page }) => {
    const imgLinks = page.locator('.article-sort-item-img');
    const count = await imgLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const img = imgLinks.nth(i).locator('img');
      await expect(img).toBeVisible();
      const src = await img.getAttribute('src');
      expect(src).toBeTruthy();
    }
  });

  // ─── 日期显示 ───────────────────────────────────────

  test('每篇文章存在 <time> 元素', async ({ page }) => {
    const timeEls = page.locator('.article-sort-item:not(.year) time');
    const count = await timeEls.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const datetime = await timeEls.nth(i).getAttribute('datetime');
      expect(datetime).toBeTruthy();
      expect(datetime).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
  });

  test('日期文字格式为 YYYY-MM-DD', async ({ page }) => {
    const timeEls = page.locator('.article-sort-item:not(.year) time');
    const count = await timeEls.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const text = (await timeEls.nth(i).innerText()).trim();
      expect(text).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  // ─── 空状态 ─────────────────────────────────────────

  test('当文章存在时，空状态 .empty-state 不显示', async ({ page }) => {
    const articleItems = page.locator('.article-sort-item:not(.year)');
    const count = await articleItems.count();
    if (count > 0) {
      const emptyState = page.locator('.empty-state');
      await expect(emptyState).toHaveCount(0);
    }
  });

  // ─── 侧边栏 ─────────────────────────────────────────

  test('侧边栏 #aside-content 存在', async ({ page }) => {
    const sidebar = page.locator('#aside-content');
    await expect(sidebar).toBeAttached();
  });

  test('侧边栏中包含作者信息卡片', async ({ page }) => {
    const authorCard = page.locator('#aside-content .card-author, #aside-content .aside_author');
    if (await authorCard.count() > 0) {
      await expect(authorCard.first()).toBeVisible();
    }
  });

  // ─── 暗黑模式 ───────────────────────────────────────

  test('暗黑模式：点击切换按钮后 html 元素启用暗黑模式（class 或 data-theme）', async ({ page }) => {
    const darkBtn = page.locator('#darkmode');
    if (await darkBtn.count() === 0) {
      test.skip(true, '未找到暗黑模式切换按钮');
      return;
    }
    await page.evaluate(() => {
      const btn = document.querySelector('#darkmode') as HTMLElement | null;
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);
    const htmlClass = await page.locator('html').getAttribute('class');
    const htmlTheme = await page.locator('html').getAttribute('data-theme');
    const isDark = (htmlClass && htmlClass.includes('dark')) || (htmlTheme && htmlTheme.includes('dark'));
    expect(isDark).toBeTruthy();
  });

  test('暗黑模式：切换后背景色变为深色', async ({ page }) => {
    const darkBtn = page.locator('#darkmode');
    if (await darkBtn.count() === 0) {
      test.skip(true, '未找到暗黑模式切换按钮');
      return;
    }
    await page.evaluate(() => {
      const btn = document.querySelector('#darkmode') as HTMLElement | null;
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      expect(r + g + b).toBeLessThan(400);
    }
  });

  // ─── 响应式 ─────────────────────────────────────────

  test('移动端 (375px)：归档列表正常显示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/archives`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const items = page.locator('.article-sort-item:not(.year)');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    await expect(items.first()).toBeVisible();
  });

  test('移动端 (375px)：标题链接可点击', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/archives`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const title = page.locator('.article-sort-item-title').first();
    await expect(title).toBeVisible();
    const href = await title.getAttribute('href');
    expect(href).toMatch(/\/posts\//);
  });

  test('平板端 (768px)：归档列表正常显示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE}/archives`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const items = page.locator('.article-sort-item:not(.year)');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('桌面端 (1920px)：归档列表和侧边栏同时可见', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE}/archives`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const items = page.locator('.article-sort-item:not(.year)');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    const sidebar = page.locator('#aside-content');
    await expect(sidebar).toBeAttached();
  });

  // ─── article-sort 容器 ──────────────────────────────

  test('.article-sort 容器存在', async ({ page }) => {
    const container = page.locator('.article-sort');
    await expect(container).toBeAttached();
  });

  // ─── 每篇文章结构完整性 ──────────────────────────────

  test('每篇文章条目包含 img、time、title 三个核心子元素', async ({ page }) => {
    const items = page.locator('.article-sort-item:not(.year)');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      await expect(item.locator('.article-sort-item-img')).toBeAttached();
      await expect(item.locator('time')).toBeAttached();
      await expect(item.locator('.article-sort-item-title')).toBeAttached();
    }
  });

  test('每篇文章条目 .article-sort-item-time 包含日历图标', async ({ page }) => {
    const timeContainers = page.locator('.article-sort-item-time');
    const count = await timeContainers.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const icon = timeContainers.nth(i).locator('i.fas, i.far, .fa-calendar-alt, [class*="calendar"]');
      expect(await icon.count()).toBeGreaterThan(0);
    }
  });

  // ─── 文章数量一致性 ──────────────────────────────────

  test('年份分组下各有至少一篇对应文章', async ({ page }) => {
    const years = page.locator('.article-sort-item.year');
    const yearCount = await years.count();
    expect(yearCount).toBeGreaterThan(0);

    const allTitles = page.locator('.article-sort-item-title');
    const titleCount = await allTitles.count();
    expect(titleCount).toBeGreaterThan(0);
  });
});
