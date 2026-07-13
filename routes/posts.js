const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db');
const { BASE_PATH, PAGE_SIZE } = require('../config');
const { render, excerpt } = require('../markdown');

function rowToPost(row) {
  return {
    id: row.id, title: row.title, content: row.content,
    tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
    cover: row.cover || '', created_at: row.created_at, updated_at: row.updated_at
  };
}

router.get('/', async (req, res) => {
  const db = getDb();
  const page = parseInt(req.query.page) || 1;
  const tag = req.query.tag || '';
  let where = '', params = [];
  if (tag) {
    where = "WHERE tags LIKE ?";
    params = [`%${tag}%`];
  }
  const countResult = db.exec(`SELECT COUNT(*) FROM posts ${where}`);
  const total = countResult[0].values[0][0];
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const offset = (page - 1) * PAGE_SIZE;

  const allTagsResult = db.exec("SELECT DISTINCT tags FROM posts WHERE tags != ''");
  const allTags = [...new Set(allTagsResult.flatMap(r =>
    r.values.flatMap(v => v[0].split(',').filter(Boolean))
  ))];

  let stmt = db.prepare(`SELECT * FROM posts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`);
  if (params.length) {
    stmt.bind([...params, PAGE_SIZE, offset]);
  } else {
    stmt.bind([PAGE_SIZE, offset]);
  }
  const posts = [];
  while (stmt.step()) {
    const p = rowToPost(stmt.getAsObject());
    p.excerptText = await excerpt(p.content, 200);
    posts.push(p);
  }
  stmt.free();

  res.render('index', {
    posts, page, totalPages, tag, allTags,
    basePath: BASE_PATH, isStatic: false
  });
});

router.get('/posts/new', (req, res) => {
  res.render('new', { basePath: BASE_PATH, isStatic: false });
});

router.get('/posts/:id', async (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM posts WHERE id = ?');
  stmt.bind([req.params.id]);
  if (stmt.step()) {
    const post = rowToPost(stmt.getAsObject());
    stmt.free();
    post.contentHtml = await render(post.content);
    const tagsResult = db.exec("SELECT DISTINCT tags FROM posts WHERE tags != ''");
    const allTags = [...new Set(tagsResult.flatMap(r =>
      r.values.flatMap(v => v[0].split(',').filter(Boolean))
    ))];
    res.render('show', { post, allTags, basePath: BASE_PATH, isStatic: false });
  } else {
    stmt.free();
    res.status(404).send('文章未找到');
  }
});

router.post('/posts', (req, res) => {
  const { title, content, tags, cover } = req.body;
  if (!title || !content) return res.status(400).send('标题和内容不能为空');
  const db = getDb();
  db.run('INSERT INTO posts (title, content, tags, cover) VALUES (?, ?, ?, ?)',
    [title, content, tags || '', cover || '']);
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const id = stmt.getAsObject().id;
  stmt.free();
  saveDb();
  res.redirect(`${BASE_PATH}/posts/${id}`);
});

router.delete('/posts/:id', (req, res) => {
  const db = getDb();
  db.run('DELETE FROM posts WHERE id = ?', [req.params.id]);
  saveDb();
  res.redirect(BASE_PATH || '/');
});

router.get('/posts/:id/edit', (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM posts WHERE id = ?');
  stmt.bind([req.params.id]);
  if (stmt.step()) {
    const post = rowToPost(stmt.getAsObject());
    stmt.free();
    post.tagsStr = post.tags.join(',');
    res.render('edit', { post, basePath: BASE_PATH, isStatic: false });
  } else {
    stmt.free();
    res.status(404).send('文章未找到');
  }
});

router.put('/posts/:id', (req, res) => {
  const { title, content, tags, cover } = req.body;
  if (!title || !content) return res.status(400).send('标题和内容不能为空');
  const db = getDb();
  db.run("UPDATE posts SET title=?, content=?, tags=?, cover=?, updated_at=datetime('now','localtime') WHERE id=?",
    [title, content, tags || '', cover || '', req.params.id]);
  saveDb();
  res.redirect(`${BASE_PATH}/posts/${req.params.id}`);
});

router.get('/about', (req, res) => {
  const db = getDb();
  const tagsResult = db.exec("SELECT DISTINCT tags FROM posts WHERE tags != ''");
  const allTags = [...new Set(tagsResult.flatMap(r =>
    r.values.flatMap(v => v[0].split(',').filter(Boolean))
  ))];
  const count = db.exec('SELECT COUNT(*) FROM posts')[0].values[0][0];
  res.render('about', { allTags, postCount: count, basePath: BASE_PATH, isStatic: false });
});

module.exports = router;
