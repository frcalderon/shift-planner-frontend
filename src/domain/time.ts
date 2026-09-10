// All times are handled as minutes since midnight (integers).
// They are only converted to "HH:MM" to render on screen (see the golden
// rule in PLAN.md).

/** "09:30" -> 570 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/** 570 -> "09:30" */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24
  const remainder = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

/**
 * Returns the start minute of each cell of size `step` between `opens`
 * (inclusive) and `closes` (exclusive). For example generateCells(570, 600, 15)
 * -> [570, 585].
 */
export function generateCells(opens: number, closes: number, step: number): number[] {
  const cells: number[] = []
  for (let minute = opens; minute < closes; minute += step) {
    cells.push(minute)
  }
  return cells
}

/** 270 -> "4.5 h" (for displaying durations and totals, never for calculations). */
export function formatHours(minutes: number): string {
  const hours = minutes / 60
  return `${hours.toLocaleString('en-US', { maximumFractionDigits: 2 })} h`
}
