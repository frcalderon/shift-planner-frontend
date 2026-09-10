import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { DayId, DayHours, Worker, Shift } from '../domain/types'
import { useAppState } from '../state/context'
import { calculateShiftLayout } from '../domain/shiftLayout'
import { ShiftBlock } from './ShiftBlock'

type DragBase = {
  previewStart: number
  previewEnd: number
}

type Drag =
  | (DragBase & {
      mode: 'create'
      anchor: number
    })
  | (DragBase & {
      mode: 'move'
      shiftId: string
      duration: number
      originalStart: number
      startY: number
    })
  | (DragBase & {
      mode: 'resizeStart'
      shiftId: string
      opposite: number
    })
  | (DragBase & {
      mode: 'resizeEnd'
      shiftId: string
      opposite: number
    })

type Props = {
  day: DayId
  hours: DayHours
  shifts: Shift[]
  workers: Worker[]
  activeWorkerId: string
  minOpen: number
  step: number
  cellHeight: number
  rows: number
}

/** Row (cell index) corresponding to a pixel offset. */
function cellIndex(offsetY: number, cellHeight: number): number {
  return Math.floor(offsetY / cellHeight)
}

/** Start minute of cell `index`, counted from the global time axis. */
function minuteFromIndex(index: number, minOpen: number, step: number): number {
  return minOpen + index * step
}

