import { useState } from 'react'
import { clipShiftsToStore } from '../domain/shifts'
import { timeToMinutes, minutesToTime } from '../domain/time'
import { DAYS, DAY_NAME } from '../domain/types'
import type { DayId, DayHours } from '../domain/types'
import { useAppState } from '../state/context'

function describeClip(day: DayId, count: number): string {
  const shiftOrShifts = count === 1 ? 'shift' : 'shifts'
  const verb = count === 1 ? 'was' : 'were'
  return `${DAY_NAME[day]}: ${count} ${shiftOrShifts} ${verb} clipped to the new hours.`
}

export function StoreHoursPanel() {
  const { state, dispatch } = useAppState()
  const [notice, setNotice] = useState<string | null>(null)

  function warnIfClipped(day: DayId, hypotheticalStore: Record<DayId, DayHours>) {
    const { affected } = clipShiftsToStore(state.shifts, hypotheticalStore)
    if (affected.length > 0) {
      setNotice(describeClip(day, affected.length))
    }
  }

  function changeTime(day: DayId, field: 'opens' | 'closes', value: string) {
    if (!value) return
    const hours = state.store[day]
    const updated = { ...hours, [field]: timeToMinutes(value) }
    if (updated.opens >= updated.closes) {
      setNotice(`${DAY_NAME[day]}: opening time must be before closing time.`)
      return
    }
    warnIfClipped(day, { ...state.store, [day]: updated })
    dispatch({ type: 'SET_DAY_HOURS', day, opens: updated.opens, closes: updated.closes })
  }

  function toggleClosed(day: DayId) {
    const hours = state.store[day]
    if (!hours.closed) {
      warnIfClipped(day, { ...state.store, [day]: { ...hours, closed: true } })
    }
    dispatch({ type: 'TOGGLE_DAY_CLOSED', day })
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Store hours</h2>

      {notice && (
        <div className="mb-3 flex items-start justify-between gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 leading-none text-amber-600 hover:text-amber-900"
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {DAYS.map((day) => {
          const hours = state.store[day]
          return (
            <div key={day} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-24 shrink-0 text-slate-600">{DAY_NAME[day]}</span>

              <label className="flex items-center gap-1.5 text-slate-500">
                <input type="checkbox" checked={hours.closed} onChange={() => toggleClosed(day)} />
                Closed
              </label>

              <input
                type="time"
                step={900}
                value={minutesToTime(hours.opens)}
                disabled={hours.closed}
                onChange={(event) => changeTime(day, 'opens', event.target.value)}
                className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100 disabled:text-slate-400"
                aria-label={`Opening time for ${DAY_NAME[day].toLowerCase()}`}
              />
              <span className="text-slate-400">–</span>
              <input
                type="time"
                step={900}
                value={minutesToTime(hours.closes)}
                disabled={hours.closed}
                onChange={(event) => changeTime(day, 'closes', event.target.value)}
                className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100 disabled:text-slate-400"
                aria-label={`Closing time for ${DAY_NAME[day].toLowerCase()}`}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
