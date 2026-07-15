const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const configPath = path.join(__dirname, 'config.yml');
let cfg = {};
try {
  cfg = yaml.load(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error('无法加载 config.yml，使用默认值:', e.message);
}

// 环境变量覆盖（环境变量优先于 config.yml）
function env(key, fallback) {
  return process.env[key] !== undefined ? process.env[key] : fallback;
}

const config = {
  // 服务端
  PORT: parseInt(env('PORT', cfg.server?.port ?? 3000), 10),

  // 站点
  SITE_LANGUAGE: cfg.site?.language ?? 'zh-CN',

  // 数据库
  SUPABASE_URL: env('SUPABASE_URL', cfg.database?.url ?? ''),
  SUPABASE_ANON_KEY: env('SUPABASE_ANON_KEY', cfg.database?.anon_key ?? ''),
  SUPABASE_SERVICE_KEY: env('SUPABASE_SERVICE_KEY', cfg.database?.service_key ?? ''),
  DB_TABLE: cfg.database?.table ?? 'posts',

  // 部署
  BASE_PATH: env('BASE_PATH', cfg.deploy?.base_path ?? ''),
  STATIC_BASE_PATH: cfg.deploy?.static_base_path ?? '/xiaoshenblog.github.io',
  DEPLOY_HOOK_URL: env('DEPLOY_HOOK_URL', cfg.deploy?.deploy_hook_url ?? ''),
  DEPLOY_BRANCH: cfg.deploy?.github_pages?.branch ?? 'gh-pages',
  IS_STATIC: env('STATIC_BUILD') === 'true',

  // 博客信息
  BLOG_NAME: cfg.blog?.name ?? 'MyBlog',
  BLOG_SUBTITLE: cfg.blog?.subtitle ?? '记录生活，分享思考',
  BLOG_AUTHOR: cfg.blog?.author ?? '博主',
  BLOG_AUTHOR_BIO: cfg.blog?.author_bio ?? '热爱技术，享受生活',
  PAGE_SIZE: cfg.blog?.page_size ?? 5,
  EXCERPT_LENGTH: cfg.blog?.excerpt_length ?? 200,
  READING_SPEED: cfg.blog?.reading_speed ?? 500,

  // 导航
  NAV: cfg.nav ?? {},
  NAV_LOGO: cfg.nav?.logo ?? '',
  NAV_DISPLAY_TITLE: cfg.nav?.display_title !== false,
  NAV_FIXED: cfg.nav?.fixed === true,
  NAV_MENU: cfg.nav?.menu ?? [],

  // 图片
  IMAGES: cfg.images ?? {},
  FAVICON: cfg.images?.favicon ?? '/img/favicon.png',
  AVATAR_IMG: cfg.images?.avatar?.img ?? '',
  AVATAR_EFFECT: cfg.images?.avatar?.effect === true,
  DEFAULT_COVER: cfg.images?.default_cover ?? '',
  DISABLE_TOP_IMG: cfg.images?.disable_top_img === true,
  DEFAULT_TOP_IMG: cfg.images?.default_top_img ?? '',
  INDEX_IMG: cfg.images?.index_img ?? '',

  // 代码块
  CODE_BLOCKS: cfg.code_blocks ?? {},
  CB_MACSTYLE: cfg.code_blocks?.macStyle !== false,
  CB_HEIGHT_LIMIT: cfg.code_blocks?.height_limit ?? false,
  CB_WORD_WRAP: cfg.code_blocks?.word_wrap === true,
  CB_SHRINK: cfg.code_blocks?.shrink === true,
  CB_FULLPAGE: cfg.code_blocks?.fullpage === true,
  CB_COPY: cfg.code_blocks?.copy !== false,
  CB_LANGUAGE: cfg.code_blocks?.language !== false,

  // 页脚
  FOOTER: cfg.footer ?? {},
  FOOTER_OWNER_ENABLE: cfg.footer?.owner?.enable !== false,
  FOOTER_OWNER_SINCE: cfg.footer?.owner?.since ?? 2026,
  FOOTER_COPYRIGHT: cfg.footer?.copyright !== false,
  FOOTER_CUSTOM_TEXT: cfg.footer?.custom_text ?? '',

  // 字体
  FONT: cfg.font ?? {},
  FONT_GLOBAL_SIZE: cfg.font?.global_font_size ?? '',
  FONT_CODE_SIZE: cfg.font?.code_font_size ?? '',
  FONT_BODY: cfg.theme?.fonts?.body ?? "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  FONT_CODE: cfg.theme?.fonts?.code ?? "'Fira Code', monospace",

  // 美化
  BEAUTIFY: cfg.beautify ?? {},
  ROUNDED_CORNERS: cfg.beautify?.rounded_corners_ui !== false,
  PRELOADER_ENABLE: cfg.beautify?.preloader?.enable === true,

  // 文章元信息
  POST_META: cfg.post_meta ?? {},

  // 首页布局
  INDEX_CONFIG: cfg.index ?? {},
  INDEX_LAYOUT: cfg.index?.layout ?? 1,
  INDEX_EXCERPT_METHOD: cfg.index?.excerpt?.method ?? 3,
  INDEX_EXCERPT_LENGTH: cfg.index?.excerpt?.length ?? 200,
  INDEX_SUBTITLE_ENABLE: cfg.index?.subtitle?.enable === true,
  INDEX_SUBTITLE_EFFECT: cfg.index?.subtitle?.effect === true,
  INDEX_SUBTITLE_SUB: cfg.index?.subtitle?.sub ?? [],
  INDEX_SUBTITLE_TYPE_SPEED: cfg.index?.subtitle?.type_speed ?? 80,
  INDEX_SUBTITLE_BACK_SPEED: cfg.index?.subtitle?.back_speed ?? 40,
  INDEX_SUBTITLE_PAUSE_TIME: cfg.index?.subtitle?.pause_time ?? 2000,

  // 目录
  TOC_POST: cfg.toc?.post !== false,
  TOC_NUMBER: cfg.toc?.number !== false,
  TOC_EXPAND: cfg.toc?.expand === true,
  TOC_STYLE_SIMPLE: cfg.toc?.style_simple === true,

  // 侧边栏
  ASIDE_ENABLE: cfg.aside?.enable !== false,
  ASIDE_MOBILE: cfg.aside?.mobile !== false,
  ASIDE_POSITION: cfg.aside?.position ?? 'right',
  ASIDE_CARD_AUTHOR: cfg.aside?.card_author?.enable !== false,
  ASIDE_CARD_ANNOUNCEMENT: cfg.aside?.card_announcement?.enable === true,
  ASIDE_ANNOUNCEMENT_CONTENT: cfg.aside?.card_announcement?.content ?? '',
  ASIDE_CARD_RECENT_POST: cfg.aside?.card_recent_post?.enable === true,
  ASIDE_RECENT_POST_LIMIT: cfg.aside?.card_recent_post?.limit ?? 5,
  ASIDE_CARD_CATEGORIES: cfg.aside?.card_categories?.enable === true,
  ASIDE_CATEGORIES_LIMIT: cfg.aside?.card_categories?.limit ?? 8,
  ASIDE_CARD_TAGS: cfg.aside?.card_tags?.enable !== false,
  ASIDE_TAGS_LIMIT: cfg.aside?.card_tags?.limit ?? 40,
  ASIDE_TAGS_COLOR: cfg.aside?.card_tags?.color === true,
  ASIDE_TAGS_ORDERBY: cfg.aside?.card_tags?.orderby ?? 'random',
  ASIDE_CARD_ARCHIVES: cfg.aside?.card_archives?.enable === true,
  ASIDE_ARCHIVES_TYPE: cfg.aside?.card_archives?.type ?? 'monthly',
  ASIDE_ARCHIVES_FORMAT: cfg.aside?.card_archives?.format ?? 'MMMM YYYY',
  ASIDE_ARCHIVES_LIMIT: cfg.aside?.card_archives?.limit ?? 8,
  ASIDE_ARCHIVES_ORDER: cfg.aside?.card_archives?.order ?? -1,
  ASIDE_CARD_WEBINFO: cfg.aside?.card_webinfo?.enable !== false,
  ASIDE_WEBINFO_POST_COUNT: cfg.aside?.card_webinfo?.post_count !== false,
  ASIDE_WEBINFO_RUNTIME_DATE: cfg.aside?.card_webinfo?.runtime_date ?? '',

  // 暗色模式
  DARKMODE_ENABLE: cfg.darkmode?.enable !== false,
  DARKMODE_BUTTON: cfg.darkmode?.button !== false,
  DARKMODE_AUTO: cfg.darkmode?.autoChangeMode ?? false,
  DARKMODE_START: cfg.darkmode?.start ?? 18,
  DARKMODE_END: cfg.darkmode?.end ?? 6,

  // 评论
  COMMENTS_USE: cfg.comments?.use ?? '',
  GISCUS_REPO: cfg.comments?.giscus?.repo ?? '',
  GISCUS_REPO_ID: cfg.comments?.giscus?.repo_id ?? '',
  GISCUS_CATEGORY: cfg.comments?.giscus?.category ?? '',
  GISCUS_CATEGORY_ID: cfg.comments?.giscus?.category_id ?? '',
  GISCUS_LIGHT_THEME: cfg.comments?.giscus?.light_theme ?? 'light',
  GISCUS_DARK_THEME: cfg.comments?.giscus?.dark_theme ?? 'dark',
  GISCUS_SCRIPT_URL: cfg.comments?.giscus?.script_url ?? 'https://giscus.app/client.js',
  GISCUS_MAPPING: cfg.comments?.giscus?.mapping ?? 'pathname',
  GISCUS_STRICT: cfg.comments?.giscus?.strict ?? '0',
  GISCUS_REACTIONS_ENABLED: cfg.comments?.giscus?.reactions_enabled ?? '1',
  GISCUS_EMIT_METADATA: cfg.comments?.giscus?.emit_metadata ?? '0',
  GISCUS_INPUT_POSITION: cfg.comments?.giscus?.input_position ?? 'bottom',
  GISCUS_LANG: cfg.comments?.giscus?.lang ?? '',

  // 搜索
  SEARCH_ENABLE: cfg.search?.enable === true,
  SEARCH_PLACEHOLDER: cfg.search?.placeholder ?? '搜索文章...',
  SEARCH_THRESHOLD: cfg.search?.threshold ?? 0.4,
  SEARCH_DEBOUNCE_MS: cfg.search?.debounce_ms ?? 200,
  SEARCH_MAX_RESULTS: cfg.search?.max_results ?? 20,
  SEARCH_MIN_QUERY_LENGTH: cfg.search?.min_query_length ?? 2,
  SEARCH_EXCERPT_LENGTH: cfg.search?.excerpt_length ?? 120,
  SEARCH_SHORTCUT_KEYS: cfg.search?.shortcut_keys ?? ['Ctrl+K', '/'],

  // PWA
  PWA_ENABLE: cfg.pwa?.enable === true,
  PWA_MANIFEST: cfg.pwa?.manifest ?? '/manifest.json',
  PWA_APPLE_TOUCH_ICON: cfg.pwa?.apple_touch_icon ?? '/img/icon.png',
  PWA_FAVICON_32: cfg.pwa?.favicon_32_32 ?? '/img/favicon-32.png',
  PWA_FAVICON_16: cfg.pwa?.favicon_16_16 ?? '/img/favicon-16.png',

  // Open Graph
  OG_ENABLE: cfg.open_graph?.enable !== false,
  OG_TWITTER_CARD: cfg.open_graph?.twitter_card ?? 'summary_large_image',
  OG_TWITTER_ID: cfg.open_graph?.twitter_id ?? '',
  OG_FB_APP_ID: cfg.open_graph?.fb_app_id ?? '',

  // 主题
  THEME: cfg.theme ?? {},
  THEME_DEFAULT: cfg.theme?.default_theme ?? 'light',

  // Markdown
  MD_HTML: cfg.markdown?.html !== false,
  MD_LINKIFY: cfg.markdown?.linkify !== false,
  MD_TYPOGRAPHER: cfg.markdown?.typographer ?? true,
  MD_HIGHLIGHT_ENGINE: cfg.markdown?.highlight?.engine ?? 'shiki',
  MD_SHIKI_THEME_LIGHT: cfg.markdown?.highlight?.themes?.light ?? 'github-light',
  MD_SHIKI_THEME_DARK: cfg.markdown?.highlight?.themes?.dark ?? 'github-dark',
  MD_MATH_INLINE: cfg.markdown?.math?.inline_delimiter ?? '$',
  MD_MATH_BLOCK: cfg.markdown?.math?.block_delimiter ?? '$$',
  MD_KATEX_ERROR_COLOR: cfg.markdown?.math?.error_color ?? '#cc0000',

  // 编辑器
  EDITOR_INDENT_MODE: cfg.editor?.indent_mode ?? 'tab',
  EDITOR_DOWNLOAD_FILENAME: cfg.editor?.download_filename ?? 'document.md',
  EDITOR_DRAFT_PREFIX: cfg.editor?.draft_prefix ?? 'editor-draft',

  // 后台
  ADMIN_MIN_PASSWORD_LENGTH: cfg.admin?.min_password_length ?? 6,
  ADMIN_SAVE_REDIRECT_DELAY: cfg.admin?.save_redirect_delay ?? 1500,
  ADMIN_CHANGE_PW_REDIRECT_DELAY: cfg.admin?.change_pw_redirect_delay ?? 2000,

  // 侧边栏附属配置
  SIDEBAR_RECENT_COUNT: cfg.aside?.card_recent_post?.limit ?? 5,

  // 友链
  FRIEND_LINKS: cfg.friend_links ?? [],

  // 社交
  SOCIAL_GITHUB: cfg.social?.github ?? '#',
  SOCIAL_WEIBO: cfg.social?.weibo ?? '#',
  SOCIAL_TWITTER: cfg.social?.twitter ?? '#',
  SOCIAL_RSS: cfg.social?.rss ?? '#',
  SOCIAL_EMAIL: cfg.social?.email ?? '#',

  // about
  ABOUT_TAGLINE: cfg.about?.tagline ?? '一名热爱技术的开发者',
  ABOUT_CONTENT_FILE: cfg.about?.content_file ?? 'views/about_content.md',

  // 国际化（保持嵌套结构，不扁平化）
  locale: cfg.locale ?? {},

  // CDN
  CDN: {
    FONT_AWESOME: cfg.cdn?.font_awesome ?? 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css',
    KATEX_CSS: cfg.cdn?.katex_css ?? 'https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.css',
    KATEX_JS: cfg.cdn?.katex_js ?? 'https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.js',
    KATEX_AUTO_RENDER: cfg.cdn?.katex_auto_render ?? 'https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/contrib/auto-render.min.js',
    FUSE_JS: cfg.cdn?.fuse_js ?? 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js',
  },
};

module.exports = config;
