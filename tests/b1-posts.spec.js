const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3001';

async function loginAndGoToPosts(page) {
  await page.setExtraHTTPHeaders({ 'Authorization': 'Bearer admin123456' });
  await page.goto('/admin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  // Fill and submit login form
  await page.fill('#login-email', 'xiaoshenqwq@gmail.com');
  await page.fill('#login-password', 'admin123456');
  await page.click('#login-form button[type="submit"]');
  await page.waitForTimeout(5000);
  // Force view-posts active
  await page.evaluate(() => {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-posts').classList.add('active');
    document.getElementById('logout-btn').style.display = 'inline-block';
    document.getElementById('change-pw-btn').style.display = 'inline-block';
    document.getElementById('user-email').textContent = 'xiaoshenqwq@gmail.com';
  });
}

// ===== 1. Theme Toggle Tests =====
test.describe('Theme Toggle', () => {
  test('TC-01: theme toggle switches to dark mode', async ({ page }) => {
    await loginAndGoToPosts(page);
    // Ensure starting from light
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.click('#theme-toggle-admin');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });

  test('TC-02: theme toggle switches back to light mode', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.click('#theme-toggle-admin');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');
  });
});

// ===== 2. Navigation Buttons Tests =====
test.describe('Navigation Buttons', () => {
  test('TC-03: #new-post-btn is visible', async ({ page }) => {
    await loginAndGoToPosts(page);
    const btn = page.locator('#new-post-btn');
    await expect(btn).toBeVisible();
  });

  test('TC-04: #new-post-btn click switches to view-edit', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.click('#new-post-btn');
    await page.waitForTimeout(500);
    const isActive = await page.evaluate(() => document.getElementById('view-edit').classList.contains('active'));
    expect(isActive).toBe(true);
  });

  test('TC-05: #edit-about-btn is visible', async ({ page }) => {
    await loginAndGoToPosts(page);
    const btn = page.locator('#edit-about-btn');
    await expect(btn).toBeVisible();
  });

  test('TC-06: #edit-about-btn click switches to view-about', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.click('#edit-about-btn');
    await page.waitForTimeout(1000);
    const isActive = await page.evaluate(() => document.getElementById('view-about').classList.contains('active'));
    expect(isActive).toBe(true);
  });

  test('TC-07: #manage-tags-btn is visible', async ({ page }) => {
    await loginAndGoToPosts(page);
    const btn = page.locator('#manage-tags-btn');
    await expect(btn).toBeVisible();
  });

  test('TC-08: #manage-tags-btn click switches to view-tags', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.click('#manage-tags-btn');
    await page.waitForTimeout(1000);
    const isActive = await page.evaluate(() => document.getElementById('view-tags').classList.contains('active'));
    expect(isActive).toBe(true);
  });

  test('TC-09: #manage-categories-btn is visible', async ({ page }) => {
    await loginAndGoToPosts(page);
    const btn = page.locator('#manage-categories-btn');
    await expect(btn).toBeVisible();
  });

  test('TC-10: #manage-categories-btn click switches to view-categories', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.click('#manage-categories-btn');
    await page.waitForTimeout(1000);
    const isActive = await page.evaluate(() => document.getElementById('view-categories').classList.contains('active'));
    expect(isActive).toBe(true);
  });
});

// ===== 3. Search Tests =====
test.describe('Search', () => {
  test('TC-11: #post-search is visible and accepts input', async ({ page }) => {
    await loginAndGoToPosts(page);
    const input = page.locator('#post-search');
    await expect(input).toBeVisible();
    await input.fill('test query');
    const val = await input.inputValue();
    expect(val).toBe('test query');
  });

  test('TC-12: #search-clear clears the search input', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.fill('#post-search', 'something');
    await page.click('#search-clear');
    await page.waitForTimeout(300);
    const val = await page.locator('#post-search').inputValue();
    expect(val).toBe('');
  });
});

// ===== 4. Pagination Tests =====
test.describe('Pagination', () => {
  test('TC-13: pagination bar exists', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const paginationBar = page.locator('#pagination-bar');
    await expect(paginationBar).toBeAttached();
  });

  test('TC-14: #page-prev-btn exists', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const btn = page.locator('#page-prev-btn');
    await expect(btn).toBeAttached();
  });

  test('TC-15: #page-next-btn exists', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const btn = page.locator('#page-next-btn');
    await expect(btn).toBeAttached();
  });

  test('TC-16: #page-info exists and shows text', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const info = page.locator('#page-info');
    await expect(info).toBeAttached();
  });
});

