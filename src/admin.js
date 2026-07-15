import './style.css'
import './admin.css'
import 'katex/dist/katex.min.css'
import { createClient } from '@supabase/supabase-js'
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
  try { return katex.renderToString(str, { displayMode, throwOnError: false }) }
  catch { return str }
}

function addMathPlugin(md) {
  md.inline.ruler.before('escape', 'math_inline', (state, silent) => {
    let pos = state.pos
    if (state.src.charCodeAt(pos) !== 36) return false
    if (state.src.charCodeAt(pos + 1) === 36) return false
    const start = pos + 1
    pos = state.src.indexOf('$', start)
    if (pos === -1) return false
    if (silent) return true
    const token = state.push('math_inline', 'math', 0)
    token.content = state.src.slice(start, pos)
    state.pos = pos + 1
    return true
  })
  md.renderer.rules.math_inline = (tokens, idx) => renderMath(tokens[idx].content, false)
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
        if (state.src.charCodeAt(bpos) === 36 && bpos + 1 < emax && state.src.charCodeAt(bpos + 1) === 36) break
        if (content) content += '\n'
        content += state.src.slice(bpos, emax)
      }
      if (nextLine >= endLine) return false
    } else { nextLine = startLine + 1 }
    if (silent) return true
    const token = state.push('math_display', 'math', 0)
    token.content = content
    token.map = [startLine, nextLine + 1]
    state.line = nextLine + 1
    return true
  })
  md.renderer.rules.math_display = (tokens, idx) => renderMath(tokens[idx].content, true)
}

const cfg = window.__CONFIG__ || {}
const SUPABASE_URL = cfg.SUPABASE_URL
const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const DEPLOY_HOOK_URL = cfg.DEPLOY_HOOK_URL || ''
const SAVE_REDIRECT_DELAY = cfg.ADMIN_SAVE_REDIRECT_DELAY || 1500
const CHANGE_PW_REDIRECT_DELAY = cfg.ADMIN_CHANGE_PW_REDIRECT_DELAY || 2000
const DB_TABLE = cfg.DB_TABLE || 'posts'
const L = cfg.LOCALE || {}

function triggerDeploy() {
  if (DEPLOY_HOOK_URL) fetch(DEPLOY_HOOK_URL, { method: 'POST' }).catch(() => {})
}

const $ = s => document.querySelector(s)
const $$ = s => document.querySelectorAll(s)

// DOM refs
const logoutBtn = $('#logout-btn')
const changePwBtn = $('#change-pw-btn')
const changePwForm = $('#change-pw-form')
const changePwMessage = $('#change-pw-message')
const newPasswordInput = $('#new-password')
const confirmPasswordInput = $('#confirm-password')
const editAboutBtn = $('#edit-about-btn')
const aboutForm = $('#about-form')
const aboutContent = $('#about-content')
const aboutMessage = $('#about-message')
const aboutSubmit = $('#about-submit')

function showView(id) {
  $$('.admin-view').forEach(v => v.classList.remove('active'))
  const el = document.getElementById(id)
  if (el) el.classList.add('active')
}

function showButtons(show) {
  logoutBtn.style.display = show ? 'inline-block' : 'none'
  changePwBtn.style.display = show ? 'inline-block' : 'none'
}

async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    showView('view-posts')
    $('#user-email').textContent = user.email
    showButtons(true)
    loadPosts()
  } else {
    showView('view-login')
    showButtons(false)
  }
}

$('#login-form').addEventListener('submit', async e => {
  e.preventDefault()
  const email = $('#login-email').value
  const password = $('#login-password').value
  $('#login-error').textContent = ''
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    $('#login-error').textContent = L.login_failed_prefix || '登录失败: ' + error.message
  } else {
    try { sessionStorage.setItem('admin', 'true') } catch(e) {}
$('#search-clear').addEventListener('click', () => {
  $('#post-search').value = ''
  $('.search-bar').classList.remove('has-value')
  filterPosts()
})

$('#post-search').addEventListener('input', () => {
  $('.search-bar').classList.toggle('has-value', $('#post-search').value.length > 0)
  filterPosts()
})

checkAuth()
  }
})

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut()
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-')) localStorage.removeItem(key)
  })
  try { sessionStorage.removeItem('admin') } catch(e) {}
  location.reload()
})

// Change Password
window.showChangePassword = function() {
  changePwMessage.style.display = 'none'
  changePwMessage.textContent = ''
  changePwMessage.className = 'message-msg'
  changePwForm.reset()
  showView('view-change-pw')
}

window.cancelChangePw = function() {
  showView('view-posts')
}

changePwBtn.addEventListener('click', showChangePassword)

