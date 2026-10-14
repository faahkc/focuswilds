import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { calculateVersion } from './version.mjs'

test('patch counts commits without changing major or minor', () => {
  assert.equal(calculateVersion('0.1.0', 0), '0.1.0')
  assert.equal(calculateVersion('0.1.0', 12), '0.1.12')
  assert.equal(calculateVersion('2.4.9', 1), '2.4.10')
  assert.throws(() => calculateVersion('bad', 1))
  assert.throws(() => calculateVersion('1.0.0', -1))
})

test('new commits increase patch; explicit minor and major changes reset the base', () => {
  const dir = mkdtempSync(join(tmpdir(), 'focuswilds-version-'))
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
  const version = (...args) => execFileSync(process.execPath, ['scripts/version.mjs', ...args], { cwd: dir, encoding: 'utf8' }).trim()
  try {
    git('init', '--quiet')
    git('config', 'user.name', 'Version Test')
    git('config', 'user.email', 'version-test@example.invalid')
    git('config', 'commit.gpgsign', 'false')
    git('commit', '--quiet', '--allow-empty', '-m', 'baseline')
    mkdirSync(join(dir, 'scripts'))
    copyFileSync(new URL('./version.mjs', import.meta.url), join(dir, 'scripts/version.mjs'))
    writeFileSync(join(dir, 'version.json'), JSON.stringify({ base: '0.1.0', anchor: git('rev-parse', 'HEAD') }))
    assert.equal(version(), '0.1.0')
    git('add', '.')
    git('commit', '--quiet', '-m', 'setup')
    assert.equal(version(), '0.1.1')
    git('commit', '--quiet', '--allow-empty', '-m', 'next change')
    assert.equal(version(), '0.1.2')
    version('minor')
    assert.equal(version(), '0.2.0')
    git('add', 'version.json')
    git('commit', '--quiet', '-m', 'minor base')
    assert.equal(version(), '0.2.1')
    version('major')
    assert.equal(version(), '1.0.0')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
