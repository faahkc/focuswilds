export function companionProgress(completedSessions: number) {
  const totalXp = completedSessions * 25
  return { totalXp, level: 1 + Math.floor(totalXp / 100), levelXp: totalXp % 100 }
}
