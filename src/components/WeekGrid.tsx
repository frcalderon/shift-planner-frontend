import { useMemo } from 'react'
import { generateCells, minutesToTime } from '../domain/time'
import { DAYS, DAY_NAME } from '../domain/types'
import { useAppState } from '../state/context'
import { DayColumn } from './DayColumn'

const CELL_HEIGHT = 20 // px per 15-min cell

type Props = {
  activeWorkerId: string | null
}

export function WeekGrid({ activeWorkerId }: Props) {
  const { state } = useAppState()
  const step = state.granularityMin

  // Time axis shared by the 7 columns: from the week's earliest opening to
  // its latest closing, so every day lines up.
  const { minOpen, maxClose } = useMemo(() => {
    const opens = DAYS.map((day) => state.store[day].opens)
    const closes = DAYS.map((day) => state.store[day].closes)

    return {
      minOpen: Math.min(...opens),
      maxClose: Math.max(...closes),
    }
  }, [state.store])

  const globalCells = useMemo(
    () => generateCells(minOpen, maxClose, step),
    [minOpen, maxClose, step],
  )

  const worker = state.workers.find((w) => w.id === activeWorkerId) ?? null

  if (!worker) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Add and select a worker to start painting their schedule.
      </section>
    )
  }

  const totalHeight = globalCells.length * CELL_HEIGHT

  return (
    <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700">
          Weekly schedule
        </h2>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {state.workers.map((worker) => (
            <div key={worker.id} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: worker.color }}
                aria-hidden
              />
              <span>{worker.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid min-w-[900px] grid-cols-[56px_repeat(7,minmax(0,1fr))]">
        <div />

        {DAYS.map((day) => (
          <div
            key={day}
            className="pb-1 text-center text-xs font-medium text-slate-500"
          >
            {DAY_NAME[day]}
          </div>
        ))}

        <div className="relative" style={{ height: totalHeight }}>
          {globalCells.map((minute) =>
            minute % 60 === 0 ? (
              <div
                key={minute}
                className="absolute right-0 -translate-y-1/2 pr-2 text-[10px] text-slate-400"
                style={{
                  top: ((minute - minOpen) / step) * CELL_HEIGHT,
                }}
              >
                {minutesToTime(minute)}
              </div>
            ) : null,
          )}
        </div>

        {DAYS.map((day) => (
          <DayColumn
            key={day}
            day={day}
            hours={state.store[day]}
            shifts={state.shifts.filter((shift) => shift.day === day)}
            workers={state.workers}
            activeWorkerId={worker.id}
            minOpen={minOpen}
            step={step}
            cellHeight={CELL_HEIGHT}
            rows={globalCells.length}
          />
        ))}
      </div>
    </section>
  )
}
