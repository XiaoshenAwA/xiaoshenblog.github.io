const express = require('express');
const path = require('path');
const fs = require('fs');
const methodOverride = require('method-override');
const helmet = require('helmet');
const postsRouter = require('./routes/posts');
const config = require('./config');
const adminAuth = require('./middleware/adminAuth');

const app = express();
const PORT = config.PORT;

const cssVersion = Date.now();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(config.BASE_PATH, express.static(path.join(__dirname, 'public'), { etag: false, maxAge: 0 }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", "https://giscus.app", "https://cdn.jsdelivr.net", "https://esm.sh"],
      scriptSrcAttr: null,
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://giscus.app", "https://esm.sh", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      fontSrc: ["'self'", "data:", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://giscus.app", "https://v1.hitokoto.cn", "https://v1.jinrishici.com", "https://cdn.jsdelivr.net", "https://esm.sh", "https://playgroundcdn.typescriptlang.org", "https://fonts.googleapis.com", config.SUPABASE_URL],
      workerSrc: ["'self'", "https://cdn.jsdelivr.net", "blob:"],
      frameSrc: ["https://giscus.app"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(methodOverride('_method'));

const SAFE_CONFIG_KEYS = [
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'DB_TABLE',
  'BLOG_NAME', 'BLOG_SUBTITLE', 'BLOG_AUTHOR', 'BLOG_AUTHOR_BIO',
  'PAGE_SIZE', 'EXCERPT_LENGTH', 'READING_SPEED',
  'NAV', 'NAV_LOGO', 'NAV_DISPLAY_TITLE', 'NAV_FIXED', 'NAV_SCROLL_THRESHOLD', 'NAV_MENU',
  'IMAGES', 'FAVICON', 'AVATAR_IMG', 'AVATAR_EFFECT', 'DEFAULT_COVER',
  'DISABLE_TOP_IMG', 'DEFAULT_TOP_IMG', 'INDEX_IMG', 'FALLBACK_COVER',
  'CODE_BLOCKS', 'CB_MACSTYLE', 'CB_HEIGHT_LIMIT', 'CB_WORD_WRAP', 'CB_SHRINK', 'CB_FULLPAGE', 'CB_COPY', 'CB_LANGUAGE',
  'FOOTER', 'FOOTER_OWNER_ENABLE', 'FOOTER_OWNER_SINCE', 'FOOTER_COPYRIGHT', 'FOOTER_CUSTOM_TEXT',
  'FONT', 'FONT_GLOBAL_SIZE', 'FONT_CODE_SIZE', 'FONT_BODY', 'FONT_CODE',
  'BEAUTIFY', 'ROUNDED_CORNERS', 'PRELOADER_ENABLE',
  'POST_META',
  'INDEX_CONFIG', 'INDEX_LAYOUT', 'INDEX_EXCERPT_METHOD', 'INDEX_EXCERPT_LENGTH',
  'INDEX_SUBTITLE_ENABLE', 'INDEX_SUBTITLE_EFFECT', 'INDEX_SUBTITLE_SUB',
  'INDEX_SUBTITLE_TYPE_SPEED', 'INDEX_SUBTITLE_BACK_SPEED', 'INDEX_SUBTITLE_PAUSE_TIME',
  'TOC_POST', 'TOC_NUMBER', 'TOC_EXPAND', 'TOC_STYLE_SIMPLE',
  'ASIDE_ENABLE', 'ASIDE_MOBILE', 'ASIDE_POSITION', 'ASIDE_FOLLOW_ME_PLATFORM',
  'ASIDE_CARD_AUTHOR', 'ASIDE_CARD_ANNOUNCEMENT', 'ASIDE_ANNOUNCEMENT_CONTENT',
  'ASIDE_CARD_RECENT_POST', 'ASIDE_RECENT_POST_LIMIT',
  'ASIDE_CARD_CATEGORIES', 'ASIDE_CATEGORIES_LIMIT',
  'ASIDE_CARD_TAGS', 'ASIDE_TAGS_LIMIT', 'ASIDE_TAGS_COLOR', 'ASIDE_TAGS_ORDERBY',
  'ASIDE_CARD_ARCHIVES', 'ASIDE_ARCHIVES_TYPE', 'ASIDE_ARCHIVES_FORMAT', 'ASIDE_ARCHIVES_LIMIT', 'ASIDE_ARCHIVES_ORDER',
  'ASIDE_CARD_WEBINFO', 'ASIDE_WEBINFO_POST_COUNT', 'ASIDE_WEBINFO_VISITOR_COUNT', 'ASIDE_WEBINFO_TOTAL_VIEWS', 'ASIDE_WEBINFO_LAST_UPDATE', 'ASIDE_WEBINFO_RUNTIME_DATE',
  'DARKMODE_ENABLE', 'DARKMODE_BUTTON', 'DARKMODE_AUTO', 'DARKMODE_START', 'DARKMODE_END',
  'COMMENTS_USE', 'GISCUS_REPO', 'GISCUS_REPO_ID', 'GISCUS_CATEGORY', 'GISCUS_CATEGORY_ID',
  'GISCUS_LIGHT_THEME', 'GISCUS_DARK_THEME', 'GISCUS_SCRIPT_URL', 'GISCUS_MAPPING',
  'GISCUS_STRICT', 'GISCUS_REACTIONS_ENABLED', 'GISCUS_EMIT_METADATA', 'GISCUS_INPUT_POSITION', 'GISCUS_LANG',
  'SEARCH_ENABLE', 'SEARCH_PLACEHOLDER', 'SEARCH_THRESHOLD', 'SEARCH_DEBOUNCE_MS',
  'SEARCH_MAX_RESULTS', 'SEARCH_MIN_QUERY_LENGTH', 'SEARCH_EXCERPT_LENGTH', 'SEARCH_SHORTCUT_KEYS',
  'PWA_ENABLE', 'PWA_MANIFEST', 'PWA_APPLE_TOUCH_ICON', 'PWA_FAVICON_32', 'PWA_FAVICON_16',
  'OG_ENABLE', 'OG_TWITTER_CARD', 'OG_TWITTER_ID', 'OG_FB_APP_ID',
  'THEME', 'THEME_DEFAULT',
  'MD_HTML', 'MD_LINKIFY', 'MD_TYPOGRAPHER', 'MD_HIGHLIGHT_ENGINE',
  'MD_SHIKI_THEME_LIGHT', 'MD_SHIKI_THEME_DARK', 'MD_MATH_INLINE', 'MD_MATH_BLOCK', 'MD_KATEX_ERROR_COLOR',
  'EDITOR_INDENT_MODE', 'EDITOR_DOWNLOAD_FILENAME', 'EDITOR_DRAFT_PREFIX',
  'ADMIN_MIN_PASSWORD_LENGTH', 'ADMIN_SAVE_REDIRECT_DELAY', 'ADMIN_CHANGE_PW_REDIRECT_DELAY', 'ADMIN_PAGE_SIZE', 'ADMIN_MAX_UNDO',
  'SIDEBAR_RECENT_COUNT', 'FRIEND_LINKS',
  'SOCIAL_GITHUB', 'SOCIAL_WEIBO', 'SOCIAL_TWITTER', 'SOCIAL_RSS', 'SOCIAL_EMAIL',
  'ABOUT_TAGLINE', 'ABOUT_CONTENT_FILE',
  'BASE_PATH', 'SITE_LANGUAGE',
  'CDN',
];

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', config.SITE_URL || '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use((req, res, next) => {
  if (req.path.startsWith(config.BASE_PATH + '/assets')) {
    res.setHeader('Cache-Control', 'no-cache');
    res.removeHeader('ETag');
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

app.use((req, res, next) => {
  res.locals.basePath = config.BASE_PATH;
  res.locals.url = function(p) {
    p = String(p || '');
    if (!p || p.startsWith('http://') || p.startsWith('https://') || p.startsWith('//')) return p;
    return config.BASE_PATH + p;
  };
  res.locals.isStatic = false;
  const safeConfig = {};
  for (const key of SAFE_CONFIG_KEYS) {
    if (config[key] !== undefined) safeConfig[key] = config[key];
  }
  res.locals.config = safeConfig;
  res.locals.locale = config.locale;
  res.locals.cssVersion = cssVersion;
  res.locals.formatDate = function(d) {
    if (!d) return '';
    var dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    var y = dt.getFullYear(), m = String(dt.getMonth()+1).padStart(2,'0'), day = String(dt.getDate()).padStart(2,'0');
    return y + '-' + m + '-' + day;
  };
  next();
});

app.get(`${config.BASE_PATH}/admin`, (req, res) => {
  res.render('admin', { locale: config.locale });
});

app.get(`${config.BASE_PATH}/editor`, (req, res) => {
  res.redirect(`${config.BASE_PATH}/editor/markdown`);
});

app.get(`${config.BASE_PATH}/editor/markdown`, (req, res) => {
  res.render('editor', { locale: config.locale, editorMode: 'markdown' });
});

app.get(`${config.BASE_PATH}/editor/typst`, (req, res) => {
  res.render('editor', { locale: config.locale, editorMode: 'typst' });
});

app.get(`${config.BASE_PATH}/typst-packages/*`, (req, res) => {
  const pkgPath = req.params[0];
  const targetUrl = `https://packages.typst.org/preview/${pkgPath}`;
  const https = require('https');
  const proxyReq = https.get(targetUrl, { headers: { 'User-Agent': 'typst-editor/1.0' } }, (proxyRes) => {
    res.status(proxyRes.statusCode);
    res.set('Content-Type', proxyRes.headers['content-type'] || 'application/octet-stream');
    res.set('Content-Length', proxyRes.headers['content-length'] || '');
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (e) => {
    console.error('Typst package proxy error:', e.message);
    res.status(502).json({ error: 'Failed to fetch package from packages.typst.org' });
  });
  proxyReq.setTimeout(30000, () => {
    proxyReq.destroy();
    res.status(504).json({ error: 'Package fetch timeout' });
  });
});

app.use(config.BASE_PATH, postsRouter);

app.listen(PORT, () => {
  console.log(`博客已启动，访问地址: http://localhost:${PORT}${config.BASE_PATH}`);
});