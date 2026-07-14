const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { getAllTags, getAllPosts } = require('./db');
const config = require('./config');
const { render: renderMd, excerpt, init } = require('./markdown');
const dist = path.join(__dirname, 'dist');

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  \u2714 ${path.relative(dist, filePath)}`);
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      copyDirSync(s, d);
    } else {
      if (!fs.existsSync(path.dirname(d))) fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

async function build() {
  const basePath = process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : config.BASE_PATH;
  const isStatic = true;

  console.log('\u6B63\u5728\u6E05\u7406 dist \u76EE\u5F55...');
  if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true });
  fs.mkdirSync(dist);

  const allTags = await getAllTags();
  const allPosts = await getAllPosts();
  const totalPages = Math.ceil(allPosts.length / config.PAGE_SIZE) || 1;

  async function render(template, data, outPath) {
    const html = await ejs.renderFile(
      path.join(__dirname, 'views', template),
      { ...data, basePath, isStatic, config },
      { views: [path.join(__dirname, 'views')] }
    );
    writeFile(path.join(dist, outPath), html);
  }

  async function preparePosts(posts) {
    const result = [];
    for (const p of posts) {
      result.push({ ...p, excerptText: await excerpt(p.content, config.EXCERPT_LENGTH) });
    }
    return result;
  }

  console.log('\u6B63\u5728\u751F\u6210\u9996\u9875...');
    for (let page = 1; page <= totalPages; page++) {
    const offset = (page - 1) * config.PAGE_SIZE;
    const posts = await preparePosts(allPosts.slice(offset, offset + config.PAGE_SIZE));
    const data = { posts, page, totalPages, tag: '', allTags };
    if (page === 1) await render('index.ejs', data, 'index.html');
    if (totalPages > 1) await render('index.ejs', data, `page/${page}/index.html`);
  }

  console.log('\u6B63\u5728\u751F\u6210\u6807\u7B7E\u9875\u9762...');
  for (const tag of allTags) {
    const allFiltered = await preparePosts(allPosts.filter(p => p.tags.includes(tag)));
    const tPages = Math.ceil(allFiltered.length / config.PAGE_SIZE) || 1;
    for (let page = 1; page <= tPages; page++) {
      const offset = (page - 1) * config.PAGE_SIZE;
      const posts = allFiltered.slice(offset, offset + config.PAGE_SIZE);
      const data = { posts, page, totalPages: tPages, tag, allTags };
      if (page === 1) {
        await render('index.ejs', data, `tag/${encodeURIComponent(tag)}/index.html`);
      } else {
        await render('index.ejs', data, `tag/${encodeURIComponent(tag)}/page/${page}/index.html`);
      }
    }
  }

  console.log('\u6B63\u5728\u751F\u6210\u6587\u7AE0\u9875\u9762...');
  for (const post of allPosts) {
    const contentHtml = await renderMd(post.content);
    await render('show.ejs', { post: { ...post, contentHtml }, allTags }, `posts/${post.id}/index.html`);
  }

  console.log('\u6B63\u5728\u751F\u6210\u5173\u4E8E\u9875\u9762...');
  const aboutContent = fs.readFileSync(path.join(__dirname, 'views', 'about_content.md'), 'utf-8');
  const aboutHtml = await renderMd(aboutContent);
  await render('about.ejs', { allTags, postCount: allPosts.length, aboutHtml }, 'about/index.html');

  console.log('\u6B63\u5728\u751F\u6210\u540E\u53F0\u7BA1\u7406\u9875\u9762...');
  await render('admin.ejs', { allTags: [], postCount: 0, title: '\u540E\u53F0\u7BA1\u7406' }, 'admin/index.html');

  console.log('\u6B63\u5728\u751F\u6210 Markdown \u7F16\u8F91\u5668\u9875\u9762...');
  await render('editor.ejs', { title: 'Markdown \u7F16\u8F91\u5668' }, 'editor/index.html');

  console.log('\u6B63\u5728\u590D\u5236\u9759\u6001\u8D44\u6E90...');
  copyDirSync(path.join(__dirname, 'public'), dist);

  console.log(`\n\u2705 \u6784\u5EFA\u5B8C\u6210\uFF01\u6587\u4EF6\u8F93\u51FA\u5230: ${dist}`);
  console.log(`   \u5171 ${allPosts.length} \u7BC7\u6587\u7AE0, ${allTags.length} \u4E2A\u6807\u7B7E, ${totalPages} \u9875`);
}

build().catch(err => { console.error('\u6784\u5EFA\u5931\u8D25:', err); process.exit(1); });