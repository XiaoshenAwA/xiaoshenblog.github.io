import './editor.css'
import 'katex/dist/katex.min.css'
import markdownit from 'markdown-it'
import markdownItContainer from 'markdown-it-container'
import { full as markdownitEmoji } from 'markdown-it-emoji'
import markdownitMark from 'markdown-it-mark'
import markdownitInsDel from 'markdown-it-ins-del'
import katex from 'katex'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import { zhTypstMsg } from './typst-msg.js'
import { registerTypstLspFeatures } from './typst-lsp.js'
pdfjsLib.GlobalWorkerOptions.workerSrc = (window.__CONFIG__?.BASE_PATH || '') + '/wasm/pdf.worker.mjs'

// --- Markdown-it setup (shared with server-side render) ---

function renderMath(str, displayMode) {
  try {
    return katex.renderToString(str, { displayMode, throwOnError: false })
  } catch {
    return str
  }
}

const md = markdownit({ html: true, linkify: true, typographer: true })
md.use(markdownitEmoji)
md.use(markdownitMark)
md.use(markdownitInsDel)

md.inline.ruler.before('escape', 'math_inline', (state, silent) => {
  let pos = state.pos
  if (state.src.charCodeAt(pos) !== 36) return false
  if (state.src.charCodeAt(pos + 1) === 36) return false
  const start = pos + 1
  pos = state.src.indexOf('$', start)
  if (pos === -1) return false
  if (silent) return true
  const content = state.src.slice(start, pos)
  const token = state.push('math_inline', 'math', 0)
  token.content = content
  state.pos = pos + 1
  return true
})

md.renderer.rules.math_inline = (tokens, idx) => {
  return renderMath(tokens[idx].content, false)
}

md.block.ruler.before('fence', 'math_display', (state, startLine, endLine, silent) => {
  let pos = state.bMarks[startLine] + state.tShift[startLine]
  const max = state.eMarks[startLine]
  if (state.src.charCodeAt(pos) !== 36) return false
  if (pos + 1 >= max || state.src.charCodeAt(pos + 1) !== 36) return false
  pos += 2
  let content = state.src.slice(pos, max).trim()
  let nextLine = startLine + 1
  if (content === '') {
    content = ''
    for (; nextLine < endLine; nextLine++) {
      const bpos = state.bMarks[nextLine] + state.tShift[nextLine]
      const emax = state.eMarks[nextLine]
      if (state.src.charCodeAt(bpos) === 36 && bpos + 1 < emax && state.src.charCodeAt(bpos + 1) === 36) {
        break
      }
      if (content) content += '\n'
      content += state.src.slice(bpos, emax)
    }
    if (nextLine >= endLine) return false
  } else {
    nextLine = startLine + 1
  }
  if (silent) return true
  const token = state.push('math_display', 'math', 0)
  token.content = content
  token.map = [startLine, nextLine + 1]
  state.line = nextLine + 1
  return true
})

md.renderer.rules.math_display = (tokens, idx) => {
  return renderMath(tokens[idx].content, true)
}

const allTagStacks = []

function makeAdmonition(md, name, defaultTitle) {
  const tagStack = []
  allTagStacks.push(tagStack)
  md.use(markdownItContainer, name, {
    validate: params => params.trim().startsWith(name) || params.trim().match(new RegExp('^' + name + '\\[')),
    render: (tokens, idx) => {
      if (tokens[idx].nesting === 1) {
        let info = tokens[idx].info.trim().slice(name.length).trim()
        let title = defaultTitle
        let openAttr = ''
        const optMatch = info.match(/\{([^}]*)\}$/)
        if (optMatch) {
          if (optMatch[1].trim() === 'open') openAttr = ' open'
          info = info.slice(0, optMatch.index).trim()
        }
        const titleMatch = info.match(/^\[([\s\S]*)\]$/)
        if (titleMatch) title = md.renderInline(titleMatch[1])
        tagStack.push('open')
        return '<details' + openAttr + ' class="admonition ' + name + '"><summary class="admonition-title">' + title + '</summary><div class="admonition-content"><div class="admonition-inner">\n'
      }
      return tagStack.pop() === 'open' ? '</div></div></details>\n' : ''
    }
  })
}

md.core.ruler.push('admonition_reset', state => {
  allTagStacks.forEach(ts => { ts.length = 0 })
})

makeAdmonition(md, 'note', '备注')
makeAdmonition(md, 'tip', '技巧')
makeAdmonition(md, 'info', '提示')
makeAdmonition(md, 'question', '常见问题')
makeAdmonition(md, 'success', '完成')
makeAdmonition(md, 'warning', '注意')
makeAdmonition(md, 'failure', '失败')
makeAdmonition(md, 'error', '错误')
makeAdmonition(md, 'danger', '危险')
makeAdmonition(md, 'bug', '缺陷')
makeAdmonition(md, 'details', '详情')

// --- Config & state ---

const cfg = window.__CONFIG__ || {}
const STORAGE_KEY = cfg.EDITOR_DRAFT_PREFIX || 'editor-draft'
const THEME_LIGHT = cfg.MD_SHIKI_THEME_LIGHT || 'light-plus'
const THEME_DARK = cfg.MD_SHIKI_THEME_DARK || 'dark-plus'

const CB_MACSTYLE = cfg.CB_MACSTYLE !== false
const CB_HEIGHT_LIMIT = cfg.CB_HEIGHT_LIMIT || false
const CB_WORD_WRAP = cfg.CB_WORD_WRAP === true
const CB_SHRINK = cfg.CB_SHRINK === true
const CB_FULLPAGE = cfg.CB_FULLPAGE === true
const CB_COPY = cfg.CB_COPY !== false
const CB_LANGUAGE = cfg.CB_LANGUAGE !== false

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
}

const SHIKI_LANGS = [
  'javascript', 'typescript', 'html', 'css', 'vue', 'vue-html',
  'python', 'jsx', 'tsx', 'json', 'bash', 'sql', 'markdown',
  'yaml', 'xml', 'shell', 'go', 'rust', 'java', 'c', 'cpp',
  'php', 'ruby', 'swift', 'kotlin', 'scss', 'less', 'diff',
  'dockerfile', 'graphql', 'http', 'ini', 'makefile', 'nginx',
  'plaintext', 'regexp', 'sass', 'toml', 'csharp',
  'r', 'perl', 'lua', 'haskell', 'elixir',
  'clojure', 'powershell', 'latex', 'tex', 'typst'
]
const TS_LANG_IDS = { typescript: 'ts', javascript: 'js', tsx: 'tsx', jsx: 'jsx' }
const INDENT_MODES = ['tab', 'spaces2', 'spaces4', 'spaces8']

const preview = document.getElementById('editor-preview')
const page = document.querySelector('.editor-page')
const downloadBtn = document.getElementById('editor-download')
const indentBtn = document.getElementById('indent-toggle')
const linkModal = document.getElementById('insert-link-modal')
const imageModal = document.getElementById('insert-image-modal')
const codeModal = document.getElementById('insert-code-modal')
const codeLang = document.getElementById('code-lang')

let editor = null
let codeEditor = null
let codeModel = null
let monaco = null
let highlighter = null
let currentMode = cfg.EDITOR_MODE || 'markdown'
let renderSeq = 0
let updateTimer = null
let typstPending = null
let typstRendering = false

const EMPTY_TOKENS = new Uint32Array(0)

let indentMode = ''
try { indentMode = localStorage.getItem('editor-indent-mode') } catch {}
indentMode = indentMode || cfg.EDITOR_INDENT_MODE || 'tab'

patchTypstPackageRegistry()

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark'
}

// Apply Shiki theme token colors to Monaco.
// vscode-textmate encoded tokens carry a foreground ColorId (bits 15-23 of metadata)
// that indexes into the theme's colorMap. We register that colorMap via Monaco's
// official languages.setColorMap() (id 1 = default foreground, id 2 = default
// background), set the editor to a matching base theme, and also inject .mtk{id}
// CSS as a belt-and-suspenders override (typst-editor approach).
function injectShikiTheme(highlighter, themeId) {
  const { colorMap } = highlighter.setTheme(themeId)
  monaco.languages.setColorMap(colorMap)
  monaco.editor.setTheme(themeId === THEME_DARK ? 'vs-dark' : 'vs')
  let style = document.getElementById('shiki-monaco-colors')
  if (!style) {
    style = document.createElement('style')
    style.id = 'shiki-monaco-colors'
    document.head.appendChild(style)
  }
  const rules = []
  for (let i = 1; i < colorMap.length; i++) {
    const c = colorMap[i]
    if (c && c !== 'transparent') rules.push('.mtk' + i + '{color:' + c + '!important}')
  }
  style.textContent = rules.join('')
}

function indentOptions() {
  if (indentMode === 'tab') return { tabSize: 2, insertSpaces: false }
  return { tabSize: parseInt(indentMode.replace('spaces', ''), 10) || 4, insertSpaces: true }
}

function indentLabel() {
  if (indentMode === 'tab') return '\u21E5'
  return indentMode.replace('spaces', '')
}

function updateIndentBtns() {
  if (indentBtn) {
    indentBtn.innerHTML = '<i class="fas fa-indent"></i> ' + indentLabel()
    indentBtn.title = '\u7F29\u8FDB\uFF1A' + indentLabel() + ' \uFF08\u70B9\u51FB\u5207\u6362\uFF09'
  }
}

function draftKey(mode) {
  return STORAGE_KEY + (mode === 'typst' ? '.typst' : '')
}

function saveDraft() {
  if (!editor) return
  try { localStorage.setItem(draftKey(currentMode), editor.getValue()) } catch {}
}

function loadDraft(mode) {
  let v = ''
  try { v = localStorage.getItem(draftKey(mode)) || '' } catch {}
  return v
}

// --- Preview rendering ---

function scheduleUpdate() {
  clearTimeout(updateTimer)
  const delay = currentMode === 'typst' ? 600 : 350
  updateTimer = setTimeout(warmAndRender, delay)
}

async function warmAndRender() {
  const source = editor.getValue()
  if (currentMode === 'typst') {
    renderTypstPreview(source)
    return
  }
  renderMarkdownPreview(source)
}

