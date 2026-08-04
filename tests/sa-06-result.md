# SA-06 归档页 `/archives` E2E 测试结果

## 断点记录

- **startedAt**: 2026-07-29T01:24:00Z
- **completedAt**: 2026-07-29T01:26:00Z
- **passed**: true
- **lastTest**: done
- **status stored in**: `.e2e-status.json` → key `sa-06-archives`

## 测试结果总览

```
Running 20 tests using 1 worker

  ok  1 [chromium] › tests\sa-06-archives.spec.ts:44:7 › A1: DOCTYPE html 存在 (16.6s)
  ok  2 [chromium] › tests\sa-06-archives.spec.ts:54:7 › A2: <title> 包含 "归档" (3.5s)
  ok  3 [chromium] › tests\sa-06-archives.spec.ts:60:7 › A3: <nav> 导航栏存在 (3.2s)
  ok  4 [chromium] › tests\sa-06-archives.spec.ts:66:7 › A4: #content-inner 主内容区存在 (4.1s)
  ok  5 [chromium] › tests\sa-06-archives.spec.ts:72:7 › A5: #archive 归档容器存在 (6.3s)
  ok  6 [chromium] › tests\sa-06-archives.spec.ts:79:7 › B6: .article-sort 时间线容器存在 (2.6s)
  ok  7 [chromium] › tests\sa-06-archives.spec.ts:91:7 › B7: .article-sort-item.year 年份头存在且数量 > 0 (4.0s)
  ok  8 [chromium] › tests\sa-06-archives.spec.ts:104:7 › B8: .article-sort-item (非年份) 文章条目存在 (3.7s)
  ok  9 [chromium] › tests\sa-06-archives.spec.ts:117:7 › B9: 每个条目的 .article-sort-item-img 封面图存在 (13.1s)
  ok 10 [chromium] › tests\sa-06-archives.spec.ts:133:7 › B10: 每个条目的 .article-sort-item-title 标题链接存在且 href 包含 /posts/ (3.4s)
  ok 11 [chromium] › tests\sa-06-archives.spec.ts:149:7 › B11: 每个条目的 .article-sort-item-time 时间显示存在 (3.5s)
  -  12 [chromium] › tests\sa-06-archives.spec.ts:166:7 › C12: 如果 archives 为空则 .empty-state 存在 (skipped)
  ok 13 [chromium] › tests\sa-06-archives.spec.ts:179:7 › D13: #blog-info .nav-site-title Logo 存在 (4.9s)
  ok 14 [chromium] › tests\sa-06-archives.spec.ts:186:7 › D14: #menus .menus_items 菜单项存在 (3.1s)
  ok 15 [chromium] › tests\sa-06-archives.spec.ts:193:7 › D15: 搜索按钮 #searchBtn 存在 (4.3s)
  ok 16 [chromium] › tests\sa-06-archives.spec.ts:201:7 › E16: #aside-content 存在 (3.8s)
  ok 17 [chromium] › tests\sa-06-archives.spec.ts:209:7 › F17: #footer 存在 (3.9s)
  ok 18 [chromium] › tests\sa-06-archives.spec.ts:217:7 › G18: 桌面端 (1920x1080) 无水平溢出 (3.8s)
  ok 19 [chromium] › tests\sa-06-archives.spec.ts:228:7 › G19: 移动端 (375x812) 无水平溢出 (4.6s)
  ok 20 [chromium] › tests\sa-06-archives.spec.ts:240:7 › H20: 点击第一个 .article-sort-item-title，断言 URL 包含 /posts/ 且页面导航成功 (4.7s)

  1 skipped
  19 passed (1.7m)
```

## 修复记录

**无需修复** — 归档页 `views/archives.ejs` DOM 结构完整，所有 20 项 DOM 控件清单均通过或符合预期（C12 空状态因有文章被 skip）。

## TS 测试源码

- 文件: `tests/sa-06-archives.spec.ts`
- 总行数: 262
- 测试用例: 20 (19 passed + 1 skipped)
- 响应式 viewport: 桌面 1920x1080 / 移动 375x812
- 零硬编码等待，使用 `waitForLoadState('networkidle')` / `waitForLoadState('domcontentloaded')`
- 断点续测: `.e2e-status.json` → `sa-06-archives` key