export function DayColumn({
  day,
  hours,
  shifts,
  workers,
  activeWorkerId,
  minOpen,
  step,
  cellHeight,
  rows,
}: Props) {
  const { dispatch } = useAppState()
  const [drag, setDrag] = useState<Drag | null>(null)

  const workersById = useMemo(
    () => new Map(workers.map((worker) => [worker.id, worker])),
    [workers],
  )

  const shiftLayout = useMemo(
    () => calculateShiftLayout(shifts),
    [shifts],
  )

  // Escape cancels the drag in progress without applying any change.
  useEffect(() => {
    if (!drag) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDrag(null)
      }
    }

    window.addEventListener('keydown', handleKey)

    return () => window.removeEventListener('keydown', handleKey)
  }, [drag])

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-drag-role]')
    const y = event.clientY - event.currentTarget.getBoundingClientRect().top

    if (target) {
      const shiftId = target.dataset.shiftId as string
      const shift = shifts.find((s) => s.id === shiftId)

      if (!shift) return

      event.currentTarget.setPointerCapture(event.pointerId)

      switch (target.dataset.dragRole) {
        case 'move':
          setDrag({
            mode: 'move',
            shiftId,
            duration: shift.end - shift.start,
            originalStart: shift.start,
            startY: y,
            previewStart: shift.start,
            previewEnd: shift.end,
          })
          break

        case 'resize-start':
          setDrag({
            mode: 'resizeStart',
            shiftId,
            opposite: shift.end,
            previewStart: shift.start,
            previewEnd: shift.end,
          })
          break

        case 'resize-end':
          setDrag({
            mode: 'resizeEnd',
            shiftId,
            opposite: shift.start,
            previewStart: shift.start,
            previewEnd: shift.end,
          })
          break
      }

      return
    }

    // Empty background: creates a shift for the selected worker.
    if (hours.closed) return

    const minute = minuteFromIndex(
      cellIndex(y, cellHeight),
      minOpen,
      step,
    )

    if (minute < hours.opens || minute >= hours.closes) return

    event.currentTarget.setPointerCapture(event.pointerId)

    setDrag({
      mode: 'create',
      anchor: minute,
      previewStart: minute,
      previewEnd: minute + step,
    })
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return

    const y = event.clientY - event.currentTarget.getBoundingClientRect().top

    if (drag.mode === 'create') {
      const current = minuteFromIndex(
        cellIndex(y, cellHeight),
        minOpen,
        step,
      )

      const start = Math.max(
        Math.min(drag.anchor, current),
        hours.opens,
      )

      const end = Math.min(
        Math.max(drag.anchor, current) + step,
        hours.closes,
      )

      if (end > start) {
        setDrag({
          ...drag,
          previewStart: start,
          previewEnd: end,
        })
      }

      return
    }

    if (drag.mode === 'move') {
      const deltaCells = Math.round(
        (y - drag.startY) / cellHeight,
      )

      let start =
        drag.originalStart + deltaCells * step

      let end = start + drag.duration

      if (start < hours.opens) {
        start = hours.opens
        end = start + drag.duration
      }

      if (end > hours.closes) {
        end = hours.closes
        start = end - drag.duration
      }

      setDrag({
        ...drag,
        previewStart: start,
        previewEnd: end,
      })

      return
    }

    const minute = minuteFromIndex(
      cellIndex(y, cellHeight),
      minOpen,
      step,
    )

    if (drag.mode === 'resizeEnd') {
      const end = Math.min(
        Math.max(minute + step, drag.opposite + step),
        hours.closes,
      )

      setDrag({
        ...drag,
        previewStart: drag.opposite,
        previewEnd: end,
      })
    } else {
      const start = Math.max(
        Math.min(minute, drag.opposite - step),
        hours.opens,
      )

      setDrag({
        ...drag,
        previewStart: start,
        previewEnd: drag.opposite,
      })
    }
  }

  function handlePointerUp() {
    if (!drag) return

    if (drag.mode === 'create') {
      dispatch({
        type: 'ADD_SHIFT',
        workerId: activeWorkerId,
        day,
        start: drag.previewStart,
        end: drag.previewEnd,
      })
    } else if (drag.mode === 'move') {
      const didMove =
        drag.previewStart !== drag.originalStart

      if (didMove) {
        dispatch({
          type: 'MOVE_SHIFT',
          id: drag.shiftId,
          start: drag.previewStart,
          end: drag.previewEnd,
        })
      }
    } else {
      dispatch({
        type: 'RESIZE_SHIFT',
        id: drag.shiftId,
        start: drag.previewStart,
        end: drag.previewEnd,
      })
    }

    setDrag(null)
  }

  const draggedId =
    drag && drag.mode !== 'create'
      ? drag.shiftId
      : null

  return (
    <div
      className="relative touch-none select-none"
      style={{ height: rows * cellHeight }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      <div className="absolute inset-0 flex flex-col">
        {Array.from({ length: rows }, (_, index) => {
          const minute = minuteFromIndex(index, minOpen, step)

          const withinHours =
            !hours.closed &&
            minute >= hours.opens &&
            minute < hours.closes

          const onTheHour = minute % 60 === 0

          return (
            <div
              key={minute}
              style={{ height: cellHeight }}
              className={`border-b ${
                onTheHour
                  ? 'border-slate-300'
                  : 'border-slate-100'
              } ${
                withinHours
                  ? 'bg-white'
                  : 'bg-slate-100'
              }`}
            />
          )
        })}
      </div>

      {hours.closed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-400">
          Closed
        </div>
      )}

      {shiftLayout
        .filter(({ shift }) => shift.id !== draggedId)
        .map(({ shift, left, width }) => {
          const worker = workersById.get(shift.workerId)

          if (!worker) return null

          return (
            <ShiftBlock
              key={shift.id}
              shift={shift}
              color={worker.color}
              workerName={worker.name}
              top={
                ((shift.start - minOpen) / step) *
                cellHeight
              }
              height={
                ((shift.end - shift.start) / step) *
                cellHeight
              }
              left={left}
              width={width}
            />
          )
        })}

      {drag && (
        <div
          className="pointer-events-none absolute inset-x-0.5 rounded-md border-2 border-dashed border-sky-500 bg-sky-200/60"
          style={{
            top:
              ((drag.previewStart - minOpen) /
                step) *
              cellHeight,
            height:
              ((drag.previewEnd -
                drag.previewStart) /
                step) *
              cellHeight,
          }}
        />
      )}
    </div>
  )
}