// Break ordered lists when the source number resets (e.g. 1. 2. 1.),
// which CommonMark otherwise renumbers into a single list.
function breakResetLists(src) {
  const lines = String(src).split('\n')
  const out = []
  let fence = null
  let prev = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (fence) {
      out.push(line)
      if (trimmed.startsWith(fence)) fence = null
      continue
    }
    if (!trimmed) {
      out.push(line)
      continue
    }
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/)
    if (fenceMatch) {
      out.push(line)
      fence = fenceMatch[1]
      prev = null
      continue
    }
    const pm = line.match(/^(\s*(?:>\s*)*)(\S)/)
    const prefix = pm ? pm[1] : ''
    const q = (prefix.match(/>/g) || []).length
    const indent = (prefix.match(/^ */) || [''])[0].length
    const rest = pm ? pm[2] + line.slice(pm[0].length) : line
    if (indent >= 4) {
      out.push(line)
      continue
    }
    const restTrimmed = rest.trim()
    if (/^[-+*](?:\s|$)/.test(restTrimmed)) {
      out.push(line)
      prev = null
      continue
    }
    const m = restTrimmed.match(/^(\d+)([.)])(?=\s)/)
    if (m) {
      const num = parseInt(m[1], 10)
      const delim = m[2]
      if (prev && prev.q === q && prev.indent === indent && prev.delim === delim && num <= prev.num) {
        out.push('')
        out.push('[//]: # ()')
        out.push('')
      }
      prev = { num, indent, delim, q }
      out.push(line)
      continue
    }
    out.push(line)
    prev = null
  }
  return out.join('\n')
}

function renderMarkdownPreview(source) {
  const seq = ++renderSeq
  const out = breakResetLists(source)
  try {
    const html = md.render(out)
    if (seq !== renderSeq) return
    preview.innerHTML = html
  } catch (e) {
    if (seq !== renderSeq) return
    preview.innerHTML = '<p class="muted">\u6E32\u67D3\u5931\u8D25\uFF1A' + escapeHtml(String((e && e.message) || e)) + '</p>'
  }
}

let shikiTransformers = []
async function loadTransformers() {
  try {
    const m = await import('@shikijs/transformers')
    shikiTransformers = [
      m.transformerMetaHighlight(),
      m.transformerNotationHighlight(),
      m.transformerNotationDiff(),
      m.transformerNotationFocus(),
      m.transformerNotationErrorLevel()
    ]
  } catch {}
}

function formatTypstError(e) {
  if (!e) return '<span class="typst-err-severity">错误</span><span class="typst-err-msg">未知错误</span>'
  const raw = String(e.message || e)
  const parts = []

  // Package loading errors
  if (raw.includes('failed to load package') || raw.includes('NetworkError') || raw.includes('Failed to load')) {
    const pkgMatch = raw.match(/Failed to load '([^']+)'/)
    const pkgUrl = pkgMatch ? pkgMatch[1] : ''
    const pkgName = pkgUrl ? pkgUrl.split('/').pop().replace(/\.tar\.gz$/, '') : 'unknown'
    parts.push('<span class="typst-err-severity">包加载错误</span>')
    parts.push('<span class="typst-err-msg">加载包失败：' + escapeHtml(pkgName) + '</span>')
    parts.push('<span class="typst-err-hint">网络请求 packages.typst.org 失败。请检查包名是否正确，或移除不需要的 #import 语句。</span>')
    return parts.join('')
  }

  // SourceDiagnostic errors (may contain multiple diagnostics)
  if (raw.includes('SourceDiagnostic') || raw.includes('severity') || raw.includes('span')) {
    const decode = s => s
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')

    const msgs = []
    const reMsg = /message:\s*"((?:[^"\\]|\\.)*)"/g
    let mm
    while ((mm = reMsg.exec(raw))) msgs.push(decode(mm[1]))
    if (!msgs.length) {
      const fb = raw.match(/message:\s*(.*?)(?:,\s*trace|,\s*hints|\})/s)
      if (fb) msgs.push(fb[1].replace(/^"|"$/g, ''))
    }

    const sevs = []
    const reSev = /severity:\s*(Error|Warning|Info)/gi
    let sm
    while ((sm = reSev.exec(raw))) sevs.push(sm[1])

    const hints = []
    const reHint = /hints:\s*\[(.*?)\]/gs
    let hm
    while ((hm = reHint.exec(raw))) {
      const h = hm[1].replace(/"/g, '').trim()
      if (h) hints.push(h)
    }

    for (let i = 0; i < msgs.length; i++) {
      const item = []
      const severity = sevs[i] || sevs[0] || 'Error'
      const sevZh = severity === 'Warning' ? '警告' : severity === 'Info' ? '提示' : '错误'
      const sevClass = severity === 'Warning' ? 'warn' : severity === 'Info' ? 'info' : ''
      item.push('<span class="typst-err-severity' + (sevClass ? ' ' + sevClass : '') + '">' + sevZh + '</span>')
      if (msgs[i]) {
        const zhMsg = zhTypstMsg(msgs[i])
          .split('\n').map(line => escapeHtml(line)).join('<br>')
        item.push('<span class="typst-err-msg">' + zhMsg + '</span>')
      }
      if (hints[i]) {
        item.push('<span class="typst-err-hint">' + escapeHtml(zhTypstMsg(hints[i])) + '</span>')
      }
      parts.push('<div class="typst-err-item">' + item.join('') + '</div>')
    }
    if (parts.length) return parts.join('')
  }

  // Fallback: first meaningful line
  const clean = raw.replace(/^JsValue\(|\)$/g, '').replace(/\s+at\s+.*$/gm, '').trim()
  const firstLine = clean.split('\n')[0].slice(0, 300)
  return '<span class="typst-err-severity">错误</span><span class="typst-err-msg">' + escapeHtml(zhTypstMsg(firstLine)) + '</span>'
}

// --- Typst zoom controls ---
let typstZoom = parseFloat(localStorage.getItem('typst-zoom') || '1') || 1
const TYPST_ZOOM_STEP = 0.1
const TYPST_ZOOM_MIN = 0.25
const TYPST_ZOOM_MAX = 3
const typstZoomInput = document.getElementById('typst-zoom-input')
const typstZoomDecreaseBtn = document.getElementById('typst-zoom-decrease')
const typstZoomIncreaseBtn = document.getElementById('typst-zoom-increase')
let typstPdfDoc = null
let typstZoomSeq = 0

async function applyTypstZoom() {
  localStorage.setItem('typst-zoom', String(typstZoom))
  updateZoomInput()
  const wrap = preview.querySelector('.typst-page-wrap')
  const oldHost = wrap && wrap.querySelector('.typst-canvas-host')
  if (!wrap || !oldHost || !typstPdfDoc) return
  const seq = ++typstZoomSeq
  const maxBefore = wrap.scrollHeight - wrap.clientHeight
  const ratio = maxBefore > 0 ? wrap.scrollTop / maxBefore : 0
  const dpr = window.devicePixelRatio || 1
  const host = document.createElement('div')
  host.className = 'typst-canvas-host'
  for (let i = 1; i <= typstPdfDoc.numPages; i++) {
    if (seq !== typstZoomSeq) return
    const page = await typstPdfDoc.getPage(i)
    if (seq !== typstZoomSeq) return
    await renderTypstPage(host, typstPdfDoc, page, dpr, 1.5 * typstZoom)
    if (seq !== typstZoomSeq) return
  }
  oldHost.replaceWith(host)
  if (ratio > 0) wrap.scrollTop = ratio * (wrap.scrollHeight - wrap.clientHeight)
  setupTypstPan()
}

// --- Scroll sync helpers (typst: content-anchor first, ratio fallback) ---

let syncingEditor = false
let syncingPreview = false
let typstPageTexts = []
let typstSyncReady = false

function normText(s) {
  return String(s || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '')
}

function syncEditorToRatio(ratio) {
  if (!editor) return
  const max = editor.getScrollHeight() - editor.getLayoutInfo().height
  if (max > 0) editor.setScrollPosition({ scrollTop: ratio * max })
}

function bindWrapScroll(wrap) {
  wrap.addEventListener('scroll', () => {
    if (currentMode === 'typst') return
    if (syncingEditor) return
    syncingPreview = true
    const max = wrap.scrollHeight - wrap.clientHeight
    if (max > 0) syncEditorToRatio(Math.max(0, Math.min(1, wrap.scrollTop / max)))
    setTimeout(() => { syncingPreview = false }, 10)
  })
}

function setupScrollSync() {
  editor.onDidScrollChange(() => {
    if (currentMode === 'typst') return
    if (syncingPreview) return
    syncingEditor = true
    const wrap = preview.querySelector('.typst-page-wrap')
    const scrollTop = editor.getScrollTop()
    const editorMax = editor.getScrollHeight() - editor.getLayoutInfo().height
    if (editorMax > 0) {
      const ratio = Math.max(0, Math.min(1, scrollTop / editorMax))
      if (wrap) wrap.scrollTop = ratio * (wrap.scrollHeight - wrap.clientHeight)
      const previewMax = preview.scrollHeight - preview.clientHeight
      if (previewMax > 0) preview.scrollTop = ratio * previewMax
    }
    setTimeout(() => { syncingEditor = false }, 10)
  })
  preview.addEventListener('scroll', () => {
    if (currentMode === 'typst') return
    if (syncingEditor) return
    syncingPreview = true
    const wrap = preview.querySelector('.typst-page-wrap')
    if (wrap) {
      const max = wrap.scrollHeight - wrap.clientHeight
      if (max > 0) syncEditorToRatio(Math.max(0, Math.min(1, wrap.scrollTop / max)))
    } else {
      const previewMax = preview.scrollHeight - preview.clientHeight
      if (previewMax > 0) syncEditorToRatio(Math.max(0, Math.min(1, preview.scrollTop / previewMax)))
    }
    setTimeout(() => { syncingPreview = false }, 10)
  })
}

