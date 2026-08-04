# SA-12 后台修改密码视图 E2E 测试报告

## 测试文件
`tests/sa-12-admin-changepw.spec.ts`

## 测试环境
- **服务器**: http://localhost:3001
- **浏览器**: Chromium (headless)
- **视口**: 1920x1080 / 375x812
- **测试框架**: Playwright Test v1.62.0

## 测试结果

| # | 测试项 | 耗时 | 结果 |
|---|--------|------|------|
| A1 | #view-change-pw 修改密码视图存在 | 1.4s | ✅ Passed |
| A2 | .edit-box 编辑框存在 | 1.3s | ✅ Passed |
| A3 | h3 标题包含修改密码图标（fa-key） | 1.3s | ✅ Passed |
| B4 | #change-pw-form 表单存在 | 1.3s | ✅ Passed |
| B5 | #new-password 输入框 type=password | 1.5s | ✅ Passed |
| B6 | #confirm-password 输入框 type=password | 1.3s | ✅ Passed |
| B7 | 两个输入框 minlength >= 6 | 1.4s | ✅ Passed |
| C8 | #change-pw-submit 确认按钮存在 | 1.3s | ✅ Passed |
| C9 | 取消按钮点击后返回 #view-posts | 1.4s | ✅ Passed |
| D10 | #change-pw-message 消息区域存在 | 1.6s | ✅ Passed |
| E11 | 两次密码不一致显示错误消息 | 1.5s | ✅ Passed |
| E12 | 密码太短（123）显示错误消息 | 1.6s | ✅ Passed |
| E13 | 输入有效密码提交成功（认证流程完整） | 3.1s | ✅ Passed |
| F14 | 桌面端 (1920x1080) 无水平溢出 | 1.3s | ✅ Passed |
| F15 | 移动端 (375x812) 无水平溢出 | 1.3s | ✅ Passed |

**总计**: 15/15 通过，平均耗时 24.4s

## 关键技术实现

### 1. 认证机制
使用 `page.route()` 对 `localhost:3001` 请求注入 `Authorization: Bearer admin123456` header，满足后端 adminAuth 中间件校验。

### 2. 视图切换
非认证测试通过 `page.evaluate()` 直接操作 DOM 类名切换到 `#view-change-pw` 视图：
```javascript
await page.evaluate(() => {
  document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById('view-change-pw');
  if (view) view.classList.add('active');
});
```

### 3. 完整认证登录流程（E13）
E13 采用真实登录流程建立 Supabase 会话：
1. 访问 `/admin` 页面
2. 等待 `#view-login.active` 出现
3. 填写凭证并提交登录表单
4. 验证登录成功后进入 `#view-posts`
5. 点击 `#change-pw-btn` 切换到修改密码视图
6. 拦截 `supabase.auth.updateUser` API 调用返回 mock 成功响应
7. 提交密码变更并验证成功消息

### 4. 网络拦截
通过 `page.route` 拦截 Supabase API 调用，避免实际修改密码：
```javascript
await page.route('https://eacieurozwzligrxnyos.supabase.co/auth/v1/user', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: { user: { id: 'mock' } }, error: null })
  });
});
```

### 5. 断点续测
使用 `.e2e-status.json` 记录每个测试用例的执行状态，支持失败后继续执行：
```javascript
function writeStatus(patch: Record<string, any>) {
  const status = readStatus();
  Object.assign(status, patch);
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}
```

## 表单验证逻辑验证

### 密码不一致（E11）
- 新密码填入 `newpassword123`，确认密码填入 `differentpassword`
- 点击提交后，`#change-pw-message` 显示错误消息且包含 "不一致" 文本
- 消息框具有 `error` 样式类 ✅

### 密码过短（E12）
- 禁用原生验证，填入 `123`（长度 < 6）
- 点击提交后，`#change-pw-message` 显示错误消息且具有 `error` 类 ✅

### 密码有效（E13）
- 完成认证登录后，填入一致密码 `TestPW123456`（长度 ≥ 6）
- API 调用被 mock 为成功
- 点击提交后，`#change-pw-message` 显示成功消息且具有 `success` 类 ✅

## 响应式测试（F 部分）

| 场景 | 宽度×高度 | 检测方式 | 结果 |
|------|----------|---------|------|
| 桌面端 | 1920×1080 | `scrollWidth > clientWidth` | ✅ 无溢出 |
| 移动端 | 375×812 | `scrollWidth > clientWidth` | ✅ 无溢出 |

## 断言与约束

- **maxFailures: 1** - 测试描述配置 `test.describe.configure({ maxFailures: 1 })`
- **零硬编码等待** - 全部使用 `page.waitForSelector()`、`page.waitForLoadState()` 替代 `waitForTimeout`
- **头文件注入** - 通过 `page.setExtraHTTPHeaders()` 和 `page.route()` 注入 Authorization Bearer Token

## 结论

SA-12 后台修改密码视图 E2E 测试全部 **15/15 通过**，涵盖视图结构、表单元素、操作按钮、消息区域、表单验证及响应式布局等全维度测试用例。