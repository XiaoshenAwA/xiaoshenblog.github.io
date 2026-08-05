import './editor.css'
import 'katex/dist/katex.min.css'
import markdownit from 'markdown-it'
import markdownItContainer from 'markdown-it-container'
import { full as markdownitEmoji } from 'markdown-it-emoji'
import markdownitMark from 'markdown-it-mark'
import markdownitInsDel from 'markdown-it-ins-del'
import katex from 'katex'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
pdfjsLib.GlobalWorkerOptions.workerSrc = (window.__CONFIG__?.BASE_PATH || '') + '/wasm/pdf.worker.mjs'

// --- Markdown-it setup (shared with server-side render) ---

function renderMath(str, displayMode) {
  try {
    return katex.renderToString(str, { displayMode, throwOnError: false })
  } catch {
    return str
  }
}

const md = markdownit({ html: true, linkify: true })
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

function makeContainer(md, name, icon, defaultTitle) {
  md.use(markdownItContainer, name, {
    validate: params => params.trim().startsWith(name) || params.trim().match(new RegExp('^' + name + '\\[')),
    render: (tokens, idx) => {
      if (tokens[idx].nesting === 1) {
        const info = tokens[idx].info.trim().slice(name.length).trim()
        let title = defaultTitle
        const titleMatch = info.match(/^\[([\s\S]*)\]$/)
        if (titleMatch) title = md.renderInline(titleMatch[1])
        const optMatch = info.match(/\{([^}]*)\}$/)
        const opts = optMatch ? optMatch[1].trim() : ''
        const openAttr = opts === 'open' ? ' open' : ''
        return '<details' + openAttr + ' class="admonition ' + name + '"><summary class="admonition-title">' + icon + ' ' + title + '</summary>\n'
      }
      return '</details>\n'
    }
  })
}

function makeAdmonition(md, name, icon, defaultTitle) {
  const tagStack = []
  md.use(markdownItContainer, name, {
    validate: params => params.trim() === name || params.trim().match(new RegExp('^' + name + '\\[')),
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
        const hasTitle = !!titleMatch
        if (titleMatch) title = md.renderInline(titleMatch[1])
        if (hasTitle) {
          tagStack.push('details')
          return '<details' + openAttr + ' class="admonition ' + name + '"><summary class="admonition-title">' + icon + ' ' + title + '</summary>\n'
        }
        tagStack.push('div')
        return '<div class="admonition ' + name + '"><p class="admonition-title">' + icon + ' ' + title + '</p>\n'
      }
      return (tagStack.pop() === 'details' ? '</details>\n' : '</div>\n')
    }
  })
}

makeAdmonition(md, 'info', '<i class="fas fa-circle-info"></i>', '提示')
makeAdmonition(md, 'success', '<i class="fas fa-circle-check"></i>', '完成')
makeAdmonition(md, 'warning', '<i class="fas fa-triangle-exclamation"></i>', '注意')
makeAdmonition(md, 'error', '<i class="fas fa-circle-xmark"></i>', '错误')
makeAdmonition(md, 'danger', '<i class="fas fa-ban"></i>', '危险')
makeContainer(md, 'details', '<i class="fas fa-chevron-right"></i>', '详情')

// --- Config & state ---

const cfg = window.__CONFIG__ || {}
const STORAGE_KEY = cfg.EDITOR_DRAFT_PREFIX || 'editor-draft'
const THEME_LIGHT = cfg.MD_SHIKI_THEME_LIGHT || 'light-plus'
const THEME_DARK = cfg.MD_SHIKI_THEME_DARK || 'dark-plus'

