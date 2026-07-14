const express = require('express');
const path = require('path');
const fs = require('fs');
const methodOverride = require('method-override');
const postsRouter = require('./routes/posts');
const config = require('./config');

const app = express();
const PORT = config.PORT;

let cssVersion = '1';
try {
  cssVersion = fs.statSync(path.join(__dirname, 'public', 'assets', 'main.css')).mtimeMs;
} catch(e) {}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(config.BASE_PATH, express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.use((req, res, next) => {
  res.locals.basePath = config.BASE_PATH;
  res.locals.isStatic = false;
  res.locals.config = config;
  res.locals.cssVersion = cssVersion;
  res.locals.formatDate = function(d) {
    if (!d) return '';
    var dt = new Date(d);
    var y = dt.getFullYear(), m = String(dt.getMonth()+1).padStart(2,'0'), day = String(dt.getDate()).padStart(2,'0');
    return y + '-' + m + '-' + day;
  };
  next();
});

app.get(`${config.BASE_PATH}/admin`, (req, res) => {
  res.render('admin');
});

app.get(`${config.BASE_PATH}/editor`, (req, res) => {
  res.render('editor');
});

app.use(config.BASE_PATH, postsRouter);

app.listen(PORT, () => {
  console.log(`博客已启动，访问地址: http://localhost:${PORT}${config.BASE_PATH}`);
});