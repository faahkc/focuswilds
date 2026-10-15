import { creatures } from './discoveries.ts'

export type CompanionId = 'moss' | typeof creatures[number]['icon']
export const MOSS_EVOLUTION_LEVEL = 5

export function mossForm(level: number) {
  return level >= MOSS_EVOLUTION_LEVEL
    ? { name: 'Mossgrove', description: 'A woodland guardian, grown through your steady focus.', evolved: true }
    : { name: 'Moss', description: 'A quiet friend for the trail ahead.', evolved: false }
}

export function isCompanionId(value: unknown): value is CompanionId {
  return value === 'moss' || creatures.some(creature => creature.icon === value)
}

export function companionProgress(completedSessions: number) {
  const totalXp = completedSessions * 25
  return { totalXp, level: 1 + Math.floor(totalXp / 100), levelXp: totalXp % 100 }
}
