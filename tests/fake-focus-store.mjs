import assert from 'node:assert/strict'

export function fakeStore(seed = []) {
  const data = new Map(seed.map(([path, value]) => [path, structuredClone(value)]))
  const calls = { get: [], list: [], writes: [], transactions: 0, batches: [] }
  const store = {
    data, calls, loseResponse: false, failTransaction: 0,
    async get(path) { calls.get.push(path); return structuredClone(data.get(path) ?? null) },
    async list(path, options) {
      calls.list.push({ path, options })
      const rows = [...data].filter(([key]) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/'))
        .map(([key, value]) => ({ id: key.split('/').at(-1), data: structuredClone(value) }))
        .filter(row => (!options.start || row.data[options.field] >= options.start) && (!options.end || row.data[options.field] < options.end))
        .sort((a, b) => b.data[options.field].localeCompare(a.data[options.field]) || b.id.localeCompare(a.id))
      const start = options.cursor ? rows.findIndex(row => row.id === options.cursor.id) + 1 : 0
      const page = rows.slice(start, start + options.limit)
      return { rows: page, cursor: page.length ? { id: page.at(-1).id, snapshot: {} } : null }
    },
    async transaction(work) {
      calls.transactions += 1
      if (calls.transactions === store.failTransaction) throw Error('Disconnected')
      const writes = new Map()
      let reads = 0
      const result = await work({
        get: async path => {
          assert.equal(writes.size, 0, 'all reads must precede writes')
          reads += 1
          return store.get(path)
        },
        set: (path, value) => { writes.set(path, structuredClone(value)) },
      })
      for (const [path, value] of writes) { data.set(path, value); calls.writes.push(path) }
      calls.batches.push({ reads, writes: writes.size })
      if (store.loseResponse) { store.loseResponse = false; throw Error('Response lost after commit') }
      return result
    },
  }
  return store
}