function setupTypstPan() {
  const wrap = preview.querySelector('.typst-page-wrap')
  if (!wrap || wrap.__panBound) return
  wrap.__panBound = true
  let panning = false
  let pointerId = null
  let startX = 0
  let startY = 0
  let startScrollLeft = 0
  let startScrollTop = 0
  const canPan = () => wrap.scrollWidth > wrap.clientWidth + 1 || wrap.scrollHeight > wrap.clientHeight + 1
  const updatePanCursor = () => wrap.classList.toggle('can-pan', canPan())
  updatePanCursor()
  wrap.addEventListener('scroll', updatePanCursor)
  let panResizeObserver = null
  try {
    panResizeObserver = new ResizeObserver(updatePanCursor)
    panResizeObserver.observe(wrap)
  } catch {}
  wrap.addEventListener('pointerdown', e => {
    if (e.button !== 0 || currentMode !== 'typst') return
    if (!canPan()) return
    pointerId = e.pointerId
    startX = e.clientX
    startY = e.clientY
    startScrollLeft = wrap.scrollLeft
    startScrollTop = wrap.scrollTop
  })
  wrap.addEventListener('pointermove', e => {
    if (e.pointerId !== pointerId) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (!panning) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
      panning = true
      wrap.classList.add('panning')
      try { wrap.setPointerCapture(pointerId) } catch {}
    }
    wrap.scrollLeft = startScrollLeft - dx
    wrap.scrollTop = startScrollTop - dy
    e.preventDefault()
  })
  const endPan = e => {
    if (e.pointerId !== pointerId) return
    panning = false
    pointerId = null
    wrap.classList.remove('panning')
    if (wrap.hasPointerCapture?.(e.pointerId)) { try { wrap.releasePointerCapture(e.pointerId) } catch {} }
  }
  wrap.addEventListener('pointerup', endPan)
  wrap.addEventListener('pointercancel', endPan)
}

function updateZoomInput() {
  const pct = Math.round(typstZoom * 100) + '%'
  if (typstZoomInput) typstZoomInput.value = pct
}

function typstZoomIn() {
  typstZoom = Math.min(TYPST_ZOOM_MAX, Math.round((typstZoom + TYPST_ZOOM_STEP) * 100) / 100)
  applyTypstZoom()
}

function typstZoomOut() {
  typstZoom = Math.max(TYPST_ZOOM_MIN, Math.round((typstZoom - TYPST_ZOOM_STEP) * 100) / 100)
  applyTypstZoom()
}

function addPageGaps() {
  // Canvas rendering handles page separation automatically
}

const TYPST_EMPTY_HTML = `<div class="typst-page-wrap">
  <div class="typst-blank-page"></div>
</div>`

const TYPST_LOADING_HTML = `<div class="typst-page-wrap">
  <div class="typst-loading">
    <div class="typst-loading-spinner"></div>
    <p>正在加载 Typst…</p>
  </div>
</div>`

let typstRenderSeq = 0

const TYPST_MAX_PDF_BYTES = 50 * 1024 * 1024
const TYPST_MAX_PAGES = 200

function renderTypstPreview(source) {
  typstPending = source
  if (typstWorkerWaiters.size) abortTypstWorker()
  if (!typstRendering) typstRunLoop()
}

function patchTypstPackageRegistry() {
  try {
    const basePath = (window.__CONFIG__ || {}).BASE_PATH || ''
    const FONT_RE = /^https:\/\/cdn\.jsdelivr\.net\/gh\/typst\/typst-assets@[^/]+\/files\/fonts\//
    const PKG_RE = /^https:\/\/packages\.typst\.org\/preview\//
    const rewrite = url => {
      if (FONT_RE.test(url)) return basePath + '/fonts/' + url.replace(FONT_RE, '')
      if (PKG_RE.test(url)) return basePath + '/typst-packages/' + url.replace(PKG_RE, '')
      return url
    }
    const origOpen = XMLHttpRequest.prototype.open
    if (!origOpen.__typstPatched) {
      XMLHttpRequest.prototype.open = function(method, url, ...args) {
        if (typeof url === 'string') url = rewrite(url)
        return origOpen.call(this, method, url, ...args)
      }
      XMLHttpRequest.prototype.open.__typstPatched = true
    }
    if (!window.__typstFetchPatched) {
      const origFetch = window.fetch
      window.fetch = function(input, init) {
        let url = typeof input === 'string' ? input : (input && (input.url || '')) || ''
        if (typeof url === 'string' && (FONT_RE.test(url) || PKG_RE.test(url))) {
          return origFetch.call(this, rewrite(url), init)
        }
        return origFetch.apply(this, arguments)
      }
      window.__typstFetchPatched = true
    }
  } catch {}
}

async function renderTypstPage(host, pdf, page, dpr, zoomScale) {
  const viewport = page.getViewport({ scale: zoomScale * dpr })
  const pageEl = document.createElement('div')
  pageEl.className = 'typst-page canvas-page'
  pageEl.style.width = (viewport.width / dpr) + 'px'
  pageEl.style.height = (viewport.height / dpr) + 'px'
  const canvas = document.createElement('canvas')
  canvas.className = 'typst-page canvas'
  canvas.width = viewport.width
  canvas.height = viewport.height
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise
  pageEl.appendChild(canvas)
  host.appendChild(pageEl)
  try {
    const tc = await page.getTextContent()
    typstPageTexts.push(normText(tc.items.map(it => it.str || '').join('')))
  } catch {
    typstPageTexts.push('')
  }
  try {
    const tc = await page.getTextContent()
    typstPageTexts.push(normText(tc.items.map(it => it.str || '').join('')))
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready } catch {}
    }
    const layer = document.createElement('div')
    layer.className = 'typst-text-layer'
    layer.style.width = viewport.width + 'px'
    layer.style.height = viewport.height + 'px'
    layer.style.transform = 'scale(' + (1 / dpr) + ')'
    layer.style.transformOrigin = '0 0'
    pageEl.appendChild(layer)
    buildTextLayer(layer, tc, viewport)
  } catch {
    typstPageTexts.push('')
  }
  try {
    const annotations = await page.getAnnotations()
    const links = (annotations || []).filter(a => a.subtype === 'Link')
    if (links.length) {
      const layer = document.createElement('div')
      layer.className = 'typst-page-links'
      for (const a of links) {
        if (!a.rect || a.rect.length < 4) continue
        const p1 = viewport.convertToViewportPoint(a.rect[0], a.rect[1])
        const p2 = viewport.convertToViewportPoint(a.rect[2], a.rect[3])
        const left = Math.min(p1[0], p2[0]) / dpr
        const top = Math.min(p1[1], p2[1]) / dpr
        const w = Math.abs(p2[0] - p1[0]) / dpr
        const h = Math.abs(p2[1] - p1[1]) / dpr
        if (w < 2 || h < 2) continue
        const el = document.createElement('a')
        el.className = 'typst-link'
        el.style.left = left + 'px'
        el.style.top = top + 'px'
        el.style.width = w + 'px'
        el.style.height = h + 'px'
        if (a.url) {
          el.href = a.url
          el.target = '_blank'
          el.rel = 'noopener noreferrer'
        } else if (a.dest) {
          el.href = '#' + String(a.dest)
          el.addEventListener('click', async ev => {
            ev.preventDefault()
            try {
              const destArr = await pdf.getDestination(a.dest)
              if (destArr && destArr[0]) {
                const idx = await pdf.getPageIndex(destArr[0])
                const target = host.querySelectorAll('.canvas-page')[idx]
                if (target) {
                  const hostRect = host.getBoundingClientRect()
                  const targetRect = target.getBoundingClientRect()
                  const wrap = host.closest('.typst-page-wrap')
                  if (wrap) wrap.scrollTop += targetRect.top - hostRect.top - 16
                }
              }
            } catch {}
          })
        }
        layer.appendChild(el)
      }
      pageEl.appendChild(layer)
    }
  } catch {}
}

function buildTextLayer(layer, tc, viewport) {
  const tr = viewport.transform
  const m0 = Math.abs(tr[0]) || 1
  const m3 = Math.abs(tr[3]) || 1
  const frag = document.createDocumentFragment()
  for (const it of tc.items || []) {
    if (!it.str) continue
    const im = it.transform || [1, 0, 0, 1, 0, 0]
    const x = tr[0] * im[4] + tr[2] * im[5] + tr[4]
    const y = tr[1] * im[4] + tr[3] * im[5] + tr[5]
    const h = Math.max(4, it.height * m3)
    const span = document.createElement('span')
    span.textContent = it.str
    span.style.left = x + 'px'
    span.style.top = (y - h) + 'px'
    span.style.width = Math.max(2, it.width * m0) + 'px'
    span.style.height = h + 'px'
    span.style.fontSize = h + 'px'
    frag.appendChild(span)
  }
  layer.appendChild(frag)
}

let typstWorker = null
let typstWorkerSeq = 0
const typstWorkerWaiters = new Map()

function abortTypstWorker() {
  if (typstWorker) {
    try { typstWorker.terminate() } catch {}
    typstWorker = null
  }
  for (const [, w] of typstWorkerWaiters) {
    try { w.reject(new Error('aborted')) } catch {}
  }
  typstWorkerWaiters.clear()
}

function getTypstWorker() {
  if (typstWorker) return typstWorker
  typstWorker = new Worker(new URL('./typst-worker.js', import.meta.url), { type: 'module' })
  typstWorker.onmessage = (e) => {
    const { id, ok, error, detail, data } = e.data
    const w = typstWorkerWaiters.get(id)
    if (!w) return
    typstWorkerWaiters.delete(id)
    if (ok) {
      w.resolve(new Uint8Array(data))
    } else {
      const msg = error === 'PDF_TOO_LARGE'
        ? '生成的 PDF 过大,预览已停止。'
        : error === 'COMPILE_FAILED'
          ? 'Typst compile failed: ' + (detail || 'no output')
          : (detail || error || 'Typst worker error')
      w.reject(new Error(msg))
    }
  }
  typstWorker.onerror = (e) => {
    const msg = 'Typst worker error: ' + (e && e.message ? e.message : 'unknown')
    for (const [, w] of typstWorkerWaiters) w.reject(new Error(msg))
    typstWorkerWaiters.clear()
  }
  return typstWorker
}

function compileTypstPdf(src) {
  const basePath = (window.__CONFIG__ || {}).BASE_PATH || ''
  const worker = getTypstWorker()
  return new Promise((resolve, reject) => {
    const id = ++typstWorkerSeq
    typstWorkerWaiters.set(id, { resolve, reject })
    worker.postMessage({ type: 'compile', id, src, basePath })
  })
}

let typstStatusEl = null

