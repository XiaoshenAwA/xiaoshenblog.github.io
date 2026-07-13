const BASE_PATH = process.env.BASE_PATH || '';
const IS_STATIC = process.env.STATIC_BUILD === 'true';
const PAGE_SIZE = 5;

module.exports = { BASE_PATH, IS_STATIC, PAGE_SIZE };
