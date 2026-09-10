import { describe, expect, it } from 'vitest'
import { formatHours, generateCells, timeToMinutes, minutesToTime } from './time'

describe('timeToMinutes / minutesToTime', () => {
  it('converts "HH:MM" to minutes since midnight', () => {
    expect(timeToMinutes('09:30')).toBe(570)
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('23:45')).toBe(1425)
  })

  it('converts minutes since midnight to "HH:MM"', () => {
    expect(minutesToTime(570)).toBe('09:30')
    expect(minutesToTime(0)).toBe('00:00')
    expect(minutesToTime(1425)).toBe('23:45')
  })

  it('are inverses of each other', () => {
    expect(minutesToTime(timeToMinutes('14:15'))).toBe('14:15')
  })
})

describe('generateCells', () => {
  it('generates one cell per step between opens and closes', () => {
    expect(generateCells(570, 600, 15)).toEqual([570, 585])
  })

  it('returns an empty list if opens === closes', () => {
    expect(generateCells(600, 600, 15)).toEqual([])
  })
})

describe('formatHours', () => {
  it('converts minutes to hours with a decimal point', () => {
    expect(formatHours(270)).toBe('4.5 h')
    expect(formatHours(60)).toBe('1 h')
    expect(formatHours(0)).toBe('0 h')
  })
})