function showTypstStatus(text) {
  if (!typstStatusEl) {
    typstStatusEl = document.createElement('div')
    typstStatusEl.className = 'typst-status'
    document.body.appendChild(typstStatusEl)
  }
  typstStatusEl.textContent = text
  typstStatusEl.style.display = 'block'
}

function hideTypstStatus() {
  if (typstStatusEl) typstStatusEl.style.display = 'none'
}

async function typstRunLoop() {
  typstRendering = true
  while (typstPending !== null) {
    const src = typstPending
    typstPending = null
    typstPageTexts = []
    typstSyncReady = false
    if (!src.trim()) {
      hideTypstStatus()
      preview.innerHTML = TYPST_EMPTY_HTML
      continue
    }
    const oldWrap = preview.querySelector('.typst-page-wrap')
    const hadCanvas = !!(oldWrap && oldWrap.querySelector('.canvas-page'))
    const oldMax = hadCanvas ? oldWrap.scrollHeight - oldWrap.clientHeight : 0
    const scrollRatio = oldMax > 0 ? oldWrap.scrollTop / oldMax : 0
    if (!hadCanvas) preview.innerHTML = TYPST_LOADING_HTML
    const wrap = document.createElement('div')
    wrap.className = 'typst-page-wrap'
    const host = document.createElement('div')
    host.className = 'typst-canvas-host'
    wrap.appendChild(host)
    let statusTimer = null
    try {
      if (!window.__$typst) {
        hideTypstStatus()
        preview.innerHTML = TYPST_LOADING_HTML
        continue
      }
      statusTimer = setTimeout(() => showTypstStatus('\u6B63\u5728\u7F16\u8BD1\u2026'), 400)
      const pdfData = await compileTypstPdf(src)
      clearTimeout(statusTimer)
      hideTypstStatus()
      if (typstPending !== null) continue
      if (!pdfData || !pdfData.length) {
        preview.innerHTML = '<p class="muted">输出为空</p>'
        continue
      }
      if (pdfData.length > TYPST_MAX_PDF_BYTES) {
        preview.innerHTML = '<div class="typst-error"><span class="typst-err-severity">Limit</span><span class="typst-err-msg">生成的 PDF 过大(' + (pdfData.length / 1024 / 1024).toFixed(1) + ' MB),预览已停止。</span></div>'
        continue
      }
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfData) }).promise
      if (typstPending !== null) { try { pdf.destroy() } catch {}; continue }
      if (typstPdfDoc && typstPdfDoc !== pdf) { try { typstPdfDoc.destroy() } catch {} }
      typstPdfDoc = pdf
      const dpr = window.devicePixelRatio || 1
      const pageLimit = Math.min(pdf.numPages, TYPST_MAX_PAGES)
      for (let i = 1; i <= pageLimit; i++) {
        if (typstPending !== null) break
        const page = await pdf.getPage(i)
        if (typstPending !== null) break
        await renderTypstPage(host, pdf, page, dpr, 1.5 * typstZoom)
      }
      if (typstPending !== null) { try { pdf.destroy() } catch {}; continue }
      if (pdf.numPages > TYPST_MAX_PAGES) {
        const note = document.createElement('div')
        note.className = 'typst-limit-note'
        note.textContent = '文档共 ' + pdf.numPages + ' 页,仅预览前 ' + TYPST_MAX_PAGES + ' 页。'
        wrap.appendChild(note)
      }
      if (hadCanvas) preview.replaceChild(wrap, oldWrap)
      else { preview.innerHTML = ''; preview.appendChild(wrap) }
      setupTypstPan()
      typstSyncReady = true
      if (location.search.includes('__debug')) window.__typstDebug = { texts: typstPageTexts }
      if (scrollRatio > 0) {
        wrap.scrollTop = scrollRatio * (wrap.scrollHeight - wrap.clientHeight)
      }
      if (typstPending !== null) continue
      updateZoomInput()
    } catch (e) {
      clearTimeout(statusTimer)
      hideTypstStatus()
      if (typstPending !== null) continue
      console.error('Typst render error:', e)
      const errMsg = formatTypstError(e)
      preview.innerHTML = '<div class="typst-error">' + errMsg + '</div>'
    }
  }
  typstRendering = false
}

// --- Editor insert helpers ---

function insertAtCursor(text) {
  const sel = editor.getSelection()
  const start = sel.getStartPosition()
  editor.executeEdits('toolbar', [{ range: sel, text }])
  editor.setPosition(new monaco.Position(start.lineNumber, start.column + text.length))
  editor.focus()
}

function insertAtLineStart(prefix) {
  const sel = editor.getSelection()
  const pos = editor.getPosition()
  const line = sel.getStartPosition().lineNumber
  const content = editor.getModel().getLineContent(line)
  const trimmed = content.replace(/^\s+/, '')
  const indent = content.length - trimmed.length
  const startCol = indent + 1
  editor.executeEdits('toolbar', [{ range: new monaco.Range(line, startCol, line, startCol), text: prefix }])
  const newCol = Math.max(startCol, pos.column) + prefix.length
  editor.setPosition(new monaco.Position(line, newCol))
  editor.focus()
}

function insertWrap(mdText, wrap) {
  const sel = editor.getSelection()
  const model = editor.getModel()
  const selText = model.getValueInRange(sel)
  const start = sel.getStartPosition()
  let text
  if (selText) {
    text = mdText + selText + wrap
  } else {
    text = mdText + wrap
  }
  editor.executeEdits('toolbar', [{ range: sel, text }])
  const c1 = start.column + mdText.length
  const c2 = c1 + selText.length
  editor.setSelection(new monaco.Range(start.lineNumber, c1, start.lineNumber, c2))
  editor.focus()
}

// --- Mode switching (pages are separate; this is only a draft key helper) ---

function setMode(mode) {
  if (mode === currentMode || !editor) return
  saveDraft()
  currentMode = mode
  monaco.editor.setModelLanguage(editor.getModel(), mode === 'typst' ? 'typst' : 'markdown')
  editor.setValue(loadDraft(mode))
const openBtn = document.getElementById('editor-open')
if (openBtn) {
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = '.typ,.md,.txt'
  fileInput.style.display = 'none'
  document.body.appendChild(fileInput)
  openBtn.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      if (editor) {
        editor.setValue(String(reader.result || ''))
        editor.focus()
      }
    }
    reader.onerror = () => {
      showTypstStatus('读取文件失败')
      setTimeout(hideTypstStatus, 2000)
    }
    reader.readAsText(f, 'utf-8')
    fileInput.value = ''
  })
}

if (downloadBtn) {
    downloadBtn.title = mode === 'typst' ? 'Download .typ file' : 'Download Markdown'
  }
  scheduleUpdate()
}

// --- Modals ---

function openCodeModal() {
  if (!codeModel) return
  codeModel.setValue('')
  codeLang.value = ''
  monaco.editor.setModelLanguage(codeModel, 'plaintext')
  codeModal.style.display = ''
  setTimeout(() => codeEditor.focus(), 80)
}

// --- Bootstrap ---

