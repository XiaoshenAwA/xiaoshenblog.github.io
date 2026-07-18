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
const ADMIN_PAGE_SIZE = cfg.ADMIN_PAGE_SIZE || 20
const ADMIN_MAX_UNDO = cfg.ADMIN_MAX_UNDO || 50
const DB_TABLE = cfg.DB_TABLE || 'posts'
const TAGS_TABLE = cfg.DB_TAGS_TABLE || 'managed_tags'
const CATEGORIES_TABLE = cfg.DB_CATEGORIES_TABLE || 'managed_categories'
const L = cfg.LOCALE || {}

// ============ Client-side Supabase helpers for Tags & Categories ============

function buildClientCategoryTree(catList) {
  const map = {}
  const roots = []
  for (const cat of catList) {
    cat.children = []
    map[cat.id] = cat
  }
  for (const cat of catList) {
    if (cat.parent_id && map[cat.parent_id]) {
      map[cat.parent_id].children.push(cat)
    } else {
      roots.push(cat)
    }
  }
  return roots
}

function aggregateClientCounts(nodes) {
  for (const node of nodes) {
    if (node.children && node.children.length) {
      aggregateClientCounts(node.children)
      for (const child of node.children) {
        node.post_count += child.post_count
      }
    }
  }
}

async function clientGetManagedTags() {
  const { data: tags } = await supabase.from(TAGS_TABLE).select('*').order('name')
  const { data: posts } = await supabase.from(DB_TABLE).select('tags')
  const countMap = {}
  if (posts) {
    for (const row of posts) {
      if (row.tags && Array.isArray(row.tags)) {
        for (const t of row.tags) {
          if (t) countMap[t] = (countMap[t] || 0) + 1
        }
      }
    }
  }
  return (tags || []).map(t => ({ ...t, post_count: countMap[t.name] || 0 }))
}

async function clientGetManagedCategories() {
  const { data: cats } = await supabase.from(CATEGORIES_TABLE).select('*').order('sort_order')
  const { data: posts } = await supabase.from(DB_TABLE).select('category')
  const countMap = {}
  if (posts) {
    for (const row of posts) {
      if (row.category) {
        countMap[row.category] = (countMap[row.category] || 0) + 1
      }
    }
  }
  const catList = (cats || []).map(c => ({
    ...c,
    post_count: countMap[c.path || c.name] || 0
  }))
  const tree = buildClientCategoryTree(catList)
  aggregateClientCounts(tree)
  return { tree, flat: catList }
}

async function clientCreateManagedTag(name) {
  const { data, error } = await supabase.from(TAGS_TABLE).insert({ name: name.trim() }).select().single()
  if (error) throw error
  return data
}

async function clientDeleteManagedTag(id) {
  const { error } = await supabase.from(TAGS_TABLE).delete().eq('id', id)
  if (error) throw error
}

async function clientRenameManagedTag(id, name) {
  const { error } = await supabase.from(TAGS_TABLE).update({ name: name.trim() }).eq('id', id)
  if (error) throw error
}

async function clientCreateManagedCategory(name, parentId) {
  let path = name.trim()
  if (parentId) {
    const { data: parent } = await supabase.from(CATEGORIES_TABLE).select('path').eq('id', parentId).single()
    if (parent && parent.path) {
      path = parent.path + '/' + name.trim()
    }
  }
  const { data, error } = await supabase.from(CATEGORIES_TABLE).insert({
    name: name.trim(),
    parent_id: parentId || null,
    path
  }).select().single()
  if (error) throw error
  return data
}

async function clientDeleteManagedCategory(id) {
  const { error } = await supabase.from(CATEGORIES_TABLE).delete().eq('id', id)
  if (error) throw error
}

async function clientRenameManagedCategory(id, name) {
  const { data: cat } = await supabase.from(CATEGORIES_TABLE).select('*').eq('id', id).single()
  if (!cat) throw new Error('分类不存在')
  let newPath = name.trim()
  if (cat.parent_id) {
    const { data: parent } = await supabase.from(CATEGORIES_TABLE).select('path').eq('id', cat.parent_id).single()
    if (parent && parent.path) {
      newPath = parent.path + '/' + name.trim()
    }
  }
  const { error } = await supabase.from(CATEGORIES_TABLE).update({ name: name.trim(), path: newPath }).eq('id', id)
  if (error) throw error
  const { data: children } = await supabase.from(CATEGORIES_TABLE).select('id, path').filter('path', 'like', cat.path + '/%')
  if (children) {
    for (const child of children) {
      const childNewPath = child.path.replace(cat.path, newPath)
      await supabase.from(CATEGORIES_TABLE).update({ path: childNewPath }).eq('id', child.id)
    }
  }
}

async function clientMoveManagedCategory(id, newParentId) {
  const { data: cat } = await supabase.from(CATEGORIES_TABLE).select('*').eq('id', id).single()
  if (!cat) throw new Error('分类不存在')
  if (String(newParentId) === String(id)) throw new Error('不能将文件夹移动到自身')
  let newPath = cat.name.trim()
  if (newParentId) {
    const { data: parent } = await supabase.from(CATEGORIES_TABLE).select('path').eq('id', newParentId).single()
    if (parent && parent.path) {
      newPath = parent.path + '/' + cat.name.trim()
    }
  }
  const oldPath = cat.path || cat.name.trim()
  const { error } = await supabase.from(CATEGORIES_TABLE).update({ parent_id: newParentId || null, path: newPath }).eq('id', id)
  if (error) throw error
  const { data: children } = await supabase.from(CATEGORIES_TABLE).select('id, path').filter('path', 'like', oldPath + '/%')
  if (children) {
    for (const child of children) {
      const childNewPath = child.path.replace(oldPath, newPath)
      await supabase.from(CATEGORIES_TABLE).update({ path: childNewPath }).eq('id', child.id)
    }
  }
  const { data: posts } = await supabase.from(DB_TABLE).select('id, category').filter('category', 'like', oldPath + '/%')
  if (posts) {
    for (const post of posts) {
      const postNewCategory = post.category.replace(oldPath, newPath)
      await supabase.from(DB_TABLE).update({ category: postNewCategory, updated_at: new Date().toISOString() }).eq('id', post.id)
    }
  }
  const { data: directPosts } = await supabase.from(DB_TABLE).select('id, category').eq('category', oldPath)
  if (directPosts) {
    for (const post of directPosts) {
      await supabase.from(DB_TABLE).update({ category: newPath, updated_at: new Date().toISOString() }).eq('id', post.id)
    }
  }
}

async function clientReorderCategory(id, newSortOrder) {
  const { error } = await supabase.from(CATEGORIES_TABLE).update({ sort_order: newSortOrder }).eq('id', id)
  if (error) throw error
}

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
    location.reload()
  }
})

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
let currentModalTa = null

function adminInsertWrapAtCursor(ta, md, wrap) {
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
}

