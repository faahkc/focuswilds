// Playwright browser_run_code_unsafe filename: tests/ui-controls.browser.js.
// Local presentation fixtures only; no authentication or persistence.
// oxlint-disable-next-line no-unused-expressions -- Invoked by Playwright.
async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message) }
  const base = 'http://127.0.0.1:5173/focuswilds/?preview=ui'
  async function open(name, state) {
    await page.goto(base)
    await page.locator('.ui-preview-tools summary').click()
    await page.locator('[data-preview-screen]').filter({ hasText: new RegExp(`^${name}$`) }).click()
    await page.waitForTimeout(300)
    if (state) {
      await page.locator('.ui-preview-tools summary').click()
      await page.locator('.ui-preview-tools').getByRole('combobox').click()
      await page.getByRole('option', { name: state, exact: true }).click()
    }
    await page.evaluate(() => document.fonts.ready)
    await page.addStyleTag({ content: '.ui-preview-tools{visibility:hidden!important}' })
  }
  async function capture(name, width) {
    await page.screenshot({ path: `.playwright-mcp/shared-controls-${width}-${name}.png` })
  }
  const results = []
  for (const [width, height] of [[320, 568], [390, 844], [393, 852]]) {
    await page.setViewportSize({ width, height })
    await open('Setup')
    await page.getByRole('button', { name: 'Custom duration', exact: true }).click()
    check(await page.locator('.game-number').evaluate(node => getComputedStyle(node).fontSize) === '96px', 'Numeric readout must not shrink')
    check(await page.locator('.game-editor h2').evaluate(node => getComputedStyle(node).fontSize) === '28px', 'Editor title must not shrink')
    await capture('numeric', width)
    await page.getByRole('button', { name: 'Clear number' }).click()
    await page.locator('.game-number').focus()
    await page.keyboard.type('1819')
    check(await page.locator('.game-number').innerText() === '181', 'Three-digit cap')
    check(await page.getByRole('button', { name: 'Set duration' }).isDisabled(), 'Invalid duration cannot commit')
    await page.getByRole('button', { name: 'Set duration' }).scrollIntoViewIfNeeded()
    await page.locator('.game-editor').evaluate(node => { node.scrollTop = node.scrollHeight })
    await capture('numeric-error-bottom', width)
    const bottom = await page.getByRole('button', { name: 'Set duration' }).boundingBox()
    check(bottom.y + bottom.height <= height - 23, 'Numeric bottom padding')
    await page.getByRole('button', { name: 'Back', exact: true }).last().click()
    await page.locator('.focus-setup input').click()
    for (const layout of ['english', 'english-shift', 'thai', 'thai-shift', 'symbols', 'more-symbols']) {
      if (layout === 'english-shift' || layout === 'thai-shift') await page.getByRole('button', { name: 'Shift', exact: true }).click()
      if (layout === 'thai') {
        await page.getByRole('button', { name: 'Switch keyboard language' }).click()
        await page.getByRole('button', { name: 'Shift', exact: true }).click()
      }
      if (layout === 'symbols') await page.getByRole('button', { name: 'Show symbols' }).click()
      if (layout === 'more-symbols') await page.getByRole('button', { name: 'More symbols' }).click()
      await page.getByRole('button', { name: 'Confirm text' }).scrollIntoViewIfNeeded()
      const sizes = await page.locator('.game-editor').evaluate(node => ({
        title: getComputedStyle(node.querySelector('h2')).fontSize,
        input: getComputedStyle(node.querySelector('input')).fontSize,
        icons: [...node.querySelectorAll('.pixel-icon')].every(icon => getComputedStyle(icon).width === '20px'),
      }))
      check(sizes.title === '28px' && sizes.input === '20px' && sizes.icons, 'Keyboard shared sizes')
      await capture(layout, width)
    }
    await page.keyboard.press('Escape')
    await page.getByRole('combobox', { name: 'Timer mode' }).click()
    await capture('dropdown', width)
    await page.keyboard.press('Escape')
    await open('Home')
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    check(await page.locator('dialog[open] h2').evaluate(node => node === document.activeElement), 'Menu opening focus')
    await capture('menu', width)
    await open('Active')
    await page.getByRole('button', { name: 'Finish', exact: true }).click()
    check(await page.locator('dialog[open] h2').evaluate(node => node === document.activeElement), 'Finish opening focus')
    await capture('finish-dialog', width)
    await open('Summary')
    await page.getByRole('button', { name: 'Take a break', exact: true }).click()
    await capture('break-dialog', width)
    for (const [name, state] of [['Active', 'Long Thai task'], ['Active', 'Recovery unavailable'], ['Rest', 'Recovery unavailable'], ['Summary', 'Long Thai task'], ['Summary', 'Save and storage error']]) {
      await open(name, state)
      await page.locator('.app-screen').evaluate(node => { node.scrollTop = node.scrollHeight })
      await capture(`${name}-${state}-bottom`.replaceAll(' ', '-'), width)
      const clearance = await page.locator('main').evaluate(node => {
        const bottom = node.getBoundingClientRect().bottom
        return bottom <= innerHeight + 1 && parseFloat(getComputedStyle(node).paddingBottom) >= 24
      })
      check(clearance, `${name}/${state}: natural content height and bottom padding`)
    }
    results.push({ width, height, numeric: '96px', title: '28px', keyboardIcons: '20px' })
  }
  return results
}