async function initEditor() {
  monaco = await window.__monacoReady

  // Monaco 0.56.0 handles workers via its built-in getWorker in editor.main.js

  monaco.languages.register({ id: 'typst' })

  monaco.languages.setLanguageConfiguration('typst', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: '`', close: '`' },
      { open: '$', close: '$' },
      { open: '/*', close: '*/' }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: '`', close: '`' },
      { open: '*', close: '*' },
      { open: '_', close: '_' },
      { open: '$', close: '$' }
    ],
    folding: {
      markers: {
        start: /^\s*(=|==|===|====|=====|======)\s/,
        end: /^\s*(=|==|===|====|=====|======)\s/
      }
    },
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
  })

  monaco.languages.setMonarchTokensProvider('typst', {
    keywords: [
      'set', 'let', 'import', 'include', 'show', 'if', 'else', 'for', 'in',
      'while', 'break', 'continue', 'return', 'as', 'is', 'not', 'and', 'or',
      'none', 'auto', 'true', 'false'
    ],
    typeKeywords: [
      'length', 'integer', 'float', 'ratio', 'fraction', 'angle', 'color',
      'alignment', 'direction', 'stretch', 'label', 'content', 'function',
      'dictionary', 'array', 'stroke', 'paint', 'fill', 'color',
      'page', 'text', 'line', 'rect', 'square', 'circle', 'ellipse',
      'polygon', 'polyline', 'path', 'catmull-spline', 'cubic-spline'
    ],
    functions: [
      'rgb', 'luma', 'oklab', 'oklch', 'hsl', 'cmyk',
      'emph', 'strong', 'raw', 'link', 'image', 'block', 'box',
      'h', 'v', 'hrule', 'vrule', 'linebreak', 'pagebreak', 'colbreak',
      'sym', 'str', 'repr', 'type', 'assert', 'panic', 'to-unicode',
      'calc', 'abs', 'ceiling', 'floor', 'log', 'pow', 'root', 'round', 'sin', 'cos', 'tan', 'atan', 'min', 'max', 'mod', 'odd', 'even', 'range',
      'enumerate', 'list', 'term', 'table', 'figure', 'footnote', 'heading',
      'document', 'page', 'columns', 'stack', 'grid', 'align',
      'pad', 'indent', 'hanging-indent', 'overline', 'strikeout', 'underline',
      'sub', 'super', 'smallcaps', 'subscript', 'superscript',
      'text', 'font', 'size', 'weight', 'style', 'fill', 'stroke',
      'track', 'kerning', 'spacing', 'shrink', 'stretch',
      'par', 'justify', 'leading', 'first-line-indent', 'block-indent',
      'lorem', 'datetime', 'datetime.now', 'toml', 'yaml', 'json', 'csv',
      'query', 'locate', 'target', 'position', 'here', 'state',
      'counter', 'step', 'display', 'final', 'sleep', 'error',
      'length', 'auto', 'none', 'bool', 'int', 'float', 'str', 'content',
      'array', 'dictionary', 'label', 'alignment', 'ratio', 'fraction',
      'angle', 'color', 'function', 'stroke', 'paint', 'fill',
      'page', 'text', 'line', 'rect', 'square', 'circle', 'ellipse',
      'polygon', 'polyline', 'path', 'catmull-spline', 'cubic-spline'
    ],
    tokenizer: {
      root: [
        [/(\/\/.*)/, 'comment'],
        [/(\/\*)/, 'comment', '@comment'],
        [/(#if\b|#else\b|#for\b|#in\b|#while\b|#break\b|#continue\b|#return\b)/, 'keyword'],
        [/(#set\b)/, 'keyword.declaration'],
        [/(#let\b)/, 'keyword.declaration'],
        [/(#import\b|#include\b)/, 'keyword.control'],
        [/(#show\b)/, 'keyword.control'],
        [/(#eval\b)/, 'keyword'],
        [/(#\w+)\s*(?=\()/, 'function.call'],
        [/(#\w+)(\[)/, { cases: { '$1@typeKeywords': { token: 'type.$1', next: '@contentBlock' }, '@default': { token: 'keyword', next: '@contentBlock' } } }],
        [/(#\w+)\s*(?=\{)/, 'function'],
        [/(#\w+)/, 'variable'],
        [/(\.\w+)\s*(?=\()/, 'function.method'],
        [/(\.\w+)/, 'attribute'],
        [/=+/, { cases: { '$S2==markup': { token: 'markup.heading' }, '@default': 'operator' } }],
        [/\*{1,2}(?=\S)/, { token: 'markup.bold', next: '@boldContent' }],
        [/_{1,2}(?=\S)/, { token: 'markup.italic', next: '@italicContent' }],
        [/~~(?=\S)/, { token: 'markup.strikethrough', next: '@strikeContent' }],
        [/``(?!\`)/, { token: 'markup.raw', next: '@rawContent' }],
        [/`/, { token: 'markup.inline.raw', next: '@inlineRawContent' }],
        [/\$/, { token: 'delimiter.math', next: '@math' }],
        [/^(\s*)(=+)\s/, { cases: { '$S2==markup': { token: 'markup.heading' }, '@default': { token: 'heading', next: '@headingContent' } } }],
        [/^\s*(-|\+|\*)\s/, 'markup.list'],
        [/^\s*\d+\.\s/, 'markup.list'],
        [/^\s*>\s/, 'markup.quote'],
        [/---/, 'hrule'],
        [/\.\./, 'operator.range'],
        [/=>/, 'operator.arrow'],
        [/<-/, 'operator.arrow'],
        [/[+\-*\/=<>!&|%^~?:]+/, 'operator'],
        [/[{}()\[\]]/, '@brackets'],
        [/[;,.]/, 'delimiter'],
        [/\"/, 'string', '@string'],
        [/'/, 'string', '@singleString'],
        [/\b\d+(\.\d+)?([ptemwctinruhkslgn%frad]+)\b/, 'number'],
        [/\b\d+\.\d+\b/, 'number.float'],
        [/\b\d+\b/, 'number'],
        [/\b(label)\s*(@?[A-Za-z_][\w.-]*)/, ['keyword', 'label']],
        [/@?[A-Za-z_][\w.-]*/, 'identifier'],
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment']
      ],
      contentBlock: [
        [/\\\[/, 'escaped'],
        [/\\\]/, 'escaped'],
        [/\[/, '@bracket', '@push'],
        [/\]/, '@bracket', '@pop'],
        { include: '@root' }
      ],
      boldContent: [
        [/[^*_\\]+/, 'markup.bold'],
        [/\*{1,2}/, 'markup.bold', '@pop'],
        [/\\./, 'escaped'],
        { include: '@root' }
      ],
      italicContent: [
        [/[^*_\\]+/, 'markup.italic'],
        [/_{1,2}/, 'markup.italic', '@pop'],
        [/\\./, 'escaped'],
        { include: '@root' }
      ],
      strikeContent: [
        [/[^~\\]+/, 'markup.strikethrough'],
        [/~~/, 'markup.strikethrough', '@pop'],
        [/\\./, 'escaped'],
        { include: '@root' }
      ],
      rawContent: [
        [/[^`\\]+/, 'markup.raw'],
        [/``/, 'markup.raw', '@pop'],
        [/\\./, 'escaped'],
      ],
      inlineRawContent: [
        [/[^`\\]+/, 'markup.inline.raw'],
        [/`/, 'markup.inline.raw', '@pop'],
        [/\\./, 'escaped'],
      ],
      math: [
        [/\\\$/, 'escaped'],
        [/\$/, 'delimiter.math', '@pop'],
        [/\b(def|let|set|if|else|for|while|do|not|and|or|in|not)\b/, 'keyword'],
        [/\b(\d+(\.\d+)?)\b/, 'number'],
        [/[+\-*\/=<>!&|^%(){}[\];,]/, 'operator'],
        [/\./, 'operator'],
        [/[A-Za-z_]\w*/, 'variable.math'],
        { include: '@root' }
      ],
      headingContent: [
        [/[^\n]+/, 'heading.content'],
        [/$/, 'heading.content', '@pop']
      ],
      string: [
        [/\\"/, 'string.escape'],
        [/[^"\\]+/, 'string'],
        [/"/, 'string', '@pop']
      ],
      singleString: [
        [/\\'/, 'string.escape'],
        [/[^'\\]+/, 'string'],
        [/'/, 'string', '@pop']
      ],
    }
  })

  monaco.languages.registerCompletionItemProvider('typst', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn
      }
      const mk = s => ({ ...s, kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range })
      const snippets = [
        // 页面与文档
        { label: 'page', insertText: '#set page(paper: "${1:a4}", margin: (x: ${2:2.5cm}, y: ${3:2.5cm}))\n${0}', detail: '设置页面' },
        { label: 'text', insertText: '#set text(size: ${1:12pt}, lang: "${2:zh}", font: ("${3:Roboto}", "${4:Noto Serif CJK SC}"))\n${0}', detail: '设置文本样式' },
        { label: 'align', insertText: '#align(${1:center}, ${0})', detail: '对齐' },
        { label: 'colbreak', insertText: '#colbreak()', detail: '分栏换页' },

        // 标题
        { label: 'h1', insertText: '= ${1:标题}\n${0}', detail: '一级标题' },
        { label: 'h2', insertText: '== ${1:标题}\n${0}', detail: '二级标题' },
        { label: 'h3', insertText: '=== ${1:标题}\n${0}', detail: '三级标题' },
        { label: 'h4', insertText: '==== ${1:标题}\n${0}', detail: '四级标题' },

        // 文本格式
        { label: 'bold', insertText: '*${1:粗体}*\n${0}', detail: '粗体' },
        { label: 'italic', insertText: '_${1:斜体}_\n${0}', detail: '斜体' },
        { label: 'code', insertText: '`${1:代码}`\n${0}', detail: '行内代码' },
        { label: 'link', insertText: 'https://${1:url}', detail: '链接' },
        { label: 'ref', insertText: '@${1:label}', detail: '引用' },
        { label: 'label', insertText: '<${1:label}>', detail: '标签' },

        // 列表
        { label: 'ul', insertText: '- ${1:项目}\n${0}', detail: '无序列表' },
        { label: 'ol', insertText: '+ ${1:项目}\n${0}', detail: '有序列表' },
        { label: 'task', insertText: '- [${1:${2| ,x,|}}] ${3:任务}\n${0}', detail: '任务列表' },

        // 表格
        { label: 'table', insertText: '#table(\n  columns: ${1:3},\n  [${2:表头1}], [${3:表头2}], [${4:表头3}],\n  [${5:内容1}], [${6:内容2}], [${7:内容3}],\n)${0}', detail: '表格' },
        { label: 'table3', insertText: '#table(\n  columns: (auto, 1fr, auto),\n  [${1:名称}], [${2:描述}], [${3:值}],\n  [${4:}], [${5:}], [${6:}],\n)${0}', detail: '三列表格' },

        // 数学公式
        { label: 'math', insertText: '$ ${1:formula} $\n${0}', detail: '行内数学公式' },
        { label: 'mathblock', insertText: '$ ${1:\n  formula\n} $\n${0}', detail: '块级数学公式' },
        { label: 'frac', insertText: 'frac(${1:分子}, ${2:分母})', detail: '分数' },
        { label: 'sqrt', insertText: 'sqrt(${1:x})', detail: '平方根' },
        { label: 'sum', insertText: 'sum(${1:0}^{${2:n}}) ${3:x_n}', detail: '求和' },
        { label: 'prod', insertText: 'prod(${1:0}^{${2:n}}) ${3:x_n}', detail: '求积' },
        { label: 'int', insertText: 'int_${1:0}^{${2:oo}} ${3:f(x)} dif x', detail: '积分' },
        { label: 'vec', insertText: 'vec(${1:x}, ${2:y})', detail: '向量' },
        { label: 'mat', insertText: 'mat(${1:a}, ${2:b}; ${3:c}, ${4:d})', detail: '矩阵' },

        // 图片与引用
        { label: 'image', insertText: '#image("${1:path}", width: ${2:80%})\n${0}', detail: '图片' },
        { label: 'figure', insertText: '#figure(\n  image("${1:path}", width: ${2:80%}),\n  caption: [${3:图片描述}],\n  kind: image,\n  supplement: "图",\n)<${4:fig}>\n${0}', detail: '带编号图片' },
        { label: 'caption', insertText: '#figure(\n  ${1:内容},\n  caption: [${2:描述}],\n)${0}', detail: '带标题图形' },

        // 代码块
        { label: 'codeblock', insertText: '```${1:python}\n${2:# 代码}\n```\n${0}', detail: '代码块' },

        // 脚注与注释
        { label: 'footnote', insertText: '#footnote[${1:脚注内容}]${0}', detail: '脚注' },
        { label: 'heading', insertText: '#heading(level: ${1:1})[${2:标题}]', detail: '标题函数' },

        // 引用与导入
        { label: 'import', insertText: '#import "${1:module}": ${2:item}\n${0}', detail: '导入模块' },
        { label: 'include', insertText: '#include "${1:file.typ}"\n${0}', detail: '包含文件' },

        // Typst 设置
        { label: 'setpage', insertText: '#set page(\n  paper: "${1:a4}",\n  margin: (x: ${2:2.5cm}, y: ${3:2.5cm}),\n  numbering: "${4:1}",\n)${0}', detail: '设置页面属性' },
        { label: 'setpar', insertText: '#set par(${1:justify: true, leading: ${2:0.78em}})\n${0}', detail: '设置段落' },
        { label: 'showrule', insertText: '#show ${1:heading}: set text(${2:font: "serif"})\n${0}', detail: '显示规则' },

        // 网格布局
        { label: 'grid', insertText: '#grid(\n  columns: ${1:3},\n  gutter: ${2:1fr},\n  [${3:A}], [${4:B}], [${5:C}],\n)${0}', detail: '网格布局' },
        { label: 'columns', insertText: '#columns(${1:2})[\n  ${0}\n]', detail: '分栏布局' },

        // 字体样式
        { label: 'highlight', insertText: '#highlight[${1:高亮文本}]${0}', detail: '高亮' },
        { label: 'strike', insertText: '#strikethrough[${1:删除线文本}]${0}', detail: '删除线' },
        { label: 'underline', insertText: '#underline[${1:下划线文本}]${0}', detail: '下划线' },

        // 数学
        { label: 'lr', insertText: 'lr(${1:(}[${2:公式}]${3:)})', detail: '自动括号' },
        { label: 'cancel', insertText: '#cancel[${1:公式}]${0}', detail: '删除线公式' },
        { label: 'overbrace', insertText: '#overbrace(${1:公式})[${2:说明}]${0}', detail: '上花括号' },
        { label: 'underbrace', insertText: '#underbrace(${1:公式})[${2:说明}]${0}', detail: '下花括号' },

        // 化学式
        { label: 'chem', insertText: '#chem("${1:H2O}")\n${0}', detail: '化学式' },

        // 文档模板
        { label: 'doc', insertText: '#set page(paper: "a4", margin: (x: 2.5cm, y: 2.5cm))\n#set text(size: 12pt, lang: "zh")\n#set par(justify: true, leading: 0.78em)\n\n= ${1:标题}\n\n${0}\n', detail: '文档模板' },
        { label: 'slide', insertText: '#set page(paper: "presentation-16-9", margin: 0cm)\n#set text(size: 24pt)\n\n#align(center + horizon)[\n  ${1:标题}\n]\n\n${0}\n', detail: '幻灯片模板' },
        { label: 'article', insertText: '#set page(paper: "a4", margin: (x: 2.5cm, y: 2.5cm))\n#set text(size: 12pt, lang: "zh", font: ("Noto Serif CJK SC"))\n#set par(justify: true, leading: 0.78em)\n#set heading(numbering: "1.")\n\n= ${1:引言}\n\n${0}\n', detail: '文章模板' },

        // alchemist 化学绘图
        { label: 'bond-single', insertText: 'single()', detail: '单键 (alchemist)' },
        { label: 'bond-double', insertText: 'double()', detail: '双键 (alchemist)' },
        { label: 'fragment', insertText: 'fragment("${1:OH}")', detail: '化学片段 (alchemist)' },
        { label: 'cycle', insertText: 'cycle(${1:6}, {\n  ${0}\n})', detail: '环状结构 (alchemist)' },
        { label: 'branch', insertText: 'branch({\n  ${0}\n})', detail: '支链 (alchemist)' },
        { label: 'skeletize', insertText: '#skeletize({\n  ${0}\n})', detail: '化学骨架 (alchemist)' },

        // 常用布局/元素函数
        { label: 'block', insertText: '#block[\n  ${1}\n]', detail: '块' },
        { label: 'box', insertText: '#box[\n  ${1}\n]', detail: '盒子' },
        { label: 'pad', insertText: '#pad(${1:10pt})[\n  ${2}\n]', detail: '内边距' },
        { label: 'stack', insertText: '#stack(dir: ${1:ltr})[\n  ${2}\n]', detail: '垂直堆叠' },
        { label: 'enum', insertText: '#enum[\n  ${1:Item}\n]', detail: '编号列表' },
        { label: 'list', insertText: '#list[\n  ${1:Item}\n]', detail: '无序列表函数' },
        { label: 'term', insertText: '#term[\n  ${1:Term} ${2:Description}\n]', detail: '术语列表' },
        { label: 'strong', insertText: '#strong[${1:text}]', detail: '加粗' },
        { label: 'emph', insertText: '#emph[${1:text}]', detail: '强调/斜体' },
        { label: 'raw', insertText: '#raw(${1:"code"})', detail: '原始代码' },
        { label: 'set', insertText: '#set ${1:page}(width: ${2:210mm})', detail: '设置规则' },
        { label: 'let', insertText: '#let ${1:name} = ${2:value}', detail: '变量定义' },
        { label: 'codeblock2', insertText: '```typst\n${1}\n```', detail: 'Typst 代码块' }
      ]
      return { suggestions: snippets.map(mk) }
    }
  })

  monaco.editor.setTheme(isDark() ? 'vs-dark' : 'vs')

  editor = monaco.editor.create(document.getElementById('editor-input'), {
    value: loadDraft(currentMode),
    language: currentMode === 'typst' ? 'typst' : 'markdown',
    automaticLayout: true,
    minimap: {
      enabled: true,
      renderCharacters: false,
      maxColumn: 80,
      scale: 1
    },
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    fontLigatures: true,
    fontSize: getMonacoFontSize(),
    ...indentOptions()
  })

  editor.onDidChangeModelContent(() => {
    saveDraft()
    scheduleUpdate()
  })

  if (currentMode === 'typst') {
    registerTypstLspFeatures(monaco, editor)
  }

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    handleSaveShortcut()
  })

  setupScrollSync()

  codeModel = monaco.editor.createModel('', 'plaintext')
  codeEditor = monaco.editor.create(document.getElementById('code-input'), {
    model: codeModel,
    automaticLayout: true,
    minimap: { enabled: false },
    wordWrap: 'off',
    scrollBeyondLastLine: false,
    fontSize: 13,
    ...indentOptions()
  })

  const initial = editor.getValue()
  if (currentMode === 'typst') {
    renderTypstPreview(initial)
  } else {
    renderMarkdownPreview(editor.getValue())
  }

  window.__monacoEditor = editor
  window.__codeEditor = codeEditor
  window.__editorInitialized = true
  applyFontToMonaco()

  document.getElementById('editor-input').addEventListener('keydown', e => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) e.stopPropagation()
  })

  // Load shiki/typst in background (non-blocking, failures don't prevent editor use)
  try {
    const shikiMod = await import('shiki')
    const { createHighlighter } = shikiMod

    highlighter = await createHighlighter({
      themes: [THEME_LIGHT, THEME_DARK],
      langs: SHIKI_LANGS
    })

    loadTransformers()

    // Apply Shiki themes + tokenizer to Monaco editor so code colors match preview
    // Uses vscode-textmate encoded tokenization + CSS color map injection
    // (inspired by typst-editor approach, avoids @shikijs/monaco's lossy reverse mapping)
    try {
      const themeId = isDark() ? THEME_DARK : THEME_LIGHT
      injectShikiTheme(highlighter, themeId)

      // Register Shiki tokenizer for all loaded languages that Monaco supports
      // Note: getInitialState() must return a real vscode-textmate state — Monaco
      // clones it (s.clone()) before the first tokenizeEncoded call, so null breaks.
      const { INITIAL } = await import('@shikijs/vscode-textmate')
      const monacoLangs = new Set(monaco.languages.getLanguages().map(l => l.id))
      for (const lang of highlighter.getLoadedLanguages()) {
        if (!monacoLangs.has(lang)) continue
        const grammar = highlighter.getLanguage(lang)
        if (!grammar || !grammar.tokenizeLine2) continue
        monaco.languages.setTokensProvider(lang, {
          getInitialState() {
            return INITIAL
          },
          tokenizeEncoded(line, state) {
            // The preview fence renderer (codeToHtml with dual themes) calls
            // shiki's setTheme internally and leaves the highlighter's active
            // theme on the last theme (dark). Token ColorIds come from the
            // active theme, so restore the page theme here to keep them in
            // sync with the colorMap registered by injectShikiTheme.
            highlighter.setTheme(isDark() ? THEME_DARK : THEME_LIGHT)
            const result = grammar.tokenizeLine2(line, state, 1000)
            if (result.stoppedEarly) return { tokens: EMPTY_TOKENS, endState: state }
            return { tokens: result.tokens, endState: result.ruleStack }
          }
        })
      }
      console.log('Shiki themes + tokenizer registered for Monaco')
    } catch (e) {
      console.warn('Shiki-Monaco integration failed:', e)
    }

    md.renderer.rules.fence = (tokens, idx) => {
      const token = tokens[idx]
      const fullInfo = (token.info || '').trim()
      const parts = fullInfo.split(/\s+/)
      const lang = parts[0] || 'text'
      const langName = lang ? (langDisplay[lang] || lang).toUpperCase() : 'TEXT'
      const fallback = () => {
        return '<figure class="highlight">'
          + '<div class="highlight-tools">'
          + (CB_MACSTYLE ? '<div class="mac-style"><span class="mac-close"></span><span class="mac-minimize"></span><span class="mac-maximize"></span></div>' : '')
          + (CB_LANGUAGE && langName ? '<span class="code-lang">' + langName + '</span>' : '')
          + '<div class="hl-tools-right">'
          + (CB_FULLPAGE ? '<i class="fullpage-btn" title="全屏"><i class="fas fa-expand"></i></i>' : '')
          + (CB_COPY ? '<i class="copy-btn" title="Copy">Copy</i>' : '')
          + (CB_SHRINK ? '<i class="shrink-btn shrunk" title="展开/折叠"><i class="fas fa-chevron-right"></i></i>' : '')
          + '</div></div>'
          + '<pre class="code-wrap' + (CB_WORD_WRAP ? ' code-wrap-on' : '') + (CB_SHRINK ? ' code-shrink' : '') + '"><code class="language-' + lang + '">' + md.utils.escapeHtml(token.content) + '</code></pre>'
          + '</figure>'
      }
      let html
      try {
        html = highlighter.codeToHtml(token.content, {
          lang,
          themes: { light: THEME_LIGHT, dark: THEME_DARK },
          defaultColor: false,
          meta: { __raw: fullInfo },
          transformers: shikiTransformers
        })
      } catch (e) {
        return fallback()
      }

      const preMatch = html.match(/^<pre[^>]*>/)
      if (!preMatch) return html

      const preTag = preMatch[0]
      const styleMatch = preTag.match(/style="([^"]+)"/)
      const preStyle = styleMatch ? styleMatch[1] : ''

      const otherAttrs = preTag.replace(/^<pre\s*/i, '').replace(/\s*>$/i, '').replace(/(style|class)="[^"]*"/g, '').trim()

      const afterPre = html.slice(preTag.length)
      const closeIdx = afterPre.lastIndexOf('</pre>')
      const innerCode = closeIdx >= 0 ? afterPre.slice(0, closeIdx) : afterPre

      let toolsParts = ''
      if (CB_MACSTYLE) {
        toolsParts += '<div class="mac-style">'
          + '<span class="mac-close"></span>'
          + '<span class="mac-minimize"></span>'
          + '<span class="mac-maximize"></span>'
          + '</div>'
      }
      if (CB_LANGUAGE && langName) {
        toolsParts += '<span class="code-lang">' + langName + '</span>'
      }
      toolsParts += '<div class="hl-tools-right">'
      if (CB_FULLPAGE) {
        toolsParts += '<i class="fullpage-btn" title="全屏"><i class="fas fa-expand"></i></i>'
      }
      if (CB_COPY) {
        toolsParts += '<i class="copy-btn" title="Copy">Copy</i>'
      }
      if (CB_SHRINK) {
        toolsParts += '<i class="shrink-btn shrunk" title="展开/折叠"><i class="fas fa-chevron-right"></i></i>'
      }
      toolsParts += '</div>'
      const toolsHtml = toolsParts ? '<div class="highlight-tools">' + toolsParts + '</div>' : ''

      let wrapClass = 'code-wrap'
      if (CB_WORD_WRAP) wrapClass += ' code-wrap-on'
      if (CB_SHRINK) wrapClass += ' code-shrink'
      let heightStyle = ''
      if (CB_HEIGHT_LIMIT) heightStyle = ' style="max-height:' + CB_HEIGHT_LIMIT + 'px;overflow-y:auto"'

      return '<figure class="highlight" style="' + preStyle + '">'
        + toolsHtml
        + '<pre class="' + wrapClass + '"' + heightStyle + (otherAttrs ? ' ' + otherAttrs : '') + '>' + innerCode + '</pre>'
        + '</figure>'
    }

    // Re-render preview now that Shiki highlighter is ready
    if (currentMode !== 'typst' && initial.trim()) {
      renderMarkdownPreview(editor.getValue())
    }

  } catch (e) {
    console.warn('Shiki loading failed:', e)
  }

  // Typst 编译在 Worker 中完成;首次编译时 Worker 内部懒加载 wasm。
  if (currentMode === 'typst') {
    try {
      window.__$typst = { worker: true }
    } catch {}
    renderTypstPreview(editor.getValue())
  }
}

// --- UI wiring ---

document.querySelectorAll('.toolbar-btn[data-md]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!editor) return
    const action = btn.dataset.action

    if (action === 'link') {
      const sel = editor.getSelection()
      const text = editor.getModel().getValueInRange(sel)
      document.getElementById('link-text').value = text || ''
      document.getElementById('link-url').value = ''
      linkModal.style.display = ''
      setTimeout(() => document.getElementById(text ? 'link-url' : 'link-text').focus(), 80)
      return
    }

    if (action === 'image') {
      document.getElementById('image-url').value = ''
      document.getElementById('image-alt').value = ''
      imageModal.style.display = ''
      setTimeout(() => document.getElementById('image-url').focus(), 80)
      return
    }

    if (action === 'code') {
      openCodeModal()
      return
    }

    if (action === 'line-start') {
      insertAtLineStart(btn.dataset.md)
      return
    }

    insertWrap(btn.dataset.md, btn.dataset.wrap)
  })
})

const linkConfirm = document.getElementById('link-confirm')
if (linkConfirm) linkConfirm.addEventListener('click', () => {
  if (!editor) return
  const url = document.getElementById('link-url').value.trim()
  if (!url) return
  const text = document.getElementById('link-text').value.trim() || url
  const sel = editor.getSelection()
  const start = sel.getStartPosition()
  editor.executeEdits('modal', [{ range: sel, text: '[' + text + '](' + url + ')' }])
  editor.setSelection(new monaco.Range(start.lineNumber, start.column + 1, start.lineNumber, start.column + 1 + text.length))
  editor.focus()
  linkModal.style.display = 'none'
})

const imageConfirm = document.getElementById('image-confirm')
if (imageConfirm) imageConfirm.addEventListener('click', () => {
  if (!editor) return
  const url = document.getElementById('image-url').value.trim()
  if (!url) return
  const alt = document.getElementById('image-alt').value.trim() || '\u56FE\u7247'
  const sel = editor.getSelection()
  const start = sel.getStartPosition()
  editor.executeEdits('modal', [{ range: sel, text: '![' + alt + '](' + url + ')' }])
  editor.setSelection(new monaco.Range(start.lineNumber, start.column + 2, start.lineNumber, start.column + 2 + alt.length))
  editor.focus()
  imageModal.style.display = 'none'
})

const codeConfirm = document.getElementById('code-confirm')
if (codeConfirm) codeConfirm.addEventListener('click', () => {
  if (!editor) return
  const lang = codeLang.value
  const code = codeModel.getValue()
  const block = '```' + lang + '\n' + code + '\n```\n'
  insertAtCursor(block)
  codeModal.style.display = 'none'
})

if (codeLang) codeLang.addEventListener('change', () => {
  if (!codeModel) return
  const lang = codeLang.value
  monaco.editor.setModelLanguage(codeModel, lang || 'plaintext')
})

document.querySelectorAll('.view-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    const container = document.querySelector('.editor-container')
    if (container) container.className = 'editor-container mode-' + btn.dataset.mode
  })
})

// --- Save to file (File System Access API) ---

const saveFileModal = document.getElementById('save-file-modal')
const saveFileNameInput = document.getElementById('save-file-name')
const saveFilePathInput = document.getElementById('save-file-path')
const saveFilePathPick = document.getElementById('save-file-path-pick')
const saveFileConfirm = document.getElementById('save-file-confirm')

let saveTarget = null

function canSaveToFile() {
  return typeof window.showDirectoryPicker === 'function'
}

function showSaveStatus(text, isSaved) {
  const st = document.getElementById('editor-save-status')
  if (!st) return
  st.classList.toggle('saved', !!isSaved)
  st.classList.toggle('dirty', !isSaved)
  st.textContent = text
  clearTimeout(st.__saveTimer)
  st.__saveTimer = setTimeout(() => {
    st.classList.remove('saved')
    st.classList.add('dirty')
    st.textContent = '未保存'
  }, 2500)
}

function saveTargetKey() {
  return 'target:' + currentMode
}

function idbOpen() {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open('editor-save-state', 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('targets')) {
          req.result.createObjectStore('targets')
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function idbGet(key) {
  const db = await idbOpen()
  if (!db) return null
  return new Promise(resolve => {
    try {
      const req = db.transaction('targets', 'readonly').objectStore('targets').get(key)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function idbSet(key, value) {
  const db = await idbOpen()
  if (!db) return
  return new Promise(resolve => {
    try {
      const tx = db.transaction('targets', 'readwrite')
      tx.objectStore('targets').put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

function resolveSaveRelPath(typed, name) {
  let rel = (typed || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  if (!rel || (saveTarget && saveTarget.dirHandle && rel === saveTarget.dirHandle.name)) return name
  if (/^[A-Za-z]:/.test(rel) || rel.startsWith('/')) return false
  if (saveTarget && saveTarget.dirHandle && rel.indexOf(saveTarget.dirHandle.name + '/') === 0) {
    rel = rel.slice(saveTarget.dirHandle.name.length + 1)
  }
  if (!rel) return name
  return rel + '/' + name
}

async function pickSaveFolder() {
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' })
  } catch {
    return null
  }
}

async function writeToDir(dirHandle, filePath, content) {
  const parts = filePath.split('/').filter(p => p && p !== '.' && p !== '..')
  const fileName = parts.pop()
  let dir = dirHandle
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true })
  }
  const fh = await dir.getFileHandle(fileName, { create: true })
  const w = await fh.createWritable()
  await w.write(content)
  await w.close()
}

async function persistSaveTarget() {
  if (!saveTarget || !saveTarget.dirHandle) return
  try {
    localStorage.setItem(saveTargetKey() + ':meta', JSON.stringify({ name: saveTarget.name, relPath: saveTarget.relPath }))
  } catch {}
  await idbSet(saveTargetKey(), saveTarget.dirHandle)
}

async function restoreSaveTarget() {
  const dirHandle = await idbGet(saveTargetKey())
  if (!dirHandle) return
  let meta = null
  try { meta = JSON.parse(localStorage.getItem(saveTargetKey() + ':meta') || 'null') } catch {}
  saveTarget = {
    name: (meta && meta.name) || downloadName(),
    relPath: (meta && meta.relPath) || downloadName(),
    dirHandle
  }
  const st = document.getElementById('editor-save-status')
  if (st && saveTarget.dirHandle) st.textContent = '保存到 ' + saveTarget.dirHandle.name
}

function openSaveFileModal() {
  if (!saveFileModal) return
  if (saveFileNameInput && !saveFileNameInput.value) saveFileNameInput.value = downloadName()
  if (saveFilePathInput) {
    saveFilePathInput.value = saveTarget && saveTarget.dirHandle ? saveTarget.dirHandle.name : ''
  }
  if (saveFilePathPick) {
    saveFilePathPick.disabled = !canSaveToFile()
    saveFilePathPick.title = canSaveToFile() ? '选择保存文件夹' : '当前浏览器不支持选择文件夹'
  }
  saveFileModal.style.display = ''
  setTimeout(() => { if (saveFileNameInput) saveFileNameInput.focus() }, 60)
}

async function saveToTarget() {
  if (!editor || !saveTarget || !saveTarget.dirHandle) return false
  try {
    await writeToDir(saveTarget.dirHandle, saveTarget.relPath, editor.getValue() || '')
    saveDraft()
    showSaveStatus('已保存', true)
    return true
  } catch (e) {
    console.error('save to file failed', e)
    if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) {
      saveTarget = null
      showSaveStatus('需要重新选择保存文件夹', false)
      openSaveFileModal()
      return false
    }
    showSaveStatus('保存失败', false)
    return false
  }
}

async function confirmSaveFile() {
  if (!editor) return
  const name = ((saveFileNameInput && saveFileNameInput.value) || '').trim()
  if (!name) {
    if (saveFileNameInput) saveFileNameInput.focus()
    return
  }
  if (!canSaveToFile()) {
    saveFileModal.style.display = 'none'
    saveDraft()
    if (downloadBtn) downloadBtn.click()
    showSaveStatus('已下载到下载目录', true)
    return
  }
  if (!saveTarget || !saveTarget.dirHandle) {
    const dir = await pickSaveFolder()
    if (!dir) return
    saveTarget = { name, dirHandle: dir }
  } else {
    saveTarget.name = name
  }
  const rel = resolveSaveRelPath(saveFilePathInput ? saveFilePathInput.value : '', name)
  if (rel === false) {
    showSaveStatus('请输入所选文件夹内的相对路径', false)
    return
  }
  saveTarget.relPath = rel
  saveFileModal.style.display = 'none'
  if (await saveToTarget()) await persistSaveTarget()
}

async function handleSaveShortcut() {
  if (!editor) return
  saveDraft()
  if (saveTarget && saveTarget.dirHandle) {
    await saveToTarget()
    return
  }
  if (!canSaveToFile()) {
    if (downloadBtn) downloadBtn.click()
    showSaveStatus('已下载到下载目录', true)
    return
  }
  openSaveFileModal()
}

if (saveFilePathPick) {
  saveFilePathPick.addEventListener('click', async () => {
    if (!canSaveToFile()) return
    const dir = await pickSaveFolder()
    if (!dir) return
    saveTarget = { name: ((saveFileNameInput && saveFileNameInput.value) || '').trim() || downloadName(), dirHandle: dir }
    if (saveFilePathInput) saveFilePathInput.value = dir.name
  })
}

if (saveFileConfirm) {
  saveFileConfirm.addEventListener('click', confirmSaveFile)
}

if (saveFileNameInput) {
  saveFileNameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); confirmSaveFile() }
  })
}

restoreSaveTarget()

function downloadName() {
  const base = cfg.EDITOR_DOWNLOAD_FILENAME || 'document.md'
  if (currentMode === 'typst') return base.replace(/\.md$/i, '') + '.typ'
  return base
}

if (downloadBtn) {
  downloadBtn.addEventListener('click', () => {
    if (!editor) return
    const blob = new Blob([editor.getValue() || ''], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadName()
    a.click()
    URL.revokeObjectURL(url)
  })
}

function exportPdfName() {
  return downloadName().replace(/\.[^.]+$/, '') + '.pdf'
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

const pdfExportBtn = document.getElementById('editor-export-pdf')
if (pdfExportBtn) {
  pdfExportBtn.addEventListener('click', async () => {
    if (!editor) return
    if (currentMode === 'typst') {
      showTypstStatus('\u6B63\u5728\u751F\u6210 PDF\u2026')
      compileTypstPdf(editor.getValue()).then(data => {
        if (!data || !data.length) throw new Error('empty')
        downloadBlob(new Blob([new Uint8Array(data)], { type: 'application/pdf' }), exportPdfName())
        hideTypstStatus()
      }).catch(() => {
        showTypstStatus('\u5BFC\u51FA\u5931\u8D25\uFF1A\u7F16\u8BD1\u9519\u8BEF')
        setTimeout(hideTypstStatus, 2500)
      })
      return
    }
    const clone = preview.cloneNode(true)
    clone.style.cssText = 'position:absolute;left:-10000px;top:0;width:794px;max-width:none;padding:24px 28px;background:#fff;color:#1f2328;-webkit-print-color-adjust:exact;print-color-adjust:exact'
    document.body.appendChild(clone)
    const btn = pdfExportBtn
    const prev = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
    try {
      const [{ jsPDF }, h2cMod] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ])
      const html2canvasFn = h2cMod.default || h2cMod
      const canvas = await html2canvasFn(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: doc => {
          doc.documentElement.setAttribute('data-theme', 'light')
        }
      })
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const margin = 10
      const pageW = 210
      const pageH = 297
      const contentW = pageW - margin * 2
      const contentH = pageH - margin * 2
      const imgW = contentW
      const imgH = canvas.height * imgW / canvas.width
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      let position = margin
      pdf.addImage(imgData, 'JPEG', margin, position, imgW, imgH)
      let remaining = imgH - contentH
      while (remaining > 0.1) {
        pdf.addPage()
        position = margin - remaining
        pdf.addImage(imgData, 'JPEG', margin, position, imgW, imgH)
        remaining -= contentH
      }
      pdf.save(exportPdfName())
    } catch (e) {
      console.error('PDF export failed:', e)
    } finally {
      btn.disabled = false
      btn.innerHTML = prev
      clone.remove()
    }
  })
}

if (indentBtn) {
  indentBtn.addEventListener('click', () => {
    const idx = INDENT_MODES.indexOf(indentMode)
    indentMode = INDENT_MODES[(idx + 1) % INDENT_MODES.length]
    try { localStorage.setItem('editor-indent-mode', indentMode) } catch {}
    const opts = indentOptions()
    if (editor) editor.updateOptions(opts)
    if (codeEditor) codeEditor.updateOptions(opts)
    updateIndentBtns()
  })
}

const fullscreenBtn = document.getElementById('editor-fullscreen')
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      page.requestFullscreen().then(() => {
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>'
        fullscreenBtn.classList.add('active')
      }).catch(() => {})
    } else {
      document.exitFullscreen().then(() => {
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>'
        fullscreenBtn.classList.remove('active')
      })
    }
  })
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>'
      fullscreenBtn.classList.remove('active')
    }
  })
}

document.querySelectorAll('.editor-mode-tab[data-mode]').forEach(tab => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode))
})

document.addEventListener('click', e => {
  const closeBtn = e.target.closest('[data-close]')
  if (closeBtn) {
    const id = closeBtn.dataset.close
    const el = document.getElementById(id)
    if (el) el.style.display = 'none'
  }
})

new MutationObserver(() => {
  if (monaco && editor) {
    if (highlighter) {
      injectShikiTheme(highlighter, isDark() ? THEME_DARK : THEME_LIGHT)
    } else {
      monaco.editor.setTheme(isDark() ? 'vs-dark' : 'vs')
    }
  }
  if (editor && currentMode !== 'typst') renderMarkdownPreview(editor.getValue())
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

// --- Editor/preview font size controls ---
const previewFontDecreaseBtn = document.getElementById('preview-font-decrease')
const previewFontIncreaseBtn = document.getElementById('preview-font-increase')
const fontSizeInput = document.getElementById('editor-font-size-input')
const isTypstPage = currentMode === 'typst'
function getMonacoFontSize() {
  try { return parseInt(localStorage.getItem('editor_font_size')) || 14 } catch { return 14 }
}
function setEditorFontSize(size) {
  size = Math.max(8, Math.min(32, size))
  localStorage.setItem('editor_font_size', size)
  if (editor) editor.updateOptions({ fontSize: size })
  if (codeEditor) codeEditor.updateOptions({ fontSize: Math.max(8, size - 1) })
}
function updateFontSizeInput() {
  if (!fontSizeInput) return
  fontSizeInput.value = getMonacoFontSize() + 'px'
  fontSizeInput.title = '编辑器字体大小'
}
if (fontSizeInput) {
  updateFontSizeInput()
  fontSizeInput.addEventListener('change', () => {
    const val = parseInt(fontSizeInput.value) || 0
    setEditorFontSize(val)
  })
  fontSizeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); fontSizeInput.blur() }
  })
}
if (previewFontDecreaseBtn) previewFontDecreaseBtn.addEventListener('click', () => {
  setEditorFontSize(getMonacoFontSize() - 1)
  updateFontSizeInput()
})
if (previewFontIncreaseBtn) previewFontIncreaseBtn.addEventListener('click', () => {
  setEditorFontSize(getMonacoFontSize() + 1)
  updateFontSizeInput()
})

if (isTypstPage) {
  if (typstZoomDecreaseBtn) typstZoomDecreaseBtn.addEventListener('click', typstZoomOut)
  if (typstZoomIncreaseBtn) typstZoomIncreaseBtn.addEventListener('click', typstZoomIn)
  if (typstZoomInput) {
    if (!typstZoomInput.value) typstZoomInput.value = Math.round(typstZoom * 100) + '%'
    typstZoomInput.addEventListener('change', () => {
      const val = parseInt(typstZoomInput.value) || 0
      typstZoom = Math.max(TYPST_ZOOM_MIN, Math.min(TYPST_ZOOM_MAX, val / 100))
      applyTypstZoom()
    })
    typstZoomInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); typstZoomInput.blur() }
    })
  }
}