function adminHljsHighlight(code, lang) {
  if (lang && hljs.getLanguage(lang)) {
    try { return hljs.highlight(code, { language: lang }).value } catch {}
  }
  try { return hljs.highlightAuto(code).value } catch {}
  return code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

document.querySelectorAll('.editor-toolbar .toolbar-btn[data-md]').forEach(btn => {
  btn.addEventListener('click', () => {
    const ta = document.getElementById(btn.dataset.target)
    if (!ta) return
    const action = btn.dataset.action

    if (action === 'link') {
      currentModalTa = ta
      const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd)
      document.getElementById('link-text').value = sel || ''
      document.getElementById('link-url').value = ''
      document.getElementById('insert-link-modal').style.display = ''
      setTimeout(() => { document.getElementById(sel ? 'link-url' : 'link-text').focus() }, 80)
      return
    }

    if (action === 'image') {
      currentModalTa = ta
      document.getElementById('image-url').value = ''
      document.getElementById('image-alt').value = ''
      document.getElementById('insert-image-modal').style.display = ''
      setTimeout(() => document.getElementById('image-url').focus(), 80)
      return
    }

    if (action === 'code') {
      currentModalTa = ta
      document.getElementById('code-input').value = ''
      document.getElementById('code-highlight').innerHTML = ''
      document.getElementById('code-gutter').textContent = '1'
      document.getElementById('code-lang').value = ''
      document.getElementById('insert-code-modal').style.display = ''
      setTimeout(() => document.getElementById('code-input').focus(), 80)
      return
    }

    adminInsertWrapAtCursor(ta, btn.dataset.md, btn.dataset.wrap)
  })
})

function adminInsertAtCursor(ta, text) {
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const before = ta.value.substring(0, start)
  const after = ta.value.substring(end)
  ta.value = before + text + after
  ta.selectionStart = ta.selectionEnd = start + text.length
  ta.focus()
  ta.dispatchEvent(new Event('input'))
}

document.getElementById('link-confirm').addEventListener('click', () => {
  if (!currentModalTa) return
  const url = document.getElementById('link-url').value.trim()
  if (!url) return
  const text = document.getElementById('link-text').value.trim() || url
  const ta = currentModalTa
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const before = ta.value.substring(0, start)
  const after = ta.value.substring(end)
  const insertion = '[' + text + '](' + url + ')'
  ta.value = before + insertion + after
  ta.selectionStart = start + 1
  ta.selectionEnd = start + 1 + text.length
  ta.focus()
  ta.dispatchEvent(new Event('input'))
  document.getElementById('insert-link-modal').style.display = 'none'
})

document.getElementById('image-confirm').addEventListener('click', () => {
  if (!currentModalTa) return
  const url = document.getElementById('image-url').value.trim()
  if (!url) return
  const alt = document.getElementById('image-alt').value.trim() || '图片'
  const ta = currentModalTa
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const before = ta.value.substring(0, start)
  const after = ta.value.substring(end)
  const insertion = '![' + alt + '](' + url + ')'
  ta.value = before + insertion + after
  ta.selectionStart = start + 2
  ta.selectionEnd = start + 2 + alt.length
  ta.focus()
  ta.dispatchEvent(new Event('input'))
  document.getElementById('insert-image-modal').style.display = 'none'
})

document.getElementById('code-confirm').addEventListener('click', () => {
  if (!currentModalTa) return
  const lang = document.getElementById('code-lang').value
  const code = document.getElementById('code-input').value
  const block = '```' + lang + '\n' + code + '\n```'
  adminInsertAtCursor(currentModalTa, block)
  document.getElementById('insert-code-modal').style.display = 'none'
})

const adminCodeInput = document.getElementById('code-input')
const adminCodeHighlight = document.getElementById('code-highlight')
const adminCodeLang = document.getElementById('code-lang')
const adminCodeGutter = document.getElementById('code-gutter')

function adminUpdateCodeLineNumbers() {
  const lines = (adminCodeInput.value || '').split('\n')
  adminCodeGutter.textContent = Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i + 1).join('\n')
}

function adminSyncCodeScroll() {
  adminCodeHighlight.scrollTop = adminCodeInput.scrollTop
  adminCodeHighlight.scrollLeft = adminCodeInput.scrollLeft
  adminCodeGutter.scrollTop = adminCodeInput.scrollTop
}

function adminUpdateCodeHighlight() {
  const code = adminCodeInput.value || ''
  const lang = adminCodeLang.value
  adminCodeHighlight.innerHTML = adminHljsHighlight(code, lang) + '\n'
  adminUpdateCodeLineNumbers()
}
adminCodeInput.addEventListener('input', adminUpdateCodeHighlight)
adminCodeInput.addEventListener('scroll', adminSyncCodeScroll)
adminCodeLang.addEventListener('change', adminUpdateCodeHighlight)

const adminCodePairs = { '{': '}', '(': ')', '[': ']', '"': '"', "'": "'", '`': '`' }
const adminCodeClosers = Object.values(adminCodePairs)
const adminCodePairsNoTick = { '{': '}', '(': ')', '[': ']', '"': '"', "'": "'" }

adminCodeInput.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault()
    const s = adminCodeInput.selectionStart
    const end = adminCodeInput.selectionEnd
    if (!document.execCommand('insertText', false, '  ')) {
      adminCodeInput.value = adminCodeInput.value.substring(0, s) + '  ' + adminCodeInput.value.substring(end)
      adminCodeInput.selectionStart = adminCodeInput.selectionEnd = s + 2
    }
    adminUpdateCodeHighlight(); return
  }
  if (e.key === 'Enter' && adminCodeInput.selectionStart === adminCodeInput.selectionEnd) {
    const s = adminCodeInput.selectionStart
    const val = adminCodeInput.value
    const lineStart = val.lastIndexOf('\n', s - 1) + 1
    const curLine = val.substring(lineStart, s)
    const indent = curLine.match(/^(\s*)/)[1]
    const lastChar = curLine.trimEnd().slice(-1)
    const after = val.substring(s)

    if (lastChar === '{' || lastChar === '(' || lastChar === '[' || lastChar === ':') {
      e.preventDefault()
      const deep = indent + '  '
      const next = after.trimStart()[0]
      if (next !== undefined && next === (adminCodePairsNoTick[lastChar] || '')) {
        adminCodeInput.value = val.substring(0, s) + '\n' + deep + '\n' + indent + after
        adminCodeInput.selectionStart = adminCodeInput.selectionEnd = s + 1 + deep.length
      } else {
        adminCodeInput.value = val.substring(0, s) + '\n' + deep + after
        adminCodeInput.selectionStart = adminCodeInput.selectionEnd = s + 1 + deep.length
      }
      adminUpdateCodeHighlight(); return
    }

    if (indent.length > 0) {
      e.preventDefault()
      adminCodeInput.value = val.substring(0, s) + '\n' + indent + after
      adminCodeInput.selectionStart = adminCodeInput.selectionEnd = s + 1 + indent.length
      adminUpdateCodeHighlight(); return
    }
  }
  if (e.key in adminCodePairsNoTick) {
    e.preventDefault()
    const s = adminCodeInput.selectionStart
    const end = adminCodeInput.selectionEnd
    adminCodeInput.value = adminCodeInput.value.substring(0, s) + e.key + adminCodePairsNoTick[e.key] + adminCodeInput.value.substring(end)
    adminCodeInput.selectionStart = adminCodeInput.selectionEnd = s + 1
    adminUpdateCodeHighlight(); return
  }
  if (')' === e.key || ']' === e.key || '}' === e.key || '"' === e.key || "'" === e.key) {
    if (adminCodeInput.value[adminCodeInput.selectionStart] === e.key) {
      e.preventDefault()
      adminCodeInput.selectionStart = adminCodeInput.selectionEnd = adminCodeInput.selectionStart + 1
      return
    }
  }
  if (e.key === 'Backspace') {
    const s = adminCodeInput.selectionStart
    if (s > 0 && s <= adminCodeInput.value.length) {
      const before = adminCodeInput.value[s - 1]
      const after = adminCodeInput.value[s]
      if (adminCodePairsNoTick[before] === after || (before === '`' && after === '`')) {
        e.preventDefault()
        adminCodeInput.value = adminCodeInput.value.substring(0, s - 1) + adminCodeInput.value.substring(s + 1)
        adminCodeInput.selectionStart = adminCodeInput.selectionEnd = s - 1
        adminUpdateCodeHighlight()
      }
    }
  }
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
      const deep = indent + getIndent()
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
let currentPage = 1
let totalPages = 1

