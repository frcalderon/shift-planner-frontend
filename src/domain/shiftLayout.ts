import type { Shift } from './types'

export type ShiftLayout = {
  shift: Shift
  left: number
  width: number
}

type OverlapGroup = Shift[]

/**
 * Two shifts are considered overlapping if their time intervals share any
 * minute.
 *
 * [start, end)
 *
 * So:
 *
 * 09:00–12:00
 * 12:00–18:00
 *
 * are not considered overlapping.
 */
function overlaps(a: Shift, b: Shift): boolean {
  return a.start < b.end && b.start < a.end
}

/**
 * Splits a day's shifts into groups where some overlap exists.
 *
 * A group can contain several shifts connected indirectly:
 *
 * A: 09–12
 * B: 10–14
 * C: 13–17
 *
 * Even though A and C don't overlap directly, they belong to the same
 * group because A overlaps with B and B overlaps with C.
 */
function groupOverlaps(shifts: Shift[]): OverlapGroup[] {
  const pending = [...shifts].sort(
    (a, b) => a.start - b.start || a.end - b.end,
  )

  const groups: OverlapGroup[] = []

  while (pending.length > 0) {
    const group: Shift[] = []
    const queue: Shift[] = [pending.shift()!]

    while (queue.length > 0) {
      const currentShift = queue.shift()!

      if (group.some((shift) => shift.id === currentShift.id)) {
        continue
      }

      group.push(currentShift)

      for (let i = pending.length - 1; i >= 0; i -= 1) {
        const candidate = pending[i]

        if (overlaps(currentShift, candidate)) {
          pending.splice(i, 1)
          queue.push(candidate)
        }
      }
    }

    groups.push(
      group.sort(
        (a, b) => a.start - b.start || a.end - b.end,
      ),
    )
  }

  return groups
}

/**
 * Computes the horizontal position of a day's shifts.
 *
 * Each shift receives:
 *
 * left  -> horizontal position as a percentage
 * width -> width as a percentage
 *
 * Shifts that don't overlap can take up the full width.
 * Shifts that do overlap are distributed across columns.
 */
export function calculateShiftLayout(shifts: Shift[]): ShiftLayout[] {
  if (shifts.length === 0) {
    return []
  }

  const groups = groupOverlaps(shifts)
  const result: ShiftLayout[] = []

  for (const group of groups) {
    const columns: Shift[][] = []

    for (const shift of group) {
      let columnFound = -1

      for (let i = 0; i < columns.length; i += 1) {
        const column = columns[i]

        const lastShift = column[column.length - 1]

        if (lastShift.end <= shift.start) {
          columnFound = i
          break
        }
      }

      if (columnFound === -1) {
        columns.push([shift])
      } else {
        columns[columnFound].push(shift)
      }
    }

    const columnCount = columns.length
    const width = 100 / columnCount

    columns.forEach((column, columnIndex) => {
      for (const shift of column) {
        result.push({
          shift,
          left: columnIndex * width,
          width,
        })
      }
    })
  }

  return result
}