changePwForm.addEventListener('submit', async e => {
  e.preventDefault()
  const newPw = newPasswordInput.value
  const confirmPw = confirmPasswordInput.value

  changePwMessage.style.display = 'none'
  changePwMessage.textContent = ''
  changePwMessage.className = 'message-msg'

  if (!newPw) {
    changePwMessage.textContent = L.password_empty_error || '请输入新密码'
    changePwMessage.className = 'message-msg error'
    changePwMessage.style.display = 'block'
    return
  }
  if (newPw !== confirmPw) {
    changePwMessage.textContent = L.password_mismatch_error || '两次输入的密码不一致'
    changePwMessage.className = 'message-msg error'
    changePwMessage.style.display = 'block'
    return
  }
  if (newPw.length < (cfg.ADMIN_MIN_PASSWORD_LENGTH || 6)) {
    changePwMessage.textContent = (L.password_too_short_error_prefix || '密码至少') + (cfg.ADMIN_MIN_PASSWORD_LENGTH || 6) + (L.password_too_short_error_suffix || '位')
    changePwMessage.className = 'message-msg error'
    changePwMessage.style.display = 'block'
    return
  }

  const submitBtn = $('#change-pw-submit')
  submitBtn.disabled = true
  submitBtn.textContent = L.password_modifying || '修改中...'

  const { error } = await supabase.auth.updateUser({ password: newPw })

  submitBtn.disabled = false
  submitBtn.textContent = L.password_confirm_button || '确认修改'

  if (error) {
    changePwMessage.textContent = (L.password_modify_failed_prefix || '修改失败: ') + error.message
    changePwMessage.className = 'message-msg error'
    changePwMessage.style.display = 'block'
    return
  }

  changePwMessage.textContent = L.password_modify_success || '密码修改成功！'
  changePwMessage.className = 'message-msg success'
  changePwMessage.style.display = 'block'
  changePwForm.reset()

  setTimeout(() => {
    cancelChangePw()
  }, CHANGE_PW_REDIRECT_DELAY)
})

// About editing
editAboutBtn.addEventListener('click', async () => {
  aboutMessage.style.display = 'none'
  aboutContent.value = L.about_loading || '加载中...'
  showView('view-about')
  updatePreview('about-content', 'about-preview')
  try {
    const res = await fetch('/about/raw')
    const text = await res.text()
    aboutContent.value = text
    updatePreview('about-content', 'about-preview')
  } catch {
    aboutContent.value = ''
    updatePreview('about-content', 'about-preview')
    aboutMessage.textContent = L.about_load_failed || '加载失败'
    aboutMessage.className = 'message-msg error'
    aboutMessage.style.display = 'block'
  }
})

window.cancelAbout = function () {
  showView('view-posts')
}

aboutForm.addEventListener('submit', async e => {
  e.preventDefault()
  aboutMessage.style.display = 'none'
  aboutMessage.textContent = ''
  aboutMessage.className = 'message-msg'

  const content = aboutContent.value
  if (!content) {
    aboutMessage.textContent = L.about_empty_error || '内容不能为空'
    aboutMessage.className = 'message-msg error'
    aboutMessage.style.display = 'block'
    return
  }

  aboutSubmit.disabled = true
  aboutSubmit.textContent = L.about_saving || '保存中...'

  try {
    const res = await fetch('/about', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    if (!res.ok) throw new Error(await res.text())
    aboutMessage.textContent = L.about_save_success || '保存成功！'
    aboutMessage.className = 'message-msg success'
    aboutMessage.style.display = 'block'
    setTimeout(cancelAbout, SAVE_REDIRECT_DELAY)
  } catch (err) {
    aboutMessage.textContent = (L.about_save_failed_prefix || '保存失败: ') + err.message
    aboutMessage.className = 'message-msg error'
    aboutMessage.style.display = 'block'
  }

  aboutSubmit.disabled = false
  aboutSubmit.textContent = L.save_button || '保存'
})

// Toolbar buttons (supports textarea with data-target)
document.querySelectorAll('.editor-toolbar .toolbar-btn[data-md]').forEach(btn => {
  btn.addEventListener('click', () => {
    const ta = document.getElementById(btn.dataset.target)
    if (!ta) return
    const md = btn.dataset.md
    const wrap = btn.dataset.wrap
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const sel = ta.value.substring(start, end)
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
    ta.dispatchEvent(new Event('input'))
  })
})

// Live Markdown preview
const md = markdownit({ html: true, linkify: true })
md.use(markdownitEmoji)
md.use(markdownitMark)
md.use(markdownitInsDel)
addMathPlugin(md)

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

function updateGutter(textareaId) {
  const ta = document.getElementById(textareaId)
  const gutter = document.querySelector('.editor-gutter[data-for="' + textareaId + '"]')
  if (ta && gutter) {
    const lines = ta.value.split('\n')
    gutter.textContent = Array.from({ length: lines.length }, (_, i) => i + 1).join('\n')
  }
}

function makeGutterScroll(ta, gutter) {
  ta.addEventListener('scroll', () => { gutter.scrollTop = ta.scrollTop })
}

function updatePreview(textareaId, previewId) {
  const textarea = document.getElementById(textareaId)
  const preview = document.getElementById(previewId)
  if (textarea && preview) {
    preview.innerHTML = md.render(textarea.value || '*...*')
    preview.querySelectorAll('pre code').forEach(block => {
      const lang = (block.className.match(/language-(\w+)/) || [])[1]
      if (lang && hljs.getLanguage(lang)) {
        block.innerHTML = hljs.highlight(block.textContent, { language: lang, ignoreIllegals: true }).value
        block.className = (block.className || '') + ' hljs'
      }
    })
    updateGutter(textareaId)
  }
}

function saveDraft(textareaId) {
  const ta = document.getElementById(textareaId)
  if (ta) localStorage.setItem(cfg.EDITOR_DRAFT_PREFIX + '-' + textareaId, ta.value)
}

function setupPreview(textareaId, previewId) {
  const textarea = document.getElementById(textareaId)
  if (textarea) {
    const saved = localStorage.getItem(cfg.EDITOR_DRAFT_PREFIX + '-' + textareaId)
    if (saved) textarea.value = saved
    textarea.addEventListener('input', () => { saveDraft(textareaId); updatePreview(textareaId, previewId) })
    const gutterEl = document.querySelector('.editor-gutter[data-for="' + textareaId + '"]')
    if (gutterEl) makeGutterScroll(textarea, gutterEl)
    updatePreview(textareaId, previewId)
  }
}

// View mode toggle
document.querySelectorAll('.view-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target
    const group = document.querySelectorAll(`.view-mode-btn[data-target="${targetId}"]`)
    group.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    const container = document.getElementById(targetId)
    if (container) container.className = 'editor-container mode-' + btn.dataset.mode
  })
})

