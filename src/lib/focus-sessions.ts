import type { SupabaseClient } from '@supabase/supabase-js'
import type { CompletedFocus } from './pomodoro'

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
