-- 在 Supabase SQL Editor 中执行此脚本

CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  cover TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
