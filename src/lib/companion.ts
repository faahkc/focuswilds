import type { SupabaseClient } from '@supabase/supabase-js'
import { creatures } from './discoveries.ts'

export type CompanionId = 'moss' | typeof creatures[number]['icon']

function isCompanionId(value: unknown): value is CompanionId {
  return value === 'moss' || creatures.some(creature => creature.icon === value)
}

export function companionProgress(completedSessions: number) {
  const totalXp = completedSessions * 25
  return { totalXp, level: 1 + Math.floor(totalXp / 100), levelXp: totalXp % 100 }
}

export async function loadSelectedCompanion(client: SupabaseClient, userId: string): Promise<CompanionId> {
  const { data, error } = await client.from('companion_preferences').select('selected_companion')
    .eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return 'moss'
  if (!isCompanionId(data.selected_companion)) throw new Error('Unknown companion')
  return data.selected_companion
}

export async function saveSelectedCompanion(client: SupabaseClient, userId: string, selected: CompanionId): Promise<CompanionId> {
  if (!isCompanionId(selected)) throw new Error('Unknown companion')
  const { data, error } = await client.from('companion_preferences')
    .upsert({ user_id: userId, selected_companion: selected }, { onConflict: 'user_id' })
    .select('selected_companion').single()
  if (error) throw error
  if (data?.selected_companion !== selected) throw new Error('Companion selection was not saved')
  return selected
}
