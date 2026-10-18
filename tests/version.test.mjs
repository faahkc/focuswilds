import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { nextVersion } from '../scripts/version.mjs'
import { resolveConfig } from 'vite'
import { fileURLToPath } from 'node:url'

test('package-only version updates do not restart the Vite configuration', async () => {
  const config = await resolveConfig({ configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)) }, 'serve')
  const packagePath = fileURLToPath(new URL('../package.json', import.meta.url)).replaceAll('\\', '/')
  assert.ok(!config.configFileDependencies.some(path => path.replaceAll('\\', '/') === packagePath))
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  assert.ok(app.includes("import { version } from '../package.json'"))
  assert.ok(!app.includes('__APP_VERSION__'))
})

test('patch increments and explicit releases reset lower fields', () => {
  assert.equal(nextVersion('0.1.3', 'patch'), '0.1.4')
  assert.equal(nextVersion('0.1.9', 'minor'), '0.2.0')
  assert.equal(nextVersion('2.4.9', 'major'), '3.0.0')
  assert.throws(() => nextVersion('bad', 'patch'))
  assert.throws(() => nextVersion('1.0.0', 'other'))
})

test('real hook synchronizes versions, preserves retries/releases and rejects partial staging', () => {
  const dir = mkdtempSync(join(tmpdir(), 'focuswilds-version-'))
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const version = (...args) => execFileSync(process.execPath, ['scripts/version.mjs', ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const pkgPath = join(dir, 'package.json')
  const check = (expected) => {
    assert.equal(JSON.parse(readFileSync(pkgPath)).version, expected)
    const lock = JSON.parse(readFileSync(join(dir, 'package-lock.json')))
    assert.equal(lock.version, expected)
    assert.equal(lock.packages[''].version, expected)
    assert.equal(JSON.parse(git('show', 'HEAD:package.json')).version, expected)
  }
  try {
    git('init', '--quiet')
    git('config', 'user.name', 'Version Test')
    git('config', 'user.email', 'version-test@example.invalid')
    git('config', 'commit.gpgsign', 'false')
    git('config', 'core.hooksPath', '.githooks')
    writeFileSync(pkgPath, JSON.stringify({ version: '0.1.3' }))
    writeFileSync(join(dir, 'package-lock.json'), JSON.stringify({ version: '0.1.3', packages: { '': { version: '0.1.3' } } }))
    git('add', '.')
    git('-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'baseline')
    mkdirSync(join(dir, 'scripts'))
    mkdirSync(join(dir, '.githooks'))
    copyFileSync(new URL('../scripts/version.mjs', import.meta.url), join(dir, 'scripts/version.mjs'))
    copyFileSync(new URL('../.githooks/pre-commit', import.meta.url), join(dir, '.githooks/pre-commit'))
    git('add', '.')
    git('update-index', '--chmod=+x', '.githooks/pre-commit')
    version('commit')
    assert.equal(version(), '0.1.4')
    version('commit')
    assert.equal(version(), '0.1.4')
    git('commit', '--quiet', '-m', 'setup')
    check('0.1.4')
    writeFileSync(join(dir, 'note.txt'), 'next task')
    git('add', 'note.txt')
    writeFileSync(pkgPath, readFileSync(pkgPath, 'utf8') + '\n')
    assert.throws(() => git('commit', '--quiet', '-m', 'must fail'))
    assert.equal(version(), '0.1.4')
    git('add', 'package.json')
    git('commit', '--quiet', '-m', 'next task')
    check('0.1.5')
    version('minor')
    git('add', 'package.json', 'package-lock.json')
    git('commit', '--quiet', '-m', 'explicit minor')
    check('0.2.0')
    version('major')
    git('add', 'package.json', 'package-lock.json')
    git('commit', '--quiet', '-m', 'explicit major')
    check('1.0.0')
    git('commit', '--quiet', '--allow-empty', '-m', 'empty')
    check('1.0.0')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
