import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { companionProgress, mossForm, MOSS_EVOLUTION_LEVEL, loadSelectedCompanion, saveSelectedCompanion } from '../src/lib/companion.ts'

test('a new companion starts at Level 1 and gains 25 EXP per saved focus session', () => {
  assert.deepEqual(companionProgress(0), { totalXp: 0, level: 1, levelXp: 0 })
  assert.deepEqual(companionProgress(1), { totalXp: 25, level: 1, levelXp: 25 })
})

const userId = '00000000-0000-4000-8000-000000000001'
const otherId = '00000000-0000-4000-8000-000000000002'
const client = fetch => createClient('https://example.supabase.co', 'test-public-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch },
})

test('selection survives a new client, switches back to Moss, and stays scoped to the account', async () => {
  const rows = new Map()
  const fetch = async (input, options) => {
    const url = new URL(input)
    assert.equal(url.pathname, '/rest/v1/companion_preferences')
    if (options.method === 'POST') {
      assert.equal(url.searchParams.get('on_conflict'), 'user_id')
      const row = JSON.parse(options.body)
      rows.set(row.user_id, row)
      return Response.json({ selected_companion: row.selected_companion })
    }
    const account = url.searchParams.get('user_id')?.slice(3)
    const row = rows.get(account)
    return Response.json(row ? [{ selected_companion: row.selected_companion }] : [])
  }
  const first = client(fetch)
  assert.equal(await loadSelectedCompanion(first, userId), 'moss')
  assert.equal(await saveSelectedCompanion(first, userId, 'rabbit'), 'rabbit')
  const second = client(fetch)
  assert.equal(await loadSelectedCompanion(second, userId), 'rabbit')
  assert.equal(await loadSelectedCompanion(second, otherId), 'moss')
  await saveSelectedCompanion(second, userId, 'moss')
  assert.equal(await loadSelectedCompanion(first, userId), 'moss')
  assert.equal(rows.size, 1)
})

test('failed or invalid preference loads do not silently reset the companion', async () => {
  const denied = client(async () => Response.json({ message: 'RLS denied', code: '42501' }, { status: 403 }))
  await assert.rejects(loadSelectedCompanion(denied, userId), { code: '42501' })
  const invalid = client(async () => Response.json([{ selected_companion: 'unknown' }]))
  await assert.rejects(loadSelectedCompanion(invalid, userId), /Unknown companion/)
})

test('selection writes require a valid companion and server confirmation', async () => {
  const denied = client(async () => Response.json({ message: 'Not discovered', code: '42501' }, { status: 403 }))
  await assert.rejects(saveSelectedCompanion(denied, userId, 'bird'), { code: '42501' })
  await assert.rejects(saveSelectedCompanion(denied, userId, 'unknown'), /Unknown companion/)
  const wrong = client(async () => Response.json({ selected_companion: 'moss' }))
  await assert.rejects(saveSelectedCompanion(wrong, userId, 'rabbit'), /not saved/)
})

test('retrying an uncertain selection writes the same preference without changing EXP', async () => {
  let selected = 'moss'
  let calls = 0
  const api = client(async (_input, options) => {
    if (options.method === 'POST') {
      selected = JSON.parse(options.body).selected_companion
      if (++calls === 1) throw new Error('Response lost after commit')
      return Response.json({ selected_companion: selected })
    }
    return Response.json([{ selected_companion: selected }])
  })
  const progress = companionProgress(5)
  await assert.rejects(saveSelectedCompanion(api, userId, 'squirrel'))
  assert.equal(await loadSelectedCompanion(api, userId), 'squirrel')
  await saveSelectedCompanion(api, userId, 'squirrel')
  assert.deepEqual(companionProgress(5), progress)
  assert.equal(calls, 2)
})

test('level boundaries reset the EXP bar without losing total experience', () => {
  assert.deepEqual(companionProgress(3), { totalXp: 75, level: 1, levelXp: 75 })
  assert.deepEqual(companionProgress(4), { totalXp: 100, level: 2, levelXp: 0 })
  assert.deepEqual(companionProgress(5), { totalXp: 125, level: 2, levelXp: 25 })
  assert.deepEqual(companionProgress(8), { totalXp: 200, level: 3, levelXp: 0 })
})

test('Moss evolves exactly at Level 5 from sixteen saved focus sessions', () => {
  assert.equal(MOSS_EVOLUTION_LEVEL, 5)
  for (const sessions of [0, 1, 15]) {
    const form = mossForm(companionProgress(sessions).level)
    assert.equal(form.name, 'Moss')
    assert.equal(form.evolved, false)
  }
  for (const sessions of [16, 17, 100]) {
    const form = mossForm(companionProgress(sessions).level)
    assert.equal(form.name, 'Mossgrove')
    assert.equal(form.evolved, true)
  }
  assert.deepEqual(companionProgress(16), { totalXp: 400, level: 5, levelXp: 0 })
})

test('an evolved Moss keeps its saved identity and form when switching away and back', async () => {
  let selected = 'moss'
  const api = client(async (_input, options) => {
    if (options.method === 'POST') selected = JSON.parse(options.body).selected_companion
    return Response.json(options.method === 'POST' ? { selected_companion: selected } : [{ selected_companion: selected }])
  })
  const level = companionProgress(16).level
  await saveSelectedCompanion(api, userId, 'bird')
  await saveSelectedCompanion(api, userId, 'moss')
  assert.equal(await loadSelectedCompanion(api, userId), 'moss')
  assert.equal(mossForm(level).name, 'Mossgrove')
})
