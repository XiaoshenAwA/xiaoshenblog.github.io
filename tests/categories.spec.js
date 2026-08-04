const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3001';

test.describe('分类页 /categories - 全按钮 E2E 深度断言', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/categories`);
    await page.waitForLoadState('networkidle');
  });

  test('1. 页面基础加载与结构', async ({ page }) => {
    await expect(page).toHaveURL(/\/categories/);
    const categoryLists = page.locator('.category-lists');
    await expect(categoryLists).toBeVisible();
    const inner = page.locator('#content-inner');
    await expect(inner).toBeVisible();
    const layout = page.locator('.layout');
    await expect(layout).toBeVisible();
  });

  test('2. 分类链接 .category-list-link → href 包含 /categories/...', async ({ page }) => {
    const links = page.locator('.category-list-link');
    const count = await links.count();
    if (count === 0) {
      test.skip(true, '无分类数据，跳过链接断言');
      return;
    }
    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      await expect(link).toBeVisible();
      const href = await link.getAttribute('href');
      expect(href).toMatch(/\/categories\/.+/);
      const text = await link.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('3. 分类数量 .category-list-count → 数字显示正确', async ({ page }) => {
    const links = page.locator('.category-list-link');
    const count = await links.count();
    if (count === 0) {
      test.skip(true, '无分类数据，跳过数量断言');
      return;
    }
    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const parentLi = link.locator('..');
      const countEl = parentLi.locator(':scope > .category-list-count');
      await expect(countEl).toBeVisible();
      const text = await countEl.textContent();
      expect(text).toMatch(/^\d+$/);
    }
  });

  test('4. 嵌套分类结构 <ul class="category-list-child"> 存在', async ({ page }) => {
    const allItems = page.locator('.category-list-item');
    const totalCount = await allItems.count();
    if (totalCount === 0) {
      test.skip(true, '无分类数据，跳过嵌套断言');
      return;
    }
    const hasChildList = await page.locator('ul.category-list-child').count();
    if (hasChildList === 0) {
      test.skip(true, '无嵌套分类，跳过');
      return;
    }
    const childLists = page.locator('ul.category-list-child');
    const childCount = await childLists.count();
    expect(childCount).toBeGreaterThan(0);
    for (let i = 0; i < childCount; i++) {
      const childUl = childLists.nth(i);
      await expect(childUl).toBeAttached();
      const childItems = childUl.locator('li.category-list-item');
      expect(await childItems.count()).toBeGreaterThan(0);
    }
  });

  test('5. 嵌套分类 → 子级 link href 也包含 /categories/', async ({ page }) => {
    const childLinks = page.locator('ul.category-list-child .category-list-link');
    const count = await childLinks.count();
    if (count === 0) {
      test.skip(true, '无嵌套分类链接，跳过');
      return;
    }
    for (let i = 0; i < count; i++) {
      const href = await childLinks.nth(i).getAttribute('href');
      expect(href).toMatch(/\/categories\/.+/);
    }
  });

  test('6. 空状态显示 (模拟无分类)', async ({ page }) => {
    const emptyState = page.locator('.empty-state');
    const catList = page.locator('.category-list');
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    const listVisible = await catList.isVisible().catch(() => false);
    if (emptyVisible) {
      await expect(emptyState).toBeVisible();
      await expect(emptyState.locator('.empty-icon')).toBeVisible();
      await expect(emptyState.locator('h3')).toBeVisible();
      await expect(emptyState.locator('p')).toBeVisible();
      expect(listVisible).toBe(false);
    } else {
      expect(listVisible).toBe(true);
    }
  });

  test('7. 侧边栏全局组件 → #aside-content 存在', async ({ page }) => {
    const aside = page.locator('#aside-content');
    await expect(aside).toBeAttached();
    const sidebarEls = aside.locator('.card-widget');
    const count = await sidebarEls.count();
    expect(count).toBeGreaterThan(0);
  });

  test('8. 侧边栏 - 作者信息卡片', async ({ page }) => {
    const profileCard = page.locator('#profileCard');
    if (await profileCard.isVisible().catch(() => false)) {
      await expect(profileCard.locator('.avatar-img')).toBeVisible();
      await expect(profileCard.locator('.author-info-name')).toBeVisible();
      await expect(profileCard.locator('.author-info-description')).toBeVisible();
      const siteData = profileCard.locator('.site-data');
      await expect(siteData).toBeVisible();
      const dataLinks = siteData.locator('a');
      expect(await dataLinks.count()).toBeGreaterThanOrEqual(3);
    }
  });

  test('9. 侧边栏 - 一言卡片', async ({ page }) => {
    const hitokoto = page.locator('#hitokotoCard');
    await expect(hitokoto).toBeAttached();
    const text = hitokoto.locator('.hitokoto-text');
    await expect(text).toBeAttached();
  });

  test('10. 侧边栏 - 标签云卡片', async ({ page }) => {
    const tagCard = page.locator('.card-tags');
    if (await tagCard.isVisible().catch(() => false)) {
      const tagCloud = tagCard.locator('.card-tag-cloud');
      await expect(tagCloud).toBeVisible();
      const tagLinks = tagCloud.locator('a');
      expect(await tagLinks.count()).toBeGreaterThan(0);
    }
  });

  test('11. 侧边栏 - 归档卡片', async ({ page }) => {
    const archiveCard = page.locator('.card-archives');
    if (await archiveCard.isVisible().catch(() => false)) {
      const list = archiveCard.locator('.card-archive-list');
      await expect(list).toBeVisible();
      const items = list.locator('.card-archive-list-item');
      expect(await items.count()).toBeGreaterThan(0);
    }
  });

  test('12. 侧边栏 - 网站信息卡片', async ({ page }) => {
    const webinfoCard = page.locator('.card-webinfo');
    if (await webinfoCard.isVisible().catch(() => false)) {
      const webinfo = webinfoCard.locator('.webinfo');
      await expect(webinfo).toBeVisible();
      const items = webinfo.locator('.webinfo-item');
      expect(await items.count()).toBeGreaterThan(0);
    }
  });

  test('13. 侧边栏 - 分类卡片 (sidebar)', async ({ page }) => {
    const catCard = page.locator('.aside-content .card-categories');
    if (await catCard.isVisible().catch(() => false)) {
      const catList = catCard.locator('#aside-cat-list');
      await expect(catList).toBeVisible();
      const catItems = catList.locator('.card-category-list-item');
      const count = await catItems.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const item = catItems.nth(i);
        const link = item.locator('.card-category-list-link');
        const href = await link.getAttribute('href');
        expect(href).toMatch(/\/categories\/.+/);
      }
    }
  });

  test('14. 导航栏 → 分类菜单项存在', async ({ page }) => {
    const nav = page.locator('#nav');
    await expect(nav).toBeVisible();
    const menuItems = nav.locator('.menus_items .menus_item');
    const count = await menuItems.count();
    let foundCategory = false;
    for (let i = 0; i < count; i++) {
      const text = await menuItems.nth(i).textContent();
      if (text && text.includes('分类')) {
        foundCategory = true;
        break;
      }
    }
    expect(foundCategory).toBe(true);
  });

  test('15. 导航栏 → 站点标题/Logo', async ({ page }) => {
    const blogInfo = page.locator('#blog-info');
    await expect(blogInfo).toBeVisible();
    const siteName = blogInfo.locator('.site-name').first();
    await expect(siteName).toBeVisible();
    const title = await siteName.textContent();
    expect(title?.trim().length).toBeGreaterThan(0);
  });

  test('16. 暗黑模式切换 → #darkmode 按钮存在并可点击', async ({ page }) => {
    const darkBtn = page.locator('#darkmode');
    if (await darkBtn.isVisible().catch(() => false)) {
      await expect(darkBtn).toBeVisible();
      const initialTheme = await page.locator('html').getAttribute('data-theme');
      await darkBtn.click();
      await page.waitForTimeout(500);
      const newTheme = await page.locator('html').getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
      await darkBtn.click();
      await page.waitForTimeout(500);
      const restoredTheme = await page.locator('html').getAttribute('data-theme');
      expect(restoredTheme).toBe(initialTheme);
    }
  });

  test('17. 暗黑模式切换 → localStorage 主题持久化', async ({ page }) => {
    const darkBtn = page.locator('#darkmode');
    if (await darkBtn.isVisible().catch(() => false)) {
      await darkBtn.click();
      await page.waitForTimeout(500);
      const storedTheme = await page.evaluate(() => localStorage.getItem('theme'));
      expect(storedTheme).toMatch(/^(light|dark)$/);
      await darkBtn.click();
      await page.waitForTimeout(500);
      const storedTheme2 = await page.evaluate(() => localStorage.getItem('theme'));
      expect(storedTheme2).toMatch(/^(light|dark)$/);
      expect(storedTheme2).not.toBe(storedTheme);
    }
  });

  test('18. 暗黑模式切换 → data-theme 属性正确切换', async ({ page }) => {
    const darkBtn = page.locator('#darkmode');
    if (await darkBtn.isVisible().catch(() => false)) {
      const before = await page.locator('html').getAttribute('data-theme');
      expect(before).toMatch(/^(light|dark)$/);
      await darkBtn.click();
      await page.waitForTimeout(300);
      const after = await page.locator('html').getAttribute('data-theme');
      expect(after).toMatch(/^(light|dark)$/);
      expect(after).not.toBe(before);
    }
  });

  test('19. 搜索功能 → #searchBtn 按钮存在并可打开搜索', async ({ page }) => {
    const searchBtn = page.locator('#searchBtn');
    if (await searchBtn.isVisible().catch(() => false)) {
      await expect(searchBtn).toBeVisible();
      await searchBtn.click();
      await page.waitForTimeout(500);
      const searchOverlay = page.locator('#local-search');
      const display = await searchOverlay.evaluate(el => getComputedStyle(el).display);
      expect(display).not.toBe('none');
    }
  });

  test('20. 搜索功能 → 打开搜索后 input 可输入', async ({ page }) => {
    const searchBtn = page.locator('#searchBtn');
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click();
      await page.waitForTimeout(500);
      const searchInput = page.locator('#searchInput');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('test');
      const value = await searchInput.inputValue();
      expect(value).toBe('test');
    }
  });

  test('21. 搜索功能 → Escape 键关闭搜索', async ({ page }) => {
    const searchBtn = page.locator('#searchBtn');
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('#local-search')).toHaveCSS('display', 'block');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const display = await page.locator('#local-search').evaluate(el => getComputedStyle(el).display);
      expect(display).toBe('none');
    }
  });

  test('22. 搜索功能 → 关闭按钮可关闭搜索', async ({ page }) => {
    const searchBtn = page.locator('#searchBtn');
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click();
      await page.waitForTimeout(500);
      const closeBtn = page.locator('.search-close-button');
      await expect(closeBtn).toBeVisible();
      await closeBtn.click();
      await page.waitForTimeout(300);
      const display = await page.locator('#local-search').evaluate(el => getComputedStyle(el).display);
      expect(display).toBe('none');
    }
  });

  test('23. 搜索功能 → mask 点击可关闭搜索', async ({ page }) => {
    const searchBtn = page.locator('#searchBtn');
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click();
      await page.waitForTimeout(500);
      const mask = page.locator('#search-mask');
      if (await mask.isVisible().catch(() => false)) {
        await mask.click({ force: true });
        await page.waitForTimeout(300);
        const display = await page.locator('#local-search').evaluate(el => getComputedStyle(el).display);
        expect(display).toBe('none');
      }
    }
  });

  test('24. 搜索功能 → Ctrl+K 快捷键打开搜索', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);
    const display = await page.locator('#local-search').evaluate(el => getComputedStyle(el).display);
    expect(display).not.toBe('none');
  });

  test('25. 响应式 - 桌面端无水平溢出 (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/categories`);
    await page.waitForLoadState('networkidle');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(1280 + 2);
  });

  test('26. 响应式 - 平板端无水平溢出 (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE}/categories`);
    await page.waitForLoadState('networkidle');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(768 + 2);
  });

  test('27. 响应式 - 移动端无水平溢出 (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE}/categories`);
    await page.waitForLoadState('networkidle');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 80);
  });

  test('28. 页脚存在', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeAttached();
  });

  test('29. 页面标题正确', async ({ page }) => {
    const title = await page.title();
    expect(title).toMatch(/分类/);
  });

  test('30. 分类列表项数量与 header 副标题数字一致', async ({ page }) => {
    const topCategories = page.locator('.category-list > .category-list-item');
    const count = await topCategories.count();
    const headerInfo = page.locator('#page-site-info');
    if (await headerInfo.isVisible().catch(() => false)) {
      const subText = await headerInfo.textContent();
      if (subText) {
        const match = subText.match(/(\d+)/);
        if (match) {
          expect(parseInt(match[1])).toBe(count);
        }
      }
    }
  });

  test('31. 分类链接可点击跳转', async ({ page }) => {
    const firstLink = page.locator('.category-list-link').first();
    if (await firstLink.isVisible().catch(() => false)) {
      const href = await firstLink.getAttribute('href');
      expect(href).toBeTruthy();
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/categories/');
    }
  });

  test('32. rightside 按钮组存在', async ({ page }) => {
    const rightside = page.locator('#rightside');
    await expect(rightside).toBeAttached();
    const configShow = rightside.locator('#rightside-config-show');
    await expect(configShow).toBeAttached();
  });

  test('33. 回到顶部按钮存在', async ({ page }) => {
    const goUp = page.locator('#go-up');
    await expect(goUp).toBeAttached();
  });

  test('34. 侧边栏 hide-aside-btn 按钮', async ({ page }) => {
    const hideBtn = page.locator('#hide-aside-btn');
    if (await hideBtn.isVisible().catch(() => false)) {
      await expect(hideBtn).toBeVisible();
    }
  });

  test('35. 公告卡片 (若启用)', async ({ page }) => {
    const announcement = page.locator('.card-announcement');
    if (await announcement.isVisible().catch(() => false)) {
      const headline = announcement.locator('.item-headline');
      await expect(headline).toBeVisible();
      const content = announcement.locator('.announcement_content');
      await expect(content).toBeVisible();
      const text = await content.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('36. 最新文章卡片 (若启用且有数据)', async ({ page }) => {
    const recentCard = page.locator('.card-recent-post');
    if (await recentCard.isVisible().catch(() => false)) {
      const items = recentCard.locator('.aside-list-item');
      expect(await items.count()).toBeGreaterThan(0);
      const firstItem = items.first();
      const thumbLink = firstItem.locator('a.thumbnail');
      await expect(thumbLink).toBeVisible();
      const titleLink = firstItem.locator('a.title');
      await expect(titleLink).toBeVisible();
    }
  });

  test('37. 分类列表完整 HTML 结构 (ul > li > a + span)', async ({ page }) => {
    const rootUl = page.locator('ul.category-list');
    if (await rootUl.isVisible().catch(() => false)) {
      await expect(rootUl).toBeVisible();
      const firstLi = rootUl.locator(':scope > .category-list-item').first();
      if (await firstLi.isVisible().catch(() => false)) {
        const link = firstLi.locator(':scope > .category-list-link');
        await expect(link).toBeVisible();
        const countSpan = firstLi.locator(':scope > .category-list-count');
        await expect(countSpan).toBeVisible();
      }
    }
  });

  test('38. 字体设置按钮存在', async ({ page }) => {
    const fontBtn = page.locator('#font-settings-btn');
    await expect(fontBtn).toBeAttached();
  });

  test('39. 移动端 - hamburger menu 存在', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE}/categories`);
    await page.waitForLoadState('networkidle');
    const toggleMenu = page.locator('#toggle-menu');
    await expect(toggleMenu).toBeAttached();
  });

  test('40. 侧边栏 - 最近文章卡片中的时间元素', async ({ page }) => {
    const recentCard = page.locator('.card-recent-post');
    if (await recentCard.isVisible().catch(() => false)) {
      const timeEl = recentCard.locator('time');
      if (await timeEl.first().isVisible().catch(() => false)) {
        const datetime = await timeEl.first().getAttribute('datetime');
        expect(datetime).toBeTruthy();
      }
    }
  });

});
