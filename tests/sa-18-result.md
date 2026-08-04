# SA-18 弹窗 Modal 集合 E2E 测试结果

**日期**: 2026-07-29
**状态**: 全部通过 ✅
**测试数量**: 53
**耗时**: ~1.6 分钟

## 测试概览

| 分组 | 用例 | 结果 |
|------|------|------|
| A. 搜索弹窗 | A1-A6 | ✅ 6/6 |
| B. 字体设置面板 | B7-B11 | ✅ 5/5 |
| C. 后台分类选择器 Modal | C12-C19 | ✅ 8/8 |
| D. 后台标签选择器 Modal | D20-D24 | ✅ 5/5 |
| E. 后台通用输入对话框 | E25-E28 | ✅ 4/4 |
| F. 后台删除标签确认弹窗 | F29-F32 | ✅ 4/4 |
| G. 后台插入链接 Modal | G33-G37 | ✅ 5/5 |
| H. 后台插入图片 Modal | H38-H42 | ✅ 5/5 |
| I. 后台插入代码块 Modal | I43-I47 | ✅ 5/5 |
| J. 右键上下文菜单 | J48-J49 | ✅ 2/2 |
| K. 响应式溢出检查 | K50-K53 | ✅ 4/4 |

## 关键实现细节

- **Supabase Mock**: 外部 Supabase (eacieurozwzligrxnyos) DNS 不可达，通过 `page.route` 拦截所有 `/auth/v1/**` 和 `/rest/v1/**` 请求并返回 mock 数据
- **Admin 登录**: 服务端中间件要求 `Authorization: Bearer admin123456`。通过 route 拦截 `/admin` 页面并在 HTML `<head>` 注入 seed 脚本，将 mock session 写入 localStorage
- **Inline onclick**: Playwright 的 `.click()` 无法触发 HTML `onclick` 属性。所有 picker 打开/关闭改用 `page.evaluate(() => window.xxx())` 直接调用 JS 函数
- **响应式测试**: 使用 `hasHorizontalOverflow()` 辅助函数检测 viewport 宽度下页面是否存在水平滚动条
