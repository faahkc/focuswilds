export type Approach = 'quiet' | 'force' | 'observe'
export type AreaId = 'border' | 'hollow' | 'barrow'
type Event = { id: string; danger: number; teamWide: boolean; rescue: boolean }
export const areas: Record<AreaId, { requires: string | null; events: Event[] }> = {
  border: { requires: null, events: [
    { id: 'tracks', danger: 2, teamWide: false, rescue: false },
    { id: 'traveler', danger: 3, teamWide: false, rescue: true },
    { id: 'lanterns', danger: 4, teamWide: true, rescue: false },
  ] },
  hollow: { requires: 'traveler', events: [
    { id: 'roots', danger: 4, teamWide: false, rescue: false },
    { id: 'bells', danger: 5, teamWide: true, rescue: false },
    { id: 'hermit', danger: 4, teamWide: false, rescue: true },
    { id: 'ward', danger: 6, teamWide: true, rescue: false },
  ] },
  barrow: { requires: 'hermit', events: [
    { id: 'gate', danger: 5, teamWide: false, rescue: false },
    { id: 'bones', danger: 6, teamWide: false, rescue: false },
    { id: 'shade', danger: 7, teamWide: true, rescue: false },
    { id: 'prisoner', danger: 6, teamWide: false, rescue: true },
    { id: 'crown', danger: 8, teamWide: true, rescue: false },
  ] },
}
export function eventAt(area: AreaId, index: number): Event {
  const event = Object.hasOwn(areas, area) && areas[area].events[index]
  if (!event || !Number.isSafeInteger(index) || index < 0) throw new Error('No event at this location')
  return event
}

const rumors = [
  { evidence: 'tracks', heardAfter: null, source: 'fortRumor' },
  { evidence: 'lanterns', heardAfter: null, source: 'fortRumor' },
  { evidence: 'ward', heardAfter: 'traveler', source: 'travelerRumor' },
  { evidence: 'shade', heardAfter: 'hermit', source: 'hermitRumor' },
] as const
export function journalRumors(knowledge: readonly string[]) {
  return rumors.filter(rumor => (!rumor.heardAfter || knowledge.includes(rumor.heardAfter)) && !knowledge.includes(rumor.evidence))
}