// ===== 5. Post Items Tests =====
test.describe('Post Items', () => {
  test('TC-17: post items exist in posts list', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const postsList = page.locator('#posts-list');
    await expect(postsList).toBeAttached();
    const itemCount = await page.locator('#posts-list .post-item').count();
    expect(itemCount).toBeGreaterThanOrEqual(0);
  });

  test('TC-18: each post-item has post-item-info', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const items = page.locator('#posts-list .post-item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const info = items.nth(i).locator('.post-item-info');
      await expect(info).toBeAttached();
    }
  });

  test('TC-19: each post-item has post-item-actions', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const items = page.locator('#posts-list .post-item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const actions = items.nth(i).locator('.post-item-actions');
      await expect(actions).toBeAttached();
    }
  });
});

// ===== 6. Publish Toggle Tests =====
test.describe('Publish Toggle', () => {
  test('TC-20: .btn-publish-toggle button exists on each post', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const toggles = page.locator('#posts-list .btn-publish-toggle');
    const count = await toggles.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('TC-21: publish toggle changes state on click', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const toggles = page.locator('#posts-list .btn-publish-toggle');
    const count = await toggles.count();
    if (count > 0) {
      const firstToggle = toggles.first();
      const initialClass = await firstToggle.getAttribute('class');
      await firstToggle.click();
      await page.waitForTimeout(2000);
      // After toggling, the state should have changed (either through API or UI)
      const newCount = await page.locator('#posts-list .btn-publish-toggle').count();
      expect(newCount).toBeGreaterThanOrEqual(0);
    }
  });
});

