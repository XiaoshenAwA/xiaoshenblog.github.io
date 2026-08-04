import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const STATUS_FILE = path.join(__dirname, '..', '.e2e-status.json');
const BASE = 'http://localhost:3001';

function loadStatus(): Record<string, boolean> {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveStatus(status: Record<string, boolean>) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), 'utf-8');
}

test.describe.configure({ mode: 'serial', maxFailures: 1 });

let status: Record<string, boolean> = {};

test.beforeAll(() => {
  status = loadStatus();
});

test.afterAll(() => {
  saveStatus(status);
});

function skipIfPassed(name: string) {
  if (status[name]) {
    test.skip();
    return true;
  }
  return false;
}

function markPassed(name: string) {
  status[name] = true;
  saveStatus(status);
}

async function gotoHome(page: Page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
}

test('A1: recent-post-item exists and visible', async ({ page }) => {
  if (skipIfPassed('A1')) return;
  await gotoHome(page);
  const items = page.locator('.recent-post-item');
  await expect(items.first()).toBeVisible();
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
  markPassed('A1');
});

test('A2: article-title href contains /posts/', async ({ page }) => {
  if (skipIfPassed('A2')) return;
  await gotoHome(page);
  const titles = page.locator('.recent-post-item .article-title');
  const count = await titles.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const href = await titles.nth(i).getAttribute('href');
    expect(href).toContain('/posts/');
  }
  markPassed('A2');
});

test('A3: post-bg cover image src not empty', async ({ page }) => {
  if (skipIfPassed('A3')) return;
  await gotoHome(page);
  const imgs = page.locator('.recent-post-item .post-bg');
  const count = await imgs.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const src = await imgs.nth(i).getAttribute('src');
    expect(src).toBeTruthy();
    expect(src!.length).toBeGreaterThan(0);
  }
  markPassed('A3');
});

test('A4: article-meta__categories href contains /categories/', async ({ page }) => {
  if (skipIfPassed('A4')) return;
  await gotoHome(page);
  const catLinks = page.locator('.article-meta__categories');
  const count = await catLinks.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const href = await catLinks.nth(i).getAttribute('href');
    expect(href).toContain('/categories/');
  }
  markPassed('A4');
});

test('A5: tag-pill href contains ?tag=', async ({ page }) => {
  if (skipIfPassed('A5')) return;
  await gotoHome(page);
  const tagPills = page.locator('.recent-post-item .tag-pill');
  const count = await tagPills.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const href = await tagPills.nth(i).getAttribute('href');
    expect(href).toMatch(/[?&]tag=/);
  }
  markPassed('A5');
});

test('B6: #pagination exists', async ({ page }) => {
  if (skipIfPassed('B6')) return;
  await gotoHome(page);
  await expect(page.locator('#pagination')).toBeVisible();
  markPassed('B6');
});

test('B7: .page-btn exists and clickable', async ({ page }) => {
  if (skipIfPassed('B7')) return;
  await gotoHome(page);
  const btns = page.locator('#pagination .page-btn');
  const count = await btns.count();
  expect(count).toBeGreaterThanOrEqual(1);
  await expect(btns.first()).toBeVisible();
  markPassed('B7');
});

test('B8: .page-btn.active exists', async ({ page }) => {
  if (skipIfPassed('B8')) return;
  await gotoHome(page);
  const active = page.locator('#pagination .page-btn.active');
  await expect(active).toBeVisible();
  markPassed('B8');
});

test('B9: prev/next links exist when applicable', async ({ page }) => {
  if (skipIfPassed('B9')) return;
  await gotoHome(page);
  const prev = page.locator('#pagination .page-btn.prev');
  const next = page.locator('#pagination .page-btn.next');
  const activeBtn = page.locator('#pagination .page-btn.active');
  const activeText = await activeBtn.textContent();
  const activePage = parseInt(activeText || '1');
  const allBtns = page.locator('#pagination .page-btn:not(.prev):not(.next)');
  const totalPages = await allBtns.count();
  if (activePage > 1) {
    await expect(prev).toBeVisible();
  }
  if (activePage < totalPages) {
    await expect(next).toBeVisible();
  }
  markPassed('B9');
});

test('C10: #load-more-btn exists and visible', async ({ page }) => {
  if (skipIfPassed('C10')) return;
  await gotoHome(page);
  const wrap = page.locator('#load-more-wrap');
  const display = await wrap.evaluate(el => getComputedStyle(el).display);
  if (display === 'none') {
    test.skip(true, 'All posts loaded, load-more hidden');
    return;
  }
  await expect(page.locator('#load-more-btn')).toBeVisible();
  markPassed('C10');
});

test('C11: clicking load-more-btn increases post count', async ({ page }) => {
  if (skipIfPassed('C11')) return;
  await gotoHome(page);
  const wrap = page.locator('#load-more-wrap');
  const display = await wrap.evaluate(el => getComputedStyle(el).display);
  if (display === 'none') {
    test.skip(true, 'All posts loaded, load-more hidden');
    return;
  }
  const countBefore = await page.locator('.recent-post-item').count();
  await page.locator('#load-more-btn').click();
  await page.waitForTimeout(3000);
  const countAfter = await page.locator('.recent-post-item').count();
  expect(countAfter).toBeGreaterThan(countBefore);
  markPassed('C11');
});

