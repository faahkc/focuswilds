import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

if (!process.env.CI) {
  const cwd = fileURLToPath(new URL('../', import.meta.url))
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
  let current = ''
  try { current = git('config', '--get', 'core.hooksPath') } catch (error) { if (error.status !== 1) throw error }
  if (current && current !== '.githooks') {
    throw new Error('An existing hooksPath is configured; integrate the version hook manually instead of replacing it.')
  }
  if (!current && existsSync(git('rev-parse', '--git-path', 'hooks/pre-commit'))) {
    throw new Error('An existing pre-commit hook was found; integrate it manually.')
  }
  git('config', 'core.hooksPath', '.githooks')
  console.log('Installed Focuswilds version hook.')
}
