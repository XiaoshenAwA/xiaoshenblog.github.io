const fs = require('fs');
const c = fs.readFileSync('public/assets/admin.js', 'utf8');

// Find cancelTagManage
let idx = c.indexOf('cancelTagManage');
if (idx >= 0) {
  console.log('=== cancelTagManage ===');
  console.log(c.substring(Math.max(0, idx - 300), idx + 300));
}

// Find function X or the view switcher
idx = c.indexOf('tags-explorer-content');
if (idx >= 0) {
  console.log('\n=== tags-explorer-content ===');
  console.log(c.substring(Math.max(0, idx - 300), idx + 500));
}

// Find tag item rendering
idx = c.indexOf('tag-item');
if (idx >= 0) {
  console.log('\n=== tag-item ===');
  console.log(c.substring(Math.max(0, idx - 300), idx + 500));
}
