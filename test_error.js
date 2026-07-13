async function main() {
  const { initDb, getDb } = require('./db');
  const { render, excerpt } = require('./markdown');

  await initDb();
  const db = getDb();

  // Test markdown rendering
  try {
    const html = await render('# Hello\n```javascript\nconst x = 1;\n```');
    console.log('Render OK');
    console.log(html.substring(0, 300));
  } catch (e) {
    console.error('Render FAIL:', e.message);
    console.error(e.stack);
  }

  // Test database query
  try {
    const result = db.exec('SELECT * FROM posts LIMIT 1');
    if (result[0] && result[0].values.length > 0) {
      const row = result[0].values[0];
      console.log('DB OK, post title:', row[1]);
      const contentHtml = await render(row[2]);
      console.log('Post render OK, length:', contentHtml.length);
    } else {
      console.log('DB OK, no posts');
    }
  } catch (e) {
    console.error('DB FAIL:', e.message);
  }
}
main();
