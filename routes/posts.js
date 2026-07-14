const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getAllTags, getPostsPage, getPost, createPost, updatePost, deletePost, getPostCount } = require('../db');
const { BASE_PATH, PAGE_SIZE } = require('../config');
const { render, excerpt } = require('../markdown');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const tag = req.query.tag || '';
    const { posts, total } = await getPostsPage(page, tag, PAGE_SIZE);
    const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
    const allTags = await getAllTags();

    for (const p of posts) {
      p.excerptText = await excerpt(p.content, 200);
    }

    res.render('index', { posts, page, totalPages, tag, allTags, basePath: BASE_PATH, isStatic: false });
  } catch (e) {
    res.status(500).send('服务器错误');
  }
});

router.get('/posts/new', (req, res) => {
  res.render('new', { basePath: BASE_PATH, isStatic: false });
});

router.get('/posts/:id', async (req, res) => {
  try {
    const post = await getPost(req.params.id);
    if (!post) return res.status(404).send('文章未找到');
    post.contentHtml = await render(post.content);
    const allTags = await getAllTags();
    res.render('show', { post, allTags, basePath: BASE_PATH, isStatic: false });
  } catch (e) {
    res.status(500).send('服务器错误');
  }
});

router.post('/posts', async (req, res) => {
  try {
    const { title, content, tags, cover } = req.body;
    if (!title || !content) return res.status(400).send('标题和内容不能为空');
    const id = await createPost({ title, content, tags, cover });
    res.redirect(`${BASE_PATH}/posts/${id}`);
  } catch (e) {
    res.status(500).send('服务器错误');
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    await deletePost(req.params.id);
    res.redirect(BASE_PATH || '/');
  } catch (e) {
    res.status(500).send('服务器错误');
  }
});

router.get('/posts/:id/edit', async (req, res) => {
  try {
    const post = await getPost(req.params.id);
    if (!post) return res.status(404).send('文章未找到');
    post.tagsStr = post.tags.join(',');
    res.render('edit', { post, basePath: BASE_PATH, isStatic: false });
  } catch (e) {
    res.status(500).send('服务器错误');
  }
});

router.put('/posts/:id', async (req, res) => {
  try {
    const { title, content, tags, cover } = req.body;
    if (!title || !content) return res.status(400).send('标题和内容不能为空');
    await updatePost(req.params.id, { title, content, tags, cover });
    res.redirect(`${BASE_PATH}/posts/${req.params.id}`);
  } catch (e) {
    res.status(500).send('服务器错误');
  }
});

router.get('/about', async (req, res) => {
  try {
    const allTags = await getAllTags();
    const postCount = await getPostCount();
    const aboutContent = fs.readFileSync(path.join(__dirname, '..', 'views', 'about_content.md'), 'utf-8');
    const aboutHtml = await render(aboutContent);
    res.render('about', { allTags, postCount, aboutHtml, basePath: BASE_PATH, isStatic: false });
  } catch (e) {
    res.status(500).send('服务器错误');
  }
});

module.exports = router;