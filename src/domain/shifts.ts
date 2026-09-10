import type { DayId, DayHours, Shift } from './types'

/** A shift is valid if it has integer minutes and starts before it ends. */
export function validateShift(shift: { start: number; end: number }): boolean {
  return Number.isInteger(shift.start) && Number.isInteger(shift.end) && shift.start < shift.end
}

/**
 * Clips a [start, end) range to the store's opening hours for that day.
 * Returns `null` if the day is closed or if the range falls completely
 * outside the opening hours.
 */
export function clipToStore(
  range: { start: number; end: number },
  hours: DayHours,
): { start: number; end: number } | null {
  if (hours.closed) return null
  const start = Math.max(range.start, hours.opens)
  const end = Math.min(range.end, hours.closes)
  if (start >= end) return null
  return { start, end }
}

/**
 * Merges overlapping or contiguous shifts (one's end matches the next one's
 * start). All shifts received are assumed to belong to the same worker and
 * the same day. The shift resulting from each merge keeps the id of the
 * first of its source shifts.
 */
export function mergeShifts(shifts: Shift[]): Shift[] {
  if (shifts.length <= 1) return shifts.map((shift) => ({ ...shift }))

  const sorted = [...shifts].sort((a, b) => a.start - b.start)
  const result: Shift[] = [{ ...sorted[0] }]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const previous = result[result.length - 1]
    if (current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end)
    } else {
      result.push({ ...current })
    }
  }

  return result
}

export type ClipResult = {
  shifts: Shift[]
  /** Original shifts that were clipped or removed. */
  affected: Shift[]
}

/**
 * Applies `clipToStore` to every shift according to its day's current
 * hours. Used when the store's hours change (or a day is closed) so that
 * no shift is left outside what is allowed.
 */
export function clipShiftsToStore(
  shifts: Shift[],
  store: Record<DayId, DayHours>,
): ClipResult {
  const result: Shift[] = []
  const affected: Shift[] = []

  for (const shift of shifts) {
    const hours = store[shift.day]
    const clipped = clipToStore(shift, hours)
    if (clipped === null) {
      affected.push(shift)
      continue
    }
    if (clipped.start !== shift.start || clipped.end !== shift.end) {
      affected.push(shift)
    }
    result.push({ ...shift, ...clipped })
  }

  return { shifts: result, affected }
}
