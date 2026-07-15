const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getAllTags, getPostsPage, getPost, getPostAdmin, createPost, updatePost, deletePost, getPostCount, getAllPosts, getAdjacentPosts, getAllCategories, getCategoryTree, getArchives, getRecentPosts, getTotalWordCount, getSiteStats, incrementVisitorCount, incrementViewCount, getLastPostUpdateTime, getManagedTags, createManagedTag, deleteManagedTag, renameManagedTag, getManagedCategories, createManagedCategory, deleteManagedCategory, renameManagedCategory, getManagedCategoriesFlat } = require('../db');
const config = require('../config');
const { render, excerpt } = require('../markdown');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const tag = req.query.tag || '';
    const cat = req.query.cat || '';
    const { posts, total } = await getPostsPage(page, tag, config.PAGE_SIZE, cat);
    const totalPages = Math.ceil(total / config.PAGE_SIZE) || 1;
    const sidebar = await getSidebarData();

    for (const p of posts) {
      p.excerptText = await excerpt(p.content, config.EXCERPT_LENGTH);
    }

    res.render('index', { posts, page, totalPages, total, tag, cat, ...sidebar, basePath: config.BASE_PATH, config, locale: config.locale, isStatic: false, pageType: 'home' });
  } catch (e) {
    res.status(500).send(config.locale?.common?.server_error || '服务器错误');
  }
});

router.get('/posts/new', async (req, res) => {
  try {
    const allCategories = await getAllCategories();
    res.render('new', { basePath: config.BASE_PATH, config, locale: config.locale, isStatic: false, allCategories });
  } catch (e) {
    res.status(500).send(config.locale?.common?.server_error || '服务器错误');
  }
});

router.get('/posts/:id', async (req, res) => {
  try {
    const post = await getPost(req.params.id);
    if (!post) return res.status(404).send(config.locale?.post?.not_found || '文章未找到');
    post.contentHtml = await render(post.content);
    const sidebar = await getSidebarData();
    const { prev, next } = await getAdjacentPosts(post.id);
    res.render('show', { post, ...sidebar, prevPost: prev, nextPost: next, basePath: config.BASE_PATH, config, locale: config.locale, isStatic: false });
  } catch (e) {
    res.status(500).send(config.locale?.common?.server_error || '服务器错误');
  }
});

router.post('/posts', async (req, res) => {
  try {
    const { title, content, tags, cover, category } = req.body;
    if (!title || !content) return res.status(400).send(config.locale?.common?.empty_error || '标题和内容不能为空');
    const id = await createPost({ title, content, tags, cover, category });
    res.redirect(`${config.BASE_PATH}/posts/${id}`);
  } catch (e) {
    res.status(500).send(config.locale?.common?.server_error || '服务器错误');
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    await deletePost(req.params.id);
    res.redirect(config.BASE_PATH || '/');
  } catch (e) {
    res.status(500).send(config.locale?.common?.server_error || '服务器错误');
  }
});

router.get('/posts/:id/edit', async (req, res) => {
  try {
    const post = await getPostAdmin(req.params.id);
    if (!post) return res.status(404).send(config.locale?.post?.not_found || '文章未找到');
    post.tagsStr = post.tags.join(',');
    const allCategories = await getAllCategories();
    res.render('edit', { post, basePath: config.BASE_PATH, config, locale: config.locale, isStatic: false, allCategories });
  } catch (e) {
    res.status(500).send(config.locale?.common?.server_error || '服务器错误');
  }
});

router.put('/posts/:id', async (req, res) => {
  try {
    const { title, content, tags, cover, category } = req.body;
    if (!title || !content) return res.status(400).send(config.locale?.common?.empty_error || '标题和内容不能为空');
    await updatePost(req.params.id, { title, content, tags, cover, category });
    res.redirect(`${config.BASE_PATH}/posts/${req.params.id}`);
  } catch (e) {
    res.status(500).send(config.locale?.common?.server_error || '服务器错误');
  }
});

const aboutFilePath = path.join(__dirname, '..', config.ABOUT_CONTENT_FILE || 'views/about_content.md');

router.get('/about/raw', (req, res) => {
  try {
    const content = fs.readFileSync(aboutFilePath, 'utf-8');
    res.type('text/plain').send(content);
  } catch (e) {
    res.status(500).send('读取失败');
  }
});

router.post('/about', (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).send('内容不能为空');
    fs.writeFileSync(aboutFilePath, content, 'utf-8');
    res.send('ok');
  } catch (e) {
    res.status(500).send('保存失败');
  }
});

router.get('/search.json', async (req, res) => {
  try {
    const posts = await getAllPosts();
    const index = posts.map(p => ({
      id: p.id,
      title: p.title,
      content: (p.content || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 500),
      url: config.BASE_PATH + '/posts/' + p.id + '/',
      tags: p.tags || []
    }));
    res.json(index);
  } catch (e) {
    res.status(500).json({ error: '搜索索引生成失败' });
  }
});

