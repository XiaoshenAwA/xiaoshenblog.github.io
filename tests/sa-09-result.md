# SA-09 后台管理登录视图 E2E 测试结果

## 断点记录

| 测试编号 | 测试名称 | 状态 | 耗时 |
|---------|---------|------|------|
| A1 | 访问 /admin 页面加载成功 | PASS | 1.2s |
| A2 | #view-login 登录视图存在且可见 | PASS | 1.2s |
| A3 | #view-posts 文章列表视图存在但隐藏 | PASS | 1.5s |
| A4 | .login-box 登录框存在 | PASS | 1.2s |
| B5 | #login-form 表单存在 | PASS | 1.1s |
| B6 | #login-email 邮箱输入框存在且可聚焦 | PASS | 1.2s |
| B7 | #login-password 密码输入框存在且可聚焦 | PASS | 1.2s |
| B8 | 提交按钮 .btn-primary 存在 | PASS | 1.2s |
| B9 | #login-error 错误提示区域存在 | PASS | 1.2s |
| C10 | #theme-toggle-admin 主题切换按钮存在 | PASS | 1.2s |
| C11 | 点击主题切换按钮切换 data-theme 属性 | PASS | 1.3s |
| D12 | .admin-header 管理头部存在 | PASS | 1.2s |
| D13 | #user-email 用户邮箱显示区域存在 | PASS | 1.3s |
| D14 | #change-pw-btn 修改密码按钮存在且初始隐藏 | PASS | 1.2s |
| D15 | #logout-btn 退出按钮存在且初始隐藏 | PASS | 1.1s |
| E16 | 输入错误凭证显示错误信息 | PASS | 2.0s |
| E17-E20 | 正确凭证登录并验证状态 | PASS | 2.0s |
| F21 | 桌面端 (1920x1080) 无水平溢出 | PASS | 1.2s |
| F22 | 移动端 (375x812) 无水平溢出 | PASS | 1.2s |

**总计: 19 passed, 0 failed — 全部通过**

## Runner 真实输出

```
Running 19 tests using 1 worker

  ok  1 [chromium] › tests\sa-09-admin-login.spec.ts:66:7 › SA-09 后台管理登录视图 E2E 测试 › A1: 访问 /admin 页面加载成功 (1.2s)
  ok  2 [chromium] › tests\sa-09-admin-login.spec.ts:75:7 › SA-09 后台管理登录视图 E2E 测试 › A2: #view-login 登录视图存在且可见 (1.2s)
  ok  3 [chromium] › tests\sa-09-admin-login.spec.ts:82:7 › SA-09 后台管理登录视图 E2E 测试 › A3: #view-posts 文章列表视图存在但隐藏 (1.5s)
  ok  4 [chromium] › tests\sa-09-admin-login.spec.ts:90:7 › SA-09 后台管理登录视图 E2E 测试 › A4: .login-box 登录框存在 (1.2s)
  ok  5 [chromium] › tests\sa-09-admin-login.spec.ts:99:7 › SA-09 后台管理登录视图 E2E 测试 › B5: #login-form 表单存在 (1.1s)
  ok  6 [chromium] › tests\sa-09-admin-login.spec.ts:106:7 › SA-09 后台管理登录视图 E2E 测试 › B6: #login-email 邮箱输入框存在且可聚焦 (1.2s)
  ok  7 [chromium] › tests\sa-09-admin-login.spec.ts:116:7 › SA-09 后台管理登录视图 E2E 测试 › B7: #login-password 密码输入框存在且可聚焦 (1.2s)
  ok  8 [chromium] › tests\sa-09-admin-login.spec.ts:126:7 › SA-09 后台管理登录视图 E2E 测试 › B8: 提交按钮 .btn-primary 存在 (1.2s)
  ok  9 [chromium] › tests\sa-09-admin-login.spec.ts:133:7 › SA-09 后台管理登录视图 E2E 测试 › B9: #login-error 错误提示区域存在 (1.2s)
  ok 10 [chromium] › tests\sa-09-admin-login.spec.ts:142:7 › SA-09 后台管理登录视图 E2E 测试 › C10: #theme-toggle-admin 主题切换按钮存在 (1.2s)
  ok 11 [chromium] › tests\sa-09-admin-login.spec.ts:149:7 › SA-09 后台管理登录视图 E2E 测试 › C11: 点击主题切换按钮切换 data-theme 属性 (1.3s)
  ok 12 [chromium] › tests\sa-09-admin-login.spec.ts:166:7 › SA-09 后台管理登录视图 E2E 测试 › D12: .admin-header 管理头部存在 (1.2s)
  ok 13 [chromium] › tests\sa-09-admin-login.spec.ts:173:7 › SA-09 后台管理登录视图 E2E 测试 › D13: #user-email 用户邮箱显示区域存在 (1.3s)
  ok 14 [chromium] › tests\sa-09-admin-login.spec.ts:180:7 › SA-09 后台管理登录视图 E2E 测试 › D14: #change-pw-btn 修改密码按钮存在且初始隐藏 (1.2s)
  ok 15 [chromium] › tests\sa-09-admin-login.spec.ts:188:7 › SA-09 后台管理登录视图 E2E 测试 › D15: #logout-btn 退出按钮存在且初始隐藏 (1.1s)
  ok 16 [chromium] › tests\sa-09-admin-login.spec.ts:198:7 › SA-09 后台管理登录视图 E2E 测试 › E16: 输入错误凭证显示错误信息 (2.0s)
  ok 17 [chromium] › tests\sa-09-admin-login.spec.ts:210:7 › SA-09 后台管理登录视图 E2E 测试 › E17-E20: 正确凭证登录并验证状态 (2.0s)
  ok 18 [chromium] › tests\sa-09-admin-login.spec.ts:253:7 › SA-09 后台管理登录视图 E2E 测试 › F21: 桌面端 (1920x1080) 无水平溢出 (1.2s)
  ok 19 [chromium] › tests\sa-09-admin-login.spec.ts:264:7 › SA-09 后台管理登录视图 E2E 测试 › F22: 移动端 (375x812) 无水平溢出 (1.2s)

  19 passed (26.3s)
```

## 修复记录

### 问题1: /admin 返回 401 Unauthorized
- **原因**: `/admin` 路由有 server-side 中间件 `adminAuth`，要求 `Authorization: Bearer <ADMIN_PASSWORD>` HTTP header
- **修复**: 使用 `page.route()` 拦截所有 `http://localhost:3001/**` 请求，仅对本地服务器请求注入 Bearer header，不干扰 Supabase API 或 CDN 请求

### 问题2: CSS 导致视图默认隐藏
- **原因**: admin.ejs 中 `.admin-view { display: none; }`，所有视图初始隐藏，JS 加载后调用 `showView()` 添加 `active` class 才显示
- **修复**: 使用 `waitForSelector('#view-login.active')` 等待 JS 执行完毕后再断言

### 问题3: setExtraHTTPHeaders 干扰 Supabase
- **原因**: `page.setExtraHTTPHeaders()` 将 `Authorization: Bearer admin123456` 发送到所有请求（包括 Supabase API），导致 Supabase 返回 403
- **修复**: 改用 `page.route('http://localhost:3001/**')` 精确控制仅对本地请求注入 auth header

## 无需代码修复

所有 19 项测试均通过，`views/admin.ejs` 和 `src/admin.js` 无需修改。
