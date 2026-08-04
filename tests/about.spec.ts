import { test, expect } from '@playwright/test';

const ABOUT_URL = '/about';

test.describe('About Page E2E Tests', () => {

  // ─── Page Load ───
  test.describe('Page Load', () => {
    test('loads about page with 200', async ({ page }) => {
      const resp = await page.goto(ABOUT_URL);
      expect(resp?.status()).toBe(200);
    });

    test('has correct title containing 关于', async ({ page }) => {
      await page.goto(ABOUT_URL);
      await expect(page).toHaveTitle(/关于/);
    });

    test('has data-theme attribute on <html>', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const theme = await page.locator('html').getAttribute('data-theme');
      expect(theme).toBeTruthy();
    });
  });

  // ─── Social Links ───
  test.describe('Social Links', () => {
    test('GitHub link has correct href', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const gh = page.locator('.social-links a').filter({ has: page.locator('.fa-github') });
      await expect(gh).toHaveCount(1);
      await expect(gh).toHaveAttribute('href', 'https://github.com/XiaoshenAwA');
    });

    test('Twitter link has correct href', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const tw = page.locator('.social-links a').filter({ has: page.locator('.fa-twitter') });
      await expect(tw).toHaveCount(1);
      await expect(tw).toHaveAttribute('href', 'https://x.com/XiaoshenAwA');
    });

    test('Weibo link is not rendered when not configured', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const wb = page.locator('.social-links a').filter({ has: page.locator('.fa-weibo') });
      const count = await wb.count();
      expect(count).toBe(0);
    });

    test('social links container exists and is visible', async ({ page }) => {
      await page.goto(ABOUT_URL);
      await expect(page.locator('.social-links')).toBeVisible();
    });

    test('social links has exactly 2 links (GitHub + Twitter)', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const links = page.locator('.social-links a');
      await expect(links).toHaveCount(2);
    });
  });

  // ─── Avatar ───
  test.describe('Avatar', () => {
    test('avatar image is visible with correct src', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const img = page.locator('.about-avatar-img');
      await expect(img).toBeVisible();
      const src = await img.getAttribute('src');
      expect(src).toContain('cdn.luogu.com.cn');
    });

    test('avatar has avatar-effect class', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const img = page.locator('.about-avatar-img');
      const cls = await img.getAttribute('class');
      expect(cls).toContain('avatar-effect');
    });

    test('avatar alt text matches blog author', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const img = page.locator('.about-avatar-img');
      await expect(img).toHaveAttribute('alt', '博主');
    });

    test('avatar is an <img> element (not a FontAwesome icon)', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const img = page.locator('.about-avatar-img');
      await expect(img).toBeVisible();
      const tagName = await img.evaluate(el => el.tagName);
      expect(tagName).toBe('IMG');
    });
  });

  // ─── Author Info ───
  test.describe('Author Info', () => {
    test('author name is displayed in h1', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const h1 = page.locator('.about-hero h1');
      await expect(h1).toBeVisible();
      await expect(h1).toHaveText('博主');
    });

    test('author bio tagline is displayed', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const tagline = page.locator('.about-tagline');
      await expect(tagline).toBeVisible();
      await expect(tagline).toHaveText('热爱技术，享受生活');
    });
  });

  // ─── About Content ───
  test.describe('About Content', () => {
    test('about-content container exists', async ({ page }) => {
      await page.goto(ABOUT_URL);
      await expect(page.locator('.about-content')).toBeVisible();
    });

    test('about-content has card-widget class', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const el = page.locator('.about-content.card-widget');
      await expect(el).toBeVisible();
    });

    test('about-content renders Markdown HTML (contains <p> tag from "hello")', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const pTag = page.locator('.about-content p');
      await expect(pTag).toBeVisible();
      await expect(pTag).toHaveText('hello');
    });

    test('about-page wrapper exists with reveal class', async ({ page }) => {
      await page.goto(ABOUT_URL);
      await expect(page.locator('.about-page.reveal')).toBeVisible();
    });

    test('about-hero section exists', async ({ page }) => {
      await page.goto(ABOUT_URL);
      await expect(page.locator('.about-hero')).toBeVisible();
    });

    test('#about div wrapper exists', async ({ page }) => {
      await page.goto(ABOUT_URL);
      await expect(page.locator('#about')).toBeVisible();
    });
  });

  // ─── Sidebar (about page uses hide-aside, sidebar is not in main content) ───
  test.describe('Sidebar', () => {
    test('layout has hide-aside class (sidebar hidden)', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const layout = page.locator('#content-inner');
      const cls = await layout.getAttribute('class');
      expect(cls).toContain('hide-aside');
    });

    test('hide-aside-btn toggle exists in rightside', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const btn = page.locator('#hide-aside-btn');
      await expect(btn).toBeAttached();
    });

    test('clicking hide-aside-btn toggles sidebar visibility', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const layout = page.locator('.layout');
      const hasHideBefore = await layout.evaluate(el => el.classList.contains('hide-aside'));
      expect(hasHideBefore).toBe(true);

      await page.evaluate(() => { document.getElementById('hide-aside-btn')?.click(); });
      await page.waitForTimeout(300);
      const hasHideAfter = await layout.evaluate(el => el.classList.contains('hide-aside'));
      expect(hasHideAfter).toBe(false);

      await page.evaluate(() => { document.getElementById('hide-aside-btn')?.click(); });
      await page.waitForTimeout(300);
      const hasHideFinal = await layout.evaluate(el => el.classList.contains('hide-aside'));
      expect(hasHideFinal).toBe(true);
    });
  });

  // ─── Navigation ───
  test.describe('Navigation', () => {
    test('nav bar is present', async ({ page }) => {
      await page.goto(ABOUT_URL);
      await expect(page.locator('#nav')).toBeVisible();
    });

    test('nav has site title link', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const siteName = page.locator('.site-name').first();
      await expect(siteName).toBeVisible();
    });

    test('about link is in nav menu', async ({ page }) => {
      await page.goto(ABOUT_URL, { waitUntil: 'domcontentloaded' });
      const aboutLink = page.locator('#menus a[href="/about"]');
      await expect(aboutLink).toBeAttached();
    });
  });

  // ─── Dark Mode ───
  test.describe('Dark Mode', () => {
    test('dark mode button exists in DOM', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const btn = page.locator('#darkmode');
      await expect(btn).toBeAttached();
    });

    test('dark mode button is in rightside config area', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const parent = page.locator('#rightside-config-hide');
      const btn = parent.locator('#darkmode');
      await expect(btn).toBeAttached();
    });

    test('clicking dark mode toggles data-theme', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const html = page.locator('html');
      const initial = await html.getAttribute('data-theme');
      await page.evaluate(() => { document.getElementById('darkmode')?.click(); });
      await page.waitForTimeout(300);
      const after = await html.getAttribute('data-theme');
      expect(after).not.toBe(initial);
    });

    test('dark mode persists after page reload', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const html = page.locator('html');
      await page.evaluate(() => { document.getElementById('darkmode')?.click(); });
      await page.waitForTimeout(300);
      const theme1 = await html.getAttribute('data-theme');
      await page.reload();
      await page.waitForTimeout(500);
      const theme2 = await html.getAttribute('data-theme');
      expect(theme2).toBe(theme1);
    });
  });

  // ─── Footer ───
  test.describe('Footer', () => {
    test('footer is present', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const footer = page.locator('#footer');
      await expect(footer).toBeVisible();
    });

    test('footer has copyright text', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const copyright = page.locator('.copyright');
      await expect(copyright).toBeVisible();
      await expect(copyright).toContainText('博主');
    });

    test('go-up back-to-top button exists', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const btn = page.locator('#go-up');
      await expect(btn).toBeAttached();
    });
  });

  // ─── Responsive Design ───
  test.describe('Responsive Design', () => {
    test('page renders on mobile viewport (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(ABOUT_URL);
      await expect(page.locator('#content-inner')).toBeVisible();
      await expect(page.locator('.about-avatar-img')).toBeVisible();
    });

    test('page renders on tablet viewport (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(ABOUT_URL);
      await expect(page.locator('#content-inner')).toBeVisible();
    });

    test('page renders on desktop viewport (1440px)', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(ABOUT_URL);
      await expect(page.locator('#content-inner')).toBeVisible();
    });

    test('mobile menu toggle exists on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(ABOUT_URL);
      await expect(page.locator('#toggle-menu')).toBeVisible();
    });

    test('about-avatar-img is visible on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(ABOUT_URL);
      const img = page.locator('.about-avatar-img');
      await expect(img).toBeVisible();
    });

    test('about-content is visible on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(ABOUT_URL);
      await expect(page.locator('.about-content')).toBeVisible();
    });

    test('social links are visible on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(ABOUT_URL);
      await expect(page.locator('.social-links')).toBeVisible();
    });
  });

  // ─── Layout Structure ───
  test.describe('Layout Structure', () => {
    test('content layout has hide-aside class', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const layout = page.locator('.layout.hide-aside');
      await expect(layout).toBeVisible();
    });

    test('about section wrapper exists', async ({ page }) => {
      await page.goto(ABOUT_URL);
      await expect(page.locator('#about')).toBeVisible();
    });

    test('page body-wrap div exists', async ({ page }) => {
      await page.goto(ABOUT_URL);
      await expect(page.locator('#body-wrap')).toBeVisible();
    });

    test('page has main.css loaded', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const link = page.locator('link[href*="main.css"]');
      await expect(link).toBeAttached();
    });

    test('page has fontawesome loaded', async ({ page }) => {
      await page.goto(ABOUT_URL);
      const link = page.locator('link[href*="fontawesome"]');
      await expect(link).toBeAttached();
    });
  });
});
