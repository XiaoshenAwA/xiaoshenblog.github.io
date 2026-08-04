# SA-10 后台文章列表视图 E2E 测试结果

**测试文件**: `tests/sa-10-admin-posts.spec.ts`
**运行时间**: 2026-07-29
**测试结果**: 23/23 通过
**总耗时**: 43.9s

## 测试概览

| 测试编号 | 测试名称 | 结果 | 耗时 |
|---------|---------|------|------|
| A1 | .toolbar 工具栏存在 | pass | 1.7s |
| A2 | #new-post-btn 写文章按钮存在且可见 | pass | 1.7s |
| A3 | #edit-about-btn 编辑关于页按钮存在 | pass | 1.7s |
| A4 | #manage-tags-btn 标签管理按钮存在 | pass | 1.7s |
| A5 | #manage-categories-btn 分类管理按钮存在 | pass | 1.7s |
| A6 | 返回首页链接存在 | pass | 1.7s |
| B7 | .search-bar 搜索栏存在 | pass | 1.7s |
| B8 | #post-search 搜索输入框存在且可聚焦 | pass | 1.7s |
| B9 | #search-clear 清除搜索按钮存在 | pass | 1.7s |
| B10 | 输入搜索词 → 文章列表过滤 | pass | 1.8s |
| C11 | #posts-list 文章列表容器存在 | pass | 1.7s |
| C12 | 每个文章条目包含标题和编辑/删除按钮 | pass | 1.8s |
| C13 | 文章条目中的状态指示器存在 | pass | 1.7s |
| D14 | #pagination-bar 分页栏存在 | pass | 1.7s |
| D15 | #page-prev-btn 上一页按钮存在 | pass | 1.6s |
| D16 | #page-info 页码信息存在 | pass | 1.7s |
| D17 | #page-next-btn 下一页按钮存在 | pass | 1.7s |
| E18 | 点击 #new-post-btn → 视图切换到 #view-edit | pass | 1.8s |
| E19 | 点击 #edit-about-btn → 视图切换到 #view-about | pass | 1.8s |
| E20 | 点击 #manage-tags-btn → 视图切换到 #view-tags | pass | 1.7s |
| E21 | 点击 #manage-categories-btn → 视图切换到 #view-categories | pass | 1.8s |
| F22 | 桌面端 (1920x1080) 无水平溢出 | pass | 1.7s |
| F23 | 移动端 (375x812) 无水平溢出 | pass | 1.7s |

## 技术说明

### 双层认证架构
- **服务端认证**: Express `adminAuth` 中间件通过 `Authorization: Bearer` 头验证
- **客户端认证**: Supabase `signInWithPassword` 通过表单登录，session 存储在 localStorage
- **关键修复**: `extraHTTPHeaders` 会覆盖 Supabase 客户端的 `Authorization` 头，导致 `getUser()` 失败。改用 `page.route` 仅对 `localhost:3001` 请求注入 Bearer 头

### B9 测试调整
`#search-clear` 按钮默认 `display: none`（仅在 `.search-bar.has-value` 时显示），改用 `toBeAttached()` 验证 DOM 存在性

### 规范遵守
- 零硬编码等待: 使用 `waitForSelector` / `waitForLoadState('networkidle')` 替代 `waitForTimeout`
- 网络拦截: 屏蔽 google-analytics/clarity 等第三方分析脚本
- 响应式双 viewport: 1920x1080 (桌面) + 375x812 (移动端)
- `maxFailures: 1`
