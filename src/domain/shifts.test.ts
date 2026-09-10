import { describe, expect, it } from 'vitest'
import { mergeShifts, clipToStore, clipShiftsToStore, validateShift } from './shifts'
import type { DayHours, Shift } from './types'

function shift(partial: Partial<Shift>): Shift {
  return { id: 't', workerId: 'w', day: 0, start: 0, end: 0, ...partial }
}

describe('validateShift', () => {
  it('requires start < end', () => {
    expect(validateShift({ start: 570, end: 600 })).toBe(true)
    expect(validateShift({ start: 600, end: 600 })).toBe(false)
    expect(validateShift({ start: 600, end: 570 })).toBe(false)
  })

  it('requires integer minutes', () => {
    expect(validateShift({ start: 570.5, end: 600 })).toBe(false)
  })
})

describe('clipToStore', () => {
  const open: DayHours = { closed: false, opens: 570, closes: 1260 }
  const closed: DayHours = { closed: true, opens: 570, closes: 1260 }

  it('returns null if the day is closed', () => {
    expect(clipToStore({ start: 600, end: 700 }, closed)).toBeNull()
  })

  it('leaves unchanged a range already contained in the hours', () => {
    expect(clipToStore({ start: 600, end: 700 }, open)).toEqual({ start: 600, end: 700 })
  })

  it('clips a range that overflows on both sides', () => {
    expect(clipToStore({ start: 0, end: 2000 }, open)).toEqual({ start: 570, end: 1260 })
  })

  it('returns null if the range falls entirely outside the hours', () => {
    expect(clipToStore({ start: 0, end: 100 }, open)).toBeNull()
  })
})

describe('mergeShifts', () => {
  it('leaves untouched shifts that neither overlap nor are contiguous', () => {
    const a = shift({ id: 'a', start: 570, end: 600 })
    const b = shift({ id: 'b', start: 700, end: 800 })
    expect(mergeShifts([a, b])).toEqual([a, b])
  })

  it('merges contiguous shifts (a split shift that has joined back up)', () => {
    const a = shift({ id: 'a', start: 570, end: 600 })
    const b = shift({ id: 'b', start: 600, end: 700 })
    expect(mergeShifts([a, b])).toEqual([shift({ id: 'a', start: 570, end: 700 })])
  })

  it('merges overlapping shifts', () => {
    const a = shift({ id: 'a', start: 570, end: 650 })
    const b = shift({ id: 'b', start: 600, end: 700 })
    expect(mergeShifts([a, b])).toEqual([shift({ id: 'a', start: 570, end: 700 })])
  })

  it('merges several shifts in a chain regardless of input order', () => {
    const a = shift({ id: 'a', start: 800, end: 900 })
    const b = shift({ id: 'b', start: 570, end: 600 })
    const c = shift({ id: 'c', start: 590, end: 810 })
    expect(mergeShifts([a, b, c])).toEqual([shift({ id: 'b', start: 570, end: 900 })])
  })
})

describe('clipShiftsToStore', () => {
  it('clips shifts that overflow the new hours and marks the affected ones', () => {
    const store = { 5: { closed: false, opens: 600, closes: 1080 } } as never // Saturday until 18:00
    const shifts = [
      shift({ id: 'a', day: 5, start: 600, end: 900 }), // within range
      shift({ id: 'b', day: 5, start: 1000, end: 1200 }), // clipped to 1080
    ]
    const result = clipShiftsToStore(shifts, store)
    expect(result.shifts).toEqual([
      shift({ id: 'a', day: 5, start: 600, end: 900 }),
      shift({ id: 'b', day: 5, start: 1000, end: 1080 }),
    ])
    expect(result.affected.map((s) => s.id)).toEqual(['b'])
  })

  it('removes the shifts of a day that is marked as closed', () => {
    const store = { 6: { closed: true, opens: 600, closes: 1200 } } as never
    const shifts = [shift({ id: 'a', day: 6, start: 600, end: 700 })]
    const result = clipShiftsToStore(shifts, store)
    expect(result.shifts).toEqual([])
    expect(result.affected.map((s) => s.id)).toEqual(['a'])
  })
})