// Fullscreen toggle
function exitFullscreen() {
  document.querySelectorAll('.editor-wrap.is-fullscreen').forEach(w => {
    w.classList.remove('is-fullscreen')
    const btn = w.querySelector('.fs-toggle')
    if (btn) { btn.querySelector('i').className = 'fas fa-expand'; btn.title = '全屏' }
  })
}
document.querySelectorAll('.fs-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const wrap = btn.closest('.editor-wrap')
    if (!wrap) return
    const isFs = wrap.classList.toggle('is-fullscreen')
    const icon = btn.querySelector('i')
    icon.className = isFs ? 'fas fa-compress' : 'fas fa-expand'
    btn.title = isFs ? '退出全屏' : '全屏'
  })
})
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') exitFullscreen()
})

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
  document.querySelectorAll('.indent-toggle').forEach(btn => {
    btn.innerHTML = '<i class="fas fa-indent"></i> ' + indentLabel()
    btn.title = '缩进：' + indentLabel() + ' （点击切换）'
  })
}

function setupTab(ta, updateFn) {
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

document.querySelectorAll('.indent-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const idx = INDENT_MODES.indexOf(indentMode)
    indentMode = INDENT_MODES[(idx + 1) % INDENT_MODES.length]
    localStorage.setItem('editor-indent-mode', indentMode)
    updateIndentBtns()
  })
})

setTimeout(() => {
  setupPreview('edit-content', 'edit-preview')
  setupPreview('about-content', 'about-preview')
  ;['edit-content', 'about-content'].forEach(id => {
    const ta = document.getElementById(id)
    if (ta) {
      const upd = () => { saveDraft(id); updatePreview(id, id === 'edit-content' ? 'edit-preview' : 'about-preview') }
      setupTab(ta, upd)
      setupAutoClose(ta, upd)
    }
  })
  const pubToggle = document.getElementById('edit-published')
  if (pubToggle) {
    pubToggle.addEventListener('change', function() {
      document.getElementById('edit-published-label').textContent = this.checked ? '公开' : '不公开'
    })
  }
  const titleInput = document.getElementById('edit-title')
  if (titleInput) {
    titleInput.value = localStorage.getItem(cfg.EDITOR_DRAFT_PREFIX + '-edit-title') || ''
    titleInput.addEventListener('input', () => {
      localStorage.setItem(cfg.EDITOR_DRAFT_PREFIX + '-edit-title', titleInput.value)
    })
  }
  updateIndentBtns()
}, 0)

let allPosts = []

function renderPosts(posts) {
  $('#posts-list').innerHTML = ''
  const empty = $('#posts-empty')
  if (!posts || posts.length === 0) {
    empty.style.display = 'block'
    return
  }
  empty.style.display = 'none'
  for (const post of posts) {
    const d = document.createElement('div')
    d.className = 'post-item'
    const isPublished = post.published !== false
    d.innerHTML = `
      <div class="post-item-info">
        <strong>${post.title}</strong>
        <span class="muted">${new Date(post.created_at).toLocaleString('zh-CN')}</span>
        <span class="post-item-status"><span class="status-dot ${isPublished ? 'published' : 'private'}"></span>${isPublished ? '公开' : '不公开'}</span>
        <span class="tag-list">${(post.tags || []).map(t => '<span class="tag-pill">' + t + '</span>').join('')}</span>
      </div>
      <div class="post-item-actions">
        <button class="btn btn-sm btn-outline" onclick="editPost(${post.id})">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id})">删除</button>
      </div>`
    $('#posts-list').appendChild(d)
  }
}

