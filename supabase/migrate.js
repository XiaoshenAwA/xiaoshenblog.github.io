// 从 SQLite 迁移数据到 Supabase
// 用法: node supabase/migrate.js
// 先确保 Supabase 表已创建 (在 SQL Editor 运行 schema.sql)

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function migrate() {
  // 1. 读取 SQLite
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '..', 'data', 'blog.db');
  if (!fs.existsSync(dbPath)) {
    console.log('没有找到 SQLite 数据库文件');
    return;
  }
  const buffer = fs.readFileSync(dbPath);
  const sqlite = new SQL.Database(buffer);

  const stmt = sqlite.prepare('SELECT * FROM posts ORDER BY id');
  const oldPosts = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    oldPosts.push({
      title: row.title,
      content: row.content,
      tags: row.tags ? row.tags.split(',').filter(Boolean).map(t => t.trim()) : [],
      cover: row.cover || '',
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }
  stmt.free();

  if (oldPosts.length === 0) {
    console.log('SQLite 中没有数据需要迁移');
    return;
  }

  // 2. 写入 Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  for (const post of oldPosts) {
    const { error } = await supabase.from('posts').insert(post);
    if (error) {
      console.error('导入失败:', error.message, post.title);
    } else {
      console.log('  ✔', post.title);
    }
  }

  console.log(`\n迁移完成: ${oldPosts.length} 篇文章导入到 Supabase`);
}

migrate().catch(console.error);
