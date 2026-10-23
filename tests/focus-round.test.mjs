import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as rounds from '../src/lib/focus-round.ts'
import { initialFocusSetup } from '../src/lib/focus-setup.ts'

test('rest uses only approved countdown presets and rejects invalid restored rest records', () => {
  assert.deepEqual(rounds.restPresets, [5, 10, 15])
  for (const minutes of rounds.restPresets) {
    const rest = rounds.startRest(minutes, 1000)
    assert.deepEqual(rest.setup, { title: '', mode: 'down', minutes })
    assert.deepEqual(rounds.restoreRound(JSON.stringify(rest), 'rest'), rest)
    const paused = rounds.changeRound(rest, 'pause', 61_000)
    assert.equal(rounds.elapsedTime(paused, 1_000_000), 60_000)
    const resumed = rounds.changeRound(paused, 'resume', 1_000_000)
    const finished = rounds.changeRound(resumed, 'tick', 2_000_000)
    assert.equal(finished.elapsedMs, minutes * 60_000)
    assert.equal(rounds.changeRound(finished, 'finish', 3_000_000), finished)
  }
  for (const minutes of [0, 1, 25, 180, 5.5, NaN]) assert.throws(() => rounds.startRest(minutes, 0))
  const rest = rounds.startRest(5, 0)
  for (const setup of [{ ...rest.setup, title: 'task' }, { ...rest.setup, mode: 'up' }, { ...rest.setup, minutes: 25 }]) {
    assert.equal(rounds.restoreRound(JSON.stringify({ ...rest, setup }), 'rest'), null)
  }
  assert.notEqual(rounds.restStorageKey, rounds.roundStorageKey)
})

test('countdown uses elapsed timestamps across a suspended tab and completes once at its exact target', () => {
  const round = rounds.startRound(initialFocusSetup, 1000)
  assert.equal(rounds.elapsedTime(round, 31_000), 30_000)
  const done = rounds.changeRound(round, 'tick', 9_000_000)
  assert.equal(done.status, 'finished')
  assert.equal(done.elapsedMs, 1_500_000)
  assert.equal(rounds.changeRound(done, 'finish', 10_000_000), done)
  assert.equal(rounds.changeRound(done, 'resume', 10_000_000), done)
})

test('pauses exclude elapsed time, repeated commands are harmless, and count-up has no countdown cap', () => {
  let round = rounds.startRound({ ...initialFocusSetup, mode: 'up' }, 1000)
  round = rounds.changeRound(round, 'pause', 61_000)
  assert.equal(rounds.changeRound(round, 'pause', 70_000), round)
  assert.equal(rounds.elapsedTime(round, 1_000_000), 60_000)
  round = rounds.changeRound(round, 'resume', 1_000_000)
  assert.equal(rounds.changeRound(round, 'resume', 1_000_001), round)
  round = rounds.changeRound(round, 'finish', 8_200_000)
  assert.equal(round.elapsedMs, 7_260_000)
  assert.equal(rounds.formatFocusTime(round.elapsedMs), '2:01:00')
  assert.equal(rounds.elapsedTime(round, 9_000_000), 7_260_000)
  assert.equal(rounds.formatFocusTime(0), '00:00')
})

test('recovery validates stored data and preserves running, paused and completed rounds without trusting extra fields', () => {
  const initial = rounds.startRound(initialFocusSetup, 1000)
  for (const round of [initial, rounds.changeRound(initial, 'pause', 30_000), rounds.changeRound(initial, 'finish', 30_000)]) {
    assert.deepEqual(rounds.restoreRound(JSON.stringify(round)), round)
  }
  for (const bad of [null, '', '{}', '{', JSON.stringify({ ...initial, elapsedMs: -1 }), JSON.stringify({ ...initial, startedAt: null }), JSON.stringify({ ...initial, setup: { ...initial.setup, minutes: 181 } })]) assert.equal(rounds.restoreRound(bad), null)
  assert.deepEqual(rounds.restoreRound(JSON.stringify({ ...initial, secret: 'ignored' })), initial)
  assert.throws(() => rounds.startRound({ ...initialFocusSetup, minutes: 0 }, 0))
})

test('round controller guards duplicate starts, persists only commands and expiry, and restores without resetting time', () => {
  const source = readFileSync(new URL('../src/hooks/use-focus-round.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  let now = 1000, writes = 0, stored = null, cursor = 0, effects = [], state = [], blocked = false, pending = null
  const dependencies = {
    react: {
      useCallback(callback) { return callback },
      useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], value => { state[i] = value }] },
      useRef(initial) { const i = cursor++; return state[i] ??= { current: initial } },
      useEffect(effect) { effects.push(effect) },
    },
    '@/lib/focus-round': rounds,
    '@/lib/focus-pending': { keepPendingFocus: () => true, restorePendingFocus: id => pending?.id === id ? null : pending },
  }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'Date', 'sessionStorage', code)(name => dependencies[name], module, module.exports, { now: () => now }, {
    getItem() { return stored }, setItem(key, value) { if (blocked) throw Error('blocked'); stored = value; writes++ }, removeItem() { stored = null },
  })
  const render = (persist = true) => { cursor = 0; effects = []; return module.exports.useFocusRound(persist) }
  let timer = render()
  timer.start(initialFocusSetup); timer.start({ ...initialFocusSetup, minutes: 50 })
  assert.equal(writes, 1)
  now = 31_000; render().action('tick'); render().action('tick')
  assert.equal(writes, 1)
  render().action('pause')
  assert.equal(writes, 2)
  state = []
  timer = render()
  assert.equal(timer.round.status, 'paused')
  assert.equal(timer.round.elapsedMs, 30_000)
  now = 100_000; timer.action('resume')
  now = 2_000_000; render().action('tick'); render().action('tick')
  assert.equal(render().round.status, 'finished')
  assert.equal(writes, 4)
  render().close(); assert.equal(stored, null)
  blocked = true
  render().start(initialFocusSetup)
  assert.equal(render().recoverable, false)
  assert.ok(render().round)
  state = []; writes = 0
  render(false).start(initialFocusSetup)
  assert.equal(writes, 0)
  state = []; stored = null; blocked = false
  pending = rounds.changeRound(rounds.startRound(initialFocusSetup, 0), 'finish', 12000)
  assert.equal(render().round.id, pending.id)
  assert.equal(JSON.parse(stored).id, pending.id)
  render().close()
  assert.equal(stored, null)
  state = []; stored = JSON.stringify({ ...pending, id: undefined }); pending = null
  const migrated = render().round.id
  assert.equal(JSON.parse(stored).id, migrated)
  state = []
  assert.equal(render().round.id, migrated)
})
