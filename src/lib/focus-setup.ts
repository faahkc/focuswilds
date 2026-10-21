export type FocusSetup = { title: string; mode: 'down' | 'up'; minutes: number }
export const initialFocusSetup: FocusSetup = { title: '', mode: 'down', minutes: 25 }
export const durationPresets = [10, 25, 50] as const

export function durationError(value: string) {
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 180
    ? '' : 'Use 1–180 whole minutes.'
}

export function titleError(value: string) {
  return [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(value)].length <= 100
    ? '' : '100 characters maximum.'
}