function filterPosts() {
  const q = ($('#post-search').value || '').trim().toLowerCase()
  if (!q) { renderPosts(allPosts); return }
  const filtered = allPosts.filter(p => {
    const title = (p.title || '').toLowerCase()
    const tags = (p.tags || []).join(' ').toLowerCase()
    const category = (p.category || '').toLowerCase()
    return title.includes(q) || tags.includes(q) || category.includes(q)
  })
  renderPosts(filtered)
}

async function loadPosts() {
  $('#posts-loading').style.display = 'block'
  $('#posts-list').innerHTML = ''
  $('#posts-empty').style.display = 'none'
  const { data, error } = await supabase.from(DB_TABLE).select('*').order('created_at', { ascending: false })
  $('#posts-loading').style.display = 'none'
  if (error) { $('#posts-error').textContent = (L.load_failed_prefix || '加载失败: ') + error.message; return }
  allPosts = data || []
  if (allPosts.length === 0) {
    $('#posts-list').innerHTML = '<p class="muted">' + (L.no_posts || '暂无文章') + '</p>'
    return
  }
  renderPosts(allPosts)
}

window.editPost = async function (id) {
  const { data } = await supabase.from(DB_TABLE).select('*').eq('id', id).single()
  if (!data) return
  $('#edit-id').value = data.id
  $('#edit-title').value = data.title
  $('#edit-content').value = data.content
  $('#edit-tags').value = (data.tags || []).join(', ')
  $('#edit-category').value = data.category || ''
  $('#edit-cover').value = data.cover || ''
  $('#edit-published').checked = data.published !== false
  $('#edit-published-label').textContent = data.published !== false ? '公开' : '不公开'
  showView('view-edit')
  updatePreview('edit-content', 'edit-preview')
}

$('#edit-form').addEventListener('submit', async e => {
  e.preventDefault()
  const id = $('#edit-id').value
  const title = $('#edit-title').value
  const content = $('#edit-content').value
  const category = $('#edit-category').value || ''
  const tags = $('#edit-tags').value.split(',').map(t => t.trim()).filter(Boolean)
  const cover = $('#edit-cover').value
  const published = $('#edit-published').checked

  if (!title || !content) { $('#edit-error').textContent = L.empty_content_error || '标题和内容不能为空'; return }
  $('#edit-error').textContent = ''
  $('#edit-submit').disabled = true
  $('#edit-submit').textContent = L.saving || '保存中...'

  let error
  if (id) {
    ({ error } = await supabase.from(DB_TABLE).update({ title, content, tags, cover, category, published, word_count: content.length, updated_at: new Date().toISOString() }).eq('id', id))
  } else {
    ({ error } = await supabase.from(DB_TABLE).insert({ title, content, tags, cover, category, published, word_count: content.length }))
  }

  $('#edit-submit').disabled = false
  $('#edit-submit').textContent = L.save_button || '保存'
  if (error) { $('#edit-error').textContent = (L.save_failed_prefix || '保存失败: ') + error.message; return }
  clearDraft()
  cancelEdit()
  loadPosts()
  triggerDeploy()
})

function clearDraft() {
  localStorage.removeItem(cfg.EDITOR_DRAFT_PREFIX + '-edit-content')
  localStorage.removeItem(cfg.EDITOR_DRAFT_PREFIX + '-edit-title')
}

$('#new-post-btn').addEventListener('click', () => {
  $('#edit-id').value = ''
  $('#edit-title').value = localStorage.getItem(cfg.EDITOR_DRAFT_PREFIX + '-edit-title') || ''
  const draft = localStorage.getItem(cfg.EDITOR_DRAFT_PREFIX + '-edit-content')
  $('#edit-content').value = draft || ''
  $('#edit-category').value = ''
  $('#edit-tags').value = ''
  $('#edit-cover').value = ''
  $('#edit-published').checked = true
  $('#edit-published-label').textContent = '公开'
  $('#edit-submit').textContent = L.save_button || '保存'
  selectedCategoryPath = ''
  selectedTags = []
  updateCategoryDisplay()
  updateTagsDisplay()
  showView('view-edit')
  updatePreview('edit-content', 'edit-preview')
  setTimeout(loadPickerData, 100)
})

window.cancelEdit = function () {
  showView('view-posts')
}

window.deletePost = async function (id) {
  if (!confirm(L.delete_confirm || '确定删除此文章？')) return
  const { error } = await supabase.from(DB_TABLE).delete().eq('id', id)
  if (error) { alert((L.delete_failed_prefix || '删除失败: ') + error.message); return }
  loadPosts()
  triggerDeploy()
}

