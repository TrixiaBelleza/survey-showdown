import { useCountdown } from '../lib/useCountdown'
import { useGame } from '../store/gameStore'
import { ROUND_WARNING_MS } from '../types'

/**
 * Both readouts subscribe to the timer slice only, so the per-frame countdown
 * never re-renders the answer board or the host console around it.
 */

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

/** Team round clock — large MM:SS on Monitor 1 */
export function DisplayRoundTimer() {
  const roundTimer = useGame((s) => s.roundTimer)
  const { seconds, expired, paused, msRemaining } = useCountdown(roundTimer)
  const urgent = !expired && msRemaining > 0 && msRemaining <= ROUND_WARNING_MS

  if (!roundTimer.visible) return <div className="dsp-timer-slot dsp-round-slot" />
  return (
    <div
      className={`dsp-timer dsp-round-timer${expired ? ' expired' : paused ? ' paused' : urgent ? ' urgent' : ''}`}
    >
      {expired ? 'TIME!' : formatClock(seconds)}
    </div>
  )
}

export function HostRoundTimer() {
  const roundTimer = useGame((s) => s.roundTimer)
  const { seconds, expired, msRemaining } = useCountdown(roundTimer)
  const urgent = !expired && msRemaining > 0 && msRemaining <= ROUND_WARNING_MS
  const state = expired && roundTimer.visible ? ' expired' : !roundTimer.visible ? ' idle' : urgent ? ' urgent' : ''

  return (
    <div className={`timer-face round-face${state}`}>
      {roundTimer.visible && expired ? 'TIME!' : formatClock(seconds)}
    </div>
  )
}

/** Optional 5-second player buzz (host pacing only) */
export function HostTimer() {
  const timer = useGame((s) => s.timer)
  const { seconds, expired } = useCountdown(timer)
  const state = expired && timer.visible ? ' expired' : !timer.visible ? ' idle' : ''

  return <div className={`timer-face${state}`}>{timer.visible && expired ? 'TIME!' : seconds}</div>
}
