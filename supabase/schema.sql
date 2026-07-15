-- 在 Supabase SQL Editor 中执行此脚本
-- 如果已有 posts 表，执行以下 ALTER 添加 published 列：
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  cover TEXT DEFAULT '',
  category TEXT DEFAULT '',
  word_count BIGINT DEFAULT 0,
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 网站统计表
CREATE TABLE IF NOT EXISTS site_stats (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入初始统计数据
INSERT INTO site_stats (key, value) VALUES 
  ('visitor_count', 7128),
  ('total_views', 8109)
ON CONFLICT (key) DO NOTHING;

-- 标签管理表
CREATE TABLE IF NOT EXISTS managed_tags (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 分类管理表（支持嵌套）
CREATE TABLE IF NOT EXISTS managed_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id BIGINT REFERENCES managed_categories(id) ON DELETE CASCADE,
  path TEXT NOT NULL DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 允许所有用户读取文章
CREATE POLICY "任何人都可以读取文章" ON posts
  FOR SELECT USING (true);

-- 仅允许经过身份验证的用户写入
CREATE POLICY "仅认证用户可以插入文章" ON posts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "仅认证用户可以更新文章" ON posts
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "仅认证用户可以删除文章" ON posts
  FOR DELETE USING (auth.role() = 'authenticated');

-- managed_tags RLS
ALTER TABLE managed_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "任何人都可以读取标签" ON managed_tags
  FOR SELECT USING (true);

CREATE POLICY "仅认证用户可以插入标签" ON managed_tags
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "仅认证用户可以删除标签" ON managed_tags
  FOR DELETE USING (auth.role() = 'authenticated');

-- managed_categories RLS
ALTER TABLE managed_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "任何人都可以读取分类" ON managed_categories
  FOR SELECT USING (true);

CREATE POLICY "仅认证用户可以插入分类" ON managed_categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "仅认证用户可以更新分类" ON managed_categories
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "仅认证用户可以删除分类" ON managed_categories
  FOR DELETE USING (auth.role() = 'authenticated');