let typstZoomWheelTimer = null
if (isTypstPage && preview) {
  preview.addEventListener('wheel', e => {
    if (!e.ctrlKey) return
    e.preventDefault()
    if (e.deltaY < 0) {
      typstZoom = Math.min(TYPST_ZOOM_MAX, Math.round((typstZoom + TYPST_ZOOM_STEP) * 100) / 100)
    } else {
      typstZoom = Math.max(TYPST_ZOOM_MIN, Math.round((typstZoom - TYPST_ZOOM_STEP) * 100) / 100)
    }
    updateZoomInput()
    clearTimeout(typstZoomWheelTimer)
    typstZoomWheelTimer = setTimeout(() => applyTypstZoom(), 150)
  }, { passive: false })
}

// --- Font settings integration with footer panel ---
function getFontSettings() {
  try { return JSON.parse(localStorage.getItem('blog_font_settings')) || {} } catch { return {} }
}
function applyFontToMonaco() {
  if (!editor) return
  const s = getFontSettings()
  let fontFamily, fontSize
  if (s.codeFont && s.codeFont !== 'unset') {
    fontFamily = '"' + s.codeFont + '", monospace'
  } else {
    // Resolve CSS variable to actual font name
    const resolved = getComputedStyle(document.documentElement).getPropertyValue('--font-code').trim().replace(/^['"]|['"]$/g, '') || 'monospace'
    fontFamily = resolved + ', monospace'
  }
  fontSize = getMonacoFontSize()
  editor.updateOptions({ fontFamily, fontSize })
  if (codeEditor) codeEditor.updateOptions({ fontFamily, fontSize: Math.max(8, fontSize - 1) })
}
window.addEventListener('storage', e => {
  if (e.key === 'blog_font_settings') applyFontToMonaco()
})
window.addEventListener('blog-font-settings-changed', applyFontToMonaco)

initEditor()
