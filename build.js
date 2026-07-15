const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { getAllTags, getAllPosts, getAllCategories, getCategoryTree, getArchives, getRecentPosts, getTotalWordCount, getPostCount } = require('./db');
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
  const basePath = process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : '';
  const isStatic = true;

  console.log('\u6B63\u5728\u6E05\u7406 dist \u76EE\u5F55...');
  if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true });
  fs.mkdirSync(dist);

  const allTags = await getAllTags();
  const allPosts = await getAllPosts();
  const totalPages = Math.ceil(allPosts.length / config.PAGE_SIZE) || 1;
  const allCategories = await getAllCategories();
  const categoryTree = await getCategoryTree();
  const archives = await getArchives();
  const recentPosts = await getRecentPosts(config.SIDEBAR_RECENT_COUNT || 5);
  const totalWordCount = await getTotalWordCount();
  const postCount = allPosts.length;
  const sidebarData = { allCategories, categoryTree, allTags, recentPosts, archives, postCount, totalWordCount, friends: config.FRIEND_LINKS || [] };

  function formatDate(d) {
    if (!d) return '';
    var dt = new Date(d);
    var y = dt.getFullYear(), m = String(dt.getMonth()+1).padStart(2,'0'), day = String(dt.getDate()).padStart(2,'0');
    return y + '-' + m + '-' + day;
  }

  function url(path) {
    if (!path || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) return path || '';
    return basePath + path;
  }

  async function render(template, data, outPath) {
    const html = await ejs.renderFile(
      path.join(__dirname, 'views', template),
      { ...data, basePath, url, isStatic, config, formatDate },
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
    const data = { posts, page, totalPages, total: allPosts.length, tag: '', cat: '', ...sidebarData, pageType: 'home' };
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
      const data = { posts, page, totalPages: tPages, tag, cat: '', ...sidebarData, pageType: 'home' };
      if (page === 1) {
        await render('index.ejs', data, `tag/${encodeURIComponent(tag)}/index.html`);
      } else {
        await render('index.ejs', data, `tag/${encodeURIComponent(tag)}/page/${page}/index.html`);
      }
    }
  }

  console.log('\u6B63\u5728\u751F\u6210\u6587\u7AE0\u9875\u9762...');
  for (let i = 0; i < allPosts.length; i++) {
    const post = allPosts[i];
    const contentHtml = await renderMd(post.content);
    const prevPost = i > 0 ? allPosts[i - 1] : null;
    const nextPost = i < allPosts.length - 1 ? allPosts[i + 1] : null;
    await render('show.ejs', { post: { ...post, contentHtml }, ...sidebarData, prevPost, nextPost }, `posts/${post.id}/index.html`);
  }

  console.log('\u6B63\u5728\u751F\u6210\u5173\u4E8E\u9875\u9762...');
  const aboutContent = fs.readFileSync(path.join(__dirname, config.ABOUT_CONTENT_FILE || 'views/about_content.md'), 'utf-8');
  const aboutHtml = await renderMd(aboutContent);
  await render('about.ejs', { ...sidebarData, aboutHtml }, 'about/index.html');

  console.log('\u6B63\u5728\u751F\u6210\u5206\u7C7B\u9875\u9762...');
  await render('categories.ejs', { ...sidebarData }, 'categories/index.html');

  console.log('\u6B63\u5728\u751F\u6210\u5F52\u6863\u9875\u9762...');
  await render('archives.ejs', { ...sidebarData }, 'archives/index.html');

  console.log('\u6B63\u5728\u751F\u6210\u6807\u7B7E\u96C6\u9875\u9762...');
  const allTagCounts = [];
  const countMap = {};
  for (const p of allPosts) {
    for (const t of p.tags) {
      countMap[t] = (countMap[t] || 0) + 1;
    }
  }
  for (const [name, cnt] of Object.entries(countMap)) {
    allTagCounts.push({ name, count: cnt });
  }
  allTagCounts.sort((a, b) => b.count - a.count);
  await render('tags.ejs', { ...sidebarData, allTagCounts }, 'tags/index.html');

  console.log('\u6B63\u5728\u751F\u6210\u53CB\u94FE\u9875\u9762...');
  await render('friends.ejs', { ...sidebarData }, 'friends/index.html');

  if (config.SEARCH_ENABLE) {
    console.log('\u6B63\u5728\u751F\u6210\u641C\u7D22\u7D22\u5F15...');
    const searchIndex = [];
    for (const post of allPosts) {
      const text = post.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      searchIndex.push({
        id: post.id,
        title: post.title,
        content: text.substring(0, 500),
        url: basePath + '/posts/' + post.id + '/',
        tags: post.tags
      });
    }
    writeFile(path.join(dist, 'search.json'), JSON.stringify(searchIndex));
  }

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