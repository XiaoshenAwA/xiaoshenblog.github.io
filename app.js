const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const postsRouter = require('./routes/posts');
const config = require('./config');

const app = express();
const PORT = config.PORT;

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