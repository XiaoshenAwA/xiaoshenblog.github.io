import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';

test.describe('文章详情页 /posts/:id 全按钮 E2E 深度断言', () => {
  let postId: string;
  let postUrl: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(BASE + '/');
    await page.waitForLoadState('networkidle');
    const link = page.locator('a[href*="/posts/"]').first();
    const href = await link.getAttribute('href');
    const match = href!.match(/\/posts\/(\d+)/);
    expect(match, '首页应有至少一篇指向 /posts/:id 的文章链接').toBeTruthy();
    postId = match![1];
    postUrl = BASE + '/posts/' + postId + '/';
    await page.close();
  });

  test('1.1 文章详情页正常加载并显示标题', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.post-article')).toBeVisible();
    const title = await page.locator('.post-title').textContent();
    expect(title?.trim().length).toBeGreaterThan(0);
  });

  test('2.1 管理员模式下编辑按钮可见且 href 正确', async ({ page }) => {
    await page.goto(postUrl);
    await page.evaluate(() => sessionStorage.setItem('admin', '1'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    const editBtn = page.locator('#admin-actions .btn-primary');
    await expect(editBtn).toBeVisible();
    const href = await editBtn.getAttribute('href');
    expect(href).toContain('/posts/' + postId + '/edit');
  });

  test('2.2 管理员模式下删除按钮可见', async ({ page }) => {
    await page.goto(postUrl);
    await page.evaluate(() => sessionStorage.setItem('admin', '1'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    const deleteBtn = page.locator('#admin-actions .btn-danger');
    await expect(deleteBtn).toBeVisible();
    const href = await deleteBtn.getAttribute('data-action');
    expect(href).toContain('/posts/' + postId);
    expect(href).toContain('_method=DELETE');
  });

  test('2.3 删除按钮的 onclick 包含 confirm 弹窗逻辑', async ({ page }) => {
    await page.goto(postUrl);
    await page.evaluate(() => sessionStorage.setItem('admin', '1'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    const deleteBtn = page.locator('#admin-actions .btn-danger');
    await expect(deleteBtn).toBeVisible();
    const onclick = await deleteBtn.getAttribute('onclick');
    expect(onclick).toContain('confirm');
    const dataAction = await deleteBtn.getAttribute('data-action');
    expect(dataAction).toContain('DELETE');
    expect(dataAction).toContain(postId);
  });

  test('3.1 返回首页按钮指向首页', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const homeBtn = page.locator('.btn-outline').filter({ hasText: /返回首页|Back/i });
    await expect(homeBtn).toBeVisible();
    const href = await homeBtn.getAttribute('href');
    expect(href).toMatch(/\/$/);
  });

  test('3.2 点击返回首页后跳转到首页', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.locator('.btn-outline').filter({ hasText: /返回首页|Back/i }).click();
    await page.waitForURL('**/');
    expect(page.url()).toMatch(/localhost:3001\/$/);
  });

  test('3.3 上一篇导航存在且 href 指向正确的文章', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const prevBtn = page.locator('.post-nav-prev');
    const count = await prevBtn.count();
    if (count > 0) {
      const href = await prevBtn.getAttribute('href');
      expect(href).toMatch(/\/posts\/\d+/);
    }
  });

  test('3.4 下一篇导航存在且 href 指向正确的文章', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const nextBtn = page.locator('.post-nav-next');
    const count = await nextBtn.count();
    if (count > 0) {
      const href = await nextBtn.getAttribute('href');
      expect(href).toMatch(/\/posts\/\d+/);
    }
  });

  test('3.5 点击上一篇导航能正常跳转', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const prevBtn = page.locator('.post-nav-prev');
    const count = await prevBtn.count();
    if (count > 0) {
      await prevBtn.click();
      await page.waitForURL(url => url.toString().includes('/posts/'));
      expect(page.url()).toContain('/posts/');
    }
  });

  test('4.1 标签链接存在且 href 正确', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const tags = page.locator('.post-tags .tag-pill');
    const count = await tags.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const href = await tags.nth(i).getAttribute('href');
        expect(href).toBeTruthy();
        expect(href!.length).toBeGreaterThan(0);
      }
    }
  });

  test('4.2 分类链接存在且 href 正确', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const catLinks = page.locator('.post-meta-categories a.post-meta-categories');
    const count = await catLinks.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const href = await catLinks.nth(i).getAttribute('href');
        expect(href).toContain('/categories/');
      }
    }
  });

  test('5.1 TOC 目录在有标题的文章中可见', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const tocLinks = page.locator('.toc-link');
    const count = await tocLinks.count();
    if (count > 0) {
      const display = await page.locator('#toc-widget').evaluate(el => el.style.display);
      expect(display).not.toBe('none');
    }
  });

  test('5.2 TOC 链接点击后 URL hash 变化', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const tocLinks = page.locator('.toc-link');
    const count = await tocLinks.count();
    if (count > 0) {
      const href = await tocLinks.first().getAttribute('href');
      expect(href).toMatch(/^#/);
      await tocLinks.first().click();
      await page.waitForTimeout(300);
      const hash = new URL(page.url()).hash;
      expect(hash).toBe(href);
    }
  });

  test('5.3 TOC 链接点击后目标元素滚动到视口', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const tocLinks = page.locator('.toc-link');
    const count = await tocLinks.count();
    if (count > 0) {
      const href = await tocLinks.first().getAttribute('href');
      const targetId = href!.replace('#', '');
      await tocLinks.first().click();
      await page.waitForTimeout(500);
      const targetEl = page.locator('#' + CSS.escape(targetId));
      if (await targetEl.count() > 0) {
        const box = await targetEl.boundingBox();
        expect(box).toBeTruthy();
        expect(box!.y).toBeGreaterThanOrEqual(-100);
      }
    }
  });

  test('6.1 复制按钮点击后剪贴板内容正确', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const copyBtns = page.locator('.copy-btn');
    const count = await copyBtns.count();
    if (count > 0) {
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: async (text: string) => { (window as any).__copiedText = text; } },
          writable: true,
          configurable: true
        });
      });
      const highlight = page.locator('figure.highlight').first();
      const codeEl = highlight.locator('pre.code-wrap code');
      if (await codeEl.count() > 0) {
        const expectedText = await codeEl.textContent();
        await copyBtns.first().click();
        await page.waitForTimeout(500);
        const copiedText = await page.evaluate(() => (window as any).__copiedText);
        expect(copiedText).toBe(expectedText);
      }
    }
  });

  test('6.2 复制按钮点击后显示"已复制"文案', async ({ page }) => {
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
          configurable: true
        });
      });
      await copyBtns.first().click();
      await page.waitForTimeout(300);
      const text = await copyBtns.first().textContent();
      expect(text).toContain('已复制');
    }
  });

  test('6.3 折叠按钮点击后代码块 class 切换', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const shrinkBtns = page.locator('.shrink-btn');
    const count = await shrinkBtns.count();
    if (count > 0) {
      const pre = page.locator('figure.highlight').first().locator('pre.code-wrap');
      const hasShrink = await pre.evaluate(el => el.classList.contains('code-shrink'));
      await shrinkBtns.first().click();
      await page.waitForTimeout(300);
      const afterShrink = await pre.evaluate(el => el.classList.contains('code-shrink'));
      const afterExpanded = await pre.evaluate(el => el.classList.contains('code-expanded'));
      expect(afterShrink !== hasShrink || afterExpanded).toBeTruthy();
    }
  });

  test('6.4 全屏按钮点击后 code-fullpage 元素出现', async ({ page }) => {
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

  test('6.5 ESC 键退出全屏', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const fullpageBtns = page.locator('.fullpage-btn');
    const count = await fullpageBtns.count();
    if (count > 0) {
      await fullpageBtns.first().click();
      await page.waitForTimeout(500);
      await expect(page.locator('.code-fullpage').first()).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      const afterEsc = await page.locator('.code-fullpage').count();
      expect(afterEsc).toBe(0);
    }
  });

  test('7.1 Giscus 脚本或 iframe 加载', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const hasGiscusScript = await page.locator('script[src*="giscus"]').count();
    const hasGiscusIframe = await page.locator('iframe[src*="giscus"]').count();
    const hasGiscusDiv = await page.locator('.post-comments').count();
    expect(hasGiscusScript + hasGiscusIframe + hasGiscusDiv).toBeGreaterThan(0);
  });

  test('8.1 侧边栏在桌面端可见', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const aside = page.locator('#aside-content');
    await expect(aside).toBeVisible();
  });

  test('8.2 暗黑模式切换按钮功能', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');

    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.evaluate(() => {
      const btn = document.getElementById('darkmode');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);
    const newTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(newTheme).not.toBe(initialTheme);
  });

  test('8.3 搜索按钮可打开搜索对话框', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const searchBtn = page.locator('#searchBtn');
    const count = await searchBtn.count();
    if (count > 0) {
      await searchBtn.click();
      await page.waitForTimeout(300);
      const searchOverlay = page.locator('#local-search');
      const display = await searchOverlay.evaluate(el => window.getComputedStyle(el).display);
      expect(display).not.toBe('none');
    }
  });

  test('8.4 搜索输入框可输入并触发搜索', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const searchBtn = page.locator('#searchBtn');
    const count = await searchBtn.count();
    if (count > 0) {
      await searchBtn.click();
      await page.waitForTimeout(300);
      const input = page.locator('#searchInput');
      await input.fill('测试');
      await page.waitForTimeout(2000);
      const inputVal = await input.inputValue();
      expect(inputVal).toBe('测试');
      const searchVisible = await page.locator('#local-search').evaluate(el => window.getComputedStyle(el).display);
      expect(searchVisible).not.toBe('none');
    }
  });

  test('8.5 回到顶部按钮功能', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const goUpBtn = page.locator('#go-up');
    if (await goUpBtn.isVisible()) {
      await goUpBtn.click();
      await page.waitForTimeout(1000);
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeLessThan(200);
    }
  });

  test('8.6 单栏/双栏切换按钮', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const layout = page.locator('.layout');
    const hasHideAside = await layout.evaluate(el => el.classList.contains('hide-aside'));
    await page.evaluate(() => {
      const btn = document.getElementById('hide-aside-btn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);
    const afterHide = await layout.evaluate(el => el.classList.contains('hide-aside'));
    expect(afterHide).not.toBe(hasHideAside);
  });

  test('9.1 桌面端 1920x1080 无横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test('9.2 移动端 375x812 布局正常', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const postArticle = page.locator('.post-article');
    await expect(postArticle).toBeVisible();
    const box = await postArticle.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.width).toBeLessThanOrEqual(375);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(450);
  });

  test('9.3 移动端文章正文不超出视口', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const overflowX = await page.evaluate(() => {
      const content = document.querySelector('.post-content');
      if (!content) return 0;
      return content.scrollWidth - content.clientWidth;
    });
    expect(overflowX).toBeLessThanOrEqual(10);
  });

  test('10.1 滚动时进度条更新', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(300);
    const progressBar = page.locator('#progressBar');
    const width = await progressBar.evaluate(el => {
      return parseFloat(window.getComputedStyle(el).width);
    });
    expect(width).toBeGreaterThan(0);
  });

  test('11.1 文章发布日期显示', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const dateEl = page.locator('.post-meta-date-created');
    const count = await dateEl.count();
    if (count > 0) {
      const text = await dateEl.textContent();
      expect(text!.trim()).toMatch(/\d{4}-\d{2}-\d{2}/);
    }
  });

  test('11.2 文章字数和阅读时间显示', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const wordCount = page.locator('.word-count');
    const count = await wordCount.count();
    if (count > 0) {
      const text = await wordCount.textContent();
      expect(text!.trim().length).toBeGreaterThan(0);
    }
  });

  test('12.1 页脚版权信息可见', async ({ page }) => {
    await page.goto(postUrl);
    await page.waitForLoadState('networkidle');
    const footer = page.locator('#footer');
    await expect(footer).toBeVisible();
    const copyright = footer.locator('.copyright');
    if (await copyright.count() > 0) {
      await expect(copyright).toBeVisible();
    }
  });
});
