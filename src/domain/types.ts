export type DayId = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Monday … 6 = Sunday

export type DayHours = {
  closed: boolean
  opens: number // minutes since midnight
  closes: number
}

export type Worker = {
  id: string
  name: string
  color: string // will be used in the coverage view (post-MVP)
  contractHours?: number // 40, 30, 20… to compare against assigned hours
}

export type Shift = {
  id: string
  workerId: string
  day: DayId
  start: number // minutes since midnight
  end: number // exclusive: [start, end)
}

export type AppState = {
  version: 1 // for future localStorage migrations
  granularityMin: 15
  store: Record<DayId, DayHours>
  workers: Worker[]
  shifts: Shift[] // flat list; several shifts per day and worker
}

export const DAYS: readonly DayId[] = [0, 1, 2, 3, 4, 5, 6]

export const DAY_NAME: Record<DayId, string> = {
  0: 'Monday',
  1: 'Tuesday',
  2: 'Wednesday',
  3: 'Thursday',
  4: 'Friday',
  5: 'Saturday',
  6: 'Sunday',
}
