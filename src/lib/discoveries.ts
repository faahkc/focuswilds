export const creatures = [
  { name: 'Fern Hare', description: 'A curious rabbit hiding among the ferns.', icon: 'rabbit', color: '#b7ce88' },
  { name: 'Dawn Finch', description: 'A little bird that welcomes the morning.', icon: 'bird', color: '#e8c782' },
  { name: 'Amber Squirrel', description: 'A bright-eyed collector of woodland treasures.', icon: 'squirrel', color: '#d7a58a' },
] as const

export type DiscoveryJournal = {
  encounters: number[]
  latest: { id: string; finishedAt: string } | null
}

// shortcut: species derive from saved session IDs, persist discoveries before changing this mapping.
export function encounterIndex(sessionId: string) {
  return Number.parseInt(sessionId.slice(-8), 16) % 3
}