// ============ Tag Management ============

function showTagManageMsg(text, type) {
  const el = $('#tags-manage-message')
  el.textContent = text
  el.className = 'message-msg ' + type
  el.style.display = 'block'
  setTimeout(() => { el.style.display = 'none' }, 3000)
}

async function loadManagedTags() {
  $('#tags-manage-loading').style.display = 'block'
  $('#tags-manage-list').innerHTML = ''
  try {
    const res = await fetch('/api/admin/tags')
    const tags = await res.json()
    $('#tags-manage-loading').style.display = 'none'
    if (!tags.length) {
      $('#tags-manage-list').innerHTML = '<p class="muted" style="text-align:center;padding:40px">暂无标签</p>'
      return
    }
    const list = $('#tags-manage-list')
    const wrap = document.createElement('div')
    wrap.className = 'manage-list'
    wrap.innerHTML = '<div class="manage-list-header"><span class="col-name">名称</span><span class="col-count">文章数</span><span class="col-action"></span></div>'
    wrap.addEventListener('contextmenu', function(e) {
      if (e.target === wrap || e.target.classList.contains('manage-list') || e.target.closest('.manage-list-header')) {
        e.preventDefault()
        showContextMenu(e, 'tag', {})
      }
    })
    for (const tag of tags) {
      const item = document.createElement('div')
      item.className = 'manage-item tag-manage-item'
      item.dataset.id = tag.id
      item.dataset.name = tag.name
      item.dataset.type = 'tag'
      item.addEventListener('contextmenu', function(e) {
        showContextMenu(e, 'tag', { id: tag.id, name: tag.name })
      })
      item.innerHTML = `
        <span class="manage-item-name"><i class="fas fa-tag"></i> ${tag.name}</span>
        <span class="manage-item-count">${tag.post_count || 0}</span>
        <button class="btn btn-sm btn-danger" onclick="deleteManagedTag(${tag.id})"><i class="fas fa-trash"></i></button>
      `
      wrap.appendChild(item)
    }
    list.appendChild(wrap)
  } catch (e) {
    $('#tags-manage-loading').style.display = 'none'
    showTagManageMsg('加载失败: ' + e.message, 'error')
  }
}

window.deleteManagedTag = async function(id) {
  if (!confirm('确定删除此标签？')) return
  try {
    const res = await fetch('/api/admin/tags/' + id, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    showTagManageMsg('标签已删除', 'success')
    loadManagedTags()
  } catch (e) {
    showTagManageMsg('删除失败: ' + e.message, 'error')
  }
}

window.renameManagedTag = async function(id, name) {
  try {
    const res = await fetch('/api/admin/tags/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    showTagManageMsg('标签已重命名', 'success')
    loadManagedTags()
  } catch (e) {
    showTagManageMsg('重命名失败: ' + e.message, 'error')
  }
}

$('#manage-tags-btn').addEventListener('click', () => {
  showView('view-tags')
  loadManagedTags()
})

window.cancelTagManage = function() {
  showView('view-posts')
}

// Helper - add tag via API
async function addTag(name) {
  if (!name) return
  try {
    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    showTagManageMsg('标签已添加', 'success')
    loadManagedTags()
  } catch (e) {
    showTagManageMsg('添加失败: ' + e.message, 'error')
  }
}

// Helper - add top-level category via API
async function addTopCategory(name) {
  if (!name) return
  try {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parent_id: null })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    showCatManageMsg('分类已添加', 'success')
    loadManagedCategories()
  } catch (e) {
    showCatManageMsg('添加失败: ' + e.message, 'error')
  }
}

// Helper - add child category via API
async function addChildCategory(parentId, name) {
  if (!name) return
  try {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parent_id: parentId })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    showCatManageMsg('子分类已添加', 'success')
    loadManagedCategories()
  } catch (e) {
    showCatManageMsg('添加失败: ' + e.message, 'error')
  }
}

// ============ Category Management ============

function showCatManageMsg(text, type) {
  const el = $('#cats-manage-message')
  el.textContent = text
  el.className = 'message-msg ' + type
  el.style.display = 'block'
  setTimeout(() => { el.style.display = 'none' }, 3000)
}

function renderCategoryTree(tree, container, level) {
  for (const cat of tree) {
    const item = document.createElement('div')
    item.className = 'manage-item cat-tree-item'
    item.style.paddingLeft = (16 + level * 24) + 'px'
    item.dataset.id = cat.id
    item.dataset.name = cat.name
    item.dataset.path = cat.path || ''
    item.dataset.type = 'cat'
    item.addEventListener('contextmenu', function(e) {
      showContextMenu(e, 'cat', { id: cat.id, name: cat.name, path: cat.path || '' })
    })
    const icon = cat.children && cat.children.length ? 'fa-folder-open' : 'fa-folder'
    item.innerHTML = `
      <span class="manage-item-name"><i class="fas ${icon}"></i> ${cat.name}</span>
      <span class="manage-item-path" title="${cat.path}">${cat.path}</span>
      <span class="manage-item-count">${cat.post_count || 0}</span>
      <button class="btn btn-sm btn-danger" onclick="deleteManagedCategory(${cat.id})"><i class="fas fa-trash"></i></button>
    `
    container.appendChild(item)
    if (cat.children && cat.children.length) {
      renderCategoryTree(cat.children, container, level + 1)
    }
  }
}

