const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

let supabase = null;
let supabaseAdmin = null;

const isConfigured = !!(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);

if (!isConfigured) {
  console.warn('[db] SUPABASE_URL 或 SUPABASE_ANON_KEY 未配置，数据库功能不可用');
}

function getDb() {
  if (!isConfigured) return null;
  if (!supabase) {
    supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  }
  return supabase;
}

function getAdminDb() {
  if (!isConfigured) return null;
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);
  }
  return supabaseAdmin;
}

const table = () => config.DB_TABLE;
const statsTable = () => config.DB_STATS_TABLE;
const tagsTable = () => config.DB_TAGS_TABLE;
const categoriesTable = () => config.DB_CATEGORIES_TABLE;

function rowToPost(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags || [],
    cover: row.cover || '',
    category: row.category || '',
    word_count: row.word_count || 0,
    published: row.published !== undefined ? row.published : true,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function onlyPublished(arr) {
  return (arr || []).filter(p => p.published !== false);
}

async function getAllTags() {
  const db = getDb();
  if (!db) return [];
  const { data } = await db.from(table()).select('tags, published');
  const allTags = new Set();
  if (data) {
    for (const row of data) {
      if (row.tags && Array.isArray(row.tags) && row.published !== false) {
        row.tags.forEach(t => { if (t) allTags.add(t); });
      }
    }
  }
  return [...allTags];
}

async function getPostsPage(page = 1, tag = '', pageSize = 5, cat = '') {
  const db = getDb();
  if (!db) return { posts: [], total: 0 };
  let query = db.from(table()).select('*', { count: 'exact' }).eq('published', true).order('created_at', { ascending: false });
  if (tag) {
    query = query.contains('tags', [tag]);
  }
  if (cat) {
    const prefix = cat + '/';
    query = query.or(`category.eq.${cat},category.like.${prefix}%`);
  }
  const offset = (page - 1) * pageSize;
  const { data, count } = await query.range(offset, offset + pageSize - 1);
  const posts = (data || []).map(rowToPost);
  return { posts, total: count || 0 };
}

async function getAllPosts() {
  const db = getDb();
  if (!db) return [];
  const { data } = await db.from(table()).select('*').order('created_at', { ascending: false });
  return onlyPublished((data || []).map(rowToPost));
}

async function getAllPostsAdmin() {
  const db = getDb();
  if (!db) return [];
  const { data } = await db.from(table()).select('*').order('created_at', { ascending: false });
  return (data || []).map(rowToPost);
}

async function getPost(id) {
  const db = getDb();
  if (!db) return null;
  const { data } = await db.from(table()).select('*').eq('id', id).single();
  const p = data ? rowToPost(data) : null;
  return (p && p.published !== false) ? p : null;
}

async function getPostAdmin(id) {
  const db = getDb();
  if (!db) return null;
  const { data } = await db.from(table()).select('*').eq('id', id).single();
  return data ? rowToPost(data) : null;
}

async function getAdjacentPosts(id) {
  const db = getDb();
  if (!db) return { prev: null, next: null };
  const { data: current } = await db.from(table()).select('created_at, published').eq('id', id).single();
  if (!current || current.published === false) return { prev: null, next: null };

  const { data: prevData } = await db.from(table())
    .select('id, title, created_at')
    .eq('published', true)
    .gt('created_at', current.created_at)
    .order('created_at', { ascending: true })
    .limit(1);

  const { data: nextData } = await db.from(table())
    .select('id, title, created_at')
    .eq('published', true)
    .lt('created_at', current.created_at)
    .order('created_at', { ascending: false })
    .limit(1);

  return {
    prev: prevData && prevData.length > 0 ? prevData[0] : null,
    next: nextData && nextData.length > 0 ? nextData[0] : null
  };
}

async function createPost({ title, content, tags, cover, category, published }) {
  const db = getAdminDb();
  if (!db) throw new Error('数据库未配置');
  const tagsArr = tags ? tags.split(',').filter(Boolean).map(t => t.trim()) : [];
  const { data } = await db.from(table()).insert({
    title, content, tags: tagsArr, cover: cover || '', category: category || '',
    word_count: (content || '').length,
    published: published !== undefined ? published : true
  }).select('id').single();
  return data?.id;
}

async function updatePost(id, { title, content, tags, cover, category, published }) {
  const db = getAdminDb();
  if (!db) throw new Error('数据库未配置');
  const tagsArr = tags ? tags.split(',').filter(Boolean).map(t => t.trim()) : [];
  const updates = {
    title, content, tags: tagsArr, cover: cover || '', category: category || '',
    word_count: (content || '').length,
    updated_at: new Date().toISOString()
  };
  if (published !== undefined) updates.published = published;
  await db.from(table()).update(updates).eq('id', id);
}

async function deletePost(id) {
  const db = getAdminDb();
  if (!db) throw new Error('数据库未配置');
  await db.from(table()).delete().eq('id', id);
}

async function getPostCount() {
  const db = getDb();
  if (!db) return 0;
  const { count } = await db.from(table()).select('id', { count: 'exact', head: true }).eq('published', true);
  return count || 0;
}

async function getAllCategories() {
  const db = getDb();
  if (!db) return [];
  const { data } = await db.from(table()).select('category, published');
  const catMap = {};
  if (data) {
    for (const row of data) {
      if (row.category && row.published !== false) {
        catMap[row.category] = (catMap[row.category] || 0) + 1;
      }
    }
  }
  return Object.entries(catMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

async function getCategoryTree() {
  const db = getDb();
  if (!db) return [];
  const { data } = await db.from(table()).select('category, published');
  const root = {};
  if (data) {
    for (const row of data) {
      if (row.category && row.published !== false) {
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
  if (!db) return [];
  const { data } = await db.from(table()).select('id, title, created_at, published').order('created_at', { ascending: false });
  const months = {};
  if (data) {
    for (const row of data) {
      if (row.published === false) continue;
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
  if (!db) return [];
  const { data } = await db.from(table()).select('id, title, cover, created_at, published').order('created_at', { ascending: false });
  const all = (data || []).filter(r => r.published !== false).slice(0, limit);
  return all.map(r => ({ id: r.id, title: r.title, cover: r.cover || '', created_at: r.created_at }));
}

async function getTotalWordCount() {
  const db = getDb();
  if (!db) return 0;
  const { data } = await db.from(table()).select('word_count, published');
  let total = 0;
  if (data) {
    for (const row of data) {
      if (row.published !== false) total += (row.word_count || 0);
    }
  }
  return total;
}

async function getSiteStats() {
  const db = getDb();
  if (!db) return { visitor_count: 0, total_views: 0 };
  const { data } = await db.from(statsTable()).select('key, value');
  const stats = { visitor_count: 0, total_views: 0 };
  if (data) {
    for (const row of data) {
      stats[row.key] = row.value;
    }
  }
  return stats;
}

async function incrementVisitorCount() {
  const db = getAdminDb();
  if (!db) throw new Error('数据库未配置');
  const { data } = await db.from(statsTable()).select('value').eq('key', 'visitor_count').single();
  const newValue = (data?.value || 0) + 1;
  await db.from(statsTable()).upsert({ key: 'visitor_count', value: newValue, updated_at: new Date().toISOString() });
  return newValue;
}

async function incrementViewCount(postId) {
  const db = getAdminDb();
  if (!db) throw new Error('数据库未配置');
  const { data } = await db.from(statsTable()).select('value').eq('key', 'total_views').single();
  const newValue = (data?.value || 0) + 1;
  await db.from(statsTable()).upsert({ key: 'total_views', value: newValue, updated_at: new Date().toISOString() });
  return newValue;
}

async function getLastPostUpdateTime() {
  const db = getDb();
  if (!db) return null;
  const { data } = await db.from(table()).select('updated_at, published').order('updated_at', { ascending: false });
  if (data) {
    const published = data.filter(r => r.published !== false);
    if (published.length > 0) return published[0].updated_at;
  }
  return null;
}

// ============ Managed Tags ============

async function getManagedTags() {
  const db = getAdminDb();
  if (!db) return [];
  const { data: tags, error: tagError } = await db.from(tagsTable()).select('*').order('name');
  if (tagError) return [];

  const { data: posts } = await db.from(table()).select('tags');
  const countMap = {};
  if (posts) {
    for (const row of posts) {
      if (row.tags && Array.isArray(row.tags)) {
        for (const t of row.tags) {
          if (t) countMap[t] = (countMap[t] || 0) + 1;
        }
      }
    }
  }
  return (tags || []).map(t => ({ ...t, post_count: countMap[t.name] || 0 }));
}

async function createManagedTag(name) {
  const db = getAdminDb();
  if (!db) throw new Error('数据库未配置');
  const { data, error } = await db.from(tagsTable()).insert({ name: name.trim() }).select().single();
  if (error) throw error;
  return data;
}

async function deleteManagedTag(id) {
  const db = getAdminDb();
  if (!db) throw new Error('数据库未配置');
  const { error } = await db.from(tagsTable()).delete().eq('id', id);
  if (error) throw error;
}

async function renameManagedTag(id, name) {
  const db = getAdminDb();
  if (!db) throw new Error('数据库未配置');
  const { error } = await db.from(tagsTable()).update({ name: name.trim() }).eq('id', id);
  if (error) throw error;
}

// ============ Managed Categories ============

async function getManagedCategories() {
  const db = getAdminDb();
  if (!db) return [];
  const { data: cats, error: catError } = await db.from(categoriesTable()).select('*').order('sort_order');
  if (catError) return [];

  const { data: posts } = await db.from(table()).select('category');
  const countMap = {};
  if (posts) {
    for (const row of posts) {
      if (row.category) {
        countMap[row.category] = (countMap[row.category] || 0) + 1;
      }
    }
  }

  const catList = (cats || []).map(c => ({
    ...c,
    post_count: countMap[c.path || c.name] || 0
  }));

  const tree = buildCategoryTree(catList);

  function aggregateCounts(nodes) {
    for (const node of nodes) {
      if (node.children && node.children.length) {
        aggregateCounts(node.children);
        for (const child of node.children) {
          node.post_count += child.post_count;
        }
      }
    }
  }
  aggregateCounts(tree);

  return tree;
}

function buildCategoryTree(catList) {
  const map = {};
  const roots = [];
  for (const cat of catList) {
    cat.children = [];
    map[cat.id] = cat;
  }
  for (const cat of catList) {
    if (cat.parent_id && map[cat.parent_id]) {
      map[cat.parent_id].children.push(cat);
    } else {
      roots.push(cat);
    }
  }
  return roots;
}

async function createManagedCategory(name, parentId) {
  const db = getAdminDb();
  if (!db) throw new Error('数据库未配置');
  let path = name.trim();
  if (parentId) {
    const { data: parent } = await db.from(categoriesTable()).select('path').eq('id', parentId).single();
    if (parent && parent.path) {
      path = parent.path + '/' + name.trim();
    }
  }
  const { data, error } = await db.from(categoriesTable()).insert({
    name: name.trim(),
    parent_id: parentId || null,
    path
  }).select().single();
  if (error) throw error;
  return data;
}

async function deleteManagedCategory(id) {
  const db = getAdminDb();
  if (!db) throw new Error('数据库未配置');
  const { error } = await db.from(categoriesTable()).delete().eq('id', id);
  if (error) throw error;
}

async function renameManagedCategory(id, name) {
  const db = getAdminDb();
  if (!db) throw new Error('数据库未配置');
  const { data: cat } = await db.from(categoriesTable()).select('*').eq('id', id).single();
  if (!cat) throw new Error('分类不存在');
  let newPath = name.trim();
  if (cat.parent_id) {
    const { data: parent } = await db.from(categoriesTable()).select('path').eq('id', cat.parent_id).single();
    if (parent && parent.path) {
      newPath = parent.path + '/' + name.trim();
    }
  }
  const { error } = await db.from(categoriesTable()).update({ name: name.trim(), path: newPath }).eq('id', id);
  if (error) throw error;

  const { data: children } = await db.from(categoriesTable()).select('id, path').filter('path', 'like', cat.path + '/%');
  if (children) {
    for (const child of children) {
      const childNewPath = child.path.replace(cat.path, newPath);
      await db.from(categoriesTable()).update({ path: childNewPath }).eq('id', child.id);
    }
  }
}

async function moveManagedCategory(id, newParentId) {
  const db = getAdminDb();
  if (!db) throw new Error('数据库未配置');
  const { data: cat } = await db.from(categoriesTable()).select('*').eq('id', id).single();
  if (!cat) throw new Error('分类不存在');
  let newPath = cat.name.trim();
  if (newParentId) {
    const { data: parent } = await db.from(categoriesTable()).select('path').eq('id', newParentId).single();
    if (parent && parent.path) {
      newPath = parent.path + '/' + cat.name.trim();
    }
  }
  const { error } = await db.from(categoriesTable()).update({ parent_id: newParentId || null, path: newPath }).eq('id', id);
  if (error) throw error;
  const { data: children } = await db.from(categoriesTable()).select('id, path').filter('path', 'like', cat.path + '/%');
  if (children) {
    for (const child of children) {
      const childNewPath = child.path.replace(cat.path, newPath);
      await db.from(categoriesTable()).update({ path: childNewPath }).eq('id', child.id);
    }
  }
}

async function getManagedCategoriesFlat() {
  const db = getAdminDb();
  if (!db) return [];
  const { data } = await db.from(categoriesTable()).select('*').order('path');
  return data || [];
}

module.exports = { getDb, getAdminDb, getAllTags, getPostsPage, getAllPosts, getAllPostsAdmin, getPost, getPostAdmin, getAdjacentPosts, createPost, updatePost, deletePost, getPostCount, getAllCategories, getCategoryTree, getArchives, getRecentPosts, getTotalWordCount, getSiteStats, incrementVisitorCount, incrementViewCount, getLastPostUpdateTime, rowToPost, onlyPublished, getManagedTags, createManagedTag, deleteManagedTag, renameManagedTag, getManagedCategories, createManagedCategory, deleteManagedCategory, renameManagedCategory, moveManagedCategory, getManagedCategoriesFlat };