function renderPosts(posts) {
  $('#posts-list').innerHTML = ''
  const empty = $('#posts-empty')
  const paginationBar = $('#pagination-bar')
  if (!posts || posts.length === 0) {
    empty.style.display = 'block'
    if (paginationBar) paginationBar.style.display = 'none'
    return
  }
  totalPages = Math.ceil(posts.length / ADMIN_PAGE_SIZE)
  if (currentPage < 1) currentPage = 1
  if (currentPage > totalPages) currentPage = totalPages
  const start = (currentPage - 1) * ADMIN_PAGE_SIZE
  const pagePosts = posts.slice(start, start + ADMIN_PAGE_SIZE)
  empty.style.display = 'none'
  for (const post of pagePosts) {
    const d = document.createElement('div')
    d.className = 'post-item'
    const isPublished = post.published !== false
    const cat = (post.category || '').trim()
    const tags = (post.tags || []).map(t => '<span class="tag-pill"><i class="fas fa-tag"></i> ' + t + '</span>').join('')
    d.innerHTML = `
      <div class="post-item-info">
        <strong>${post.title}</strong>
        <span class="muted">${new Date(post.created_at).toLocaleString('zh-CN')}</span>
        <div class="post-item-meta">
          <span class="post-item-status"><span class="status-dot ${isPublished ? 'published' : 'private'}"></span>${isPublished ? '公开' : '不公开'}</span>
          ${cat ? '<span class="post-item-cat"><i class="fas fa-folder"></i> ' + cat + '</span>' : ''}
          ${tags ? '<span class="tag-list">' + tags + '</span>' : ''}
        </div>
      </div>
      <div class="post-item-actions">
        <button class="btn btn-sm btn-publish-toggle ${isPublished ? 'published' : 'private'}" onclick="togglePublished(${post.id}, ${isPublished})" title="${isPublished ? '设为不公开' : '设为公开'}"><i class="fas fa-eye${isPublished ? '' : '-slash'}"></i></button>
        <button class="btn btn-sm btn-outline" onclick="editPost(${post.id})">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id})">删除</button>
      </div>`
    $('#posts-list').appendChild(d)
  }
  renderPagination(posts.length)
}

function renderPagination(total) {
  const bar = $('#pagination-bar')
  const info = $('#page-info')
  if (!bar || !info) return
  if (totalPages <= 1 && total <= ADMIN_PAGE_SIZE) { bar.style.display = 'none'; return }
  bar.style.display = 'flex'
  info.textContent = total + ' 篇，第 ' + currentPage + ' / ' + totalPages + ' 页'
  const prev = $('#page-prev-btn')
  const next = $('#page-next-btn')
  if (prev) prev.disabled = currentPage <= 1
  if (next) next.disabled = currentPage >= totalPages
}

window.goToPage = function(page) {
  if (page < 1 || page > totalPages) return
  currentPage = page
  filterPosts()
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
  currentPage = 1
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
  currentPage = 1
  if (allPosts.length === 0) {
    $('#posts-list').innerHTML = '<p class="muted">' + (L.no_posts || '暂无文章') + '</p>'
    return
  }
  renderPosts(allPosts)
}

