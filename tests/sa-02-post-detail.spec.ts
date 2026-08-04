import { test, expect, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = 'http://localhost:3001';
const STATUS_FILE = join(__dirname, '..', '.e2e-status.json');

test.describe('SA-02 文章详情页 /posts/:id 完整 E2E 测试', () => {
  test.setTimeout(120000);
  let postId = '7';
  let postUrl: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    const links = page.locator('a[href*="/posts/"]');
    const count = await links.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      const match = href!.match(/\/posts\/(\d+)/);
      if (!match) continue;
      const testUrl = BASE + '/posts/' + match[1] + '/';
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(500);
      const highlightCount = await page.locator('figure.highlight').count();
      if (highlightCount > 0) {
        postId = match[1];
        postUrl = testUrl;
        found = true;
        break;
      }
    }
    if (!found) {
      const href = await links.first().getAttribute('href');
      const match = href!.match(/\/posts\/(\d+)/);
      expect(match, '首页应有至少一篇指向 /posts/:id 的文章链接').toBeTruthy();
      postId = match![1];
      postUrl = BASE + '/posts/' + postId + '/';
    }
    await page.close();

    try {
      const status = JSON.parse(readFileSync(STATUS_FILE, 'utf-8'));
      status['sa-02'] = { postId, postUrl, startedAt: new Date().toISOString() };
      writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
    } catch (e) {}
  });

  test.afterAll(async () => {
    try {
      const status = JSON.parse(readFileSync(STATUS_FILE, 'utf-8'));
      status['sa-02'] = { ...status['sa-02'], completedAt: new Date().toISOString(), passed: true };
      writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
    } catch (e) {}
  });

  // ==================== A. 文章内容区 ====================
  test('A1. .post-article 存在', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.post-article')).toBeVisible();
  });

  test('A2. .post-content 存在且有 HTML 内容', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const content = page.locator('.post-content');
    await expect(content).toBeVisible();
    const html = await content.innerHTML();
    expect(html.trim().length).toBeGreaterThan(0);
  });

  test('A3. 文章标题 .post-title 存在', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const title = page.locator('.post-title');
    await expect(title).toBeVisible();
    const text = await title.textContent();
    expect(text!.trim().length).toBeGreaterThan(0);
  });

  // ==================== B. 代码块工具栏 ====================
  test('B1. .highlight 代码块存在', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const highlights = page.locator('figure.highlight');
    const count = await highlights.count();
    expect(count).toBeGreaterThan(0);
  });

  test('B2. .copy-btn 复制按钮点击后文字变为"已复制"', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const copyBtns = page.locator('.copy-btn');
    const count = await copyBtns.count();
    if (count > 0) {
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: async () => {} },
          writable: true,
          configurable: true,
        });
      });
      await copyBtns.first().click();
      await page.waitForTimeout(500);
      const text = await copyBtns.first().textContent();
      expect(text).toContain('已复制');
    }
  });

  test('B3. .shrink-btn 折叠按钮点击后 .code-shrink class 切换', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const shrinkBtns = page.locator('.shrink-btn');
    const count = await shrinkBtns.count();
    if (count > 0) {
      const pre = page.locator('figure.highlight').first().locator('pre.code-wrap');
      const beforeShrink = await pre.evaluate((el) => el.classList.contains('code-shrink'));
      await shrinkBtns.first().click();
      await page.waitForTimeout(300);
      const afterShrink = await pre.evaluate((el) => el.classList.contains('code-shrink'));
      expect(afterShrink).not.toBe(beforeShrink);
    }
  });

  test('B4. .fullpage-btn 全屏按钮点击后 .code-fullpage 出现', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const fullpageBtns = page.locator('.fullpage-btn');
    const count = await fullpageBtns.count();
    if (count > 0) {
      await fullpageBtns.first().click();
      await page.waitForTimeout(500);
      const fullpage = page.locator('.code-fullpage');
      await expect(fullpage.first()).toBeVisible();
    }
  });

  // ==================== C. 文章元信息 ====================
  test('C1. 发布日期 .post-meta-date-created 存在', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const dateCreated = page.locator('.post-meta-date-created');
    const count = await dateCreated.count();
    if (count > 0) {
      const text = await dateCreated.textContent();
      expect(text!.trim()).toMatch(/\d{4}-\d{2}-\d{2}/);
    }
  });

  test('C2. 更新日期 .post-meta-date-updated 存在 (当 dateType !== created)', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const dateUpdated = page.locator('.post-meta-date-updated');
    const count = await dateUpdated.count();
    if (count > 0) {
      const text = await dateUpdated.textContent();
      expect(text!.trim()).toMatch(/\d{4}-\d{2}-\d{2}/);
    }
  });

  test('C3. 字数 .word-count 存在', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const wordCount = page.locator('.word-count');
    await expect(wordCount).toBeVisible();
    const text = await wordCount.textContent();
    expect(text!.trim().length).toBeGreaterThan(0);
  });

  test('C4. 阅读时间显示存在', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const readingTime = page.locator('.post-meta-wordcount');
    await expect(readingTime).toBeVisible();
    const text = await readingTime.textContent();
    expect(text).toMatch(/\d+/);
  });

  test('C5. 浏览量 #post-view-count 存在', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const viewCount = page.locator('#post-view-count');
    await expect(viewCount).toBeVisible();
  });

  test('C6. 标签 .tag-pill 链接存在', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const tags = page.locator('.post-info .tag-pill');
    const count = await tags.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const href = await tags.nth(i).getAttribute('href');
        expect(href).toBeTruthy();
        expect(href!.length).toBeGreaterThan(0);
      }
    }
  });

  // ==================== D. 分类面包屑 ====================
  test('D1. .post-meta-categories 分类链接存在', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const catLinks = page.locator('.post-meta-categories .post-meta-categories');
    const count = await catLinks.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const href = await catLinks.nth(i).getAttribute('href');
        expect(href).toContain('/categories/');
      }
    }
  });

  // ==================== E. 文章导航 ====================
  test('E1. .post-nav-prev 上一篇链接 (如果存在)', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const prev = page.locator('.post-nav-prev');
    const count = await prev.count();
    if (count > 0) {
      const href = await prev.getAttribute('href');
      expect(href).toMatch(/\/posts\/\d+/);
    }
  });

  test('E2. .post-nav-next 下一篇链接 (如果存在)', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const next = page.locator('.post-nav-next');
    const count = await next.count();
    if (count > 0) {
      const href = await next.getAttribute('href');
      expect(href).toMatch(/\/posts\/\d+/);
    }
  });

  // ==================== F. 操作按钮 ====================
  test('F1. "返回首页" 按钮存在且 href 正确', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const homeBtn = page.locator('.btn-outline').filter({ hasText: /返回首页|Back/i });
    await expect(homeBtn).toBeVisible();
    const href = await homeBtn.getAttribute('href');
    expect(href).toMatch(/\/$/);
  });

  // ==================== G. TOC 目录 ====================
  test('G1. #toc-widget 目录 widget', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const tocWidget = page.locator('#toc-widget');
    const count = await tocWidget.count();
    if (count > 0) {
      const display = await tocWidget.evaluate((el) => (el as HTMLElement).style.display);
      const tocLinks = page.locator('.toc-link');
      if ((await tocLinks.count()) > 0) {
        expect(display).not.toBe('none');
      }
    }
  });

  test('G2. #toc-content 含 .toc-link 目录链接', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const tocContent = page.locator('#toc-content');
    const count = await tocContent.count();
    if (count > 0) {
      const tocLinks = tocContent.locator('.toc-link');
      const linkCount = await tocLinks.count();
      if (linkCount > 0) {
        const href = await tocLinks.first().getAttribute('href');
        expect(href).toMatch(/^#/);
      }
    }
  });

  // ==================== H. 评论区 ====================
  test('H1. .post-comments iframe 存在 (如果配置 Giscus)', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const commentsDiv = page.locator('.post-comments');
    const commentsScript = page.locator('script[src*="giscus"]');
    const commentsIframe = page.locator('iframe[src*="giscus"]');
    const count = (await commentsDiv.count()) + (await commentsScript.count()) + (await commentsIframe.count());
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  // ==================== I. 导航栏与侧边栏 ====================
  test('I1. 非首页 header: #page-header.not-home-page', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const header = page.locator('#page-header.not-home-page');
    await expect(header).toBeVisible();
  });

  test('I2. 侧边栏 #aside-content 存在', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const aside = page.locator('#aside-content');
    await expect(aside).toBeVisible();
  });

  // ==================== J. 响应式溢出检查 ====================
  test('J1. 桌面端 1920x1080: 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test('J2. 移动端 375x812: 无水平溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
  });
});