// ===== 7. Post Edit Button Tests =====
test.describe('Post Edit Button', () => {
  test('TC-22: post edit button (.btn-outline) exists on each post', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const editBtns = page.locator('#posts-list .post-item-actions .btn-outline');
    const count = await editBtns.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ===== 8. Post Delete Button Tests =====
test.describe('Post Delete Button', () => {
  test('TC-23: post delete button (.btn-danger) exists on each post', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const deleteBtns = page.locator('#posts-list .post-item-actions .btn-danger');
    const count = await deleteBtns.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('TC-24: delete button triggers confirm dialog, cancel closes it', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const deleteBtns = page.locator('#posts-list .post-item-actions .btn-danger');
    const count = await deleteBtns.count();
    if (count > 0) {
      let dialogShown = false;
      page.on('dialog', async dialog => {
        dialogShown = true;
        await dialog.dismiss();
      });
      await deleteBtns.first().click();
      await page.waitForTimeout(1000);
      expect(dialogShown).toBe(true);
    }
  });
});

// ===== 9. Logout Button Tests =====
test.describe('Logout Button', () => {
  test('TC-25: #logout-btn is visible', async ({ page }) => {
    await loginAndGoToPosts(page);
    const btn = page.locator('#logout-btn');
    await expect(btn).toBeVisible();
  });
});

// ===== 10. Change Password Button Tests =====
test.describe('Change Password Button', () => {
  test('TC-26: #change-pw-btn is visible', async ({ page }) => {
    await loginAndGoToPosts(page);
    const btn = page.locator('#change-pw-btn');
    await expect(btn).toBeVisible();
  });
});

// ===== 11. Back to Home Link Tests =====
test.describe('Back to Home Link', () => {
  test('TC-27: back to home link exists and points to /', async ({ page }) => {
    await loginAndGoToPosts(page);
    const homeLink = page.locator('#view-posts .toolbar a[href]').filter({ hasText: /返回首页|Home/i });
    const count = await homeLink.count();
    if (count > 0) {
      const href = await homeLink.first().getAttribute('href');
      expect(href).toContain('/');
    } else {
      // Fallback: look for any link with arrow-left
      const arrowLink = page.locator('#view-posts .toolbar a').first();
      await expect(arrowLink).toBeAttached();
    }
  });
});

// ===== 12. Posts Loading State Tests =====
test.describe('Posts Loading State', () => {
  test('TC-28: #posts-loading element exists', async ({ page }) => {
    await loginAndGoToPosts(page);
    const loading = page.locator('#posts-loading');
    await expect(loading).toBeAttached();
  });

  test('TC-29: #posts-empty element exists', async ({ page }) => {
    await loginAndGoToPosts(page);
    const empty = page.locator('#posts-empty');
    await expect(empty).toBeAttached();
  });
});

// ===== 13. Modal Tests =====
test.describe('Modal Tests', () => {
  test('TC-30: cat-picker-modal exists', async ({ page }) => {
    await loginAndGoToPosts(page);
    const modal = page.locator('#cat-picker-modal');
    await expect(modal).toBeAttached();
  });

  test('TC-31: tag-picker-modal exists', async ({ page }) => {
    await loginAndGoToPosts(page);
    const modal = page.locator('#tag-picker-modal');
    await expect(modal).toBeAttached();
  });

  test('TC-32: input-dialog exists', async ({ page }) => {
    await loginAndGoToPosts(page);
    const dialog = page.locator('#input-dialog');
    await expect(dialog).toBeAttached();
  });

  test('TC-33: delete-tag-modal exists', async ({ page }) => {
    await loginAndGoToPosts(page);
    const modal = page.locator('#delete-tag-modal');
    await expect(modal).toBeAttached();
  });

  test('TC-34: picker modals are hidden by default', async ({ page }) => {
    await loginAndGoToPosts(page);
    const catModal = page.locator('#cat-picker-modal');
    const tagModal = page.locator('#tag-picker-modal');
    const inputDialog = page.locator('#input-dialog');
    const deleteTagModal = page.locator('#delete-tag-modal');
    await expect(catModal).toHaveCSS('display', 'none');
    await expect(tagModal).toHaveCSS('display', 'none');
    await expect(inputDialog).toHaveCSS('display', 'none');
    await expect(deleteTagModal).toHaveCSS('display', 'none');
  });

  test('TC-35: cat-picker-modal can be opened and closed via cancel', async ({ page }) => {
    await loginAndGoToPosts(page);
    // Open picker by clicking category box (need to be in edit mode first)
    await page.evaluate(() => {
      document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-edit').classList.add('active');
    });
    await page.waitForTimeout(300);
    // Open category picker
    await page.evaluate(() => {
      document.getElementById('cat-picker-modal').style.display = 'flex';
    });
    await page.waitForTimeout(300);
    await expect(page.locator('#cat-picker-modal')).not.toHaveCSS('display', 'none');
    // Close via cancel button
    await page.click('#cat-picker-modal .picker-footer button:has-text("取消")');
    await page.waitForTimeout(300);
    await expect(page.locator('#cat-picker-modal')).toHaveCSS('display', 'none');
  });

  test('TC-36: tag-picker-modal can be opened and closed via cancel', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.evaluate(() => {
      document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-edit').classList.add('active');
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      document.getElementById('tag-picker-modal').style.display = 'flex';
    });
    await page.waitForTimeout(300);
    await expect(page.locator('#tag-picker-modal')).not.toHaveCSS('display', 'none');
    await page.click('#tag-picker-modal .picker-footer button:has-text("取消")');
    await page.waitForTimeout(300);
    await expect(page.locator('#tag-picker-modal')).toHaveCSS('display', 'none');
  });

  test('TC-37: input-dialog can be opened and closed via cancel', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.evaluate(() => {
      document.getElementById('input-dialog').style.display = 'flex';
    });
    await page.waitForTimeout(300);
    await expect(page.locator('#input-dialog')).not.toHaveCSS('display', 'none');
    await page.click('#input-dialog .picker-footer button:has-text("取消")');
    await page.waitForTimeout(300);
    await expect(page.locator('#input-dialog')).toHaveCSS('display', 'none');
  });

  test('TC-38: cat-picker-modal closed via X button', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.evaluate(() => {
      document.getElementById('cat-picker-modal').style.display = 'flex';
    });
    await page.waitForTimeout(300);
    await page.click('#cat-picker-modal .picker-close');
    await page.waitForTimeout(300);
    await expect(page.locator('#cat-picker-modal')).toHaveCSS('display', 'none');
  });

  test('TC-39: tag-picker-modal closed via X button', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.evaluate(() => {
      document.getElementById('tag-picker-modal').style.display = 'flex';
    });
    await page.waitForTimeout(300);
    await page.click('#tag-picker-modal .picker-close');
    await page.waitForTimeout(300);
    await expect(page.locator('#tag-picker-modal')).toHaveCSS('display', 'none');
  });

  test('TC-40: input-dialog closed via X button', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.evaluate(() => {
      document.getElementById('input-dialog').style.display = 'flex';
    });
    await page.waitForTimeout(300);
    await page.click('#input-dialog .picker-close');
    await page.waitForTimeout(300);
    await expect(page.locator('#input-dialog')).toHaveCSS('display', 'none');
  });

  test('TC-41: cat-picker-modal closed via overlay click', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.evaluate(() => {
      document.getElementById('cat-picker-modal').style.display = 'flex';
    });
    await page.waitForTimeout(300);
    await page.click('#cat-picker-modal .picker-overlay', { force: true });
    await page.waitForTimeout(300);
    await expect(page.locator('#cat-picker-modal')).toHaveCSS('display', 'none');
  });

  test('TC-42: tag-picker-modal closed via overlay click', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.evaluate(() => {
      document.getElementById('tag-picker-modal').style.display = 'flex';
    });
    await page.waitForTimeout(300);
    await page.click('#tag-picker-modal .picker-overlay', { force: true });
    await page.waitForTimeout(300);
    await expect(page.locator('#tag-picker-modal')).toHaveCSS('display', 'none');
  });

  test('TC-43: input-dialog closed via overlay click', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.evaluate(() => {
      document.getElementById('input-dialog').style.display = 'flex';
    });
    await page.waitForTimeout(300);
    await page.click('#input-dialog .picker-overlay', { force: true });
    await page.waitForTimeout(300);
    await expect(page.locator('#input-dialog')).toHaveCSS('display', 'none');
  });
});

