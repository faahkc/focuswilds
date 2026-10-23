// Run through Playwright browser_run_code_unsafe against the local Web export.
// oxlint-disable-next-line no-unused-expressions -- Invoked by Playwright.
async (page) => {
  const check = (ok, message) => { if (!ok) throw new Error(message) }
  const url = 'http://localhost:5173/focuswilds/game/build/web/index.html'
  const results = []
  for (const [width, height] of [[320, 568], [390, 844], [393, 852]]) {
    await page.setViewportSize({ width, height })
    await page.goto(url)
    await page.waitForFunction(() => document.body.dataset.ready === 'true')
    await page.evaluate(() => document.fonts.ready)
    const back = await page.locator('.back').evaluate(node => {
      const css = getComputedStyle(node), box = node.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(node)
      const text = range.getBoundingClientRect()
      return { height: box.height, compensation: parseFloat(css.paddingBottom) - parseFloat(css.paddingTop), offset: (text.top + text.bottom) / 2 - (box.top + (box.height - 4) / 2) }
    })
    check(back.height === 44 && back.compensation === 4 && Math.abs(back.offset) <= 1, 'Compact Back text must center on the button face above its lower edge')
    const geometry = await page.evaluate(() => {
      const canvas = document.querySelector('canvas'), pet = document.querySelector('#pet')
      const c = canvas.getBoundingClientRect(), p = pet.getBoundingClientRect()
      const actions = [...document.querySelector('.actions').children].map(e => e.getBoundingClientRect())
      return { canvas: [canvas.width, canvas.height], css: [c.width, c.height], pet: [p.x, p.y, p.width, p.height], inScene: p.left >= c.left && p.top >= c.top && p.right <= c.right && p.bottom <= c.bottom, gap: actions[1].top - actions[0].bottom, scroll: document.documentElement.scrollHeight - innerHeight, title: getComputedStyle(document.querySelector('h1')).fontSize, control: getComputedStyle(document.querySelector('.actions button')).fontSize, controlHeight: actions[0].height, loadMs: document.body.dataset.loadMs }
    })
    check(geometry.inScene && geometry.pet[2] === 48 && geometry.pet[3] === 52, 'Cat touch target/anchor')
    check(geometry.canvas.every((n, i) => n === geometry.css[i]), 'Avoid excess DPR render resolution')
    check(geometry.gap === 16 && geometry.title === '28px' && geometry.control === '20px' && geometry.controlHeight === 60, 'Shared UI geometry')
    check(geometry.scroll === 0, 'Essential Home content must fit these tested viewports')
    await page.locator('#pet').click()
    check(await page.locator('#notice').innerText() === 'Your cat noticed you.', 'Engine interaction callback')
    await page.locator('#pet').focus()
    await page.keyboard.press('Enter')
    await page.locator('#pet').blur()
    await page.screenshot({ path: `D:/focuswilds/.playwright-mcp/apartment-engine-${width}.png` })
    results.push({ width, height, ...geometry })
  }
  await page.setViewportSize({ width: 852, height: 393 })
  check(await page.locator('#portrait').isVisible(), 'Landscape notice')
  await page.setViewportSize({ width: 393, height: 393 })
  check(await page.locator('#portrait').isVisible(), 'Square notice')
  await page.setViewportSize({ width: 393, height: 852 })
  await page.locator('#pet').click()
  check(await page.locator('#notice').innerText() === 'Your cat noticed you.', 'Resume after orientation changes')
  await page.locator('canvas').evaluate(c => c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext())
  await page.getByRole('button', { name: 'Reload', exact: true }).waitFor()
  check(await page.locator('body').getAttribute('data-rendering') === 'paused', 'Stop rendering after graphics loss')
  for (const [width, height] of [[320, 568], [390, 844]]) {
    await page.setViewportSize({ width, height })
    const action = await page.getByRole('button', { name: 'Reload', exact: true }).boundingBox()
    check(action.width === width - 48 && action.height === 60, 'Shared recovery action width/height')
  }
  await page.getByRole('button', { name: 'Reload', exact: true }).click()
  await page.waitForFunction(() => document.body.dataset.ready === 'true')
  return results
}
