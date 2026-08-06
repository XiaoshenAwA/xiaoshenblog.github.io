const katex = require('katex');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const config = require('./config');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const katexOptions = {
  throwOnError: false,
  errorColor: config.MD_KATEX_ERROR_COLOR,
  strict: false
};

let md = null;
let ready = false;
let initPromise = null;

const renderCache = new Map();
const RENDER_CACHE_MAX = 300;

function clearCache() {
  renderCache.clear();
}

const langDisplay = {
  vue: 'Vue', vuejs: 'Vue',
  jsx: 'JSX', tsx: 'TSX',
  html: 'HTML', css: 'CSS',
  javascript: 'JavaScript', typescript: 'TypeScript',
  js: 'JavaScript', ts: 'TypeScript',
  python: 'Python', py: 'Python', sql: 'SQL',
  json: 'JSON', yaml: 'YAML', yml: 'YAML',
  markdown: 'Markdown', md: 'Markdown',
  bash: 'Bash', shell: 'Shell', sh: 'Shell', powershell: 'PowerShell',
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

function breakResetLists(src) {
  const lines = String(src).split('\n');
  const out = [];
  let fence = null;
  let prev = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (fence) {
      out.push(line);
      if (trimmed.startsWith(fence)) fence = null;
      continue;
    }
    if (!trimmed) {
      out.push(line);
      continue;
    }
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      out.push(line);
      fence = fenceMatch[1];
      prev = null;
      continue;
    }
    const qm = trimmed.match(/^((?:>\s*)*)(\S)/);
    const q = qm ? (qm[1].match(/>/g) || []).length : 0;
    const rest = qm ? qm[2] + trimmed.slice(qm[0].length) : trimmed;
    const indent = (rest.match(/^ */) || [''])[0].length;
    if (indent >= 4) {
      out.push(line);
      continue;
    }
    const restTrimmed = rest.trim();
    if (/^[-+*](?:\s|$)/.test(restTrimmed)) {
      out.push(line);
      prev = null;
      continue;
    }
    const m = restTrimmed.match(/^(\d+)([.)])(?=\s)/);
    if (m) {
      const num = parseInt(m[1], 10);
      const delim = m[2];
      if (prev && prev.q === q && prev.indent === indent && prev.delim === delim && num <= prev.num) {
        out.push('');
        out.push('[//]: # ()');
        out.push('');
      }
      prev = { num, indent, delim, q };
      out.push(line);
      continue;
    }
    out.push(line);
    prev = null;
  }
  return out.join('\n');
}

async function init() {
  if (ready) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {

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

  const allTagStacks = [];

  function makeAdmonition(name, defaultTitle) {
    var tagStack = [];
    allTagStacks.push(tagStack);
    md.use(markdownItContainer, name, {
      validate: function (params) {
        return params.trim().startsWith(name) || params.trim().match(new RegExp('^' + name + '\\['));
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
          if (titleMatch) title = md.renderInline(titleMatch[1]);
          tagStack.push('open');
          return '<details' + openAttr + ' class="admonition ' + name + '"><summary class="admonition-title">' + title + '</summary><div class="admonition-content"><div class="admonition-inner">\n';
        }
        return tagStack.pop() === 'open' ? '</div></div></details>\n' : '';
      }
    });
  }

  makeAdmonition('note', '备注');
  makeAdmonition('tip', '技巧');
  makeAdmonition('info', '提示');
  makeAdmonition('question', '常见问题');
  makeAdmonition('success', '完成');
  makeAdmonition('warning', '注意');
  makeAdmonition('failure', '失败');
  makeAdmonition('error', '错误');
  makeAdmonition('danger', '危险');
  makeAdmonition('bug', '缺陷');
  makeAdmonition('details', '详情');

  md.core.ruler.push('admonition_reset', function (state) {
    allTagStacks.forEach(function (ts) { ts.length = 0; });
  });

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
    const langName = lang ? (langDisplay[lang] || lang).toUpperCase() : 'TEXT';
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

    var toolsParts = '';
    if (config.CB_MACSTYLE) {
      toolsParts += '<div class="mac-style">'
        + '<span class="mac-close"></span>'
        + '<span class="mac-minimize"></span>'
        + '<span class="mac-maximize"></span>'
        + '</div>';
    }
    if (config.CB_LANGUAGE && langName) {
      toolsParts += '<span class="code-lang">' + langName + '</span>';
    }
    toolsParts += '<div class="hl-tools-right">';
    if (config.CB_FULLPAGE) {
      toolsParts += '<i class="fullpage-btn" title="全屏"><i class="fas fa-expand"></i></i>';
    }
    if (config.CB_COPY) {
      toolsParts += '<i class="copy-btn" title="Copy">Copy</i>';
    }
    if (config.CB_SHRINK) {
      toolsParts += '<i class="shrink-btn shrunk" title="展开/折叠"><i class="fas fa-chevron-right"></i></i>';
    }
    toolsParts += '</div>';
    var toolsHtml = toolsParts ? '<div class="highlight-tools">' + toolsParts + '</div>' : '';

    var wrapClass = 'code-wrap';
    if (config.CB_WORD_WRAP) wrapClass += ' code-wrap-on';
    if (config.CB_SHRINK) wrapClass += ' code-shrink';
    var heightStyle = '';
    if (config.CB_HEIGHT_LIMIT) heightStyle = ' style="max-height:' + config.CB_HEIGHT_LIMIT + 'px;overflow-y:auto"';

    return '<figure class="highlight" style="' + preStyle + '">'
      + toolsHtml
      + '<pre class="' + wrapClass + '"' + heightStyle + (otherAttrs ? ' ' + otherAttrs : '') + '>' + innerCode + '</pre>'
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
        const msg = String(e.message || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
        return `<span style="color:${config.MD_KATEX_ERROR_COLOR}">[公式错误: ${msg}]</span>`;
      }
    },
    blockRenderer: (str) => {
      try {
        return katex.renderToString(str, { ...katexOptions, displayMode: true });
      } catch (e) {
        const msg = String(e.message || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
        return `<span style="color:${config.MD_KATEX_ERROR_COLOR}" class="katex-error katex-display">[公式错误: ${msg}]</span>`;
      }
    }
  });

  ready = true;
  })().catch(err => { initPromise = null; throw err; });
  await initPromise;
}

