const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const BASE_PATH = process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : '';
const IS_STATIC = process.env.STATIC_BUILD === 'true';
const PAGE_SIZE = 5;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

module.exports = { BASE_PATH, IS_STATIC, PAGE_SIZE, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY };
