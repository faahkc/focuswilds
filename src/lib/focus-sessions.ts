import type { SupabaseClient } from '@supabase/supabase-js'
import type { CompletedFocus } from './pomodoro'
import { encounterIndex, type DiscoveryJournal } from './discoveries.ts'
import { historyRange, summarizeHistory, type HistoryPeriod, type HistorySession } from './history.ts'
import { normalizeFocusTitle } from './focus-title.ts'

export async function saveFocus(client: SupabaseClient, userId: string, session: CompletedFocus) {
  const { error } = await client.from('focus_sessions').upsert({
    id: session.id,
    user_id: userId,
    session_type: 'focus',
    status: 'completed',
    duration_seconds: 1500,
    remaining_seconds: 0,
    started_at: session.startedAt,
    ends_at: session.completedAt,
    finished_at: session.completedAt,
    title: normalizeFocusTitle(session.title),
  }, { onConflict: 'id', ignoreDuplicates: true })
  if (error) throw error
}

export async function loadProgress(client: SupabaseClient, userId: string, start: string, end: string) {
  let sessions = 0
  let seconds = 0
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from('focus_sessions').select('duration_seconds')
      .eq('user_id', userId).eq('session_type', 'focus').eq('status', 'completed')
      .gte('finished_at', start).lt('finished_at', end).order('id').range(offset, offset + 999)
    if (error) throw error
    for (const row of data ?? []) { sessions += 1; seconds += row.duration_seconds }
    if (!data || data.length < 1000) return { sessions, minutes: Math.floor(seconds / 60) }
  }
}

export async function loadCompletedFocusCount(client: SupabaseClient, userId: string) {
  const { count, error } = await client.from('focus_sessions').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('session_type', 'focus').eq('status', 'completed')
  if (error) throw error
  if (count === null) throw new Error('Completed focus count was not returned')
  return count
}

export async function loadDiscoveryJournal(client: SupabaseClient, userId: string): Promise<DiscoveryJournal> {
  const journal: DiscoveryJournal = { encounters: [0, 0, 0], latest: null }
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from('focus_sessions').select('id,finished_at')
      .eq('user_id', userId).eq('session_type', 'focus').eq('status', 'completed')
      .order('finished_at', { ascending: false }).order('id').range(offset, offset + 999)
    if (error) throw error
    for (const row of data ?? []) {
      journal.latest ??= { id: row.id, finishedAt: row.finished_at }
      journal.encounters[encounterIndex(row.id)] += 1
    }
    if (!data || data.length < 1000) return journal
  }
}

export async function loadFocusHistory(client: SupabaseClient, userId: string, period: HistoryPeriod, now: number) {
  const { start, end } = historyRange(period, now)
  const rows: HistorySession[] = []
  for (let offset = 0; ; offset += 1000) {
    let query = client.from('focus_sessions').select('id,title,finished_at,duration_seconds')
      .eq('user_id', userId).eq('session_type', 'focus').eq('status', 'completed').lt('finished_at', end)
    if (start !== null) query = query.gte('finished_at', start)
    const { data, error } = await query.order('finished_at', { ascending: false }).order('id').range(offset, offset + 999)
    if (error) throw error
    rows.push(...data ?? [])
    if (!data || data.length < 1000) return summarizeHistory(rows)
  }
}
