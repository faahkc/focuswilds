import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const configPath = new URL('../version.json', import.meta.url)
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()

export function calculateVersion(base, count) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(base)) {
    throw new Error('Version base must be major.minor.patch.')
  }
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid commit count.')
  const [major, minor, patch] = base.split('.').map(Number)
  if (![major, minor, patch + count].every(Number.isSafeInteger)) throw new Error('Version exceeds safe integer range.')
  return `${major}.${minor}.${patch + count}`
}

export function getVersion() {
  const { base, anchor } = JSON.parse(readFileSync(configPath, 'utf8'))
  git('merge-base', '--is-ancestor', anchor, 'HEAD')
  return calculateVersion(base, Number(git('rev-list', '--count', `${anchor}..HEAD`)))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2]
  if (mode === 'major' || mode === 'minor') {
    const [major, minor] = getVersion().split('.').map(Number)
    const base = mode === 'major' ? `${major + 1}.0.0` : `${major}.${minor + 1}.0`
    writeFileSync(configPath, `${JSON.stringify({ base, anchor: git('rev-parse', 'HEAD') }, null, 2)}\n`)
    console.log(`Next release base: ${base}. The commit recording this change adds patch 1.`)
  } else if (mode === undefined) {
    console.log(getVersion())
  } else {
    throw new Error('Use version, version major, or version minor.')
  }
}
