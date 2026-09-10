import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import type { AppState } from '../domain/types'
import { INITIAL_STATE, reducer, type Action } from './reducer'
import { loadState, saveState } from './storage'

type StateContextValue = {
  state: AppState
  dispatch: Dispatch<Action>
}

const StateContext = createContext<StateContextValue | null>(null)

function initialize(): AppState {
  return loadState() ?? INITIAL_STATE
}

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialize)

  // Auto-save with a small debounce so we don't write on every keystroke/drag.
  useEffect(() => {
    const timer = setTimeout(() => saveState(state), 300)
    return () => clearTimeout(timer)
  }, [state])

  return <StateContext.Provider value={{ state, dispatch }}>{children}</StateContext.Provider>
}

export function useAppState(): StateContextValue {
  const context = useContext(StateContext)
  if (!context) throw new Error('useAppState must be used within <StateProvider>')
  return context
}
