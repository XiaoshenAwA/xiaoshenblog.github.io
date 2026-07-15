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

function handleTab(ta, updateFn) {
  ta.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const indent = getIndent()
      const start = ta.selectionStart
      const end = ta.selectionEnd
      if (!document.execCommand('insertText', false, indent)) {
        ta.value = ta.value.substring(0, start) + indent + ta.value.substring(end)
        ta.selectionStart = ta.selectionEnd = start + indent.length
      }
      if (updateFn) updateFn()
    }
  })
}

function isInCodeBlock(text, pos) {
  const before = text.substring(0, pos)
  let fences = 0
  for (const line of before.split('\n')) {
    if (/^\s*`{3,}/.test(line) || /^\s*~{3,}/.test(line)) fences++
  }
  return fences % 2 === 1
}

function setupAutoClose(ta, updateFn) {
  ta.addEventListener('keydown', e => {
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const val = ta.value
    const pair = { '{': '}', '(': ')', '[': ']' }
    const closers = Object.values(pair)

    if (e.key in pair) {
      e.preventDefault()
      if (!document.execCommand('insertText', false, e.key + pair[e.key])) {
        ta.value = val.substring(0, start) + e.key + pair[e.key] + val.substring(end)
      }
      ta.selectionStart = ta.selectionEnd = start + 1
      if (updateFn) updateFn(); return
    }

    if (closers.includes(e.key) && val[start] === e.key) {
      e.preventDefault()
      ta.selectionStart = ta.selectionEnd = start + 1
      if (updateFn) updateFn(); return
    }

    if (e.key === 'Backspace' && start > 0 && start < val.length && pair[val[start - 1]] === val[start]) {
      e.preventDefault()
      ta.value = val.substring(0, start - 1) + val.substring(start + 1)
      ta.selectionStart = ta.selectionEnd = start - 1
      if (updateFn) updateFn(); return
    }

    if (e.key === 'Enter' && start === end) {
      const inCode = isInCodeBlock(val, start)
      const lineStart = val.lastIndexOf('\n', start - 1) + 1
      const curLine = val.substring(lineStart, start)
      const indent = curLine.match(/^(\s*)/)[1]
      const lastLineChar = curLine.trimEnd().slice(-1)
      const afterCursor = val.substring(end)

      if (inCode && (lastLineChar === '{' || lastLineChar === '(' || lastLineChar === '[' || lastLineChar === ':')) {
        e.preventDefault()
        const deep = indent + '  '
        const nextChar = afterCursor.trimStart()[0]
        if (nextChar === pair[lastLineChar]) {
          if (!document.execCommand('insertText', false, '\n' + deep + '\n' + indent)) {
            ta.value = val.substring(0, start) + '\n' + deep + '\n' + indent + val.substring(end)
          }
          ta.selectionStart = ta.selectionEnd = start + 1 + deep.length
        } else {
          document.execCommand('insertText', false, '\n' + deep)
        }
        if (updateFn) updateFn(); return
      }

      if (indent.length > 0) {
        e.preventDefault()
        if (!document.execCommand('insertText', false, '\n' + indent)) {
          ta.value = val.substring(0, start) + '\n' + indent + val.substring(end)
          ta.selectionStart = ta.selectionEnd = start + 1 + indent.length
        }
        if (updateFn) updateFn()
      }
    }
  })
}

textarea.addEventListener('input', update)
textarea.addEventListener('scroll', syncGutterScroll)
handleTab(textarea, update)
setupAutoClose(textarea, update)
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
document.querySelectorAll('.toolbar-btn[data-md]').forEach(btn => {
  btn.addEventListener('click', () => {
    const md = btn.dataset.md
    const wrap = btn.dataset.wrap
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const sel = textarea.value.substring(start, end)
    const before = textarea.value.substring(0, start)
    const after = textarea.value.substring(end)
    if (sel) {
      textarea.value = before + md + sel + wrap + after
      textarea.selectionStart = start + md.length
      textarea.selectionEnd = start + md.length + sel.length
    } else {
      textarea.value = before + md + wrap + after
      const pos = start + md.length
      textarea.selectionStart = textarea.selectionEnd = pos
    }
    textarea.focus()
    update()
  })
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
