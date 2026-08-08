const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const config = require('../config');
const { getDb } = require('../db');

const BUCKET = 'blog-images';
const FOLDER = 'uploads';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MIME_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'image/svg+xml', 'image/avif', 'image/bmp',
  'image/x-icon', 'image/vnd.microsoft.icon',
]);
const EXTENSIONS = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif',
  'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/avif': '.avif',
  'image/bmp': '.bmp', 'image/x-icon': '.ico', 'image/vnd.microsoft.icon': '.ico',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 10 },
  fileFilter: (req, file, cb) => {
    if (MIME_TYPES.has(file.mimetype)) return cb(null, true);
    cb(new Error('仅支持图片文件（PNG/JPG/GIF/WebP/SVG/AVIF/BMP/ICO）'));
  },
});

function getAdminClient() {
  const key = config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY;
  if (!config.SUPABASE_URL || !key) return null;
  return require('@supabase/supabase-js').createClient(config.SUPABASE_URL, key);
}

async function ensureBucket(sb) {
  const { data: buckets } = await sb.storage.listBuckets();
  if ((buckets || []).some(b => b.name === BUCKET)) return;
  const { error } = await sb.storage.createBucket(BUCKET, {
    public: true,
    file_size_limit: MAX_IMAGE_SIZE,
    allowed_mime_types: [...MIME_TYPES],
  });
  if (error) throw error;
}

async function authCheck(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Supabase 未配置' });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data || !data.user) return res.status(403).json({ error: 'Invalid credentials' });
  req.user = data.user;
  next();
}

async function uploadBuffer(file) {
  const sb = getAdminClient();
  const name = crypto.randomBytes(8).toString('hex') + EXTENSIONS[file.mimetype];
  const objectPath = FOLDER + '/' + name;
  const { error } = await sb.storage.from(BUCKET).upload(objectPath, file.buffer, {
    contentType: file.mimetype,
    cacheControl: '3600',
  });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(objectPath);
  return { name, url: data.publicUrl, size: file.size, mime: file.mimetype };
}

router.post('/api/admin/images', authCheck, upload.array('images', 10), async (req, res) => {
  try {
    const sb = getAdminClient();
    if (!sb) return res.status(500).json({ error: 'Supabase 未配置' });
    await ensureBucket(sb);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有选择图片文件' });
    }
    const images = [];
    for (const f of req.files) {
      images.push(await uploadBuffer(f));
    }
    res.json({ success: true, images });
  } catch (e) {
    if (e.message && e.message.includes('仅支持图片')) {
      return res.status(400).json({ error: e.message });
    }
    console.error('[图床上传失败]', e.message);
    res.status(500).json({ error: '上传失败: ' + e.message });
  }
});

router.get('/api/admin/images', authCheck, async (req, res) => {
  try {
    const sb = getAdminClient();
    if (!sb) return res.status(500).json({ error: 'Supabase 未配置' });
    await ensureBucket(sb);
    const { data: items, error } = await sb.storage.from(BUCKET).list(FOLDER, {
      limit: 500,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) throw error;
    const images = (items || []).map(item => {
      const path = FOLDER + '/' + item.name;
      const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
      return {
        name: item.name,
        url: data.publicUrl,
        size: item.metadata && item.metadata.size ? item.metadata.size : 0,
        created_at: item.created_at || '',
      };
    });
    res.json({ success: true, images });
  } catch (e) {
    console.error('[图床列表失败]', e.message);
    res.status(500).json({ error: '获取图片列表失败' });
  }
});

router.delete('/api/admin/images/:name', authCheck, async (req, res) => {
  try {
    const name = String(req.params.name || '').replace(/^uploads\//, '');
    if (!/^[A-Za-z0-9._-]+$/.test(name)) {
      return res.status(400).json({ error: '非法文件名' });
    }
    const sb = getAdminClient();
    if (!sb) return res.status(500).json({ error: 'Supabase 未配置' });
    await ensureBucket(sb);
    const { error } = await sb.storage.from(BUCKET).remove([FOLDER + '/' + name]);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('[图床删除失败]', e.message);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;