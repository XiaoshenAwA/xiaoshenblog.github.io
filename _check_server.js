const http = require('http');
const req = http.get('http://localhost:3001/', (res) => {
  console.log('STATUS:', res.statusCode);
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on('error', (e) => {
  console.log('NOT_RUNNING:', e.message);
  process.exit(1);
});
req.setTimeout(5000, () => { console.log('TIMEOUT'); req.destroy(); process.exit(1); });
