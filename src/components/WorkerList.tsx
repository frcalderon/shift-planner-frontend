import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { formatHours } from '../domain/time'
import { useAppState } from '../state/context'

type Props = {
  activeWorkerId: string | null
  onSelect: (id: string) => void
}

export function WorkerList({
  activeWorkerId,
  onSelect,
}: Props) {
  const { state, dispatch } = useAppState()

  const [newName, setNewName] = useState('')
  const [newContractHours, setNewContractHours] =
    useState('')
  const [editingId, setEditingId] = useState<string | null>(
    null,
  )
  const [editName, setEditName] = useState('')

  const activeWorker = useMemo(
    () =>
      state.workers.find(
        (worker) =>
          worker.id === activeWorkerId,
      ) ?? null,
    [state.workers, activeWorkerId],
  )

  const assignedMinutes = useMemo(() => {
    if (!activeWorker) return 0

    return state.shifts
      .filter(
        (shift) =>
          shift.workerId === activeWorker.id,
      )
      .reduce(
        (total, shift) =>
          total + (shift.end - shift.start),
        0,
      )
  }, [state.shifts, activeWorker])

  const contractMinutes = activeWorker?.contractHours
    ? activeWorker.contractHours * 60
    : null

  const remainingMinutes =
    contractMinutes !== null
      ? Math.max(contractMinutes - assignedMinutes, 0)
      : null

  function addWorker(event: FormEvent) {
    event.preventDefault()

    const name = newName.trim()

    if (!name) return

    const contractHours = newContractHours
      ? Number(newContractHours)
      : undefined

    dispatch({
      type: 'ADD_WORKER',
      name,
      contractHours,
    })

    setNewName('')
    setNewContractHours('')
  }

  function startEditing(
    id: string,
    currentName: string,
  ) {
    setEditingId(id)
    setEditName(currentName)
  }

  function confirmEditing(id: string) {
    const name = editName.trim()

    if (name) {
      dispatch({
        type: 'RENAME_WORKER',
        id,
        name,
      })
    }

    setEditingId(null)
  }

  function handleEditKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    id: string,
  ) {
    if (event.key === 'Enter') {
      confirmEditing(id)
    }

    if (event.key === 'Escape') {
      setEditingId(null)
    }
  }

  function removeWorker(
    id: string,
    name: string,
  ) {
    if (
      !confirm(
        `Delete ${name}? Their shifts will also be removed.`,
      )
    ) {
      return
    }

    dispatch({
      type: 'DELETE_WORKER',
      id,
    })

    if (activeWorkerId === id) {
      const remaining = state.workers.find(
        (worker) => worker.id !== id,
      )

      if (remaining) {
        onSelect(remaining.id)
      }
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">
        Workers
      </h2>

      <ul className="mb-3 space-y-1">
        {state.workers.map((worker) => (
          <li key={worker.id}>
            <div
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                worker.id === activeWorkerId
                  ? 'bg-sky-50 ring-1 ring-sky-300'
                  : 'hover:bg-slate-50'
              }`}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: worker.color,
                }}
                aria-hidden
              />

              {editingId === worker.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(event) =>
                    setEditName(event.target.value)
                  }
                  onBlur={() =>
                    confirmEditing(worker.id)
                  }
                  onKeyDown={(event) =>
                    handleEditKeyDown(
                      event,
                      worker.id,
                    )
                  }
                  className="flex-1 rounded border border-slate-300 px-1.5 py-0.5"
                />
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onSelect(worker.id)
                  }
                  onDoubleClick={() =>
                    startEditing(
                      worker.id,
                      worker.name,
                    )
                  }
                  className="flex-1 truncate text-left text-slate-700"
                  title="Click to select, double-click to rename"
                >
                  {worker.name}

                  {worker.contractHours ? (
                    <span className="ml-1 text-xs text-slate-400">
                      ({worker.contractHours}h)
                    </span>
                  ) : null}
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  removeWorker(
                    worker.id,
                    worker.name,
                  )
                }
                className="shrink-0 text-slate-400 hover:text-red-600"
                aria-label={`Delete ${worker.name}`}
              >
                ×
              </button>
            </div>
          </li>
        ))}

        {state.workers.length === 0 && (
          <li className="text-sm text-slate-400">
            No workers yet.
          </li>
        )}
      </ul>

      {activeWorker && (
        <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: activeWorker.color,
              }}
              aria-hidden
            />

            <span className="text-xs font-semibold text-slate-600">
              Summary for {activeWorker.name}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                Assigned
              </div>
              <div className="text-sm font-semibold text-slate-700">
                {formatHours(assignedMinutes)}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                Contract
              </div>
              <div className="text-sm font-semibold text-slate-700">
                {contractMinutes !== null
                  ? formatHours(contractMinutes)
                  : '—'}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                Remaining
              </div>
              <div
                className={`text-sm font-semibold ${
                  remainingMinutes === null
                    ? 'text-slate-400'
                    : remainingMinutes > 0
                      ? 'text-amber-600'
                      : 'text-green-600'
                }`}
              >
                {remainingMinutes !== null
                  ? formatHours(remainingMinutes)
                  : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={addWorker}
        className="flex items-center gap-2"
      >
        <input
          value={newName}
          onChange={(event) =>
            setNewName(event.target.value)
          }
          placeholder="Name"
          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />

        <input
          value={newContractHours}
          onChange={(event) =>
            setNewContractHours(event.target.value)
          }
          placeholder="Hours"
          type="number"
          min={0}
          step={0.5}
          className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
          aria-label="Contract hours (optional)"
        />

        <button
          type="submit"
          className="shrink-0 rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700"
        >
          Add
        </button>
      </form>
    </section>
  )
}
