import { journalRumors } from '@/lib/shelter-content'
import { eventText, rumorText, shelterText } from '@/lib/shelter-text'
import type { Language } from '@/lib/shelter'

export function ShelterJournal({ knowledge, language }: { knowledge: string[]; language: Language }) {
  const t = shelterText(language)
  const rumors = journalRumors(knowledge)
  return <div className="shelter-list">
    <p>{t.blueprintHint}</p><p>{t.pathfinderHint}</p>
    <h3>{t.knowledge}</h3>
    {knowledge.length ? knowledge.map(id => <p key={id}>{eventText(id, language)}</p>) : <p>{t.empty}</p>}
    <h3>{t.rumors}</h3><p>{t.rumorHint}</p>
    {rumors.length ? rumors.map(rumor => <article key={rumor.evidence}>
      <h4>{t[rumor.source]}</h4><p>{rumorText(rumor.evidence, language)}</p>
    </article>) : <p>{t.empty}</p>}
  </div>
}