window.togglePublished = async function(id, currentPublished) {
  const newVal = !currentPublished
  try {
    const { error } = await supabase.from(DB_TABLE).update({ published: newVal, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    const post = allPosts.find(p => p.id === id)
    if (post) post.published = newVal
    filterPosts()
  } catch (e) {
    $('#posts-error').textContent = '修改失败: ' + e.message
  }
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

// ============ Undo/Redo System ============

const undoStack = []
const redoStack = []
const MAX_UNDO = ADMIN_MAX_UNDO

function pushUndo(action) {
  undoStack.push(action)
  if (undoStack.length > MAX_UNDO) undoStack.shift()
  redoStack.length = 0
  updateUndoButtons()
}

function updateUndoButtons() {
  const cu = $('#cat-undo-btn'); const cr = $('#cat-redo-btn')
  const tu = $('#tag-undo-btn'); const tr = $('#tag-redo-btn')
  if (cu) cu.disabled = undoStack.length === 0
  if (cr) cr.disabled = redoStack.length === 0
  if (tu) tu.disabled = undoStack.length === 0
  if (tr) tr.disabled = redoStack.length === 0
}

async function applyAction(action) {
  switch (action.type) {
    case 'move-article': {
      const { error } = await supabase.from(DB_TABLE).update({ category: action.toCategory, updated_at: new Date().toISOString() }).eq('id', action.postId)
      if (error) throw error
      break
    }
    case 'add-tag': {
      if (action.toTags) {
        const { error } = await supabase.from(DB_TABLE).update({ tags: action.toTags, updated_at: new Date().toISOString() }).eq('id', action.postId)
        if (error) throw error
      }
      break
    }
    case 'move-folder': {
      await clientMoveManagedCategory(action.folderId, action.toParentId)
      break
    }
  }
}

async function performUndo() {
  const action = undoStack.pop()
  if (!action) return
  try {
    const reverse = Object.assign({}, action, {
      fromCategory: action.toCategory, toCategory: action.fromCategory,
      fromParentId: action.toParentId, toParentId: action.fromParentId,
      fromTags: action.toTags || action.fromTags, toTags: action.fromTags || action.toTags
    })
    await applyAction(reverse)
    redoStack.push(action)
    updateUndoButtons()
    if (action.type === 'move-article' || action.type === 'move-folder') loadExplorerData()
    else if (action.type === 'add-tag') loadTagExplorerData()
  } catch (e) {
    showTagManageMsg('撤销失败: ' + e.message, 'error')
  }
}

async function performRedo() {
  const action = redoStack.pop()
  if (!action) return
  try {
    await applyAction(action)
    undoStack.push(action)
    updateUndoButtons()
    if (action.type === 'move-article' || action.type === 'move-folder') loadExplorerData()
    else if (action.type === 'add-tag') loadTagExplorerData()
  } catch (e) {
    showTagManageMsg('重做失败: ' + e.message, 'error')
  }
}

function handleUndoKeyboard(e) {
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); performUndo() }
  if (e.ctrlKey && e.key === 'y') { e.preventDefault(); performRedo() }
}
document.addEventListener('keydown', handleUndoKeyboard)

$('#cat-undo-btn').addEventListener('click', performUndo)
$('#cat-redo-btn').addEventListener('click', performRedo)
$('#tag-undo-btn').addEventListener('click', performUndo)
$('#tag-redo-btn').addEventListener('click', performRedo)

// ============ Tag Management ============

function showTagManageMsg(text, type) {
  const el = $('#tags-manage-message')
  if (!el) return
  el.textContent = text
  el.className = 'message-msg ' + type
  el.style.display = 'block'
  setTimeout(() => { el.style.display = 'none' }, 3000)
}

const tagExplorer = {
  tags: [],
  allPosts: [],
  currentTag: null
}

async function loadTagExplorerData() {
  const content = $('#tags-explorer-content')
  if (!content) return
  content.innerHTML = '<div class="explorer-loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>'
  try {
    tagExplorer.tags = await clientGetManagedTags()
    const { data: posts } = await supabase.from(DB_TABLE).select('id, title, tags, created_at, published, category').order('created_at', { ascending: false })
    tagExplorer.allPosts = posts || []
    renderTagExplorer()
  } catch (e) {
    content.innerHTML = '<div class="explorer-empty"><i class="fas fa-exclamation-triangle"></i><p>加载失败: ' + e.message + '</p></div>'
  }
}

function getTagArticles(tagName) {
  return tagExplorer.allPosts.filter(p => (p.tags || []).includes(tagName))
}

function navigateToTag(tag) {
  tagExplorer.currentTag = tag
  renderTagExplorer()
}

function navigateToAllTags() {
  tagExplorer.currentTag = null
  renderTagExplorer()
}

function renderTagExplorer() {
  const content = $('#tags-explorer-content')
  if (!content) return
  content.innerHTML = ''
  const backBtn = $('#tag-back-btn')
  const bc = $('#tag-breadcrumb')
  const curTag = tagExplorer.currentTag
  if (curTag) {
    if (backBtn) backBtn.style.display = ''
    if (bc) bc.innerHTML = '<span class="breadcrumb-item" id="tag-bc-root"><i class="fas fa-tags"></i> 标签管理</span><span class="breadcrumb-sep"><i class="fas fa-chevron-right"></i></span><span class="breadcrumb-item current">' + curTag.name + '</span>'
    const rootCrumb = document.getElementById('tag-bc-root')
    if (rootCrumb) rootCrumb.addEventListener('click', navigateToAllTags)
    const tagArticles = getTagArticles(curTag.name)
    const section1 = document.createElement('div')
    section1.className = 'explorer-section'
    section1.innerHTML = '<div class="explorer-section-title"><i class="fas fa-file-alt"></i> 标签「' + curTag.name + '」下的文章 <span class="muted">(' + tagArticles.length + ')</span></div>'
    if (tagArticles.length > 0) {
      const list = document.createElement('div')
      list.className = 'explorer-articles'
      for (const article of tagArticles) {
        list.appendChild(renderTagArticle(article))
      }
      section1.appendChild(list)
    } else {
      section1.innerHTML += '<div class="explorer-empty"><i class="fas fa-inbox"></i><p>暂无文章使用此标签</p><p class="muted">从下方拖拽文章到标签卡片即可添加</p></div>'
    }
    content.appendChild(section1)
  } else {
    if (backBtn) backBtn.style.display = 'none'
    if (bc) bc.innerHTML = '<span class="breadcrumb-item current"><i class="fas fa-tags"></i> 标签管理</span>'
  }
  const allSection = document.createElement('div')
  allSection.className = 'explorer-section'
  allSection.innerHTML = '<div class="explorer-section-title"><i class="fas fa-tags"></i> 所有标签 <span class="muted">(' + tagExplorer.tags.length + ')</span></div>'
  if (tagExplorer.tags.length > 0) {
    const tagGrid = document.createElement('div')
    tagGrid.className = 'explorer-folders'
    for (const tag of tagExplorer.tags) {
      tagGrid.appendChild(renderTagCard(tag))
    }
    allSection.appendChild(tagGrid)
  } else {
    allSection.innerHTML += '<div class="explorer-empty"><i class="fas fa-tags"></i><p>暂无标签</p><p class="muted">点击上方「新建标签」创建</p></div>'
  }
  content.appendChild(allSection)
  const postsSection = document.createElement('div')
  postsSection.className = 'explorer-section'
  const totalPosts = tagExplorer.allPosts.length
  postsSection.innerHTML = '<div class="explorer-section-title"><i class="fas fa-file-alt"></i> 所有文章 <span class="muted">(' + totalPosts + ')</span></div>'
  if (totalPosts > 0) {
    const list = document.createElement('div')
    list.className = 'explorer-articles'
    for (const article of tagExplorer.allPosts) {
      list.appendChild(renderTagArticle(article))
    }
    postsSection.appendChild(list)
  } else {
    postsSection.innerHTML += '<div class="explorer-empty"><i class="fas fa-file-alt"></i><p>暂无文章</p></div>'
  }
  content.appendChild(postsSection)
  const status = $('#tags-explorer-status')
  if (status) status.textContent = (curTag ? getTagArticles(curTag.name).length + ' 篇标签文章, ' : '') + totalPosts + ' 篇文章, ' + tagExplorer.tags.length + ' 个标签'
}

function renderTagCard(tag) {
  const el = document.createElement('div')
  el.className = 'explorer-folder explorer-tag-item'
  const postCount = tag.post_count || 0
  el.innerHTML = '<div class="explorer-folder-icon explorer-tag-icon"><i class="fas fa-tag"></i></div><div class="explorer-folder-name">' + tag.name + '</div><div class="explorer-folder-count">' + postCount + ' 篇</div><button class="tag-card-delete-btn" title="删除标签"><i class="fas fa-times"></i></button>'
  el.addEventListener('click', function() {
    navigateToTag(tag)
  })
  el.querySelector('.tag-card-delete-btn').addEventListener('click', function(e) {
    e.stopPropagation()
    deleteManagedTag(tag.id)
  })
  el.addEventListener('contextmenu', function(e) {
    e.preventDefault()
    e.stopPropagation()
    showContextMenu(e, 'tag', { id: tag.id, name: tag.name })
  })
  el.addEventListener('dragover', function(e) {
    e.preventDefault()
    e.stopPropagation()
    el.classList.add('drop-target')
  })
  el.addEventListener('dragleave', function() {
    el.classList.remove('drop-target')
  })
  el.addEventListener('drop', function(e) {
    e.preventDefault()
    e.stopPropagation()
    el.classList.remove('drop-target')
    const postId = e.dataTransfer.getData('text/post-id')
    if (postId) {
      addTagToArticle(parseInt(postId), tag.name)
    }
  })
  return el
}

function renderTagArticle(article) {
  const el = document.createElement('div')
  el.className = 'explorer-article'
  el.draggable = true
  const isPublished = article.published !== false
  const cat = (article.category || '').trim()
  const tags = (article.tags || []).map(function(t) { return '<span class="tag-pill removable-tag" data-tag="' + t.replace(/"/g, '&quot;') + '" data-post-id="' + article.id + '"><i class="fas fa-tag"></i> ' + t + '<i class="fas fa-times tag-pill-remove"></i></span>' }).join('')
  el.innerHTML = '<div class="explorer-article-drag-handle"><i class="fas fa-grip-vertical"></i></div><div class="explorer-article-info"><div class="explorer-article-title">' + article.title + '</div><div class="explorer-article-meta"><span class="post-item-status"><span class="status-dot ' + (isPublished ? 'published' : 'private') + '"></span>' + (isPublished ? '公开' : '不公开') + '</span><span class="muted">' + new Date(article.created_at).toLocaleDateString('zh-CN') + '</span>' + (cat ? '<span class="post-item-cat"><i class="fas fa-folder"></i> ' + cat + '</span>' : '') + (tags ? '<span class="tag-list">' + tags + '</span>' : '') + '</div></div><div class="explorer-article-actions"><button class="btn btn-sm btn-publish-toggle ' + (isPublished ? 'published' : 'private') + '" onclick="togglePublished(' + article.id + ', ' + isPublished + ')" title="' + (isPublished ? '设为不公开' : '设为公开') + '"><i class="fas fa-eye' + (isPublished ? '' : '-slash') + '"></i></button><button class="btn btn-sm btn-outline" onclick="editPost(' + article.id + ')">编辑</button></div>'
  el.addEventListener('dragstart', function(e) {
    e.dataTransfer.setData('text/post-id', article.id.toString())
    e.dataTransfer.effectAllowed = 'copy'
    el.classList.add('dragging')
  })
  el.addEventListener('dragend', function() {
    el.classList.remove('dragging')
  })
  return el
}

async function addTagToArticle(postId, tagName) {
  const post = tagExplorer.allPosts.find(function(p) { return p.id === postId })
  if (!post) return
  const currentTags = post.tags || []
  if (currentTags.includes(tagName)) {
    showTagManageMsg('此文章已有该标签', 'error')
    return
  }
  const newTags = currentTags.concat([tagName])
  try {
    const { error } = await supabase.from(DB_TABLE).update({ tags: newTags, updated_at: new Date().toISOString() }).eq('id', postId)
    if (error) throw error
    pushUndo({ type: 'add-tag', postId, fromTags: currentTags, toTags: newTags })
    showTagManageMsg('已为「' + post.title + '」添加标签「' + tagName + '」', 'success')
    loadTagExplorerData()
  } catch (e) {
    showTagManageMsg('添加失败: ' + e.message, 'error')
  }
}

async function removeTagFromArticle(postId, tagName) {
  const post = tagExplorer.allPosts.find(function(p) { return p.id === postId })
  if (!post) return
  const currentTags = post.tags || []
  if (!currentTags.includes(tagName)) return
  const newTags = currentTags.filter(function(t) { return t !== tagName })
  try {
    const { error } = await supabase.from(DB_TABLE).update({ tags: newTags, updated_at: new Date().toISOString() }).eq('id', postId)
    if (error) throw error
    pushUndo({ type: 'add-tag', postId, fromTags: currentTags, toTags: newTags })
    showTagManageMsg('已从文章移除标签「' + tagName + '」', 'success')
    loadTagExplorerData()
  } catch (e) {
    showTagManageMsg('移除失败: ' + e.message, 'error')
  }
}

// Delegated click handler for removable tag pills
document.addEventListener('click', function(e) {
  const pill = e.target.closest('.removable-tag')
  if (!pill) return
  if (!pill.closest('#view-tags.active')) return
  e.stopPropagation()
  const tagName = pill.getAttribute('data-tag')
  const postId = parseInt(pill.getAttribute('data-post-id'))
  if (tagName && postId) {
    removeTagFromArticle(postId, tagName)
  }
})

let deleteTagCallback = null

window.deleteManagedTag = async function(id) {
  const tag = tagExplorer.tags.find(function(t) { return t.id === id })
  const tagName = tag ? tag.name : '未知'
  const articles = tagExplorer.allPosts.filter(function(p) { return (p.tags || []).includes(tagName) })
  const body = $('#delete-tag-body')
  const title = $('#delete-tag-title')
  if (!body || !title) return
  title.textContent = '删除标签「' + tagName + '」'
  if (articles.length > 0) {
    let html = '<p style="margin:0 0 12px;color:var(--text-secondary);">以下 ' + articles.length + ' 篇文章使用了该标签：</p><div style="max-height:280px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;">'
    for (const a of articles) {
      html += '<div style="padding:8px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;font-size:0.88em;"><i class="fas fa-file-alt" style="color:var(--text-muted);flex-shrink:0;"></i><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + a.title + '</span></div>'
    }
    html += '</div>'
    body.innerHTML = html
  } else {
    body.innerHTML = '<p style="margin:0;color:var(--text-secondary);">没有文章使用此标签。</p>'
  }
  $('#delete-tag-modal').style.display = 'flex'
  deleteTagCallback = { id, tagName, articles }
}

window.confirmDeleteTag = async function() {
  if (!deleteTagCallback) return
  const { id, tagName, articles } = deleteTagCallback
  const confirmBtn = $('#delete-tag-confirm-btn')
  confirmBtn.disabled = true
  confirmBtn.textContent = '删除中...'
  try {
    const removeFromArticles = $('#delete-tag-remove-articles').checked
    if (removeFromArticles && articles.length > 0) {
      for (const a of articles) {
        const newTags = (a.tags || []).filter(function(t) { return t !== tagName })
        if (newTags.length !== (a.tags || []).length) {
          await supabase.from(DB_TABLE).update({ tags: newTags, updated_at: new Date().toISOString() }).eq('id', a.id)
        }
      }
    }
    await clientDeleteManagedTag(id)
    showTagManageMsg('标签已删除' + (removeFromArticles && articles.length > 0 ? ('，已从 ' + articles.length + ' 篇文章中移除') : ''), 'success')
    closeDeleteTagDialog()
    if (tagExplorer.currentTag && tagExplorer.currentTag.id === id) {
      tagExplorer.currentTag = null
    }
    loadTagExplorerData()
  } catch (e) {
    showTagManageMsg('删除失败: ' + e.message, 'error')
    confirmBtn.disabled = false
    confirmBtn.textContent = '删除标签'
  }
}

window.closeDeleteTagDialog = function() {
  $('#delete-tag-modal').style.display = 'none'
  $('#delete-tag-confirm-btn').disabled = false
  $('#delete-tag-confirm-btn').textContent = '删除标签'
  deleteTagCallback = null
}

window.renameManagedTag = async function(id, name) {
  try {
    await clientRenameManagedTag(id, name)
    showTagManageMsg('标签已重命名', 'success')
    if (tagExplorer.currentTag && tagExplorer.currentTag.id === id) {
      tagExplorer.currentTag = { id: id, name: name }
    }
    loadTagExplorerData()
  } catch (e) {
    showTagManageMsg('重命名失败: ' + e.message, 'error')
  }
}

$('#manage-tags-btn').addEventListener('click', () => {
  showView('view-tags')
  tagExplorer.currentTag = null
  loadTagExplorerData()
})

window.cancelTagManage = function() {
  showView('view-posts')
}

$('#tag-back-btn').addEventListener('click', navigateToAllTags)

$('#explorer-new-tag-btn').addEventListener('click', function() {
  showInputDialog('新建标签：', addTag)
})

$('#view-tags').addEventListener('contextmenu', function(e) {
  if (!$('#view-tags').classList.contains('active')) return
  if (e.target.closest('.explorer-tag-item') || e.target.closest('.explorer-article')) return
  e.preventDefault()
  showContextMenu(e, 'tag', {})
})

// Helper - add tag via Supabase
async function addTag(name) {
  if (!name) return
  try {
    await clientCreateManagedTag(name)
    showTagManageMsg('标签已添加', 'success')
    loadTagExplorerData()
  } catch (e) {
    showTagManageMsg('添加失败: ' + e.message, 'error')
  }
}

// Helper - add top-level category via Supabase
async function addTopCategory(name) {
  if (!name) return
  try {
    await clientCreateManagedCategory(name, null)
    showCatManageMsg('分类已添加', 'success')
    loadExplorerData()
  } catch (e) {
    showCatManageMsg('添加失败: ' + e.message, 'error')
  }
}

// Helper - add child category via Supabase
async function addChildCategory(parentId, name) {
  if (!name) return
  try {
    await clientCreateManagedCategory(name, parentId)
    showCatManageMsg('子分类已添加', 'success')
    loadExplorerData()
  } catch (e) {
    showCatManageMsg('添加失败: ' + e.message, 'error')
  }
}

// ============ Category Management ============

function showCatManageMsg(text, type) {
  const el = $('#cats-manage-message')
  if (!el) return
  el.textContent = text
  el.className = 'message-msg ' + type
  el.style.display = 'block'
  setTimeout(() => { el.style.display = 'none' }, 3000)
}

// ============ Category Explorer ============

const UNCATEGORIZED = { id: -1, name: '未分类', path: '', isVirtual: true, post_count: 0 }

const explorer = {
  tree: [],
  flat: [],
  allPosts: [],
  currentPath: '',
  currentId: null,
  currentName: '',
  history: []
}

async function loadExplorerData() {
  const content = $('#explorer-content')
  if (!content) return
  content.innerHTML = '<div class="explorer-loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>'
  try {
    const catsData = await clientGetManagedCategories()
    explorer.tree = catsData.tree || []
    explorer.flat = catsData.flat || []
    const { data: posts } = await supabase.from(DB_TABLE).select('id, title, category, created_at, published, tags').order('created_at', { ascending: false })
    explorer.allPosts = posts || []
    UNCATEGORIZED.post_count = explorer.allPosts.filter(p => !p.category || p.category === '').length
    renderExplorer()
  } catch (e) {
    content.innerHTML = '<div class="explorer-empty"><i class="fas fa-exclamation-triangle"></i><p>加载失败: ' + e.message + '</p></div>'
  }
}

function getExplorerContents() {
  const curPath = explorer.currentPath
  let folders = []
  let articles = []
  if (!curPath) {
    folders.push({ ...UNCATEGORIZED })
    for (const cat of explorer.tree) {
      folders.push(cat)
    }
    articles = explorer.allPosts.filter(p => !p.category || p.category === '')
  } else {
    const findChildren = (nodes) => {
      for (const node of nodes) {
        if (node.path === curPath) return node.children || []
        if (node.children) {
          const found = findChildren(node.children)
          if (found) return found
        }
      }
      return null
    }
    const children = findChildren(explorer.tree) || []
    for (const c of children) { folders.push(c) }
    articles = explorer.allPosts.filter(p => p.category === curPath)
  }
  return { folders, articles }
}

function isDescendant(folderId, targetId, nodes) {
  for (const node of nodes) {
    if (node.id === folderId) {
      return node.children ? containsId(node.children, targetId) : false
    }
    if (node.children && isDescendant(folderId, targetId, node.children)) return true
  }
  return false
}

function containsId(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return true
    if (node.children && containsId(node.children, id)) return true
  }
  return false
}

async function moveFolderToParent(folderId, newParentId, targetName) {
  try {
    const cat = explorer.flat.find(function(c) { return c.id === folderId })
    const oldParentId = cat ? cat.parent_id : null
    if (oldParentId === newParentId) return
    if (folderId === newParentId) {
      showCatManageMsg('不能将文件夹移动到自身', 'error')
      return
    }
    if (isDescendant(folderId, newParentId, explorer.tree)) {
      showCatManageMsg('不能将文件夹移动到自身的子文件夹中', 'error')
      return
    }
    await clientMoveManagedCategory(folderId, newParentId)
    pushUndo({ type: 'move-folder', folderId, fromParentId: oldParentId, toParentId: newParentId })
    showCatManageMsg('文件夹已移动到「' + targetName + '」', 'success')
    loadExplorerData()
  } catch (e) {
    showCatManageMsg('移动失败: ' + e.message, 'error')
  }
}

function navigateTo(path, id, name) {
  if (explorer.currentPath !== path || explorer.currentId !== id) {
    explorer.history.push({ path: explorer.currentPath, id: explorer.currentId, name: explorer.currentName })
  }
  explorer.currentPath = path
  explorer.currentId = id
  explorer.currentName = name || ''
  renderExplorer()
}

function navigateBack() {
  if (explorer.history.length === 0) return
  const prev = explorer.history.pop()
  explorer.currentPath = prev.path
  explorer.currentId = prev.id
  explorer.currentName = prev.name
  renderExplorer()
}

function navigateToRoot() {
  explorer.history = []
  explorer.currentPath = ''
  explorer.currentId = null
  explorer.currentName = ''
  renderExplorer()
}

function renderExplorer() {
  const content = $('#explorer-content')
  if (!content) return
  content.innerHTML = ''
  const { folders, articles } = getExplorerContents()
  if (folders.length > 0) {
    const section = document.createElement('div')
    section.className = 'explorer-section'
    section.innerHTML = '<div class="explorer-section-title"><i class="fas fa-folder"></i> 文件夹 <span class="muted">(' + folders.length + ')</span></div>'
    const grid = document.createElement('div')
    grid.className = 'explorer-folders'
    for (const folder of folders) {
      grid.appendChild(renderExplorerFolder(folder))
    }
    section.appendChild(grid)
    content.appendChild(section)
  }
  if (articles.length > 0) {
    const section = document.createElement('div')
    section.className = 'explorer-section'
    section.innerHTML = '<div class="explorer-section-title"><i class="fas fa-file-alt"></i> 文章 <span class="muted">(' + articles.length + ')</span></div>'
    const list = document.createElement('div')
    list.className = 'explorer-articles'
    for (const article of articles) {
      list.appendChild(renderExplorerArticle(article))
    }
    section.appendChild(list)
    content.appendChild(section)
  }
  if (folders.length === 0 && articles.length === 0) {
    content.innerHTML = '<div class="explorer-empty"><i class="fas fa-folder-open"></i><p>此文件夹为空</p><p class="muted">点击上方「新建文件夹」创建子分类，或拖拽文章到其他文件夹</p></div>'
  }
  renderBreadcrumb()
  const backBtn = $('#explorer-back-btn')
  if (backBtn) backBtn.disabled = explorer.history.length === 0
  renderExplorerStatus(folders.length, articles.length)
}

function renderExplorerFolder(folder) {
  const el = document.createElement('div')
  el.className = 'explorer-folder'
  const isUncategorized = folder.id === -1 || folder.isVirtual
  const postCount = folder.post_count || 0
  el.innerHTML = '<div class="explorer-folder-icon"><i class="fas fa-folder"></i></div><div class="explorer-folder-name">' + folder.name + '</div><div class="explorer-folder-count">' + postCount + ' 篇</div>'
  if (!isUncategorized) {
    el.draggable = true
    el.addEventListener('dragstart', function(e) {
      e.dataTransfer.setData('text/folder-id', folder.id.toString())
      e.dataTransfer.effectAllowed = 'move'
      el.classList.add('dragging')
    })
    el.addEventListener('dragend', function() {
      el.classList.remove('dragging')
    })
  }
  el.addEventListener('click', function(e) {
    if (e.defaultPrevented) return
    if (isUncategorized) {
      navigateTo('', null, '未分类')
    } else {
      navigateTo(folder.path || '', folder.id, folder.name)
    }
  })
  if (!isUncategorized) {
    el.addEventListener('contextmenu', function(e) {
      e.preventDefault()
      e.stopPropagation()
      showContextMenu(e, 'cat', { id: folder.id, name: folder.name, path: folder.path || '' })
    })
  }
  el.addEventListener('dragover', function(e) {
    e.preventDefault()
    e.stopPropagation()
    el.classList.add('drop-target')
  })
  el.addEventListener('dragleave', function() {
    el.classList.remove('drop-target')
  })
  el.addEventListener('drop', function(e) {
    e.preventDefault()
    e.stopPropagation()
    el.classList.remove('drop-target')
    const folderId = e.dataTransfer.getData('text/folder-id')
    const postId = e.dataTransfer.getData('text/post-id')
    if (folderId && !isUncategorized) {
      moveFolderToParent(parseInt(folderId), folder.id, folder.name)
      return
    }
    if (postId) {
      movePostToCategory(parseInt(postId), isUncategorized ? '' : (folder.path || ''), folder.name)
    }
  })
  return el
}

function renderExplorerArticle(post) {
  const el = document.createElement('div')
  el.className = 'explorer-article'
  el.draggable = true
  const isPublished = post.published !== false
  const cat = (post.category || '').trim()
  const tags = (post.tags || []).map(function(t) { return '<span class="tag-pill"><i class="fas fa-tag"></i> ' + t + '</span>' }).join('')
  el.innerHTML = '<div class="explorer-article-drag-handle"><i class="fas fa-grip-vertical"></i></div><div class="explorer-article-info"><div class="explorer-article-title">' + post.title + '</div><div class="explorer-article-meta"><span class="post-item-status"><span class="status-dot ' + (isPublished ? 'published' : 'private') + '"></span>' + (isPublished ? '公开' : '不公开') + '</span><span class="muted">' + new Date(post.created_at).toLocaleDateString('zh-CN') + '</span>' + (cat ? '<span class="post-item-cat"><i class="fas fa-folder"></i> ' + cat + '</span>' : '') + (tags ? '<span class="tag-list">' + tags + '</span>' : '') + '</div></div><div class="explorer-article-actions"><button class="btn btn-sm btn-publish-toggle ' + (isPublished ? 'published' : 'private') + '" onclick="togglePublished(' + post.id + ', ' + isPublished + ')" title="' + (isPublished ? '设为不公开' : '设为公开') + '"><i class="fas fa-eye' + (isPublished ? '' : '-slash') + '"></i></button><button class="btn btn-sm btn-outline" onclick="editPost(' + post.id + ')">编辑</button></div>'
  el.addEventListener('dragstart', function(e) {
    e.dataTransfer.setData('text/post-id', post.id.toString())
    e.dataTransfer.effectAllowed = 'move'
    el.classList.add('dragging')
  })
  el.addEventListener('dragend', function() {
    el.classList.remove('dragging')
  })
  return el
}

async function movePostToCategory(postId, categoryPath, categoryName) {
  try {
    const { data: post } = await supabase.from(DB_TABLE).select('category').eq('id', postId).single()
    const oldCategory = post ? post.category : ''
    const { error } = await supabase.from(DB_TABLE).update({ category: categoryPath, updated_at: new Date().toISOString() }).eq('id', postId)
    if (error) throw error
    pushUndo({ type: 'move-article', postId, fromCategory: oldCategory, toCategory: categoryPath })
    showCatManageMsg('文章已移动到「' + categoryName + '」', 'success')
    loadExplorerData()
  } catch (e) {
    showCatManageMsg('移动失败: ' + e.message, 'error')
  }
}

function makeBreadcrumbDropTarget(el, path, id, name) {
  el.addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); el.classList.add('drop-target') })
  el.addEventListener('dragleave', function() { el.classList.remove('drop-target') })
  el.addEventListener('drop', function(e) {
    e.preventDefault(); e.stopPropagation(); el.classList.remove('drop-target')
    const folderId = e.dataTransfer.getData('text/folder-id')
    const postId = e.dataTransfer.getData('text/post-id')
    if (folderId) moveFolderToParent(parseInt(folderId), id, name)
    if (postId) movePostToCategory(parseInt(postId), path || '', name)
  })
}

