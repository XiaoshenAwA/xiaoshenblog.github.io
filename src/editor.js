import './style.css'
import './editor.css'
import 'katex/dist/katex.min.css'
import markdownit from 'markdown-it'
import markdownItContainer from 'markdown-it-container'
import { full as markdownitEmoji } from 'markdown-it-emoji'
import markdownitMark from 'markdown-it-mark'
import markdownitInsDel from 'markdown-it-ins-del'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import sql from 'highlight.js/lib/languages/sql'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import cpp from 'highlight.js/lib/languages/cpp'
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('cpp', cpp)

import 'highlight.js/styles/github.css'
import katex from 'katex'

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

// inline math: $...$
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

// display math: $$...$$
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

const cfg = window.__CONFIG__ || {}
const STORAGE_KEY = cfg.EDITOR_DRAFT_PREFIX || 'editor-draft'

const textarea = document.getElementById('editor-input')
const preview = document.getElementById('editor-preview')
const gutter = document.getElementById('editor-gutter')

function updateLineNumbers() {
  const lines = textarea.value.split('\n')
  gutter.textContent = Array.from({ length: lines.length }, (_, i) => i + 1).join('\n')
}

function syncGutterScroll() { gutter.scrollTop = textarea.scrollTop }

function update() {
  preview.innerHTML = md.render(textarea.value || '*...*')
  preview.querySelectorAll('pre code').forEach(block => {
    const lang = (block.className.match(/language-(\w+)/) || [])[1]
    if (lang && hljs.getLanguage(lang)) {
      block.innerHTML = hljs.highlight(block.textContent, { language: lang, ignoreIllegals: true }).value
      block.className = (block.className || '') + ' hljs'
    }
  })
  localStorage.setItem(STORAGE_KEY, textarea.value)
  updateLineNumbers()
}

const saved = localStorage.getItem(STORAGE_KEY)
if (saved) textarea.value = saved

const INDENT_MODES = ['tab', 'spaces2', 'spaces4', 'spaces8']
let indentMode = localStorage.getItem('editor-indent-mode') || cfg.EDITOR_INDENT_MODE || 'tab'

function getIndent() {
  if (indentMode === 'tab') return '\t'
  return ' '.repeat(parseInt(indentMode.replace('spaces', '')))
}

function indentLabel() {
  if (indentMode === 'tab') return '⇥'
  return indentMode.replace('spaces', '')
}

function updateIndentBtns() {
  document.querySelectorAll('#indent-toggle, .indent-toggle').forEach(btn => {
    btn.innerHTML = '<i class="fas fa-indent"></i> ' + indentLabel()
    btn.title = '缩进：' + indentLabel() + ' （点击切换）'
  })
}

const pair = { '{': '}', '(': ')', '[': ']' }
const closers = new Set(Object.values(pair))

textarea.addEventListener('keydown', function(e) {
  if (e.ctrlKey || e.metaKey) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const val = textarea.value

  if (e.key === 'Tab') {
    e.preventDefault()
    const ind = getIndent()
    textarea.value = val.substring(0, start) + ind + val.substring(end)
    textarea.selectionStart = textarea.selectionEnd = start + ind.length
    update(); return
  }

  if (e.key in pair && start === end) {
    e.preventDefault()
    textarea.value = val.substring(0, start) + e.key + pair[e.key] + val.substring(end)
    textarea.selectionStart = textarea.selectionEnd = start + 1
    update(); return
  }

  if (closers.has(e.key) && val[start] === e.key) {
    e.preventDefault()
    textarea.selectionStart = textarea.selectionEnd = start + 1
    update(); return
  }

  if (e.key === 'Backspace' && start > 0 && start < val.length && pair[val[start - 1]] === val[start]) {
    e.preventDefault()
    textarea.value = val.substring(0, start - 1) + val.substring(start + 1)
    textarea.selectionStart = textarea.selectionEnd = start - 1
    update(); return
  }

  if (e.key === 'Enter' && start === end) {
    const lineStart = val.lastIndexOf('\n', start - 1) + 1
    const curLine = val.substring(lineStart, start)
    const indent = curLine.match(/^(\s*)/)[1]
    const lastChar = curLine.trimEnd().slice(-1)
    const after = val.substring(end)

    if (lastChar === '{' || lastChar === '(' || lastChar === '[' || lastChar === ':') {
      e.preventDefault()
      const deep = indent + getIndent()
      const next = after.trimStart()[0]
      if (next !== undefined && next === pair[lastChar]) {
        textarea.value = val.substring(0, start) + '\n' + deep + '\n' + indent + val.substring(end)
        textarea.selectionStart = textarea.selectionEnd = start + 1 + deep.length
      } else {
        textarea.value = val.substring(0, start) + '\n' + deep + val.substring(end)
        textarea.selectionStart = textarea.selectionEnd = start + 1 + deep.length
      }
      update(); return
    }

    if (indent.length > 0) {
      e.preventDefault()
      textarea.value = val.substring(0, start) + '\n' + indent + val.substring(end)
      textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length
      update(); return
    }
  }
})

