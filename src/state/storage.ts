import type { AppState } from '../domain/types'

const STORAGE_KEY = 'shift-planner:state'
const SUPPORTED_VERSION = 1

/** Loads the state from localStorage. Returns `null` if there is nothing,
 * it's corrupted, or it belongs to a version this app can't migrate yet. */
export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as AppState
    if (data.version !== SUPPORTED_VERSION) return null
    return data
  } catch {
    return null
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage can fail (private mode, quota exceeded); ignored in the MVP.
  }
}

export function clearSavedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
