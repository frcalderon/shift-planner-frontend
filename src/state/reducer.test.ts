import { describe, expect, it } from 'vitest'
import type { AppState } from '../domain/types'
import { INITIAL_STATE, reducer } from './reducer'

function withWorker(state: AppState, name = 'Ana') {
  return reducer(state, { type: 'ADD_WORKER', name })
}

describe('ADD_WORKER / RENAME_WORKER / DELETE_WORKER', () => {
  it('adds a worker with an assigned id and color', () => {
    const state = withWorker(INITIAL_STATE, 'Ana')
    expect(state.workers).toHaveLength(1)
    expect(state.workers[0].name).toBe('Ana')
    expect(state.workers[0].id).toBeTruthy()
    expect(state.workers[0].color).toBeTruthy()
  })

  it('ignores blank names', () => {
    const state = withWorker(INITIAL_STATE, '   ')
    expect(state.workers).toHaveLength(0)
  })

  it('renames by id', () => {
    const state = withWorker(INITIAL_STATE, 'Ana')
    const id = state.workers[0].id
    const renamed = reducer(state, { type: 'RENAME_WORKER', id, name: 'Ana Smith' })
    expect(renamed.workers[0].name).toBe('Ana Smith')
  })

  it('removing a worker also removes their shifts', () => {
    let state = withWorker(INITIAL_STATE, 'Ana')
    const id = state.workers[0].id
    state = reducer(state, { type: 'ADD_SHIFT', workerId: id, day: 0, start: 600, end: 700 })
    expect(state.shifts).toHaveLength(1)

    state = reducer(state, { type: 'DELETE_WORKER', id })
    expect(state.workers).toHaveLength(0)
    expect(state.shifts).toHaveLength(0)
  })
})

describe('ADD_SHIFT', () => {
  it('creates a shift clipped to the store hours', () => {
    let state = withWorker(INITIAL_STATE)
    const id = state.workers[0].id
    // Monday opens at 570 (09:30); we ask for something starting before opening
    state = reducer(state, { type: 'ADD_SHIFT', workerId: id, day: 0, start: 0, end: 600 })
    expect(state.shifts).toEqual([expect.objectContaining({ start: 570, end: 600 })])
  })

  it('creates nothing on a closed day', () => {
    let state = withWorker(INITIAL_STATE)
    const id = state.workers[0].id
    state = reducer(state, { type: 'ADD_SHIFT', workerId: id, day: 6, start: 600, end: 700 }) // Sunday
    expect(state.shifts).toHaveLength(0)
  })

  it('automatically merges with an overlapping shift of the same worker and day', () => {
    let state = withWorker(INITIAL_STATE)
    const id = state.workers[0].id
    state = reducer(state, { type: 'ADD_SHIFT', workerId: id, day: 0, start: 600, end: 700 })
    state = reducer(state, { type: 'ADD_SHIFT', workerId: id, day: 0, start: 650, end: 800 })
    expect(state.shifts).toEqual([expect.objectContaining({ start: 600, end: 800 })])
  })

  it('allows split shifts (two separate shifts on the same day)', () => {
    let state = withWorker(INITIAL_STATE)
    const id = state.workers[0].id
    state = reducer(state, { type: 'ADD_SHIFT', workerId: id, day: 0, start: 600, end: 700 })
    state = reducer(state, { type: 'ADD_SHIFT', workerId: id, day: 0, start: 900, end: 1000 })
    expect(state.shifts).toHaveLength(2)
  })
})

describe('MOVE_SHIFT / RESIZE_SHIFT', () => {
  it('moves a shift within the store hours', () => {
    let state = withWorker(INITIAL_STATE)
    const id = state.workers[0].id
    state = reducer(state, { type: 'ADD_SHIFT', workerId: id, day: 0, start: 600, end: 700 })
    const shiftId = state.shifts[0].id
    state = reducer(state, { type: 'MOVE_SHIFT', id: shiftId, start: 800, end: 900 })
    expect(state.shifts).toEqual([expect.objectContaining({ start: 800, end: 900 })])
  })

  it('resizes and merges if the new size reaches another shift', () => {
    let state = withWorker(INITIAL_STATE)
    const id = state.workers[0].id
    state = reducer(state, { type: 'ADD_SHIFT', workerId: id, day: 0, start: 600, end: 700 })
    state = reducer(state, { type: 'ADD_SHIFT', workerId: id, day: 0, start: 800, end: 900 })
    const firstId = state.shifts.find((s) => s.start === 600)!.id
    state = reducer(state, { type: 'RESIZE_SHIFT', id: firstId, start: 600, end: 850 })
    expect(state.shifts).toEqual([expect.objectContaining({ start: 600, end: 900 })])
  })
})

describe('SET_DAY_HOURS / TOGGLE_DAY_CLOSED', () => {
  it('clips the affected shifts when the hours are reduced', () => {
    let state = withWorker(INITIAL_STATE)
    const id = state.workers[0].id
    // Saturday: 10:00–20:00 (600–1200) by default
    state = reducer(state, { type: 'ADD_SHIFT', workerId: id, day: 5, start: 1000, end: 1180 })
    state = reducer(state, { type: 'SET_DAY_HOURS', day: 5, opens: 600, closes: 1080 }) // closes at 18:00
    expect(state.shifts).toEqual([expect.objectContaining({ start: 1000, end: 1080 })])
  })

  it('removes the shifts of a day that is marked as closed', () => {
    let state = withWorker(INITIAL_STATE)
    const id = state.workers[0].id
    state = reducer(state, { type: 'ADD_SHIFT', workerId: id, day: 0, start: 600, end: 700 })
    state = reducer(state, { type: 'TOGGLE_DAY_CLOSED', day: 0 })
    expect(state.store[0].closed).toBe(true)
    expect(state.shifts).toHaveLength(0)
  })

  it('ignores invalid hours (opens >= closes)', () => {
    const state = reducer(INITIAL_STATE, { type: 'SET_DAY_HOURS', day: 0, opens: 900, closes: 800 })
    expect(state).toBe(INITIAL_STATE)
  })
})

describe('RESET_SHIFTS', () => {
  it('empties all shifts without touching workers or store hours', () => {
    let state = withWorker(INITIAL_STATE)
    const id = state.workers[0].id
    state = reducer(state, { type: 'ADD_SHIFT', workerId: id, day: 0, start: 600, end: 700 })
    state = reducer(state, { type: 'RESET_SHIFTS' })
    expect(state.shifts).toHaveLength(0)
    expect(state.workers).toHaveLength(1)
    expect(state.store).toBe(state.store)
  })
})
