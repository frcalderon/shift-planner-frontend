import { describe, expect, it } from 'vitest'
import { daysOff, workedDays, hoursPerDay, storeHoursPerDay, weekHours, storeTotalHours } from './stats'
import type { Shift } from './types'

function shift(partial: Partial<Shift>): Shift {
  return { id: 't', workerId: 'w', day: 0, start: 0, end: 0, ...partial }
}

const shifts: Shift[] = [
  shift({ id: '1', workerId: 'ana', day: 0, start: 570, end: 840 }), // 4.5h Monday
  shift({ id: '2', workerId: 'ana', day: 1, start: 600, end: 1020 }), // 7h Tuesday
  shift({ id: '3', workerId: 'ana', day: 1, start: 1020, end: 1080 }), // 1h Tuesday (split)
  shift({ id: '4', workerId: 'bea', day: 2, start: 600, end: 960 }), // 6h Wednesday
]

describe('weekHours', () => {
  it('sums the hours of all of the worker\'s shifts', () => {
    expect(weekHours('ana', shifts)).toBeCloseTo(4.5 + 7 + 1)
    expect(weekHours('bea', shifts)).toBeCloseTo(6)
  })

  it('returns 0 for a worker with no shifts', () => {
    expect(weekHours('cris', shifts)).toBe(0)
  })
})

describe('workedDays / daysOff', () => {
  it('counts distinct days, not shifts', () => {
    expect(workedDays('ana', shifts)).toBe(2) // Monday and Tuesday, even though Tuesday has 2 shifts
    expect(daysOff('ana', shifts)).toBe(5)
  })

  it('a worker with no shifts has all 7 days off', () => {
    expect(workedDays('cris', shifts)).toBe(0)
    expect(daysOff('cris', shifts)).toBe(7)
  })
})

describe('hoursPerDay', () => {
  it('sums only that day\'s shifts (includes a split shift)', () => {
    expect(hoursPerDay('ana', 1, shifts)).toBeCloseTo(8)
    expect(hoursPerDay('ana', 2, shifts)).toBe(0)
  })
})

describe('store totals', () => {
  it('storeTotalHours sums all workers', () => {
    expect(storeTotalHours(shifts)).toBeCloseTo(4.5 + 7 + 1 + 6)
  })

  it('storeHoursPerDay sums all workers for that day', () => {
    expect(storeHoursPerDay(1, shifts)).toBeCloseTo(8)
    expect(storeHoursPerDay(2, shifts)).toBeCloseTo(6)
  })
})