async function getSidebarData() {
  const allCategories = await getAllCategories();
  const categoryTree = await getCategoryTree();
  const allTags = await getAllTags();
  const recentPosts = await getRecentPosts(config.SIDEBAR_RECENT_COUNT || 5);
  const archives = await getArchives();
  const postCount = await getPostCount();
  const totalWordCount = await getTotalWordCount();
  const siteStats = await getSiteStats();
  const lastUpdateTime = await getLastPostUpdateTime();
  return { allCategories, categoryTree, allTags, recentPosts, archives, postCount, totalWordCount, visitorCount: siteStats.visitor_count, totalViews: siteStats.total_views, lastUpdateTime };
}

router.get('/about', async (req, res) => {
  try {
    const aboutContent = fs.readFileSync(aboutFilePath, 'utf-8');
    const aboutHtml = await render(aboutContent);
    const sidebar = await getSidebarData();
    res.render('about', { ...sidebar, aboutHtml, basePath: config.BASE_PATH, config, locale: config.locale, isStatic: false });
  } catch (e) {
    res.status(500).send('服务器错误');
  }
});

router.get('/categories', async (req, res) => {
  try {
    const sidebar = await getSidebarData();
    res.render('categories', { ...sidebar, basePath: config.BASE_PATH, config, locale: config.locale, isStatic: false });
  } catch (e) {
    res.status(500).send('服务器错误');
  }
});

router.get(/\/categories\/(.+)/, async (req, res) => {
  try {
    const catPath = decodeURIComponent(req.params[0] || '').replace(/\/+$/, '');
    if (!catPath) { res.redirect(config.BASE_PATH + '/categories'); return; }
    const page = parseInt(req.query.page) || 1;
    const { posts, total } = await getPostsPage(page, '', config.PAGE_SIZE, catPath);
    const totalPages = Math.ceil(total / config.PAGE_SIZE) || 1;
    const sidebar = await getSidebarData();
    for (const p of posts) {
      p.excerptText = await excerpt(p.content, config.EXCERPT_LENGTH);
    }
    res.render('index', { posts, page, totalPages, total, tag: '', cat: catPath, ...sidebar, basePath: config.BASE_PATH, config, locale: config.locale, isStatic: false, pageType: 'category' });
  } catch (e) {
    res.status(500).send(config.locale?.common?.server_error || '服务器错误');
  }
});

router.get('/archives', async (req, res) => {
  try {
    const sidebar = await getSidebarData();
    res.render('archives', { ...sidebar, basePath: config.BASE_PATH, config, locale: config.locale, isStatic: false });
  } catch (e) {
    res.status(500).send('服务器错误');
  }
});

router.get('/friends', async (req, res) => {
  try {
    const sidebar = await getSidebarData();
    res.render('friends', { ...sidebar, basePath: config.BASE_PATH, config, locale: config.locale, isStatic: false, friends: config.FRIEND_LINKS || [] });
  } catch (e) {
    res.status(500).send('服务器错误');
  }
});

router.get('/tags', async (req, res) => {
  try {
    const sidebar = await getSidebarData();
    const allTagCounts = [];
    const all = await getAllPosts();
    const countMap = {};
    for (const p of all) {
      for (const t of p.tags) {
        countMap[t] = (countMap[t] || 0) + 1;
      }
    }
    for (const [name, count] of Object.entries(countMap)) {
      allTagCounts.push({ name, count });
    }
    allTagCounts.sort((a, b) => b.count - a.count);
    res.render('tags', { ...sidebar, allTagCounts, basePath: config.BASE_PATH, config, locale: config.locale, isStatic: false });
  } catch (e) {
    res.status(500).send(config.locale?.common?.server_error || '服务器错误');
  }
});

router.post('/api/stats/visit', async (req, res) => {
  try {
    const count = await incrementVisitorCount();
    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ success: false, error: '统计访客失败' });
  }
});

router.post('/api/stats/view/:id', async (req, res) => {
  try {
    const count = await incrementViewCount(req.params.id);
    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ success: false, error: '统计浏览量失败' });
  }
});

// ============ Managed Tags API ============

router.get('/api/admin/tags', async (req, res) => {
  try {
    const tags = await getManagedTags();
    res.json(tags);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api/admin/tags', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '标签名不能为空' });
    const tag = await createManagedTag(name);
    res.json(tag);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/api/admin/tags/:id', async (req, res) => {
  try {
    await deleteManagedTag(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/api/admin/tags/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '标签名不能为空' });
    await renameManagedTag(req.params.id, name);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ Managed Categories API ============

router.get('/api/admin/categories', async (req, res) => {
  try {
    const tree = await getManagedCategories();
    const flat = await getManagedCategoriesFlat();
    res.json({ tree, flat });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api/admin/categories', async (req, res) => {
  try {
    const { name, parent_id } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '分类名不能为空' });
    const cat = await createManagedCategory(name, parent_id || null);
    res.json(cat);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    await deleteManagedCategory(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/api/admin/categories/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '分类名不能为空' });
    await renameManagedCategory(req.params.id, name);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;