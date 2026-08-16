import { useCountdown } from '../lib/useCountdown'
import { useGame } from '../store/gameStore'

/**
 * Both readouts subscribe to the timer slice only, so the per-frame countdown
 * never re-renders the answer board or the host console around it.
 */

export function DisplayTimer() {
  const timer = useGame((s) => s.timer)
  const { seconds, expired, paused } = useCountdown(timer)

  if (!timer.visible) return <div className="dsp-timer-slot" />
  return <div className={`dsp-timer${expired ? ' expired' : paused ? ' paused' : ' tick'}`}>{expired ? 'TIME!' : seconds}</div>
}

export function HostTimer() {
  const timer = useGame((s) => s.timer)
  const { seconds, expired } = useCountdown(timer)
  const state = expired && timer.visible ? ' expired' : !timer.visible ? ' idle' : ''

  return <div className={`timer-face${state}`}>{timer.visible && expired ? 'TIME!' : seconds}</div>
}
