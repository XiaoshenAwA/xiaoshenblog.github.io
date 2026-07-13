const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { initDb, getDb } = require('./db');
const { PAGE_SIZE } = require('./config');
const { render: renderMd, excerpt } = require('./markdown');
const dist = path.join(__dirname, 'dist');

function rowToPost(row) {
  return {
    id: row.id, title: row.title, content: row.content,
    tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
    cover: row.cover || '', created_at: row.created_at, updated_at: row.updated_at
  };
}

function getAllTags(db) {
  const r = db.exec("SELECT DISTINCT tags FROM posts WHERE tags != ''");
  return [...new Set(r.flatMap(x => x.values.flatMap(v => v[0].split(',').filter(Boolean))))];
}

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✔ ${path.relative(dist, filePath)}`);
}

async function build() {
  console.log('正在初始化数据库...');
  await initDb();
  const db = getDb();

  const basePath = process.env.BASE_PATH || '';
  const isStatic = true;

  console.log('正在清理 dist 目录...');
  if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true });
  fs.mkdirSync(dist);

  const allTags = getAllTags(db);
  const allPostsResult = db.exec('SELECT * FROM posts ORDER BY created_at DESC');
  const allPosts = allPostsResult[0]?.values.map(r => rowToPost({
    id: r[0], title: r[1], content: r[2], tags: r[3], cover: r[4], created_at: r[5], updated_at: r[6]
  })) || [];

  const totalPages = Math.ceil(allPosts.length / PAGE_SIZE) || 1;

  // ====== Render helper ======
  async function render(template, data, outPath) {
    const html = await ejs.renderFile(
      path.join(__dirname, 'views', template),
      { ...data, basePath, isStatic },
      { views: [path.join(__dirname, 'views')] }
    );
    writeFile(path.join(dist, outPath), html);
  }

  async function preparePosts(posts) {
    const result = [];
    for (const p of posts) {
      result.push({ ...p, excerptText: await excerpt(p.content, 200) });
    }
    return result;
  }

  // ====== Homepage pages ======
  console.log('正在生成首页...');
  for (let page = 1; page <= totalPages; page++) {
    const offset = (page - 1) * PAGE_SIZE;
    const posts = await preparePosts(allPosts.slice(offset, offset + PAGE_SIZE));
    const data = { posts, page, totalPages, tag: '', allTags };
    if (page === 1) await render('index.ejs', data, 'index.html');
    if (totalPages > 1) await render('index.ejs', data, `page/${page}/index.html`);
  }

  // ====== Tag pages ======
  console.log('正在生成标签页面...');
  for (const tag of allTags) {
    const allFiltered = await preparePosts(allPosts.filter(p => p.tags.includes(tag)));
    const tPages = Math.ceil(allFiltered.length / PAGE_SIZE) || 1;
    for (let page = 1; page <= tPages; page++) {
      const offset = (page - 1) * PAGE_SIZE;
      const posts = allFiltered.slice(offset, offset + PAGE_SIZE);
      const data = { posts, page, totalPages: tPages, tag, allTags };
      if (page === 1) {
        await render('index.ejs', data, `tag/${encodeURIComponent(tag)}/index.html`);
      } else {
        await render('index.ejs', data, `tag/${encodeURIComponent(tag)}/page/${page}/index.html`);
      }
    }
  }

  // ====== Post detail pages ======
  console.log('正在生成文章页面...');
  for (const post of allPosts) {
    const contentHtml = await renderMd(post.content);
    await render('show.ejs', { post: { ...post, contentHtml }, allTags }, `posts/${post.id}/index.html`);
  }

  // ====== About page ======
  console.log('正在生成关于页面...');
  await render('about.ejs', { allTags, postCount: allPosts.length }, 'about/index.html');

  // ====== Copy static assets ======
  console.log('正在复制静态资源...');
  const copyDir = (src, dest) => {
    if (!fs.existsSync(src)) return;
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const e of entries) {
      const s = path.join(src, e.name);
      const d = path.join(dest, e.name);
      if (e.isDirectory()) {
        copyDir(s, d);
      } else {
        if (!fs.existsSync(path.dirname(d))) fs.mkdirSync(path.dirname(d), { recursive: true });
        fs.copyFileSync(s, d);
      }
    }
  };
  copyDir(path.join(__dirname, 'public'), dist);

  console.log(`\n✅ 构建完成！文件输出到: ${dist}`);
  console.log(`   共 ${allPosts.length} 篇文章, ${allTags.length} 个标签, ${totalPages} 页`);
}

build().catch(err => { console.error('构建失败:', err); process.exit(1); });
