import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const read = (name) => JSON.parse(readFileSync(new URL('../' + name, import.meta.url), 'utf8'))

export function nextVersion(version, mode) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) throw new Error('Invalid version: expected major.minor.patch.')
  const [major, minor, patch] = version.split('.').map(Number)
  const parts = mode === 'major' ? [major + 1, 0, 0] : mode === 'minor' ? [major, minor + 1, 0] : mode === 'patch' ? [major, minor, patch + 1] : null
  if (!parts || !parts.every(Number.isSafeInteger)) throw new Error('Invalid version increment.')
  return parts.join('.')
}

export function getVersion() {
  const { version } = read('package.json')
  nextVersion(version, 'patch')
  return version
}

function writeVersion(version, pkg, lock) {
  pkg.version = version
  lock.version = version
  lock.packages[''].version = version
  for (const [name, data] of [['package.json', pkg], ['package-lock.json', lock]]) {
    writeFileSync(new URL('../' + name, import.meta.url), JSON.stringify(data, null, 4) + '\n')
  }
}

function commitVersion() {
  const staged = git('diff', '--cached', '--name-only')
  if (!staged) return
  // Do not overwrite or silently stage partially staged package changes.
  if (git('diff', '--name-only', '--', 'package.json', 'package-lock.json')) {
    throw new Error('Stage or save aside all package.json and package-lock.json edits before committing.')
  }
  const pkg = JSON.parse(git('show', ':package.json'))
  const lock = JSON.parse(git('show', ':package-lock.json'))
  const previous = JSON.parse(git('show', 'HEAD:package.json')).version
  nextVersion(pkg.version, 'patch')
  if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) throw new Error('Package and lockfile versions must match.')
  const version = pkg.version === previous ? nextVersion(previous, 'patch') : pkg.version
  const compare = version.split('.').map(Number)
  const old = previous.split('.').map(Number)
  const firstDifference = compare.findIndex((part, index) => part !== old[index])
  if (firstDifference < 0 || compare[firstDifference] < old[firstDifference]) throw new Error('Version must increase.')
  writeVersion(version, pkg, lock)
  git('add', '--', 'package.json', 'package-lock.json')
  console.log('Application version: ' + version)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2]
  if (mode === 'commit') commitVersion()
  else if (mode === 'major' || mode === 'minor') {
    const pkg = read('package.json')
    const lock = read('package-lock.json')
    writeVersion(nextVersion(pkg.version, mode), pkg, lock)
    console.log(getVersion() + ' ? stage both package files and commit.')
  } else if (mode === undefined) console.log(getVersion())
  else throw new Error('Use version, major, minor, or commit.')
}
