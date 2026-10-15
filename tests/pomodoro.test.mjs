import test from 'node:test'
import assert from 'node:assert/strict'
import { FOCUS_MS, BREAK_MS, newTimer, remaining, advance, toggleTimer, resetTimer, restoreTimer, todayBounds, dailyGoalProgress } from '../src/lib/pomodoro.ts'

const id = '00000000-0000-4000-8000-000000000001'
const otherId = '00000000-0000-4000-8000-000000000002'
const now = Date.parse('2026-10-15T08:00:00Z')

test('the daily goal reaches four saved sessions and stays full beyond the target', () => {
  assert.deepEqual(dailyGoalProgress(0), { completed: 0, remaining: 4 })
  assert.deepEqual(dailyGoalProgress(1), { completed: 1, remaining: 3 })
  assert.deepEqual(dailyGoalProgress(3), { completed: 3, remaining: 1 })
  assert.deepEqual(dailyGoalProgress(4), { completed: 4, remaining: 0 })
  assert.deepEqual(dailyGoalProgress(5), { completed: 4, remaining: 0 })
})

test('deadline follows elapsed time after background throttling and reload', () => {
  const running = toggleTimer(newTimer(id), now, otherId)
  assert.equal(remaining(running, now + 10 * 60_000), 15 * 60_000)
  const restored = restoreTimer(JSON.stringify(running), id)
  const completed = advance(restored, now + FOCUS_MS + 60 * 60_000)
  assert.equal(completed.phase, 'break')
  assert.equal(completed.remainingMs, BREAK_MS)
  assert.equal(completed.deadline, null)
  assert.deepEqual(completed.pending, { id: otherId, startedAt: new Date(now).toISOString(), completedAt: new Date(now + FOCUS_MS).toISOString(), title: 'Focus session' })
  assert.equal(advance(completed, now + FOCUS_MS * 4), completed)
})

test('pause and resume preserve focus time without counting paused time', () => {
  const running = toggleTimer(newTimer(id), now, otherId)
  const paused = toggleTimer(running, now + 60_000, id)
  assert.equal(paused.remainingMs, FOCUS_MS - 60_000)
  assert.equal(paused.deadline, null)
  const resumed = toggleTimer(paused, now + 600_000, id)
  assert.equal(resumed.deadline, now + 600_000 + FOCUS_MS - 60_000)
  assert.equal(resumed.id, otherId)
  assert.equal(resumed.startedAt, new Date(now).toISOString())
})

test('reset discards unfinished focus but cannot erase a completed session', () => {
  const running = toggleTimer(newTimer(id), now, otherId)
  const reset = resetTimer(running, now + 60_000)
  assert.equal(reset.remainingMs, FOCUS_MS)
  assert.equal(reset.pending, null)
  assert.equal(reset.deadline, null)
  const completed = resetTimer(running, now + FOCUS_MS)
  assert.equal(completed.phase, 'break')
  assert.equal(completed.pending.id, otherId)
})

test('breaks do not auto-start focus or overwrite an unsaved session', () => {
  const completed = advance(toggleTimer(newTimer(id), now, id), now + FOCUS_MS)
  const resting = toggleTimer(completed, now + FOCUS_MS, otherId)
  const focused = advance(resting, now + FOCUS_MS + BREAK_MS)
  assert.equal(focused.phase, 'focus')
  assert.equal(focused.deadline, null)
  assert.deepEqual(focused.pending, completed.pending)
  assert.equal(toggleTimer(focused, now + FOCUS_MS + BREAK_MS, otherId), focused)
  const saved = { ...focused, pending: null }
  assert.equal(toggleTimer(saved, now + FOCUS_MS + BREAK_MS, otherId).id, otherId)
})

test('a click after expiry completes the phase instead of pausing at zero', () => {
  const running = toggleTimer(newTimer(id), now, id)
  const completed = toggleTimer(running, now + FOCUS_MS, otherId)
  assert.equal(completed.phase, 'break')
  assert.equal(completed.deadline, null)
  assert.equal(completed.pending.id, id)
})

test('restore validates browser storage and preserves pending saves', () => {
  for (const raw of ['invalid', 'null', '{}', JSON.stringify({ ...newTimer(id), remainingMs: -1 }),
    JSON.stringify({ ...newTimer(id), remainingMs: FOCUS_MS + 1 }),
    JSON.stringify({ ...newTimer(id), id: 'invalid' }),
    JSON.stringify({ ...newTimer(id), deadline: 1e20 }),
    JSON.stringify({ ...newTimer(id), pending: { id, completedAt: 'invalid' } }),
    JSON.stringify({ ...newTimer(id), deadline: now }),
    JSON.stringify({ ...newTimer(id), startedAt: 'invalid' }),
    JSON.stringify({ ...newTimer(id), deadline: now, pending: { id, startedAt: new Date(now).toISOString(), completedAt: new Date(now).toISOString() } })]) {
    assert.deepEqual(restoreTimer(raw, otherId), newTimer(otherId))
  }
  const pending = advance(toggleTimer(newTimer(id), now, id), now + FOCUS_MS)
  assert.deepEqual(restoreTimer(JSON.stringify(pending), otherId), pending)
})

test('daily bounds use Thailand midnight consistently across device timezones', () => {
  const original = process.env.TZ
  try {
    process.env.TZ = 'Asia/Bangkok'
    assert.deepEqual(todayBounds(Date.parse('2026-10-15T18:00:00Z')), {
      start: '2026-10-15T17:00:00.000Z', end: '2026-10-16T17:00:00.000Z',
    })
    process.env.TZ = 'America/New_York'
    const bounds = todayBounds(Date.parse('2026-03-08T12:00:00Z'))
    assert.equal(Date.parse(bounds.end) - Date.parse(bounds.start), 24 * 60 * 60_000)
  } finally {
    if (original === undefined) delete process.env.TZ
    else process.env.TZ = original
  }
})

test('a named focus session keeps its title through pause, reload, completion, and pending retry', () => {
  const running = toggleTimer({ ...newTimer(id), title: '  อ่านหนังสือ  ' }, now, otherId)
  const paused = toggleTimer(running, now + 60_000, id)
  const restored = restoreTimer(JSON.stringify(paused), id)
  assert.equal(restored.title, 'อ่านหนังสือ')
  const resumed = toggleTimer(restored, now + 120_000, id)
  const completed = advance(resumed, resumed.deadline)
  assert.equal(completed.pending.title, 'อ่านหนังสือ')
  assert.equal(restoreTimer(JSON.stringify(completed), id).pending.title, 'อ่านหนังสือ')
})

test('legacy timers and pending saves gain the default title without losing progress', () => {
  const running = toggleTimer(newTimer(id), now, otherId)
  const completed = advance(running, running.deadline)
  delete running.title
  delete completed.title
  delete completed.pending.title
  assert.equal(restoreTimer(JSON.stringify(running), id).deadline, running.deadline)
  const restored = restoreTimer(JSON.stringify(completed), id)
  assert.equal(restored.pending.id, otherId)
  assert.equal(restored.pending.title, 'Focus session')
  assert.equal(restored.title, 'Focus session')
})
