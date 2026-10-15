export const DEFAULT_FOCUS_TITLE = 'Focus session'
export const MAX_FOCUS_TITLE_LENGTH = 120

export function normalizeFocusTitle(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_FOCUS_TITLE
  return [...value.trim()].slice(0, MAX_FOCUS_TITLE_LENGTH).join('') || DEFAULT_FOCUS_TITLE
}
