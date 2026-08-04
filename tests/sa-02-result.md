# SA-02 文章详情页 /posts/:id E2E 测试结果

## 1. 测试断点记录

`.e2e-status.json` 中 `sa-02` 节点:

```json
{
  "postId": "7",
  "postUrl": "http://localhost:3001/posts/7/",
  "startedAt": "2026-07-29T01:20:53.221Z",
  "completedAt": "2026-07-29T01:22:55.105Z",
  "passed": true
}
```

## 2. 测试脚本完整源码

见 `tests/sa-02-post-detail.spec.ts` (334 行)

## 3. Playwright Runner 输出结果

```
Running 24 tests using 1 worker

  ok  1 [chromium] › tests\sa-02-post-detail.spec.ts:61:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › A1. .post-article 存在 (4.4s)
  ok  2 [chromium] › tests\sa-02-post-detail.spec.ts:67:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › A2. .post-content 存在且有 HTML 内容 (4.4s)
  ok  3 [chromium] › tests\sa-02-post-detail.spec.ts:76:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › A3. 文章标题 .post-title 存在 (4.6s)
  ok  4 [chromium] › tests\sa-02-post-detail.spec.ts:86:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › B1. .highlight 代码块存在 (5.1s)
  ok  5 [chromium] › tests\sa-02-post-detail.spec.ts:95:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › B2. .copy-btn 复制按钮点击后文字变为"已复制" (5.5s)
  ok  6 [chromium] › tests\sa-02-post-detail.spec.ts:116:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › B3. .shrink-btn 折叠按钮点击后 .code-shrink class 切换 (5.0s)
  ok  7 [chromium] › tests\sa-02-post-detail.spec.ts:132:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › B4. .fullpage-btn 全屏按钮点击后 .code-fullpage 出现 (5.4s)
  ok  8 [chromium] › tests\sa-02-post-detail.spec.ts:147:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › C1. 发布日期 .post-meta-date-created 存在 (5.0s)
  ok  9 [chromium] › tests\sa-02-post-detail.spec.ts:158:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › C2. 更新日期 .post-meta-date-updated 存在 (当 dateType !== created) (5.3s)
  ok 10 [chromium] › tests\sa-02-post-detail.spec.ts:169:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › C3. 字数 .word-count 存在 (6.1s)
  ok 11 [chromium] › tests\sa-02-post-detail.spec.ts:178:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › C4. 阅读时间显示存在 (5.3s)
  ok 12 [chromium] › tests\sa-02-post-detail.spec.ts:187:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › C5. 浏览量 #post-view-count 存在 (9.9s)
  ok 13 [chromium] › tests\sa-02-post-detail.spec.ts:195:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › C6. 标签 .tag-pill 链接存在 (4.8s)
  ok 14 [chromium] › tests\sa-02-post-detail.spec.ts:210:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › D1. .post-meta-categories 分类链接存在 (4.2s)
  ok 15 [chromium] › tests\sa-02-post-detail.spec.ts:224:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › E1. .post-nav-prev 上一篇链接 (如果存在) (4.6s)
  ok 16 [chromium] › tests\sa-02-post-detail.spec.ts:235:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › E2. .post-nav-next 下一篇链接 (如果存在) (4.6s)
  ok 17 [chromium] › tests\sa-02-post-detail.spec.ts:247:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › F1. "返回首页" 按钮存在且 href 正确 (4.6s)
  ok 18 [chromium] › tests\sa-02-post-detail.spec.ts:257:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › G1. #toc-widget 目录 widget (4.8s)
  ok 19 [chromium] › tests\sa-02-post-detail.spec.ts:272:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › G2. #toc-content 含 .toc-link 目录链接 (5.2s)
  ok 20 [chromium] › tests\sa-02-post-detail.spec.ts:289:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › H1. .post-comments iframe 存在 (如果配置 Giscus) (6.3s)
  ok 21 [chromium] › tests\sa-02-post-detail.spec.ts:303:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › I1. 非首页 header: #page-header.not-home-page (3.9s)
  ok 22 [chromium] › tests\sa-02-post-detail.spec.ts:310:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › I2. 侧边栏 #aside-content 存在 (3.9s)
  ok 23 [chromium] › tests\sa-02-post-detail.spec.ts:318:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › J1. 桌面端 1920x1080: 无水平溢出 (4.0s)
  ok 24 [chromium] › tests\sa-02-post-detail.spec.ts:327:7 › SA-02 文章详情页 /posts/:id 完整 E2E 测试 › J2. 移动端 375x812: 无水平溢出 (3.8s)

  24 passed (2.2m)
```

## 4. 代码修复

**无需修复代码。** 所有 24 个测试一次性全部通过，未发现 bug。

### 测试覆盖清单

| 编号 | 测试项 | 结果 |
|------|--------|------|
| A1 | `.post-article` 存在 | ✅ |
| A2 | `.post-content` 存在且有 HTML 内容 | ✅ |
| A3 | `.post-title` 文章标题存在 | ✅ |
| B1 | `.highlight` 代码块存在 | ✅ |
| B2 | `.copy-btn` 点击后显示"已复制" | ✅ |
| B3 | `.shrink-btn` 点击后 `.code-shrink` class 切换 | ✅ |
| B4 | `.fullpage-btn` 点击后 `.code-fullpage` 出现 | ✅ |
| C1 | `.post-meta-date-created` 发布日期存在 | ✅ |
| C2 | `.post-meta-date-updated` 更新日期存在 | ✅ |
| C3 | `.word-count` 字数存在 | ✅ |
| C4 | 阅读时间显示存在 | ✅ |
| C5 | `#post-view-count` 浏览量存在 | ✅ |
| C6 | `.tag-pill` 标签链接存在 | ✅ |
| D1 | `.post-meta-categories` 分类面包屑存在 | ✅ |
| E1 | `.post-nav-prev` 上一篇链接 | ✅ |
| E2 | `.post-nav-next` 下一篇链接 | ✅ |
| F1 | "返回首页" 按钮 href 正确 | ✅ |
| G1 | `#toc-widget` 目录 widget | ✅ |
| G2 | `#toc-content` 含 `.toc-link` 目录链接 | ✅ |
| H1 | `.post-comments` iframe 存在 | ✅ |
| I1 | `#page-header.not-home-page` 非首页 header | ✅ |
| I2 | `#aside-content` 侧边栏存在 | ✅ |
| J1 | 桌面端 1920x1080 无水平溢出 | ✅ |
| J2 | 移动端 375x812 无水平溢出 | ✅ |
