import { DAYS } from './types'
import type { DayId, Shift } from './types'

function shiftsForWorker(workerId: string, shifts: Shift[]): Shift[] {
  return shifts.filter((shift) => shift.workerId === workerId)
}

function sumMinutes(shifts: Shift[]): number {
  return shifts.reduce((total, shift) => total + (shift.end - shift.start), 0)
}

/** Total hours worked in the week by a worker (e.g. 38.5). */
export function weekHours(workerId: string, shifts: Shift[]): number {
  return sumMinutes(shiftsForWorker(workerId, shifts)) / 60
}

/** Number of distinct days on which the worker has at least one shift. */
export function workedDays(workerId: string, shifts: Shift[]): number {
  const days = new Set(shiftsForWorker(workerId, shifts).map((shift) => shift.day))
  return days.size
}

/** Days of the week (out of 7) on which the worker has no shift at all. */
export function daysOff(workerId: string, shifts: Shift[]): number {
  return DAYS.length - workedDays(workerId, shifts)
}

/** Hours worked by a worker on a specific day. */
export function hoursPerDay(workerId: string, day: DayId, shifts: Shift[]): number {
  return sumMinutes(shiftsForWorker(workerId, shifts).filter((shift) => shift.day === day)) / 60
}

/** Total store hours for the week, summing all workers. */
export function storeTotalHours(shifts: Shift[]): number {
  return sumMinutes(shifts) / 60
}

/** Total store hours on a given day, summing all workers. */
export function storeHoursPerDay(day: DayId, shifts: Shift[]): number {
  return sumMinutes(shifts.filter((shift) => shift.day === day)) / 60
}
