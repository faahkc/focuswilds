// Playwright browser_run_code_unsafe filename: tests/message-layout.browser.js.
// Only localhost presentation previews are opened; no account services or writes.
// oxlint-disable-next-line no-unused-expressions -- Playwright invokes this function expression directly.
async (page) => {
  const baseURL = 'http://127.0.0.1:5173/focuswilds/?preview=ui'
  const check = (condition, message) => { if (!condition) throw new Error(message) }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await page.locator('.ui-preview-tools summary').click()
  const screens = await page.locator('[data-preview-screen]').evaluateAll(nodes => nodes.map(node => ({ name: node.innerText, id: node.dataset.previewScreen })))
  check(screens.length > 0, 'Preview catalog must not be empty')
  let fixtures = 0
  const checkedSaveMessages = []
  for (const screen of screens) {
    await page.goto(baseURL)
    await page.locator('.ui-preview-tools summary').click()
    await page.locator(`[data-preview-screen="${screen.id}"]`).click()
    await page.locator('.ui-preview-tools[data-preview-states]').waitFor()
    const cases = JSON.parse(await page.locator('.ui-preview-tools').getAttribute('data-preview-states'))
    for (const state of cases) {
      await page.evaluate(state => {
        document.querySelector('#message-check-hide')?.remove()
        if (state !== 'Default') document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close())
      }, state)
      if (state !== 'Default') {
        await page.locator('.ui-preview-tools summary').evaluate(node => { node.parentElement.open = true })
        await page.locator('.ui-preview-tools').getByRole('combobox').click()
        await page.getByRole('option', { name: state, exact: true }).click()
      }
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(250)
      const style = await page.addStyleTag({ content: '.ui-preview-tools{visibility:hidden!important}' })
      await style.evaluate(node => { node.id = 'message-check-hide' })
      for (const [width, height] of [[320, 568], [390, 844]]) {
        await page.setViewportSize({ width, height })
        await page.waitForTimeout(180)
        await page.locator('.app-screen').evaluate(node => { node.scrollTop = 0 })
        const messages = await page.locator('.message-copy, .message-copy-line').evaluateAll(nodes => nodes.filter(node => node.getBoundingClientRect().height > 0 && getComputedStyle(node).visibility !== 'hidden').map(node => {
          const range = document.createRange()
          const runs = [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim()).map(child => {
            range.selectNodeContents(child)
            const lines = range.getClientRects().length
            const words = [...child.textContent.matchAll(/\S+/g)]
            const rows = new Map()
            if (lines > 1 && /^[\x20-\x7e‘’…]+$/.test(child.textContent)) for (const word of words) {
              range.setStart(child, word.index)
              range.setEnd(child, word.index + word[0].length)
              for (const rect of range.getClientRects()) rows.set(Math.round(rect.top), (rows.get(Math.round(rect.top)) ?? 0) + 1)
            }
            const orphan = rows.size > 1 && rows.get(Math.max(...rows.keys())) === 1 && words.at(-1)[0].length < 18
            return { text: child.textContent, lines, orphan }
          })
          return { text: node.innerText, balanced: getComputedStyle(node).textWrapStyle === 'balance', fits: node.scrollWidth <= node.clientWidth + 1,
            summarySave: node.classList.contains('focus-summary-save'), breaks: node.querySelectorAll('br').length, runs }
        }))
        for (const message of messages) {
          check(message.balanced && message.fits, `${screen.name}/${state}/${width}: ${message.text}`)
          check(message.runs.every(run => !run.orphan), `${screen.name}/${state}/${width}: unplanned single-word last line in ${message.text}`)
          if (message.summarySave && !message.text.startsWith('Saving')) {
            check(message.breaks === 1, `${state}: separate condition and instruction`)
            check(message.runs.every(run => run.lines === 1), `${state}/${width}: sentence leaves a trailing word on another line`)
            checkedSaveMessages.push({ state, width, text: message.text })
          }
        }
        const slug = `${screen.name}-${state}`.replace(/[^a-zA-Z0-9]+/g, '-')
        await page.screenshot({ path: `.playwright-mcp/message-layout-${width}-${slug}.png` })
      }
      fixtures++
    }
  }
  return { screens: screens.length, fixtures, captures: fixtures * 2, checkedSaveMessages }
}