async function loadManagedCategories() {
  $('#cats-manage-loading').style.display = 'block'
  $('#cats-manage-list').innerHTML = ''
  try {
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    $('#cats-manage-loading').style.display = 'none'
    const { tree, flat } = data
    if (!tree || tree.length === 0) {
      $('#cats-manage-list').innerHTML = '<p class="muted" style="text-align:center;padding:40px">暂无分类</p>'
      return
    }
    const wrap = document.createElement('div')
    wrap.className = 'manage-list'
    wrap.innerHTML = '<div class="manage-list-header"><span class="col-name">名称</span><span class="col-path">路径</span><span class="col-count">文章数</span><span class="col-action"></span></div>'
    wrap.addEventListener('contextmenu', function(e) {
      if (e.target === wrap || e.target.classList.contains('manage-list') || e.target.closest('.manage-list-header')) {
        e.preventDefault()
        showContextMenu(e, 'cat', {})
      }
    })
    renderCategoryTree(tree, wrap, 0)
    $('#cats-manage-list').appendChild(wrap)
  } catch (e) {
    $('#cats-manage-loading').style.display = 'none'
    showCatManageMsg('加载失败: ' + e.message, 'error')
  }
}

window.deleteManagedCategory = async function(id) {
  if (!confirm('确定删除此分类？子分类也会被删除。')) return
  try {
    const res = await fetch('/api/admin/categories/' + id, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    showCatManageMsg('分类已删除', 'success')
    loadManagedCategories()
  } catch (e) {
    showCatManageMsg('删除失败: ' + e.message, 'error')
  }
}

window.renameManagedCategory = async function(id, name) {
  try {
    const res = await fetch('/api/admin/categories/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    showCatManageMsg('分类已重命名', 'success')
    loadManagedCategories()
  } catch (e) {
    showCatManageMsg('重命名失败: ' + e.message, 'error')
  }
}

let contextMenuTarget = null

function closeContextMenu() {
  $('#context-menu').classList.remove('active')
  contextMenuTarget = null
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('#context-menu')) {
    closeContextMenu()
  }
})

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeContextMenu()
})

window.showContextMenu = function(e, type, data) {
  e.preventDefault()
  e.stopPropagation()
  closeContextMenu()
  const hasId = !!data.id
  contextMenuTarget = { type, ...data }
  const menu = $('#context-menu')
  const sep = menu.querySelector('.context-menu-separator')
  menu.querySelector('[data-action="new-cat"]').style.display = 'none'
  menu.querySelector('[data-action="new-tag"]').style.display = 'none'
  menu.querySelector('[data-action="add-child"]').style.display = 'none'
  menu.querySelector('[data-action="rename"]').style.display = 'none'
  menu.querySelector('[data-action="rename-tag"]').style.display = 'none'
  menu.querySelector('[data-action="delete"]').style.display = 'none'
  sep.style.display = 'none'
  if (hasId) {
    if (type === 'cat') {
      menu.querySelector('[data-action="add-child"]').style.display = ''
      menu.querySelector('[data-action="rename"]').style.display = ''
      menu.querySelector('[data-action="delete"]').style.display = ''
      sep.style.display = ''
    } else {
      menu.querySelector('[data-action="rename-tag"]').style.display = ''
      menu.querySelector('[data-action="delete"]').style.display = ''
      sep.style.display = ''
    }
  } else {
    if (type === 'cat') {
      menu.querySelector('[data-action="new-cat"]').style.display = ''
    } else {
      menu.querySelector('[data-action="new-tag"]').style.display = ''
    }
  }
  const mx = Math.min(e.clientX, window.innerWidth - menu.offsetWidth)
  const my = Math.min(e.clientY, window.innerHeight - menu.offsetHeight)
  menu.style.left = Math.max(0, mx) + 'px'
  menu.style.top = Math.max(0, my) + 'px'
  menu.classList.add('active')
}

