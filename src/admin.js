import './style.css'
import './admin.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import 'katex/dist/katex.min.css'
import { createClient } from '@supabase/supabase-js'
import markdownit from 'markdown-it'
import markdownItContainer from 'markdown-it-container'
import { full as markdownitEmoji } from 'markdown-it-emoji'
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
const SUPABASE_URL = cfg.SUPABASE_URL || 'https://eacieurozwzligrxnyos.supabase.co'
const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || 'sb_publishable_owez1XlLUfQiJOkzi23zng_B-A_Ez0P'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const DEPLOY_HOOK_URL = cfg.DEPLOY_HOOK_URL || ''
const SAVE_REDIRECT_DELAY = cfg.ADMIN_SAVE_REDIRECT_DELAY || 1500
const CHANGE_PW_REDIRECT_DELAY = cfg.ADMIN_CHANGE_PW_REDIRECT_DELAY || 2000

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
  $$('.admin-view').forEach(v => v.style.display = 'none')
  const el = document.getElementById(id)
  if (el) el.style.display = 'block'
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
    $('#login-error').textContent = '登录失败: ' + error.message
  } else {
    checkAuth()
  }
})

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut()
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-')) localStorage.removeItem(key)
  })
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
    changePwMessage.textContent = '请输入新密码'
    changePwMessage.className = 'message-msg error'
    changePwMessage.style.display = 'block'
    return
  }
  if (newPw !== confirmPw) {
    changePwMessage.textContent = '两次输入的密码不一致'
    changePwMessage.className = 'message-msg error'
    changePwMessage.style.display = 'block'
    return
  }
  if (newPw.length < 6) {
    changePwMessage.textContent = '密码至少6位'
    changePwMessage.className = 'message-msg error'
    changePwMessage.style.display = 'block'
    return
  }

  const submitBtn = $('#change-pw-submit')
  submitBtn.disabled = true
  submitBtn.textContent = '修改中...'

  const { error } = await supabase.auth.updateUser({ password: newPw })

  submitBtn.disabled = false
  submitBtn.textContent = '确认修改'

  if (error) {
    changePwMessage.textContent = '修改失败: ' + error.message
    changePwMessage.className = 'message-msg error'
    changePwMessage.style.display = 'block'
    return
  }

  changePwMessage.textContent = '密码修改成功！'
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
  aboutContent.value = '加载中...'
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
    aboutMessage.textContent = '加载失败'
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
    aboutMessage.textContent = '内容不能为空'
    aboutMessage.className = 'message-msg error'
    aboutMessage.style.display = 'block'
    return
  }

  aboutSubmit.disabled = true
  aboutSubmit.textContent = '保存中...'

  try {
    const res = await fetch('/about', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    if (!res.ok) throw new Error(await res.text())
    aboutMessage.textContent = '保存成功！'
    aboutMessage.className = 'message-msg success'
    aboutMessage.style.display = 'block'
    setTimeout(cancelAbout, SAVE_REDIRECT_DELAY)
  } catch (err) {
    aboutMessage.textContent = '保存失败: ' + err.message
    aboutMessage.className = 'message-msg error'
    aboutMessage.style.display = 'block'
  }

  aboutSubmit.disabled = false
  aboutSubmit.textContent = '保存'
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
    gutter.innerHTML = Array.from({ length: lines.length }, (_, i) => i + 1).join('<br>')
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
  if (ta) localStorage.setItem('admin-draft-' + textareaId, ta.value)
}

function setupPreview(textareaId, previewId) {
  const textarea = document.getElementById(textareaId)
  if (textarea) {
    const saved = localStorage.getItem('admin-draft-' + textareaId)
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
  const titleInput = document.getElementById('edit-title')
  if (titleInput) {
    titleInput.value = localStorage.getItem('admin-draft-edit-title') || ''
    titleInput.addEventListener('input', () => {
      localStorage.setItem('admin-draft-edit-title', titleInput.value)
    })
  }
  updateIndentBtns()
}, 0)

async function loadPosts() {
  $('#posts-loading').style.display = 'block'
  $('#posts-list').innerHTML = ''
  const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
  $('#posts-loading').style.display = 'none'
  if (error) { $('#posts-error').textContent = '加载失败: ' + error.message; return }
  if (!data || data.length === 0) {
    $('#posts-list').innerHTML = '<p class="muted">暂无文章</p>'
    return
  }
  for (const post of data) {
    const d = document.createElement('div')
    d.className = 'post-item'
    d.innerHTML = `
      <div class="post-item-info">
        <strong>${post.title}</strong>
        <span class="muted">${new Date(post.created_at).toLocaleString('zh-CN')}</span>
        <span class="tag-list">${(post.tags || []).map(t => '<span class="tag-pill">' + t + '</span>').join('')}</span>
      </div>
      <div class="post-item-actions">
        <button class="btn btn-sm btn-outline" onclick="editPost(${post.id})">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id})">删除</button>
      </div>`
    $('#posts-list').appendChild(d)
  }
}

window.editPost = async function (id) {
  const { data } = await supabase.from('posts').select('*').eq('id', id).single()
  if (!data) return
  $('#edit-id').value = data.id
  $('#edit-title').value = data.title
  $('#edit-content').value = data.content
  $('#edit-tags').value = (data.tags || []).join(', ')
  $('#edit-cover').value = data.cover || ''
  showView('view-edit')
  updatePreview('edit-content', 'edit-preview')
}

$('#edit-form').addEventListener('submit', async e => {
  e.preventDefault()
  const id = $('#edit-id').value
  const title = $('#edit-title').value
  const content = $('#edit-content').value
  const tags = $('#edit-tags').value.split(',').map(t => t.trim()).filter(Boolean)
  const cover = $('#edit-cover').value

  if (!title || !content) { $('#edit-error').textContent = '标题和内容不能为空'; return }
  $('#edit-error').textContent = ''
  $('#edit-submit').disabled = true
  $('#edit-submit').textContent = '保存中...'

  let error
  if (id) {
    ({ error } = await supabase.from('posts').update({ title, content, tags, cover, updated_at: new Date().toISOString() }).eq('id', id))
  } else {
    ({ error } = await supabase.from('posts').insert({ title, content, tags, cover }))
  }

  $('#edit-submit').disabled = false
  $('#edit-submit').textContent = '保存'
  if (error) { $('#edit-error').textContent = '保存失败: ' + error.message; return }
  clearDraft()
  cancelEdit()
  loadPosts()
  triggerDeploy()
})

function clearDraft() {
  localStorage.removeItem('admin-draft-edit-content')
  localStorage.removeItem('admin-draft-edit-title')
}

$('#new-post-btn').addEventListener('click', () => {
  $('#edit-id').value = ''
  $('#edit-title').value = localStorage.getItem('admin-draft-edit-title') || ''
  const draft = localStorage.getItem('admin-draft-edit-content')
  $('#edit-content').value = draft || ''
  $('#edit-tags').value = ''
  $('#edit-cover').value = ''
  $('#edit-submit').textContent = '保存'
  showView('view-edit')
  updatePreview('edit-content', 'edit-preview')
})

window.cancelEdit = function () {
  showView('view-posts')
}

window.deletePost = async function (id) {
  if (!confirm('确定删除此文章？')) return
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) { alert('删除失败: ' + error.message); return }
  loadPosts()
  triggerDeploy()
}

checkAuth()