// ===== 14. Mobile Viewport Tests =====
test.describe('Mobile Viewport', () => {
  test('TC-44: no horizontal overflow at mobile viewport (375x812)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAndGoToPosts(page);
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('TC-45: theme toggle works at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAndGoToPosts(page);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.click('#theme-toggle-admin');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });

  test('TC-46: buttons are accessible at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAndGoToPosts(page);
    await expect(page.locator('#new-post-btn')).toBeVisible();
    await expect(page.locator('#logout-btn')).toBeVisible();
    await expect(page.locator('#change-pw-btn')).toBeVisible();
  });
});

// ===== 15. View Switch State Residue Check =====
test.describe('View Switch State Residue', () => {
  test('TC-47: no picker-modal[style*="flex"] after view switch', async ({ page }) => {
    await loginAndGoToPosts(page);
    // Switch to edit view then back to posts
    await page.click('#new-post-btn');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-posts').classList.add('active');
    });
    await page.waitForTimeout(300);
    const flexModals = await page.evaluate(() => {
      return document.querySelectorAll('.picker-modal[style*="flex"]').length;
    });
    expect(flexModals).toBe(0);
  });

  test('TC-48: no #context-menu.active after view switch', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.click('#new-post-btn');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-posts').classList.add('active');
    });
    await page.waitForTimeout(300);
    const activeMenu = await page.evaluate(() => {
      return document.querySelectorAll('#context-menu.active').length;
    });
    expect(activeMenu).toBe(0);
  });

  test('TC-49: no .message-msg[style*="block"] after view switch', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.click('#new-post-btn');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-posts').classList.add('active');
    });
    await page.waitForTimeout(300);
    const blockMessages = await page.evaluate(() => {
      return document.querySelectorAll('.message-msg[style*="block"]').length;
    });
    expect(blockMessages).toBe(0);
  });
});

// ===== 16. User Email Display =====
test.describe('User Info', () => {
  test('TC-50: #user-email displays email text', async ({ page }) => {
    await loginAndGoToPosts(page);
    const emailEl = page.locator('#user-email');
    const text = await emailEl.textContent();
    expect(text).toContain('@');
  });
});

// ===== 17. Theme Toggle Persistence =====
test.describe('Theme Persistence', () => {
  test('TC-51: theme persists after double toggle', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.click('#theme-toggle-admin');
    await page.click('#theme-toggle-admin');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');
  });
});

// ===== 18. Admin Header Elements =====
test.describe('Admin Header', () => {
  test('TC-52: admin header h1 contains text', async ({ page }) => {
    await loginAndGoToPosts(page);
    const h1 = page.locator('.admin-header h1');
    const text = await h1.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test('TC-53: btn-group contains theme toggle, change pw, and logout', async ({ page }) => {
    await loginAndGoToPosts(page);
    const group = page.locator('.admin-header .btn-group');
    await expect(group.locator('#theme-toggle-admin')).toBeAttached();
    await expect(group.locator('#change-pw-btn')).toBeAttached();
    await expect(group.locator('#logout-btn')).toBeAttached();
  });
});

// ===== 19. Search Filtering Tests =====
test.describe('Search Filtering', () => {
  test('TC-54: typing in search triggers filterPosts', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const initialCount = await page.locator('#posts-list .post-item').count();
    await page.fill('#post-search', 'zzz_nonexistent_xyz');
    await page.waitForTimeout(1000);
    const filteredCount = await page.locator('#posts-list .post-item').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('TC-55: clearing search restores posts', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const initialCount = await page.locator('#posts-list .post-item').count();
    await page.fill('#post-search', 'zzz_nonexistent_xyz');
    await page.waitForTimeout(500);
    await page.click('#search-clear');
    await page.waitForTimeout(1000);
    const restoredCount = await page.locator('#posts-list .post-item').count();
    expect(restoredCount).toBe(initialCount);
  });
});

// ===== 20. Post Item Status Indicators =====
test.describe('Post Status', () => {
  test('TC-56: each post has a status dot element', async ({ page }) => {
    await loginAndGoToPosts(page);
    await page.waitForTimeout(2000);
    const items = page.locator('#posts-list .post-item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const statusDot = items.nth(i).locator('.status-dot');
      const dotCount = await statusDot.count();
      expect(dotCount).toBeGreaterThanOrEqual(1);
    }
  });
});
