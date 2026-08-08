const { test } = require('@playwright/test')

test('probe vscode.dev markdown math colors', async ({ page }) => {
  const logs = []
  page.on('pageerror', e => logs.push(e.message))
  // vscode.dev 支持 ?vscode-lang=markdown 快速打开 untitled markdown
  await page.goto('https://vscode.dev/?vscode-lang=markdown', { waitUntil: 'domcontentloaded', timeout: 120000 })
  // 等待编辑器出现（vscode.dev 用 .monaco-editor）
  await page.waitForSelector('.monaco-editor', { timeout: 180000 })
  await page.waitForTimeout(3000)
  const textarea = page.locator('.monaco-editor textarea').first()
  await textarea.click()
  await page.waitForTimeout(500)
  await page.keyboard.type('$x^2 + \\alpha$ and $$\\frac{1}{0} = \\infty$$', { delay: 40 })
  await page.waitForTimeout(3000)
  const info = await page.evaluate(() => {
    const out = []
    const spans = document.querySelectorAll('.mtk')
    spans.forEach(s => {
      const t = s.textContent.trim()
      if (!t || !/[\\$a-zA-Z0-9{}]/.test(t)) return
      const color = getComputedStyle(s).color
      const cls = s.className
      if (!out.some(o => o.text === t && o.color === color)) out.push({ text: t, cls, color })
    })
    return out.slice(0, 100)
  })
  console.log(JSON.stringify(info, null, 1))
  console.log('errors:', logs.slice(0, 5))
})