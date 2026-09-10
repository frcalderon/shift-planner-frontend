import { useState } from 'react'
import { StoreHoursPanel } from './components/StoreHoursPanel'
import { WeekGrid } from './components/WeekGrid'
import { WorkerList } from './components/WorkerList'
import { StateProvider, useAppState } from './state/context'

function Content() {
  const { state } = useAppState()
  const [activeWorkerId, setActiveWorkerId] = useState<string | null>(null)

  // If there's no selection or the selected worker no longer exists, fall back to the first available.
  const validSelection = state.workers.some((worker) => worker.id === activeWorkerId)
  const activeId = validSelection ? activeWorkerId : (state.workers[0]?.id ?? null)

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <h1 className="text-xl font-semibold text-slate-800">Shift Planner</h1>

        <div className="grid gap-4 md:grid-cols-2">
          <StoreHoursPanel />
          <WorkerList activeWorkerId={activeId} onSelect={setActiveWorkerId} />
        </div>

        <WeekGrid activeWorkerId={activeId} />
      </div>
    </div>
  )
}

function App() {
  return (
    <StateProvider>
      <Content />
    </StateProvider>
  )
}

export default App
