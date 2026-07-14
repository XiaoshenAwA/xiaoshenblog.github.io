const katex = require('katex');
const config = require('./config');

const katexOptions = {
  throwOnError: false,
  errorColor: config.MD_KATEX_ERROR_COLOR,
  strict: false
};

let md = null;
let ready = false;

const langDisplay = {
  vue: 'Vue', vuejs: 'Vue',
  jsx: 'JSX', tsx: 'TSX',
  html: 'HTML', css: 'CSS',
  javascript: 'JavaScript', typescript: 'TypeScript',
  python: 'Python', sql: 'SQL',
  json: 'JSON', yaml: 'YAML',
  markdown: 'Markdown',
  bash: 'Bash', shell: 'Shell', powershell: 'PowerShell',
  xml: 'XML', dockerfile: 'Docker',
  go: 'Go', rust: 'Rust', java: 'Java',
  c: 'C', cpp: 'C++', csharp: 'C#',
  php: 'PHP', ruby: 'Ruby', swift: 'Swift',
  kotlin: 'Kotlin',
  scss: 'SCSS', sass: 'Sass', less: 'Less',
  diff: 'Diff', graphql: 'GraphQL',
  http: 'HTTP', ini: 'INI', toml: 'TOML',
  makefile: 'Makefile', nginx: 'Nginx',
  plaintext: 'Text', text: 'Text',
  latex: 'LaTeX', tex: 'TeX'
};

