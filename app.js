const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const postsRouter = require('./routes/posts');
const { BASE_PATH } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(BASE_PATH, express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.use((req, res, next) => {
  res.locals.basePath = BASE_PATH;
  res.locals.isStatic = false;
  next();
});

app.get(`${BASE_PATH}/admin`, (req, res) => {
  res.render('admin');
});

app.get(`${BASE_PATH}/editor`, (req, res) => {
  res.render('editor');
});

app.use(BASE_PATH, postsRouter);

app.listen(PORT, () => {
  console.log(`博客已启动，访问地址: http://localhost:${PORT}${BASE_PATH}`);
});