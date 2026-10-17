import test from 'node:test'
import assert from 'node:assert/strict'
import { newShelterTimer, toggleShelterTimer, finishShelterTimer, timerRemaining, timerTabTitle, restoreShelterTimer } from '../src/lib/shelter-timer.ts'

const id = '00000000-0000-4000-8000-000000000001'
const now = Date.parse('2026-10-17T08:00:00Z')

test('tab title follows elapsed focus, pause, resume and completion without changing timer data', () => {
  const idle = newShelterTimer(id, 300)
  assert.equal(timerTabTitle(null, now, 'Paused'), 'Focuswilds')
  assert.equal(timerTabTitle(idle, now, 'Paused'), 'Focuswilds')
  const running = toggleShelterTimer(idle, now), snapshot = structuredClone(running)
  assert.equal(timerTabTitle(running, now + 28_200, 'Paused'), '04:32 — Focuswilds')
  assert.deepEqual(running, snapshot)
  const paused = toggleShelterTimer(running, now + 28_200)
  assert.equal(timerTabTitle(paused, now + 100_000, 'Paused'), 'Paused — Focuswilds')
  assert.equal(timerTabTitle(paused, now + 100_000, 'พักโฟกัส'), 'พักโฟกัส — Focuswilds')
  const resumed = toggleShelterTimer(paused, now + 100_000)
  assert.equal(timerTabTitle(resumed, now + 100_000, 'Paused'), '04:32 — Focuswilds')
  assert.equal(timerTabTitle(running, now + 300_000, 'Paused'), 'Focuswilds')
  assert.equal(timerTabTitle(finishShelterTimer(running, now + 30_000, 0), now + 30_000, 'Paused'), 'Focuswilds')
  assert.equal(timerTabTitle(finishShelterTimer(running, now + 300_000, 0), now + 300_000, 'Paused'), 'Focuswilds')
})
test('custom timer survives pauses and reload without counting paused time', () => {
  let timer = newShelterTimer(id, 300)
  timer = toggleShelterTimer(timer, now)
  timer = toggleShelterTimer(timer, now + 200_000)
  timer = restoreShelterTimer(JSON.stringify(timer), id)
  assert.equal(timerRemaining(timer, now + 500_000), 100_000)
  timer = toggleShelterTimer(timer, now + 500_000)
  timer = finishShelterTimer(timer, now + 700_000, 4)
  assert.deepEqual(timer.pending.command, { type: 'focus', seconds: 300, targetSeconds: 300, completed: true })
  assert.equal(timer.pending.revision, 4)
  assert.equal(timer.pending.focus.completedAt, new Date(now + 600_000).toISOString())
  assert.deepEqual(restoreShelterTimer(JSON.stringify(timer), id), timer)
  assert.deepEqual(finishShelterTimer(timer, now + 800_000, 9), timer, 'pending payload stays stable across retries')
})
test('early finish keeps actual whole focus seconds and no completed session', () => {
  let timer = toggleShelterTimer(newShelterTimer(id), now)
  timer = finishShelterTimer(timer, now + 90_500, 0)
  assert.equal(timer.pending.command.seconds, 90)
  assert.equal(timer.pending.command.completed, false)
  assert.throws(() => toggleShelterTimer(timer, now + 100_000))
  assert.equal(finishShelterTimer(newShelterTimer(id), now, 0).pending, null)
})
test('corrupt timer data fails visibly instead of silently erasing an unsaved session', () => {
  const timer = newShelterTimer(id)
  for (const raw of ['broken', JSON.stringify({ ...timer, targetSeconds: 0 }), JSON.stringify({ ...timer, deadline: now }), JSON.stringify({ ...timer, pending: {} })]) {
    assert.throws(() => restoreShelterTimer(raw, id))
  }
  assert.deepEqual(restoreShelterTimer(null, id), timer)
})