async function init() {
  if (ready) return;

  const shiki = await import('shiki');
  const { fromHighlighter } = await import('@shikijs/markdown-it/core');
  const {
    transformerMetaHighlight,
    transformerNotationHighlight,
    transformerNotationDiff,
    transformerNotationFocus,
    transformerNotationErrorLevel
  } = await import('@shikijs/transformers');

  const highlighter = await shiki.createHighlighter({
    langs: [
      'javascript', 'typescript', 'html', 'css', 'vue', 'vue-html',
      'python', 'jsx', 'tsx', 'json', 'bash', 'sql', 'markdown',
      'yaml', 'xml', 'shell', 'go', 'rust', 'java', 'c', 'cpp',
      'php', 'ruby', 'swift', 'kotlin', 'scss', 'less', 'diff',
      'dockerfile', 'graphql', 'http', 'ini', 'makefile', 'nginx',
      'plaintext', 'regexp', 'sass', 'toml', 'csharp',
      'r', 'perl', 'lua', 'haskell', 'elixir',
      'clojure', 'powershell', 'latex', 'tex'
    ],
    themes: [config.MD_SHIKI_THEME_LIGHT, config.MD_SHIKI_THEME_DARK]
  });

  const MarkdownIt = require('markdown-it');
  const markdownItMath = (await import('markdown-it-math')).default;
  const markdownItEmoji = (await import('markdown-it-emoji')).full;
  const markdownItMark = require('markdown-it-mark');
  const markdownItInsDel = require('markdown-it-ins-del');
  const { default: markdownItContainer } = await import('markdown-it-container');

  md = new MarkdownIt({
    html: config.MD_HTML,
    linkify: config.MD_LINKIFY,
    typographer: config.MD_TYPOGRAPHER
  });

  md.use(markdownItEmoji);
  md.use(markdownItMark);
  md.use(markdownItInsDel);

  function makeContainer(name, icon, defaultTitle) {
    md.use(markdownItContainer, name, {
      validate: function (params) {
        return params.trim().startsWith(name) || params.trim().match(new RegExp('^' + name + '\\['));
      },
      render: function (tokens, idx) {
        if (tokens[idx].nesting === 1) {
          var title = defaultTitle;
          var info = tokens[idx].info.trim().slice(name.length).trim();
          var optMatch = info.match(/\{([^}]*)\}$/);
          var opts = optMatch ? optMatch[1].trim() : '';
          if (optMatch) info = info.slice(0, optMatch.index).trim();
          var titleMatch = info.match(/^\[([\s\S]*)\]$/);
          if (titleMatch) title = md.renderInline(titleMatch[1]);
          var openAttr = opts === 'open' ? ' open' : '';
          return '<details' + openAttr + ' class="admonition ' + name + '"><summary class="admonition-title">' + icon + ' ' + title + '</summary>\n';
        }
        return '</details>\n';
      }
    });
  }

  function makeAdmonition(name, icon, defaultTitle) {
    var tagStack = [];
    md.use(markdownItContainer, name, {
      validate: function (params) {
        return params.trim() === name || params.trim().match(new RegExp('^' + name + '\\['));
      },
      render: function (tokens, idx) {
        if (tokens[idx].nesting === 1) {
          var info = tokens[idx].info.trim().slice(name.length).trim();
          var title = defaultTitle;
          var openAttr = '';
          var optMatch = info.match(/\{([^}]*)\}$/);
          if (optMatch) {
            if (optMatch[1].trim() === 'open') openAttr = ' open';
            info = info.slice(0, optMatch.index).trim();
          }
          var titleMatch = info.match(/^\[([\s\S]*)\]$/);
          var hasTitle = !!titleMatch;
          if (titleMatch) title = md.renderInline(titleMatch[1]);
          if (hasTitle) {
            tagStack.push('details');
            return '<details' + openAttr + ' class="admonition ' + name + '"><summary class="admonition-title">' + icon + ' ' + title + '</summary>\n';
          }
          tagStack.push('div');
          return '<div class="admonition ' + name + '"><p class="admonition-title">' + icon + ' ' + title + '</p>\n';
        }
        return (tagStack.pop() === 'details' ? '</details>\n' : '</div>\n');
      }
    });
  }

  makeAdmonition('info', '<i class="fas fa-circle-info"></i>', '提示');
  makeAdmonition('success', '<i class="fas fa-circle-check"></i>', '完成');
  makeAdmonition('warning', '<i class="fas fa-triangle-exclamation"></i>', '注意');
  makeAdmonition('error', '<i class="fas fa-circle-xmark"></i>', '错误');
  makeAdmonition('danger', '<i class="fas fa-ban"></i>', '危险');
  makeContainer('details', '<i class="fas fa-chevron-right"></i>', '详情');

  md.use(await fromHighlighter(highlighter, {
    themes: { light: config.MD_SHIKI_THEME_LIGHT, dark: config.MD_SHIKI_THEME_DARK },
    defaultColor: false,
    transformers: [
      transformerMetaHighlight(),
      transformerNotationHighlight(),
      transformerNotationDiff(),
      transformerNotationFocus(),
      transformerNotationErrorLevel()
    ]
  }));

  const originalFence = md.renderer.rules.fence;
  md.renderer.rules.fence = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const fullInfo = token.info.trim();
    const parts = fullInfo.split(/\s+/);
    const lang = parts[0];
    const langName = langDisplay[lang] || (lang ? lang.toUpperCase() : '');

    const html = originalFence.call(this, tokens, idx, options, env, self);

    const preMatch = html.match(/^<pre[^>]*>/);
    if (!preMatch) return html;

    const preTag = preMatch[0];

    const styleMatch = preTag.match(/style="([^"]+)"/);
    const preStyle = styleMatch ? styleMatch[1] : '';

    const classMatch = preTag.match(/class="([^"]*)"/);
    const preClass = classMatch ? classMatch[1] + ' code-wrap' : 'code-wrap';

    const otherAttrs = preTag.replace(/^<pre\s*/i, '').replace(/\s*>$/i, '').replace(/(style|class)="[^"]*"/g, '').trim();

    const afterPre = html.slice(preTag.length);
    const closePre = '</pre>';
    const closeIdx = afterPre.lastIndexOf(closePre);
    const innerCode = closeIdx >= 0 ? afterPre.slice(0, closeIdx) : afterPre;

    const toolsHtml = '<div class="highlight-tools">'
      + '<div class="mac-style">'
      + '<span class="mac-close"></span>'
      + '<span class="mac-minimize"></span>'
      + '<span class="mac-maximize"></span>'
      + '</div>'
      + '<span class="code-lang">' + langName + '</span>'
      + '<i class="copy-btn" title="复制">复制</i>'
      + '</div>';

    return '<figure class="highlight" style="' + preStyle + '">'
      + toolsHtml
      + '<pre class="' + preClass + '"' + (otherAttrs ? ' ' + otherAttrs : '') + '>' + innerCode + '</pre>'
      + '</figure>';
  };

  md.use(markdownItMath, {
    inlineOpen: config.MD_MATH_INLINE,
    inlineClose: config.MD_MATH_INLINE,
    blockOpen: config.MD_MATH_BLOCK,
    blockClose: config.MD_MATH_BLOCK,
    inlineRenderer: (str) => {
      try {
        return katex.renderToString(str, { ...katexOptions, displayMode: false });
      } catch (e) {
        return `<span style="color:#cc0000">[公式错误: ${e.message}]</span>`;
      }
    },
    blockRenderer: (str) => {
      try {
        return katex.renderToString(str, { ...katexOptions, displayMode: true });
      } catch (e) {
        return `<span style="color:#cc0000" class="katex-error katex-display">[公式错误: ${e.message}]</span>`;
      }
    }
  });

  ready = true;
}

async function render(content) {
  await init();
  return md.render(content || '');
}

async function excerpt(content, maxLen = 200) {
  const html = await render(content);
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

module.exports = { render, excerpt, init };