function renderBreadcrumb() {
  const bc = $('#explorer-breadcrumb')
  if (!bc) return
  bc.innerHTML = ''
  const root = document.createElement('span')
  root.className = 'breadcrumb-item'
  root.innerHTML = '<i class="fas fa-home"></i> 全部分类'
  root.addEventListener('click', navigateToRoot)
  makeBreadcrumbDropTarget(root, '', null, '根目录')
  bc.appendChild(root)
  for (let i = 0; i < explorer.history.length; i++) {
    const item = explorer.history[i]
    if (item.path || item.name) {
      const sep = document.createElement('span')
      sep.className = 'breadcrumb-sep'
      sep.innerHTML = '<i class="fas fa-chevron-right"></i>'
      bc.appendChild(sep)
      const crumb = document.createElement('span')
      crumb.className = 'breadcrumb-item'
      crumb.textContent = item.name || '全部分类'
      const idx = i
      crumb.addEventListener('click', function() {
        explorer.history = explorer.history.slice(0, idx)
        explorer.currentPath = item.path
        explorer.currentId = item.id
        explorer.currentName = item.name
        renderExplorer()
      })
      makeBreadcrumbDropTarget(crumb, item.path, item.id, item.name)
      bc.appendChild(crumb)
    }
  }
  if (explorer.currentName) {
    const sep = document.createElement('span')
    sep.className = 'breadcrumb-sep'
    sep.innerHTML = '<i class="fas fa-chevron-right"></i>'
    bc.appendChild(sep)
    const current = document.createElement('span')
    current.className = 'breadcrumb-item current'
    current.textContent = explorer.currentName
    bc.appendChild(current)
  }
}