$('#context-menu').addEventListener('click', function(e) {
  const item = e.target.closest('.context-menu-item')
  if (!item || !contextMenuTarget) return
  const action = item.dataset.action
  const target = contextMenuTarget
  closeContextMenu()
  if (action === 'new-cat') {
    showInputDialog('请输入新分类名：', addTopCategory)
    return
  }
  if (action === 'new-tag') {
    showInputDialog('请输入新标签名：', addTag)
    return
  }
  if (target.type === 'cat') {
    switch (action) {
      case 'add-child':
        showInputDialog('请输入子分类名：', function(val) {
          if (val) addChildCategory(target.id, val)
        })
        break
      case 'rename':
        showInputDialog('重命名分类：', function(val) {
          if (val) renameManagedCategory(target.id, val)
        }, target.name)
        break
      case 'delete':
        deleteManagedCategory(target.id)
        break
    }
  } else {
    switch (action) {
      case 'rename-tag':
        showInputDialog('重命名标签：', function(val) {
          if (val) renameManagedTag(target.id, val)
        }, target.name)
        break
      case 'delete':
        deleteManagedTag(target.id)
        break
    }
  }
})

// ============ Input Dialog ============

let inputDialogCallback = null

window.showInputDialog = function(title, callback, defaultValue) {
  $('#input-dialog-title').textContent = title
  $('#input-dialog-field').value = defaultValue || ''
  inputDialogCallback = callback
  $('#input-dialog').style.display = 'flex'
  setTimeout(function() {
    $('#input-dialog-field').focus()
    $('#input-dialog-field').select()
  }, 100)
}

window.closeInputDialog = function() {
  $('#input-dialog').style.display = 'none'
  inputDialogCallback = null
}

$('#input-dialog-confirm').addEventListener('click', function() {
  const val = $('#input-dialog-field').value.trim()
  if (inputDialogCallback) {
    inputDialogCallback(val)
  }
  closeInputDialog()
})

$('#input-dialog-field').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    $('#input-dialog-confirm').click()
  }
  if (e.key === 'Escape') {
    closeInputDialog()
  }
})

$('#manage-categories-btn').addEventListener('click', () => {
  showView('view-categories')
  loadManagedCategories()
})

window.cancelCatManage = function() {
  showView('view-posts')
}

// ============ Editor Category/Tag Picker ============

let pickerCategories = []
let pickerCategoryTree = []
let pickerTags = []
let selectedCategoryPath = ''
let selectedTags = []

async function loadPickerData() {
  try {
    const [tagsRes, catsRes] = await Promise.all([
      fetch('/api/admin/tags'),
      fetch('/api/admin/categories')
    ])
    pickerTags = await tagsRes.json()
    const catsData = await catsRes.json()
    pickerCategories = catsData.flat || []
    pickerCategoryTree = catsData.tree || []
  } catch (e) {
    console.error('loadPickerData error:', e)
  }
}

function updateCategoryDisplay() {
  const box = $('#selected-cats-box')
  const display = $('#selected-cats-display')
  if (!box) return
  if (selectedCategoryPath) {
    display.style.display = 'none'
    const existing = box.querySelectorAll('.selected-badge')
    for (const e of existing) e.remove()
    const badge = document.createElement('span')
    badge.className = 'selected-badge'
    badge.innerHTML = `<i class="fas fa-folder"></i> ${selectedCategoryPath} <span class="badge-remove">&times;</span>`
    badge.querySelector('.badge-remove').addEventListener('click', function(e) {
      e.stopPropagation()
      selectedCategoryPath = ''
      $('#edit-category').value = ''
      updateCategoryDisplay()
    })
    box.insertBefore(badge, box.firstChild)
  } else {
    display.style.display = ''
    const existing = box.querySelectorAll('.selected-badge')
    for (const e of existing) e.remove()
  }
}

function updateTagsDisplay() {
  const box = $('#selected-tags-box')
  const display = $('#selected-tags-display')
  if (!box) return
  const existing = box.querySelectorAll('.selected-badge')
  for (const e of existing) e.remove()
  if (selectedTags.length) {
    display.style.display = 'none'
    for (const t of selectedTags) {
      const badge = document.createElement('span')
      badge.className = 'selected-badge'
      badge.innerHTML = `<i class="fas fa-tag"></i> ${t} <span class="badge-remove" data-tag="${t.replace(/"/g, '&quot;')}">&times;</span>`
      badge.querySelector('.badge-remove').addEventListener('click', function(e) {
        e.stopPropagation()
        const tag = this.getAttribute('data-tag')
        selectedTags = selectedTags.filter(function(x) { return x !== tag })
        updateTagsDisplay()
      })
      box.insertBefore(badge, display)
    }
  } else {
    display.style.display = ''
  }
}

// === Category Picker ===