async function render(content) {
  await init();
  const key = String(content || '');
  if (renderCache.has(key)) return renderCache.get(key);
  const raw = md.render(breakResetLists(key));
  const html = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins', 'mark', 'sub', 'sup', 'a', 'img', 'figure', 'figcaption', 'pre', 'code', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'details', 'summary',
      'math', 'semantics', 'annotation', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mover', 'munder', 'mstyle', 'merror', 'mpadded', 'mphantom', 'menclose', 'mlabeledtr', 'mtable', 'mtr', 'mtd', 'mprescripts', 'none'],
    ALLOWED_ATTR: ['class', 'id', 'src', 'href', 'alt', 'title', 'target', 'rel', 'width', 'height', 'loading', 'datetime', 'open', 'start', 'type', 'colspan', 'rowspan', 'checked', 'disabled', 'draggable', 'data-line', 'data-language', 'mathvariant', 'encoding', 'definitionURL', 'style'],
    FORBID_TAGS: ['script', 'iframe', 'embed', 'object', 'applet', 'form', 'input', 'textarea', 'button', 'select', 'option', 'label', 'frameset', 'frame', 'marquee', 'template', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover', 'onmousemove', 'onmouseout', 'onkeydown', 'onkeypress', 'onkeyup', 'onsubmit', 'onreset', 'onfocus', 'onblur', 'onchange', 'onselect', 'onabort', 'onbeforeunload', 'onhashchange', 'onpopstate', 'onstorage', 'onfocusin', 'onfocusout', 'oninput', 'oninvalid', 'oncontextmenu', 'oncopy', 'oncut', 'onpaste', 'onwheel', 'onpointerdown', 'onpointerup', 'onpointermove', 'onpointerover', 'onpointerout', 'onpointerenter', 'onpointerleave', 'onpointercancel', 'ongotpointercapture', 'onlostpointercapture', 'ontouchstart', 'ontouchend', 'ontouchmove', 'ontouchcancel', 'onanimationend', 'onanimationstart', 'onanimationiteration', 'ontransitionend', 'ontransitionrun', 'ontransitionstart', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'onpageshow', 'onpagehide', 'onmessage', 'onmessageerror', 'onplay', 'onplaying', 'onpause', 'onended', 'onvolumechange', 'onwaiting', 'onscroll'],
  });
  renderCache.set(key, html);
  if (renderCache.size > RENDER_CACHE_MAX) {
    const oldest = renderCache.keys().next().value;
    renderCache.delete(oldest);
  }
  return html;
}

async function excerpt(content, maxLen = 200) {
  const html = await render(content);
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

module.exports = { render, excerpt, init, clearCache };
