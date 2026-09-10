import { formatHours, minutesToTime } from '../domain/time'
import type { Shift } from '../domain/types'
import { useAppState } from '../state/context'

type Props = {
  shift: Shift
  color: string
  workerName: string
  top: number
  height: number
  left: number
  width: number
  dimmed?: boolean
}

/**
 * Visual block for a shift within a day column.
 *
 * The whole block lets you move the shift, and its edges let you resize
 * it. Deletion happens via the X button.
 */
export function ShiftBlock({
  shift,
  color,
  workerName,
  top,
  height,
  left,
  width,
  dimmed = false,
}: Props) {
  const { dispatch } = useAppState()
  const compact = height < 42

  function removeShift(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    dispatch({ type: 'DELETE_SHIFT', id: shift.id })
  }

  return (
    <div
      className={`absolute flex touch-none cursor-move flex-col overflow-hidden rounded-md px-1.5 py-1 text-white shadow-sm select-none ${
        dimmed ? 'opacity-40' : ''
      }`}
      style={{
        top,
        height,
        left: `${left}%`,
        width: `${width}%`,
        backgroundColor: color,
      }}
      data-drag-role="move"
      data-shift-id={shift.id}
    >
      <div
        className="absolute inset-x-0 top-0 h-2 cursor-ns-resize"
        data-drag-role="resize-start"
        data-shift-id={shift.id}
      />

      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={removeShift}
        className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/20 text-[11px] leading-none text-white hover:bg-black/40"
        aria-label={`Delete shift for ${workerName}`}
        title="Delete shift"
      >
        ×
      </button>

      <span className="pointer-events-none truncate pr-4 text-[11px] leading-tight font-semibold">
        {workerName}
      </span>

      <span className="pointer-events-none truncate text-[10px] leading-tight">
        {minutesToTime(shift.start)} – {minutesToTime(shift.end)}
      </span>

      {!compact && (
        <span className="pointer-events-none truncate text-[10px] leading-tight opacity-80">
          {formatHours(shift.end - shift.start)}
        </span>
      )}

      <div
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
        data-drag-role="resize-end"
        data-shift-id={shift.id}
      />
    </div>
  )
}