const SHIKI_LANGS = [
  'javascript', 'typescript', 'html', 'css', 'vue', 'vue-html',
  'python', 'jsx', 'tsx', 'json', 'bash', 'sql', 'markdown',
  'yaml', 'xml', 'shell', 'go', 'rust', 'java', 'c', 'cpp',
  'php', 'ruby', 'swift', 'kotlin', 'scss', 'less', 'diff',
  'dockerfile', 'graphql', 'http', 'ini', 'makefile', 'nginx',
  'plaintext', 'regexp', 'sass', 'toml', 'csharp',
  'r', 'perl', 'lua', 'haskell', 'elixir',
  'clojure', 'powershell', 'latex', 'tex'
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

function formatTypstError(e) {
  if (!e) return 'Unknown error'
  const raw = String(e.message || e)
  const parts = []

  // Package loading errors
  if (raw.includes('failed to load package') || raw.includes('NetworkError') || raw.includes('Failed to load')) {
    const pkgMatch = raw.match(/Failed to load '([^']+)'/)
    const pkgUrl = pkgMatch ? pkgMatch[1] : ''
    const pkgName = pkgUrl ? pkgUrl.split('/').pop().replace(/\.tar\.gz$/, '') : 'unknown'
    parts.push('<span class="typst-err-severity">Package Error</span>')
    parts.push('<span class="typst-err-msg">Failed to load package: ' + escapeHtml(pkgName) + '</span>')
    parts.push('<span class="typst-err-hint">Network request to packages.typst.org failed. Check if the package exists, or remove the #import statement if not needed.</span>')
    return parts.join('')
  }

  // SourceDiagnostic errors
  if (raw.includes('SourceDiagnostic') || raw.includes('severity') || raw.includes('span')) {
    // Try to extract severity
    let severity = 'Error'
    const sevMatch = raw.match(/severity:\s*(Error|Warning|Info)/i)
    if (sevMatch) severity = sevMatch[1]

    // Try to extract message - handle escaped quotes and nested content
    let msg = ''
    const msgMatch = raw.match(/message:\s*"((?:[^"\\]|\\.)*)"/)
    if (msgMatch) {
      msg = msgMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    } else {
      // Fallback: extract text between message: and trace/hints
      const fallbackMatch = raw.match(/message:\s*(.*?)(?:,\s*trace|,\s*hints|\})/s)
      if (fallbackMatch) msg = fallbackMatch[1].replace(/^"|"$/g, '')
    }

    // Extract hints
    let hints = ''
    const hintMatch = raw.match(/hints:\s*\[(.*?)\]/s)
    if (hintMatch && hintMatch[1].trim()) {
      hints = hintMatch[1].replace(/"/g, '').trim()
    }

    const sevClass = severity === 'Warning' ? 'warn' : severity === 'Info' ? 'info' : ''
    parts.push('<span class="typst-err-severity' + (sevClass ? ' ' + sevClass : '') + '">' + escapeHtml(severity) + '</span>')
    if (msg) {
      const firstLine = msg.split('\n')[0]
      parts.push('<span class="typst-err-msg">' + escapeHtml(firstLine) + '</span>')
    }
    if (hints) {
      parts.push('<span class="typst-err-hint">' + escapeHtml(hints) + '</span>')
    }
    if (parts.length > 1) return parts.join('')
  }

  // Fallback: first meaningful line
  const clean = raw.replace(/^JsValue\(|\)$/g, '').replace(/\s+at\s+.*$/gm, '').trim()
  const firstLine = clean.split('\n')[0].slice(0, 300)
  return '<span class="typst-err-severity">Error</span><span class="typst-err-msg">' + escapeHtml(firstLine) + '</span>'
}

// --- Typst zoom controls ---
let typstZoom = parseFloat(localStorage.getItem('typst-zoom') || '1') || 1
const TYPST_ZOOM_STEP = 0.1
const TYPST_ZOOM_MIN = 0.25
const TYPST_ZOOM_MAX = 3
let typstPdfDoc = null
let typstZoomSeq = 0

async function applyTypstZoom() {
  localStorage.setItem('typst-zoom', String(typstZoom))
  updateZoomInput()
  const wrap = preview.querySelector('.typst-page-wrap')
  const host = wrap && wrap.querySelector('.typst-canvas-host')
  if (!host || !typstPdfDoc) return
  const seq = ++typstZoomSeq
  const maxBefore = wrap.scrollHeight - wrap.clientHeight
  const ratio = maxBefore > 0 ? wrap.scrollTop / maxBefore : 0
  const dpr = window.devicePixelRatio || 1
  host.innerHTML = ''
  for (let i = 1; i <= typstPdfDoc.numPages; i++) {
    if (seq !== typstZoomSeq) return
    const page = await typstPdfDoc.getPage(i)
    if (seq !== typstZoomSeq) return
    await renderTypstPage(host, typstPdfDoc, page, dpr, 1.5 * typstZoom)
    if (seq !== typstZoomSeq) return
  }
  if (ratio > 0) wrap.scrollTop = ratio * (wrap.scrollHeight - wrap.clientHeight)
  setupTypstPan()
}

// --- Scroll sync helpers ---

let syncingEditor = false
let syncingPreview = false

function syncEditorToRatio(ratio) {
  if (!editor) return
  const max = editor.getScrollHeight() - editor.getLayoutInfo().height
  if (max > 0) editor.setScrollPosition({ scrollTop: ratio * max })
}

