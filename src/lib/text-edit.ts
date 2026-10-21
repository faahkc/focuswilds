const graphemes = new Intl.Segmenter('th', { granularity: 'grapheme' })

export function editText(value: string, start: number, end: number, insert: string, backspace = false) {
  start = Math.max(0, Math.min(start, value.length))
  end = Math.max(start, Math.min(end, value.length))
  if (backspace && start !== end) {
    for (const part of graphemes.segment(value)) {
      if (part.index < start && part.index + part.segment.length > start) start = part.index
      if (part.index < end && part.index + part.segment.length > end) end = part.index + part.segment.length
    }
  }
  if (backspace && start === end) {
    const previous = [...graphemes.segment(value)].findLast(part => part.index < start)
    if (previous) { start = previous.index; end = Math.max(end, previous.index + previous.segment.length) }
  }
  return { value: value.slice(0, start) + insert + value.slice(end), caret: start + insert.length }
}
