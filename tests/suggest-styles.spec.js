const { test, expect } = require('@playwright/test')

test('markdown math: coloring, suggestion icons, rounded widget', async ({ page }) => {
  await page.goto('http://localhost:3002/editor/markdown')
  await page.waitForFunction(() => window.__editorInitialized === true, null, { timeout: 30000 })
  const editor = page.locator('#editor-input')
  await editor.click()

  // --- 1) 数学公式配色：多色 token（VS Code md-math 官方配色） ---
  await page.evaluate(() => window.__monacoEditor.setValue('行内 $x+y$ 结束\n块级：\n$$x$$\n'))
  await page.waitForTimeout(800)
  const math = await page.evaluate(() => {
    const display = document.querySelector('.view-line .md-math-display')
    const rowText = document.querySelector('.view-line').textContent
    const colors = [...document.querySelectorAll('.view-line span')]
      .filter(s => s.className.includes('md-math-'))
      .map(s => getComputedStyle(s).color)
    return {
      rowText,
      inlineColors: colors,
      displayText: display && display.textContent
    }
  })
  console.log('math:', JSON.stringify(math))
  expect(math.rowText).toContain('x+y')
  expect(math.displayText).toContain('x')
  const greenish = ['rgb(9, 134, 88)', 'rgb(0, 128, 0)', 'rgb(181, 206, 168)']
  expect(math.inlineColors.some(c => greenish.includes(c))).toBe(true)

  // 进入 $$…$$ 数学环境（补全仅在其中触发）
  async function gotoMathLine() {
    await page.evaluate(() => {
      window.__monacoEditor.setValue('$$\n\n$$\n')
      window.__monacoEditor.setPosition({ lineNumber: 2, column: 1 })
      window.__monacoEditor.focus()
    })
    await page.waitForTimeout(300)
  }

  // --- 2) 补全图标：\begin → snippet(三个方块)，\alpha → constant ---
  await gotoMathLine()
  await page.keyboard.insertText('\\be')
  await page.waitForTimeout(600)
  const rowIcons = await page.evaluate(() => {
    return [...document.querySelectorAll('.suggest-widget .monaco-list-row .suggest-icon')].map(i => i.className)
  })
  console.log('row icons:', JSON.stringify(rowIcons))
  expect(rowIcons.some(c => c.includes('codicon-symbol-snippet'))).toBe(true)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  await gotoMathLine()
  await page.keyboard.insertText('\\alp')
  await page.waitForTimeout(600)
  const alpIcons = await page.evaluate(() => {
    return [...document.querySelectorAll('.suggest-widget .monaco-list-row .suggest-icon')].map(i => i.className)
  })
  console.log('alp icons:', JSON.stringify(alpIcons))
  expect(alpIcons.some(c => c.includes('codicon-symbol-constant'))).toBe(true)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // --- 3) 补全框圆角 ---
  await gotoMathLine()
  await page.keyboard.insertText('\\fr')
  await page.waitForTimeout(600)
  const radius = await page.evaluate(() => {
    const w = document.querySelector('.suggest-widget')
    return w ? getComputedStyle(w).borderRadius : null
  })
  console.log('suggest radius:', radius)
  expect(radius).not.toBe('0px')
  await page.keyboard.press('Escape')

  // --- 4) 非数学环境不弹补全 ---
  await page.evaluate(() => {
    window.__monacoEditor.setValue('plain text here\n')
    window.__monacoEditor.setPosition({ lineNumber: 2, column: 1 })
    window.__monacoEditor.focus()
  })
  await page.waitForTimeout(300)
  await page.keyboard.insertText('\\be')
  await page.waitForTimeout(600)
  const nonMathRows = await page.evaluate(() => {
    const w = document.querySelector('.editor-widget.suggest-widget')
    if (!w || w.classList.contains('hidden')) return 0
    return w.querySelectorAll('.monaco-list-row').length
  })
  console.log('non-math widget rows:', nonMathRows)
  expect(nonMathRows).toBe(0)
})