textarea.addEventListener('input', update)
textarea.addEventListener('scroll', syncGutterScroll)
update()

const indentBtn = document.getElementById('indent-toggle')
if (indentBtn) {
  indentBtn.addEventListener('click', () => {
    const idx = INDENT_MODES.indexOf(indentMode)
    indentMode = INDENT_MODES[(idx + 1) % INDENT_MODES.length]
    localStorage.setItem('editor-indent-mode', indentMode)
    updateIndentBtns()
  })
}
updateIndentBtns()

// toolbar buttons
function insertAtCursor(ta, text) {
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const before = ta.value.substring(0, start)
  const after = ta.value.substring(end)
  ta.value = before + text + after
  ta.selectionStart = ta.selectionEnd = start + text.length
  ta.focus()
  update()
}

function insertWrapAtCursor(ta, md, wrap) {
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const sel = textarea.value.substring(start, end)
  const before = ta.value.substring(0, start)
  const after = ta.value.substring(end)
  if (sel) {
    ta.value = before + md + sel + wrap + after
    ta.selectionStart = start + md.length
    ta.selectionEnd = start + md.length + sel.length
  } else {
    ta.value = before + md + wrap + after
    const pos = start + md.length
    ta.selectionStart = ta.selectionEnd = pos
  }
  ta.focus()
  update()
}

function hljsHighlight(code, lang) {
  if (lang && hljs.getLanguage(lang)) {
    try { return hljs.highlight(code, { language: lang }).value } catch {}
  }
  try { return hljs.highlightAuto(code).value } catch {}
  return code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

const linkModal = document.getElementById('insert-link-modal')
const imageModal = document.getElementById('insert-image-modal')
const codeModal = document.getElementById('insert-code-modal')

document.querySelectorAll('.toolbar-btn[data-md]').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action

    if (action === 'link') {
      const sel = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
      document.getElementById('link-text').value = sel || ''
      document.getElementById('link-url').value = ''
      linkModal.style.display = ''
      setTimeout(() => { document.getElementById(sel ? 'link-url' : 'link-text').focus() }, 80)
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
      document.getElementById('code-input').value = ''
      document.getElementById('code-highlight').innerHTML = ''
      document.getElementById('code-gutter').textContent = '1'
      document.getElementById('code-lang').value = ''
      codeModal.style.display = ''
      setTimeout(() => document.getElementById('code-input').focus(), 80)
      return
    }

    insertWrapAtCursor(textarea, btn.dataset.md, btn.dataset.wrap)
  })
})

document.getElementById('link-confirm').addEventListener('click', () => {
  const url = document.getElementById('link-url').value.trim()
  if (!url) return
  const text = document.getElementById('link-text').value.trim() || url
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const before = textarea.value.substring(0, start)
  const after = textarea.value.substring(end)
  const insertion = '[' + text + '](' + url + ')'
  textarea.value = before + insertion + after
  textarea.selectionStart = start + 1
  textarea.selectionEnd = start + 1 + text.length
  textarea.focus()
  update()
  linkModal.style.display = 'none'
})

document.getElementById('image-confirm').addEventListener('click', () => {
  const url = document.getElementById('image-url').value.trim()
  if (!url) return
  const alt = document.getElementById('image-alt').value.trim() || '图片'
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const before = textarea.value.substring(0, start)
  const after = textarea.value.substring(end)
  const insertion = '![' + alt + '](' + url + ')'
  textarea.value = before + insertion + after
  textarea.selectionStart = start + 2
  textarea.selectionEnd = start + 2 + alt.length
  textarea.focus()
  update()
  imageModal.style.display = 'none'
})

document.getElementById('code-confirm').addEventListener('click', () => {
  const lang = document.getElementById('code-lang').value
  const code = document.getElementById('code-input').value
  const block = '```' + lang + '\n' + code + '\n```'
  insertAtCursor(textarea, block)
  codeModal.style.display = 'none'
})

const codeInput = document.getElementById('code-input')
const codeHighlight = document.getElementById('code-highlight')
const codeLang = document.getElementById('code-lang')
const codeGutter = document.getElementById('code-gutter')