function bindWrapScroll(wrap) {
  wrap.addEventListener('scroll', () => {
    if (syncingEditor) return
    syncingPreview = true
    const max = wrap.scrollHeight - wrap.clientHeight
    if (max > 0) syncEditorToRatio(Math.max(0, Math.min(1, wrap.scrollTop / max)))
    setTimeout(() => { syncingPreview = false }, 10)
  })
}

function setupScrollSync() {
  editor.onDidScrollChange(() => {
    if (syncingPreview) return
    syncingEditor = true
    const scrollTop = editor.getScrollTop()
    const editorMax = editor.getScrollHeight() - editor.getLayoutInfo().height
    if (editorMax > 0) {
      const ratio = Math.max(0, Math.min(1, scrollTop / editorMax))
      const wrap = preview.querySelector('.typst-page-wrap')
      if (wrap) wrap.scrollTop = ratio * (wrap.scrollHeight - wrap.clientHeight)
      const previewMax = preview.scrollHeight - preview.clientHeight
      if (previewMax > 0) preview.scrollTop = ratio * previewMax
    }
    setTimeout(() => { syncingEditor = false }, 10)
  })
  preview.addEventListener('scroll', () => {
    if (syncingEditor) return
    syncingPreview = true
    const previewMax = preview.scrollHeight - preview.clientHeight
    if (previewMax > 0) syncEditorToRatio(Math.max(0, Math.min(1, preview.scrollTop / previewMax)))
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
  const input = document.getElementById('editor-font-size-input')
  if (input) {
    input.value = Math.round(typstZoom * 100) + '%'
    input.title = 'Typst 预览缩放 %'
  }
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
  <div class="typst-page typst-page-empty">
    <div class="typst-empty">
      <div class="typst-empty-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="4" width="48" height="56" rx="4" stroke="currentColor" stroke-width="2" fill="none"/>
          <line x1="16" y1="16" x2="48" y2="16" stroke="currentColor" stroke-width="2" opacity="0.4"/>
          <line x1="16" y1="24" x2="40" y2="24" stroke="currentColor" stroke-width="2" opacity="0.3"/>
          <line x1="16" y1="32" x2="44" y2="32" stroke="currentColor" stroke-width="2" opacity="0.2"/>
          <line x1="16" y1="40" x2="36" y2="40" stroke="currentColor" stroke-width="2" opacity="0.15"/>
        </svg>
      </div>
      <p class="typst-empty-hint">Start typing to preview your Typst document</p>
      <p class="typst-empty-examples">e.g. <code>#heading[Hello World]</code></p>
    </div>
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
  host.appendChild(pageEl)
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
    if (!src.trim()) {
      hideTypstStatus()
      preview.innerHTML = TYPST_EMPTY_HTML
      continue
    }
    const oldWrap = preview.querySelector('.typst-page-wrap')
    const oldMax = oldWrap ? oldWrap.scrollHeight - oldWrap.clientHeight : 0
    const scrollRatio = oldMax > 0 ? oldWrap.scrollTop / oldMax : 0
    const wrap = document.createElement('div')
    wrap.className = 'typst-page-wrap'
    const host = document.createElement('div')
    host.className = 'typst-canvas-host'
    wrap.appendChild(host)
    let statusTimer = null
    try {
      if (!window.__$typst) {
        hideTypstStatus()
        preview.innerHTML = '<p class="muted">Typst is loading, please wait...</p>'
        continue
      }
      statusTimer = setTimeout(() => showTypstStatus('\u6B63\u5728\u7F16\u8BD1\u2026'), 400)
      const pdfData = await compileTypstPdf(src)
      clearTimeout(statusTimer)
      hideTypstStatus()
      if (typstPending !== null) continue
      if (!pdfData || !pdfData.length) {
        preview.innerHTML = '<p class="muted">Empty output</p>'
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
      if (oldWrap) preview.replaceChild(wrap, oldWrap)
      else { preview.innerHTML = ''; preview.appendChild(wrap) }
      bindWrapScroll(wrap)
      setupTypstPan()
      if (scrollRatio > 0) wrap.scrollTop = scrollRatio * (wrap.scrollHeight - wrap.clientHeight)
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
      const suggestions = [
        { label: '#heading[', insertText: '#heading[${1:Title}]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Heading', range },
        { label: '#link(', insertText: '#link("${1:url}")[${2:text}]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Link', range },
        { label: '#image(', insertText: '#image("${1:url}", width: ${2:100%})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Image', range },
        { label: '#block[', insertText: '#block[\n  ${1}\n]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Block', range },
        { label: '#grid[', insertText: '#grid(columns: ${1:2})[\n  ${2}\n]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Grid', range },
        { label: '#stack[', insertText: '#stack(dir: ${1:ltr})[\n  ${2}\n]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Stack', range },
        { label: '#align(', insertText: '#align(${1:center})[\n  ${2}\n]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Align', range },
        { label: '#pad(', insertText: '#pad(${1:10pt})[\n  ${2}\n]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Pad', range },
        { label: '#box[', insertText: '#box[\n  ${1}\n]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Box', range },
        { label: '#text[', insertText: '#text(${1:12pt})[${2}]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Text size', range },
        { label: '#strong[', insertText: '#strong[${1:text}]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Strong/Bold', range },
        { label: '#emph[', insertText: '#emph[${1:text}]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Emphasis/Italic', range },
        { label: '#raw(', insertText: '#raw(${1:"code"})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Raw code', range },
        { label: '#table[', insertText: '#table(columns: ${1:2})[\n  ${2}\n]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Table', range },
        { label: '#enum[', insertText: '#enum[\n  ${1:Item}\n]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Enum list', range },
        { label: '#list[', insertText: '#list[\n  ${1:Item}\n]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Bullet list', range },
        { label: '#term[', insertText: '#term[\n  ${1:Term} ${2:Description}\n]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Term list', range },
        { label: '#page[', insertText: '#page(width: ${1:210mm}, height: ${2:297mm})[\n  ${3}\n]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Page layout', range },
        { label: '#set ', insertText: '#set ${1:page}(width: ${2:210mm})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Set rule', range },
        { label: '#let ', insertText: '#let ${1:name} = ${2:value}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Let binding', range },
        { label: '#import ', insertText: '#import "${1:module}": ${2:symbol}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Import', range },
        { label: '= ', insertText: '= ${1:Heading}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Markup heading', range },
        { label: '== ', insertText: '== ${1:Heading}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Markup heading 2', range },
        { label: '```typst', insertText: '```typst\n${1}\n```', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Code block', range },
        { label: '/* ', insertText: '/* ${1} */', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Comment', range },
      ]
      return { suggestions }
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
      const info = (token.info || '').trim()
      const lang = info.split(/\s+/)[0] || 'text'
      const fallback = () => '<pre><code class="language-' + lang + '">' + md.utils.escapeHtml(token.content) + '</code></pre>'
      try {
        return highlighter.codeToHtml(token.content, {
          lang,
          themes: { light: THEME_LIGHT, dark: THEME_DARK },
          defaultColor: false,
          meta: { __raw: info }
        })
      } catch (e) {
        return fallback()
      }
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
  if (!isTypstPage) {
    const previewEl = document.getElementById('editor-preview')
    if (previewEl) previewEl.style.setProperty('font-size', Math.round(size * 0.95) + 'px', 'important')
  }
}
function updateFontSizeInput() {
  if (!fontSizeInput) return
  if (isTypstPage) {
    fontSizeInput.value = Math.round(typstZoom * 100) + '%'
    fontSizeInput.title = 'Typst 预览缩放 %'
  } else {
    fontSizeInput.value = getMonacoFontSize() + 'px'
    fontSizeInput.title = '编辑器字体大小'
  }
}
if (fontSizeInput) {
  updateFontSizeInput()
  fontSizeInput.addEventListener('change', () => {
    const val = parseInt(fontSizeInput.value) || 0
    if (isTypstPage) {
      typstZoom = Math.max(TYPST_ZOOM_MIN, Math.min(TYPST_ZOOM_MAX, val / 100))
      applyTypstZoom()
    } else {
      setEditorFontSize(val)
    }
  })
  fontSizeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); fontSizeInput.blur() }
  })
}
if (previewFontDecreaseBtn) previewFontDecreaseBtn.addEventListener('click', () => {
  if (isTypstPage) typstZoomOut()
  else setEditorFontSize(getMonacoFontSize() - 1)
  updateFontSizeInput()
})
if (previewFontIncreaseBtn) previewFontIncreaseBtn.addEventListener('click', () => {
  if (isTypstPage) typstZoomIn()
  else setEditorFontSize(getMonacoFontSize() + 1)
  updateFontSizeInput()
})

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
  if (!isTypstPage) {
    const previewEl = document.getElementById('editor-preview')
    if (previewEl) previewEl.style.fontSize = Math.round(fontSize * 0.95) + 'px'
  }
}
window.addEventListener('storage', e => {
  if (e.key === 'blog_font_settings') applyFontToMonaco()
})
window.addEventListener('blog-font-settings-changed', applyFontToMonaco)

initEditor()
