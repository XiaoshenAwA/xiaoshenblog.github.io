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

async function getPostsPage(page = 1, tag = '', pageSize = 5) {
  const db = getDb();
  let query = db.from(table()).select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (tag) {
    query = query.contains('tags', [tag]);
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

async function createPost({ title, content, tags, cover }) {
  const db = getAdminDb();
  const tagsArr = tags ? tags.split(',').filter(Boolean).map(t => t.trim()) : [];
  const { data } = await db.from(table()).insert({
    title, content, tags: tagsArr, cover: cover || ''
  }).select('id').single();
  return data?.id;
}

async function updatePost(id, { title, content, tags, cover }) {
  const db = getAdminDb();
  const tagsArr = tags ? tags.split(',').filter(Boolean).map(t => t.trim()) : [];
  await db.from(table()).update({
    title, content, tags: tagsArr, cover: cover || '',
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

module.exports = { getDb, getAllTags, getPostsPage, getAllPosts, getPost, getAdjacentPosts, createPost, updatePost, deletePost, getPostCount, rowToPost };