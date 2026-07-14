const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

let supabase = null;
let supabaseAdmin = null;

function getDb() {
  if (!supabase) {
    supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  }
  return supabase;
}

function getAdminDb() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);
  }
  return supabaseAdmin;
}

const table = () => config.DB_TABLE;

function rowToPost(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags || [],
    cover: row.cover || '',
    category: row.category || '',
    word_count: row.word_count || 0,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function getAllTags() {
  const db = getDb();
  const { data } = await db.from(table()).select('tags');
  const allTags = new Set();
  if (data) {
    for (const row of data) {
      if (row.tags && Array.isArray(row.tags)) {
        row.tags.forEach(t => { if (t) allTags.add(t); });
      }
    }
  }
  return [...allTags];
}

async function getPostsPage(page = 1, tag = '', pageSize = 5, cat = '') {
  const db = getDb();
  let query = db.from(table()).select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (tag) {
    query = query.contains('tags', [tag]);
  }
  if (cat) {
    const prefix = cat + '/';
    query = query.or(`category.eq.${cat},category.like.${prefix}%`);
  }
  const offset = (page - 1) * pageSize;
  const { data, count } = await query.range(offset, offset + pageSize - 1);
  return { posts: (data || []).map(rowToPost), total: count || 0 };
}

async function getAllPosts() {
  const db = getDb();
  const { data } = await db.from(table()).select('*').order('created_at', { ascending: false });
  return (data || []).map(rowToPost);
}

async function getPost(id) {
  const db = getDb();
  const { data } = await db.from(table()).select('*').eq('id', id).single();
  return data ? rowToPost(data) : null;
}

async function getAdjacentPosts(id) {
  const db = getDb();
  const { data: allPosts } = await db.from(table()).select('id, title').order('created_at', { ascending: false });
  if (!allPosts || allPosts.length === 0) return { prev: null, next: null };
  const idx = allPosts.findIndex(p => p.id === id);
  return {
    prev: idx > 0 ? allPosts[idx - 1] : null,
    next: idx < allPosts.length - 1 ? allPosts[idx + 1] : null
  };
}

async function createPost({ title, content, tags, cover, category }) {
  const db = getAdminDb();
  const tagsArr = tags ? tags.split(',').filter(Boolean).map(t => t.trim()) : [];
  const { data } = await db.from(table()).insert({
    title, content, tags: tagsArr, cover: cover || '', category: category || '', word_count: (content || '').length
  }).select('id').single();
  return data?.id;
}

async function updatePost(id, { title, content, tags, cover, category }) {
  const db = getAdminDb();
  const tagsArr = tags ? tags.split(',').filter(Boolean).map(t => t.trim()) : [];
  await db.from(table()).update({
    title, content, tags: tagsArr, cover: cover || '', category: category || '',
    word_count: (content || '').length,
    updated_at: new Date().toISOString()
  }).eq('id', id);
}

async function deletePost(id) {
  const db = getAdminDb();
  await db.from(table()).delete().eq('id', id);
}

async function getPostCount() {
  const db = getDb();
  const { count } = await db.from(table()).select('*', { count: 'exact', head: true });
  return count || 0;
}

async function getAllCategories() {
  const db = getDb();
  const { data } = await db.from(table()).select('category');
  const catMap = {};
  if (data) {
    for (const row of data) {
      if (row.category) {
        catMap[row.category] = (catMap[row.category] || 0) + 1;
      }
    }
  }
  return Object.entries(catMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

async function getCategoryTree() {
  const db = getDb();
  const { data } = await db.from(table()).select('category');
  const root = {};
  if (data) {
    for (const row of data) {
      if (row.category) {
        const parts = row.category.split('/').map(s => s.trim()).filter(Boolean);
        let node = root;
        for (const part of parts) {
          if (!node[part]) node[part] = { _count: 0, _children: {} };
          node[part]._count++;
          node = node[part]._children;
        }
      }
    }
  }
  const result = [];
  function flatten(obj, level, prefix) {
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      const item = obj[key];
      const path = prefix ? prefix + '/' + key : key;
      result.push({ name: key, count: item._count, level, path, children: [] });
      const childKeys = Object.keys(item._children);
      if (childKeys.length > 0) {
        flatten(item._children, level + 1, path);
      }
    }
  }
  flatten(root, 0, '');
  return result;
}

async function getArchives() {
  const db = getDb();
  const { data } = await db.from(table()).select('created_at, title, id').order('created_at', { ascending: false });
  const months = {};
  if (data) {
    for (const row of data) {
      const d = new Date(row.created_at);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (!months[key]) months[key] = { year: d.getFullYear(), month: d.getMonth() + 1, label: `${d.getFullYear()}年${d.getMonth() + 1}月`, count: 0, posts: [] };
      months[key].count++;
      months[key].posts.push({ id: row.id, title: row.title, created_at: row.created_at });
    }
  }
  return Object.values(months).sort((a, b) => b.year - a.year || b.month - a.month);
}

async function getRecentPosts(limit = 5) {
  const db = getDb();
  const { data } = await db.from(table()).select('id, title, cover, created_at').order('created_at', { ascending: false }).limit(limit);
  return (data || []).map(r => ({ id: r.id, title: r.title, cover: r.cover || '', created_at: r.created_at }));
}

async function getTotalWordCount() {
  const db = getDb();
  const { data } = await db.from(table()).select('content');
  let total = 0;
  if (data) {
    for (const row of data) {
      total += (row.content || '').length;
    }
  }
  return total;
}

module.exports = { getDb, getAllTags, getPostsPage, getAllPosts, getPost, getAdjacentPosts, createPost, updatePost, deletePost, getPostCount, getAllCategories, getCategoryTree, getArchives, getRecentPosts, getTotalWordCount, rowToPost };