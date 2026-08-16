import type { GameState } from '../types'
import { useGame } from './gameStore'
import type { Store } from './gameStore'

const STORAGE_KEY = 'survey-showdown:state:v1'
const CHANNEL_NAME = 'survey-showdown'

type Message = { type: 'state'; state: GameState; from: string } | { type: 'hello'; from: string }

const windowId = Math.random().toString(36).slice(2)

/** true while a remote update is being applied, so we do not echo it back */
let applyingRemote = false

function strip(state: Store): GameState {
  const { actions: _actions, ...rest } = state
  return rest as GameState
}

function loadPersisted(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    if (!parsed || !Array.isArray(parsed.teams) || !Array.isArray(parsed.questions)) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Wires localStorage persistence plus BroadcastChannel mirroring so the Host
 * Control and Game Display windows always render the same game state.
 */
export function initSync(): () => void {
  const persisted = loadPersisted()
  if (persisted) {
    applyingRemote = true
    useGame.getState().actions.hydrate(persisted)
    applyingRemote = false
  }

  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null

  const publish = (state: Store) => {
    const plain = strip(state)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plain))
    } catch {
      /* storage full or blocked: in-memory state still works */
    }
    channel?.postMessage({ type: 'state', state: plain, from: windowId } satisfies Message)
  }

  const unsubscribe = useGame.subscribe((state) => {
    if (applyingRemote) return
    publish(state)
  })

  if (channel) {
    channel.onmessage = (event: MessageEvent<Message>) => {
      const msg = event.data
      if (!msg || msg.from === windowId) return
      if (msg.type === 'hello') {
        publish(useGame.getState())
        return
      }
      applyingRemote = true
      useGame.getState().actions.hydrate(msg.state)
      applyingRemote = false
    }
    channel.postMessage({ type: 'hello', from: windowId } satisfies Message)
  }

  // localStorage events are the fallback when BroadcastChannel is unavailable
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return
    try {
      const next = JSON.parse(event.newValue) as GameState
      applyingRemote = true
      useGame.getState().actions.hydrate(next)
      applyingRemote = false
    } catch {
      /* ignore malformed payloads */
    }
  }
  window.addEventListener('storage', onStorage)

  return () => {
    unsubscribe()
    channel?.close()
    window.removeEventListener('storage', onStorage)
  }
}

export function clearPersisted() {
  localStorage.removeItem(STORAGE_KEY)
}