function renderPickerCategoryTree(tree, container, level) {
  for (const cat of tree) {
    const item = document.createElement('div')
    item.className = 'picker-item'
    item.style.paddingLeft = (16 + level * 24) + 'px'
    const hasChildren = cat.children && cat.children.length > 0
    const current = selectedCategoryPath
    item.innerHTML = `
      ${hasChildren ? '<span class="picker-toggle"><i class="fas fa-chevron-right"></i></span>' : '<span class="picker-toggle" style="visibility:hidden"><i class="fas fa-chevron-right"></i></span>'}
      <input type="radio" name="cat-picker" value="${cat.path || cat.name}" ${(cat.path || cat.name) === current ? 'checked' : ''}>
      <span class="picker-item-name"><i class="fas fa-folder"></i> ${cat.name}</span>
      <span class="picker-item-path">${cat.post_count || 0} 篇</span>
    `
    // Radio click: select this item
    item.addEventListener('click', function(e) {
      if (e.target.closest('.picker-toggle')) return
      const inp = item.querySelector('input[type="radio"]')
      if (inp) inp.checked = true
    })
    container.appendChild(item)

    if (hasChildren) {
      const childWrap = document.createElement('div')
      childWrap.className = 'picker-children'
      childWrap.style.display = 'none'
      container.appendChild(childWrap)
      renderPickerCategoryTree(cat.children, childWrap, level + 1)

      const toggle = item.querySelector('.picker-toggle')
      toggle.addEventListener('click', function(e) {
        e.stopPropagation()
        const expanded = childWrap.style.display !== 'none'
        childWrap.style.display = expanded ? 'none' : ''
        toggle.querySelector('i').className = expanded ? 'fas fa-chevron-right' : 'fas fa-chevron-down'
      })
    }
  }
}

window.openCategoryPicker = function() {
  const modal = $('#cat-picker-modal')
  const body = $('#cat-picker-body')
  modal.style.display = 'flex'
  body.innerHTML = '<div class="picker-loading">加载中...</div>'
  loadPickerData().then(function() {
    body.innerHTML = ''
    if (!pickerCategoryTree.length) {
      body.innerHTML = '<div class="picker-empty">暂无分类</div>'
      return
    }
    renderPickerCategoryTree(pickerCategoryTree, body, 0)
  })
}

window.closeCategoryPicker = function() {
  $('#cat-picker-modal').style.display = 'none'
}

window.confirmCategoryPicker = function() {
  const sel = document.querySelector('input[name="cat-picker"]:checked')
  if (sel) {
    selectedCategoryPath = sel.value
  } else {
    selectedCategoryPath = ''
  }
  $('#edit-category').value = selectedCategoryPath
  updateCategoryDisplay()
  closeCategoryPicker()
}

window.openNewCategoryFromPicker = function() {
  showInputDialog('输入新分类名：', function(name) {
    if (name) {
      fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name })
      }).then(function() {
        openCategoryPicker()
      }).catch(function() {})
    }
  })
}

// === Tag Picker ===
window.openTagPicker = function() {
  const modal = $('#tag-picker-modal')
  const body = $('#tag-picker-body')
  modal.style.display = 'flex'
  body.innerHTML = '<div class="picker-loading">加载中...</div>'
  loadPickerData().then(function() {
    body.innerHTML = ''
    if (!pickerTags.length) {
      body.innerHTML = '<div class="picker-empty">暂无标签</div>'
      return
    }
    for (const t of pickerTags) {
      const item = document.createElement('div')
      item.className = 'picker-item' + (selectedTags.indexOf(t.name) !== -1 ? ' selected' : '')
      item.innerHTML = `
        <input type="checkbox" value="${t.name}" ${selectedTags.indexOf(t.name) !== -1 ? 'checked' : ''}>
        <span class="picker-item-name"><i class="fas fa-tag"></i> ${t.name}</span>
        <span class="picker-item-path">${t.post_count || 0} 篇</span>
      `
      item.addEventListener('click', function(e) {
        if (e.target.tagName !== 'INPUT') {
          const inp = item.querySelector('input')
          if (inp) inp.checked = !inp.checked
        }
      })
      body.appendChild(item)
    }
  })
}

window.closeTagPicker = function() {
  $('#tag-picker-modal').style.display = 'none'
}

window.confirmTagPicker = function() {
  var checks = document.querySelectorAll('#tag-picker-body input[type="checkbox"]:checked')
  selectedTags = []
  for (var i = 0; i < checks.length; i++) {
    selectedTags.push(checks[i].value)
  }
  $('#edit-tags').value = selectedTags.join(', ')
  updateTagsDisplay()
  closeTagPicker()
}

window.openNewTagFromPicker = function() {
  showInputDialog('输入新标签名：', function(name) {
    if (name) {
      fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name })
      }).then(function() {
        openTagPicker()
      }).catch(function() {})
    }
  })
}

// Override editPost to sync picker display
const origEditPostFn2 = window.editPost
window.editPost = async function(id) {
  await origEditPostFn2(id)
  const catVal = $('#edit-category').value
  const tagsVal = $('#edit-tags').value
  selectedCategoryPath = catVal || ''
  selectedTags = tagsVal ? tagsVal.split(',').map(function(t) { return t.trim() }).filter(Boolean) : []
  updateCategoryDisplay()
  updateTagsDisplay()
  setTimeout(loadPickerData, 100)
}

checkAuth()