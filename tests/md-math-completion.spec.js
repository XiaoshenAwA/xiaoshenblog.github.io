const { test, expect } = require('@playwright/test')

test('markdown math completion: $$ auto-close and backslash suggestions', async ({ page }) => {
  await page.goto('http://localhost:3002/editor/markdown')
  await page.waitForFunction(() => window.__editorInitialized === true, null, { timeout: 30000 })
  const editor = page.locator('#editor-input')
  await editor.click()

  async function getWidgetTexts() {
    return page.evaluate(() => {
      const el = document.querySelector('.editor-widget.suggest-widget')
      if (!el || el.classList.contains('hidden')) return null
      return [...el.querySelectorAll('.monaco-list-row .label-name')].map(n => n.textContent)
    })
  }

  // 1) 输入 $$ 后应出现自动闭合建议
  await page.keyboard.press('Control+a')
  await page.keyboard.insertText('hello math \n\n')
  await page.keyboard.insertText('$$')
  await page.waitForTimeout(800)
  const dollarWidgets = await getWidgetTexts()
  console.log('after $$:', dollarWidgets)
  expect(dollarWidgets).not.toBeNull()
  expect(dollarWidgets.join(',')).toContain('块级公式')

  // 接受块级公式建议
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  const value = await page.evaluate(() => window.__monacoEditor.getValue())
  console.log('after accept:', JSON.stringify(value))
  expect(value).toContain('$$')

  // 2) 按下 \ 出现类似 Typst 的符号补全
  await page.keyboard.insertText('\\alp')
  await page.waitForTimeout(400)
  const backslashWidgets = await getWidgetTexts()
  console.log('after \\alp:', backslashWidgets)
  expect(backslashWidgets).not.toBeNull()
  expect(backslashWidgets.join(',')).toContain('alpha')

  // 选择 alpha
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)
  const value2 = await page.evaluate(() => window.__monacoEditor.getValue())
  console.log('after alpha:', JSON.stringify(value2))
  expect(value2).toContain('\\alpha')

  // 3) 输入 \frac 补全（带占位符 snippet）
  await page.keyboard.insertText(' \\fr')
  await page.waitForTimeout(400)
  const fracWidgets = await getWidgetTexts()
  console.log('after \\fr:', fracWidgets)
  expect(fracWidgets).not.toBeNull()
  expect(fracWidgets.join(',')).toContain('frac')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // 4) 输入 \be 出现 \begin{env} 环境补全（Markdown All in One 式 snippet）
  await page.keyboard.insertText('\\be')
  await page.waitForTimeout(400)
  const beginWidgets = await getWidgetTexts()
  console.log('after \\be:', beginWidgets)
  expect(beginWidgets).not.toBeNull()
  expect(beginWidgets.join(',')).toContain('begin')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // 5) 希腊字母补全：\pi 应精确命中（而非被其他前缀占用）
  await page.keyboard.insertText('\\pi')
  await page.waitForTimeout(400)
  const piWidgets = await getWidgetTexts()
  console.log('after \\pi:', piWidgets)
  expect(piWidgets).not.toBeNull()
  expect(piWidgets.join(',')).toContain('pi')
  await page.keyboard.press('Escape')
})