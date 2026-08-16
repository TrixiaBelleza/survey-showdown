type Cue = 'reveal' | 'tick' | 'time' | 'start' | 'win' | 'undo'

let ctx: AudioContext | null = null
let enabled = true

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setSoundEnabled(on: boolean) {
  enabled = on
}

/** Browsers need a user gesture before audio can start. */
export function unlockAudio() {
  audio()
}

function tone(freq: number, start: number, duration: number, gain: number, type: OscillatorType = 'sine') {
  const ac = audio()
  if (!ac) return
  const osc = ac.createOscillator()
  const amp = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ac.currentTime + start)
  amp.gain.setValueAtTime(0.0001, ac.currentTime + start)
  amp.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.02)
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration)
  osc.connect(amp).connect(ac.destination)
  osc.start(ac.currentTime + start)
  osc.stop(ac.currentTime + start + duration + 0.05)
}

export function play(cue: Cue) {
  if (!enabled) return
  switch (cue) {
    case 'reveal':
      tone(660, 0, 0.16, 0.22, 'triangle')
      tone(990, 0.07, 0.22, 0.18, 'triangle')
      break
    case 'undo':
      tone(300, 0, 0.14, 0.16, 'sine')
      tone(200, 0.08, 0.18, 0.12, 'sine')
      break
    case 'tick':
      tone(880, 0, 0.06, 0.1, 'square')
      break
    case 'time':
      tone(180, 0, 0.55, 0.28, 'sawtooth')
      tone(140, 0.05, 0.6, 0.22, 'square')
      break
    case 'start':
      tone(520, 0, 0.12, 0.16, 'triangle')
      tone(780, 0.1, 0.16, 0.14, 'triangle')
      break
    case 'win':
      [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.3, 0.2, 'triangle'))
      break
  }
}