function updateCodeLineNumbers() {
  const lines = (codeInput.value || '').split('\n')
  codeGutter.textContent = Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i + 1).join('\n')
}

function syncCodeScroll() {
  codeHighlight.scrollTop = codeInput.scrollTop
  codeHighlight.scrollLeft = codeInput.scrollLeft
  codeGutter.scrollTop = codeInput.scrollTop
}

function updateCodeHighlight() {
  const code = codeInput.value || ''
  const lang = codeLang.value
  codeHighlight.innerHTML = hljsHighlight(code, lang) + '\n'
  updateCodeLineNumbers()
}
codeInput.addEventListener('input', updateCodeHighlight)
codeInput.addEventListener('scroll', syncCodeScroll)
codeLang.addEventListener('change', updateCodeHighlight)

const codePairs = { '{': '}', '(': ')', '[': ']', '"': '"', "'": "'", '`': '`' }
const codeClosers = Object.values(codePairs)
const codePairsNoTick = { '{': '}', '(': ')', '[': ']', '"': '"', "'": "'" }

codeInput.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault()
    const s = codeInput.selectionStart
    const end = codeInput.selectionEnd
    const ind = getIndent()
    codeInput.value = codeInput.value.substring(0, s) + ind + codeInput.value.substring(end)
    codeInput.selectionStart = codeInput.selectionEnd = s + ind.length
    updateCodeHighlight(); return
  }
  if (e.key === 'Enter' && codeInput.selectionStart === codeInput.selectionEnd) {
    const s = codeInput.selectionStart
    const val = codeInput.value
    const lineStart = val.lastIndexOf('\n', s - 1) + 1
    const curLine = val.substring(lineStart, s)
    const indent = curLine.match(/^(\s*)/)[1]
    const lastChar = curLine.trimEnd().slice(-1)
    const after = val.substring(s)

    if (lastChar === '{' || lastChar === '(' || lastChar === '[' || lastChar === ':') {
      e.preventDefault()
      const deep = indent + getIndent()
      const next = after.trimStart()[0]
      if (next !== undefined && next === (codePairsNoTick[lastChar] || '')) {
        codeInput.value = val.substring(0, s) + '\n' + deep + '\n' + indent + after
        codeInput.selectionStart = codeInput.selectionEnd = s + 1 + deep.length
      } else {
        codeInput.value = val.substring(0, s) + '\n' + deep + after
        codeInput.selectionStart = codeInput.selectionEnd = s + 1 + deep.length
      }
      updateCodeHighlight(); return
    }

    if (indent.length > 0) {
      e.preventDefault()
      codeInput.value = val.substring(0, s) + '\n' + indent + after
      codeInput.selectionStart = codeInput.selectionEnd = s + 1 + indent.length
      updateCodeHighlight(); return
    }
  }
  if (e.key in codePairsNoTick) {
    e.preventDefault()
    const s = codeInput.selectionStart
    const end = codeInput.selectionEnd
    codeInput.value = codeInput.value.substring(0, s) + e.key + codePairsNoTick[e.key] + codeInput.value.substring(end)
    codeInput.selectionStart = codeInput.selectionEnd = s + 1
    updateCodeHighlight(); return
  }
  if (')' === e.key || ']' === e.key || '}' === e.key || '"' === e.key || "'" === e.key) {
    if (codeInput.value[codeInput.selectionStart] === e.key) {
      e.preventDefault()
      codeInput.selectionStart = codeInput.selectionEnd = codeInput.selectionStart + 1
      return
    }
  }
  if (e.key === 'Backspace') {
    const s = codeInput.selectionStart
    if (s > 0 && s <= codeInput.value.length) {
      const before = codeInput.value[s - 1]
      const after = codeInput.value[s]
      if (codePairsNoTick[before] === after || (before === '`' && after === '`')) {
        e.preventDefault()
        codeInput.value = codeInput.value.substring(0, s - 1) + codeInput.value.substring(s + 1)
        codeInput.selectionStart = codeInput.selectionEnd = s - 1
        updateCodeHighlight()
      }
    }
  }
})

// view mode toggle
document.querySelectorAll('.view-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    const container = document.querySelector('.editor-container')
    if (container) container.className = 'editor-container mode-' + btn.dataset.mode
  })
})

// download
document.getElementById('editor-download').addEventListener('click', () => {
  const blob = new Blob([textarea.value || ''], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = cfg.EDITOR_DOWNLOAD_FILENAME || 'document.md'
  a.click()
  URL.revokeObjectURL(url)
})

// fullscreen toggle
const fullscreenBtn = document.getElementById('editor-fullscreen')
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', () => {
    const page = document.querySelector('.editor-page')
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
