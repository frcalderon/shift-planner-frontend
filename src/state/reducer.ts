import { mergeShifts, clipToStore, clipShiftsToStore, validateShift } from '../domain/shifts'
import type { DayId, AppState, DayHours, Worker, Shift } from '../domain/types'

export type Action =
  | { type: 'SET_DAY_HOURS'; day: DayId; opens: number; closes: number }
  | { type: 'TOGGLE_DAY_CLOSED'; day: DayId }
  | { type: 'ADD_WORKER'; name: string; contractHours?: number }
  | { type: 'RENAME_WORKER'; id: string; name: string }
  | { type: 'DELETE_WORKER'; id: string }
  | { type: 'ADD_SHIFT'; workerId: string; day: DayId; start: number; end: number }
  | { type: 'MOVE_SHIFT'; id: string; start: number; end: number }
  | { type: 'RESIZE_SHIFT'; id: string; start: number; end: number }
  | { type: 'DELETE_SHIFT'; id: string }
  | { type: 'RESET_SHIFTS' }
  | { type: 'LOAD_STATE'; state: AppState }

const COLOR_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
]

function colorForIndex(index: number): string {
  return COLOR_PALETTE[index % COLOR_PALETTE.length]
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const DEFAULT_STORE_HOURS: DayHours = { closed: false, opens: 570, closes: 1260 } // 09:30–21:00

export const INITIAL_HOURS: Record<DayId, DayHours> = {
  0: { ...DEFAULT_STORE_HOURS },
  1: { ...DEFAULT_STORE_HOURS },
  2: { ...DEFAULT_STORE_HOURS },
  3: { ...DEFAULT_STORE_HOURS },
  4: { ...DEFAULT_STORE_HOURS },
  5: { closed: false, opens: 600, closes: 1200 }, // Saturday 10:00–20:00
  6: { closed: true, opens: 600, closes: 1200 }, // Sunday closed
}

export const INITIAL_STATE: AppState = {
  version: 1,
  granularityMin: 15,
  store: INITIAL_HOURS,
  workers: [],
  shifts: [],
}

/**
 * Replaces, within `shifts`, every shift of the same worker and day as
 * `next` with the result of merging them with it. This way any shift left
 * overlapping or contiguous after an ADD/MOVE/RESIZE gets merged
 * automatically.
 */
function integrateShift(shifts: Shift[], next: Shift): Shift[] {
  const sameDay: Shift[] = []
  const rest: Shift[] = []
  for (const shift of shifts) {
    if (shift.workerId === next.workerId && shift.day === next.day) {
      sameDay.push(shift)
    } else {
      rest.push(shift)
    }
  }
  return [...rest, ...mergeShifts([...sameDay, next])]
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_DAY_HOURS': {
      if (!Number.isInteger(action.opens) || !Number.isInteger(action.closes)) return state
      if (action.opens >= action.closes) return state
      const store: Record<DayId, DayHours> = {
        ...state.store,
        [action.day]: { ...state.store[action.day], opens: action.opens, closes: action.closes },
      }
      const { shifts } = clipShiftsToStore(state.shifts, store)
      return { ...state, store, shifts }
    }

    case 'TOGGLE_DAY_CLOSED': {
      const currentDay = state.store[action.day]
      const store: Record<DayId, DayHours> = {
        ...state.store,
        [action.day]: { ...currentDay, closed: !currentDay.closed },
      }
      const { shifts } = clipShiftsToStore(state.shifts, store)
      return { ...state, store, shifts }
    }

    case 'ADD_WORKER': {
      const name = action.name.trim()
      if (!name) return state
      const worker: Worker = {
        id: generateId(),
        name,
        color: colorForIndex(state.workers.length),
        contractHours: action.contractHours,
      }
      return { ...state, workers: [...state.workers, worker] }
    }

    case 'RENAME_WORKER': {
      const name = action.name.trim()
      if (!name) return state
      return {
        ...state,
        workers: state.workers.map((worker) =>
          worker.id === action.id ? { ...worker, name } : worker,
        ),
      }
    }

    case 'DELETE_WORKER': {
      return {
        ...state,
        workers: state.workers.filter((worker) => worker.id !== action.id),
        shifts: state.shifts.filter((shift) => shift.workerId !== action.id),
      }
    }

    case 'ADD_SHIFT': {
      if (!validateShift(action)) return state
      const hours = state.store[action.day]
      const clipped = clipToStore(action, hours)
      if (!clipped) return state
      const next: Shift = {
        id: generateId(),
        workerId: action.workerId,
        day: action.day,
        ...clipped,
      }
      return { ...state, shifts: integrateShift(state.shifts, next) }
    }

    case 'MOVE_SHIFT':
    case 'RESIZE_SHIFT': {
      const existing = state.shifts.find((shift) => shift.id === action.id)
      if (!existing) return state
      if (!validateShift(action)) return state
      const hours = state.store[existing.day]
      const clipped = clipToStore(action, hours)
      if (!clipped) return state
      const withoutThis = state.shifts.filter((shift) => shift.id !== action.id)
      const updated: Shift = { ...existing, ...clipped }
      return { ...state, shifts: integrateShift(withoutThis, updated) }
    }

    case 'DELETE_SHIFT': {
      return { ...state, shifts: state.shifts.filter((shift) => shift.id !== action.id) }
    }

    case 'RESET_SHIFTS': {
      return { ...state, shifts: [] }
    }

    case 'LOAD_STATE': {
      return action.state
    }

    default:
      return state
  }
}