function renderExplorerStatus(folderCount, articleCount) {
  const status = $('#explorer-status')
  if (status) status.textContent = folderCount + ' 个文件夹, ' + articleCount + ' 篇文章'
}

window.deleteManagedCategory = async function(id) {
  if (!confirm('确定删除此分类？子分类也会被删除。')) return
  try {
    await clientDeleteManagedCategory(id)
    showCatManageMsg('分类已删除', 'success')
    loadExplorerData()
  } catch (e) {
    showCatManageMsg('删除失败: ' + e.message, 'error')
  }
}

window.renameManagedCategory = async function(id, name) {
  try {
    await clientRenameManagedCategory(id, name)
    showCatManageMsg('分类已重命名', 'success')
    loadExplorerData()
  } catch (e) {
    showCatManageMsg('重命名失败: ' + e.message, 'error')
  }
}

async function sortCategory(id, direction) {
  const siblings = explorer.currentPath
    ? (function findSiblings(nodes, path) {
        for (const node of nodes) {
          if (node.path === path) return node.children || []
          if (node.children) {
            const found = findSiblings(node.children, path)
            if (found) return found
          }
        }
        return null
      })(explorer.tree, explorer.currentPath)
    : explorer.tree
  const idx = siblings.findIndex(function(c) { return c.id === id })
  if (idx < 0) return
  const targetIdx = idx + direction
  if (targetIdx < 0 || targetIdx >= siblings.length) return
  const a = siblings[idx]
  const b = siblings[targetIdx]
  try {
    await clientReorderCategory(a.id, b.sort_order || 0)
    await clientReorderCategory(b.id, a.sort_order || 0)
    showCatManageMsg('排序已更新', 'success')
    loadExplorerData()
  } catch (e) {
    showCatManageMsg('排序失败: ' + e.message, 'error')
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
  menu.querySelector('[data-action="sort-up"]').style.display = 'none'
  menu.querySelector('[data-action="sort-down"]').style.display = 'none'
  menu.querySelector('[data-action="rename-tag"]').style.display = 'none'
  menu.querySelector('[data-action="delete"]').style.display = 'none'
  sep.style.display = 'none'
  if (hasId) {
    if (type === 'cat') {
      menu.querySelector('[data-action="add-child"]').style.display = ''
      menu.querySelector('[data-action="rename"]').style.display = ''
      menu.querySelector('[data-action="sort-up"]').style.display = ''
      menu.querySelector('[data-action="sort-down"]').style.display = ''
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
      case 'sort-up':
        sortCategory(target.id, -1)
        break
      case 'sort-down':
        sortCategory(target.id, 1)
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
  explorer.history = []
  explorer.currentPath = ''
  explorer.currentId = null
  explorer.currentName = ''
  loadExplorerData()
})

window.cancelCatManage = function() {
  showView('view-posts')
}

$('#explorer-back-btn').addEventListener('click', navigateBack)

$('#explorer-new-folder-btn').addEventListener('click', function() {
  const parentName = explorer.currentName || '根目录'
  const parentId = explorer.currentId
  if (explorer.currentPath) {
    showInputDialog('在「' + parentName + '」下新建子文件夹：', function(val) {
      if (val) addChildCategory(parentId, val)
    })
  } else {
    showInputDialog('新建文件夹：', addTopCategory)
  }
})

$('#view-categories').addEventListener('contextmenu', function(e) {
  if (!$('#view-categories').classList.contains('active')) return
  if (e.target.closest('.explorer-folder') || e.target.closest('.explorer-article')) return
  e.preventDefault()
  if (explorer.currentPath && explorer.currentId) {
    showContextMenu(e, 'cat', { id: explorer.currentId, name: explorer.currentName, path: explorer.currentPath })
  } else {
    showContextMenu(e, 'cat', {})
  }
})

// ============ Editor Category/Tag Picker ============

let pickerCategories = []
let pickerCategoryTree = []
let pickerTags = []
let selectedCategoryPath = ''
let selectedTags = []

async function loadPickerData() {
  try {
    pickerTags = await clientGetManagedTags()
    const catsData = await clientGetManagedCategories()
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

function updatePickerAncestorHighlight(selVal) {
  if (!selVal) return
  const body = $('#cat-picker-body')
  if (!body) return
  const items = body.querySelectorAll('.picker-item')
  for (const item of items) {
    item.classList.remove('picker-item-ancestor')
    const radio = item.querySelector('input[type="radio"]')
    if (radio && selVal.startsWith(radio.value + '/') && radio.value !== selVal) {
      item.classList.add('picker-item-ancestor')
    }
  }
}

function renderPickerCategoryTree(tree, container, level) {
  for (const cat of tree) {
    const item = document.createElement('div')
    item.className = 'picker-item'
    item.style.paddingLeft = (16 + level * 24) + 'px'
    const hasChildren = cat.children && cat.children.length > 0
    const current = selectedCategoryPath
    const catPath = cat.path || cat.name
    const isExact = catPath === current
    const isAncestor = current && current.startsWith(catPath + '/') && catPath !== current
    item.innerHTML = `
      ${hasChildren ? '<span class="picker-toggle"><i class="fas fa-chevron-right"></i></span>' : '<span class="picker-toggle" style="visibility:hidden"><i class="fas fa-chevron-right"></i></span>'}
      <input type="radio" name="cat-picker" value="${catPath}" ${isExact ? 'checked' : ''}>
      <span class="picker-item-name"><i class="fas fa-folder"></i> ${cat.name}</span>
      <span class="picker-item-path">${cat.post_count || 0} 篇</span>
    `
    item.addEventListener('click', function(e) {
      if (e.target.closest('.picker-toggle')) return
      const inp = item.querySelector('input[type="radio"]')
      if (inp) {
        inp.checked = true
        updatePickerAncestorHighlight(inp.value)
      }
    })
    container.appendChild(item)

    if (hasChildren) {
      const childWrap = document.createElement('div')
      childWrap.className = 'picker-children'
      childWrap.style.display = 'none'
      container.appendChild(childWrap)
      renderPickerCategoryTree(cat.children, childWrap, level + 1)

      const toggle = item.querySelector('.picker-toggle')
      if (isAncestor) {
        childWrap.style.display = ''
        toggle.querySelector('i').className = 'fas fa-chevron-down'
      }
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
    if (selectedCategoryPath) {
      updatePickerAncestorHighlight(selectedCategoryPath)
    }
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
  const checked = document.querySelector('input[name="cat-picker"]:checked')
  const parentPath = checked ? checked.value : ''
  const parent = parentPath ? pickerCategories.find(function(c) { return (c.path || c.name) === parentPath }) : null
  const parentId = parent ? parent.id : null
  showInputDialog(parent ? ('在「' + parent.name + '」下新建：') : '输入新分类名：', function(name) {
    if (name) {
      clientCreateManagedCategory(name, parentId).then(function() {
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
      clientCreateManagedTag(name).then(function() {
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