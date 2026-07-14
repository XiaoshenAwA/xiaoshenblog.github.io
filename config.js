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

  // 数据库
  SUPABASE_URL: env('SUPABASE_URL', cfg.database?.url ?? ''),
  SUPABASE_ANON_KEY: env('SUPABASE_ANON_KEY', cfg.database?.anon_key ?? ''),
  SUPABASE_SERVICE_KEY: env('SUPABASE_SERVICE_KEY', cfg.database?.service_key ?? ''),
  DB_TABLE: cfg.database?.table ?? 'posts',

  // 部署
  BASE_PATH: env('BASE_PATH', cfg.deploy?.base_path ?? ''),
  STATIC_BASE_PATH: cfg.deploy?.static_base_path ?? '/xiaoshenblog.github.io',
  DEPLOY_HOOK_URL: env('DEPLOY_HOOK_URL', cfg.deploy?.deploy_hook_url ?? ''),
  IS_STATIC: env('STATIC_BUILD') === 'true',

  // 博客信息
  BLOG_NAME: cfg.blog?.name ?? 'MyBlog',
  BLOG_SUBTITLE: cfg.blog?.subtitle ?? '记录生活，分享思考',
  BLOG_AUTHOR: cfg.blog?.author ?? '博主',
  BLOG_AUTHOR_BIO: cfg.blog?.author_bio ?? '热爱技术，享受生活',
  PAGE_SIZE: cfg.blog?.page_size ?? 5,
  EXCERPT_LENGTH: cfg.blog?.excerpt_length ?? 200,
  READING_SPEED: cfg.blog?.reading_speed ?? 500,

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

  // 社交
  SOCIAL_GITHUB: cfg.social?.github ?? '#',
  SOCIAL_WEIBO: cfg.social?.weibo ?? '#',
  SOCIAL_TWITTER: cfg.social?.twitter ?? '#',
  SOCIAL_RSS: cfg.social?.rss ?? '#',
  SOCIAL_EMAIL: cfg.social?.email ?? '#',

  // about
  ABOUT_TAGLINE: cfg.about?.tagline ?? '一名热爱技术的开发者',
  ABOUT_CONTENT_FILE: cfg.about?.content_file ?? 'views/about_content.md',
};

module.exports = config;
