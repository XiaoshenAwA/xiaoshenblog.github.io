import './style.css'
import './admin.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import 'katex/dist/katex.min.css'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://eacieurozwzligrxnyos.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_owez1XlLUfQiJOkzi23zng_B-A_Ez0P'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const DEPLOY_HOOK_URL = 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/aeddd3fe-52ad-45c1-9b29-4b0093c2168b'

function triggerDeploy() {
  fetch(DEPLOY_HOOK_URL, { method: 'POST' }).catch(() => {})
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
  showView('view-login')
  showButtons(false)
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

  // Automatically return to posts list after 2 seconds
  setTimeout(() => {
    cancelChangePw()
  }, 2000)
})

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
  $('#edit-submit').textContent = id ? '更新文章' : '创建文章'
  if (error) { $('#edit-error').textContent = '保存失败: ' + error.message; return }
  cancelEdit()
  loadPosts()
  triggerDeploy()
})

$('#new-post-btn').addEventListener('click', () => {
  $('#edit-id').value = ''
  $('#edit-title').value = ''
  $('#edit-content').value = ''
  $('#edit-tags').value = ''
  $('#edit-cover').value = ''
  $('#edit-submit').textContent = '创建文章'
  showView('view-edit')
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