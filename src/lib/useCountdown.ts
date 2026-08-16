import { useEffect, useState } from 'react'
import type { TimerState } from '../types'

export type Countdown = {
  /** whole seconds remaining, 0 when expired */
  seconds: number
  msRemaining: number
  running: boolean
  paused: boolean
  expired: boolean
}

/**
 * Derives the countdown locally from the shared `endsAt` timestamp, so both
 * windows animate smoothly without broadcasting every tick.
 */
export function useCountdown(timer: TimerState): Countdown {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!timer.endsAt) return
    const sync = () => setNow(Date.now())
    sync()
    // an interval (not rAF) keeps counting when the window sits behind Teams,
    // and the visibility listener resyncs the instant it comes back to front
    const interval = window.setInterval(sync, 100)
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [timer.endsAt])

  if (timer.endsAt) {
    const msRemaining = Math.max(0, timer.endsAt - now)
    return {
      msRemaining,
      seconds: Math.ceil(msRemaining / 1000),
      running: msRemaining > 0,
      paused: false,
      expired: msRemaining === 0,
    }
  }

  if (timer.pausedMs !== null) {
    return {
      msRemaining: timer.pausedMs,
      seconds: Math.ceil(timer.pausedMs / 1000),
      running: false,
      paused: true,
      expired: timer.pausedMs === 0,
    }
  }

  return {
    msRemaining: timer.durationMs,
    seconds: Math.ceil(timer.durationMs / 1000),
    running: false,
    paused: false,
    expired: false,
  }
}