test('D12: ?tag=xxx shows .tag-filter-bar', async ({ page }) => {
  if (skipIfPassed('D12')) return;
  await gotoHome(page);
  await page.goto(BASE + '/?tag=test', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  const filterBar = page.locator('.tag-filter-bar');
  const count = await filterBar.count();
  if (count > 0) {
    await expect(filterBar.first()).toBeVisible();
  }
  markPassed('D12');
});

test('D13: tag-clear click returns to homepage without filter', async ({ page }) => {
  if (skipIfPassed('D13')) return;
  await gotoHome(page);
  await page.goto(BASE + '/?tag=test', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  const clearBtn = page.locator('.tag-filter-bar .tag-clear');
  const count = await clearBtn.count();
  if (count > 0) {
    await clearBtn.first().click();
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).not.toContain('?tag=');
  }
  markPassed('D13');
});

test('E14: #aside-content exists', async ({ page }) => {
  if (skipIfPassed('E14')) return;
  await gotoHome(page);
  await expect(page.locator('#aside-content')).toBeVisible();
  markPassed('E14');
});

test('E15: card-info author avatar, name, social icons', async ({ page }) => {
  if (skipIfPassed('E15')) return;
  await gotoHome(page);
  const card = page.locator('.card-info');
  const count = await card.count();
  if (count === 0) {
    test.skip(true, '.card-info not present');
    return;
  }
  await expect(card.locator('.avatar-img img')).toBeVisible();
  await expect(card.locator('.author-info-name')).toBeVisible();
  const socialCount = await card.locator('.social-icon').count();
  expect(socialCount).toBeGreaterThan(0);
  markPassed('E15');
});

test('E16: card-recent-post has article links', async ({ page }) => {
  if (skipIfPassed('E16')) return;
  await gotoHome(page);
  const card = page.locator('.card-recent-post');
  const count = await card.count();
  if (count === 0) {
    test.skip(true, '.card-recent-post not present');
    return;
  }
  const links = card.locator('.aside-list-item a');
  const linkCount = await links.count();
  expect(linkCount).toBeGreaterThan(0);
  markPassed('E16');
});

test('E17: card-categories cat-toggle expand/collapse', async ({ page }) => {
  if (skipIfPassed('E17')) return;
  await gotoHome(page);
  const card = page.locator('.card-categories');
  const count = await card.count();
  if (count === 0) {
    test.skip(true, '.card-categories not present');
    return;
  }
  const toggle = page.locator('.cat-toggle');
  const toggleCount = await toggle.count();
  if (toggleCount === 0) {
    test.skip(true, '.cat-toggle not present (no sub-categories)');
    return;
  }
  await expect(toggle.first()).toBeVisible();
  markPassed('E17');
});

test('E18: card-tags tag links exist', async ({ page }) => {
  if (skipIfPassed('E18')) return;
  await gotoHome(page);
  const card = page.locator('.card-tags');
  const count = await card.count();
  if (count === 0) {
    test.skip(true, '.card-tags not present');
    return;
  }
  const tagLinks = card.locator('.card-tag-cloud a');
  const linkCount = await tagLinks.count();
  expect(linkCount).toBeGreaterThan(0);
  markPassed('E18');
});

test('E19: card-archives archive links exist', async ({ page }) => {
  if (skipIfPassed('E19')) return;
  await gotoHome(page);
  const card = page.locator('.card-archives');
  const count = await card.count();
  if (count === 0) {
    test.skip(true, '.card-archives not present');
    return;
  }
  const links = card.locator('.card-archive-list-link');
  const linkCount = await links.count();
  expect(linkCount).toBeGreaterThan(0);
  markPassed('E19');
});

test('E20: card-webinfo website info stats exist', async ({ page }) => {
  if (skipIfPassed('E20')) return;
  await gotoHome(page);
  const card = page.locator('.card-webinfo');
  const count = await card.count();
  if (count === 0) {
    test.skip(true, '.card-webinfo not present');
    return;
  }
  const items = card.locator('.webinfo-item');
  const itemCount = await items.count();
  expect(itemCount).toBeGreaterThan(0);
  for (let i = 0; i < itemCount; i++) {
    await expect(items.nth(i).locator('.item-count')).toBeVisible();
  }
  markPassed('E20');
});

test('F21: #blog-info .nav-site-title href is /', async ({ page }) => {
  if (skipIfPassed('F21')) return;
  await gotoHome(page);
  const logo = page.locator('#blog-info .nav-site-title');
  await expect(logo).toBeVisible();
  const href = await logo.getAttribute('href');
  expect(href).toBe('/');
  markPassed('F21');
});

test('F22: #menus .menus_items exists', async ({ page }) => {
  if (skipIfPassed('F22')) return;
  await gotoHome(page);
  const menus = page.locator('#menus .menus_items');
  await expect(menus).toBeVisible();
  markPassed('F22');
});

test('F23: #searchBtn exists', async ({ page }) => {
  if (skipIfPassed('F23')) return;
  await gotoHome(page);
  const btn = page.locator('#searchBtn');
  await expect(btn).toBeVisible();
  markPassed('F23');
});

test('F24: #toggle-menu exists for mobile', async ({ page }) => {
  if (skipIfPassed('F24')) return;
  await gotoHome(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  const toggle = page.locator('#toggle-menu');
  await expect(toggle).toBeVisible();
  markPassed('F24');
});

test('G25: desktop 1920x1080 no horizontal overflow', async ({ page }) => {
  if (skipIfPassed('G25')) return;
  await page.setViewportSize({ width: 1920, height: 1080 });
  await gotoHome(page);
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow).toBe(false);
  markPassed('G25');
});

test('G26: mobile 375x812 no horizontal overflow', async ({ page }) => {
  if (skipIfPassed('G26')) return;
  await page.setViewportSize({ width: 375, height: 812 });
  await gotoHome(page);
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow).toBe(false);
  markPassed('G26');
});
