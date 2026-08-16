export type Player = {
  id: string
  name: string
}

export type Team = {
  id: string
  name: string
  color: string
  players: Player[]
  questionId: string | null
}

export type Answer = {
  id: string
  text: string
  /** rank 1 = most common survey answer. Used to decide the tiebreaker. */
  rank: number
  note?: string
}

export type Question = {
  id: string
  text: string
  category?: string
  answers: Answer[]
}

/** Per-team turn state. */
export type Round = {
  /** answer ids in the order they were revealed (last item = undo target) */
  revealed: string[]
  rotation: number
  currentPlayerId: string | null
  /** how many player turns have been used in this round */
  guesses: number
  started: boolean
  ended: boolean
}

export type TimerState = {
  durationMs: number
  /** epoch ms when the timer hits zero, null when not running */
  endsAt: number | null
  /** ms left while paused, null when not paused */
  pausedMs: number | null
  /** timer widget is on screen (host started it at least once this turn) */
  visible: boolean
}

export type TiebreakerState = {
  active: boolean
  questionId: string | null
  teamIds: string[]
  revealed: string[]
  /** which answer id was the winning #1 reveal */
  currentTeamId: string | null
  currentPlayerId: string | null
  winnerTeamId: string | null
}

export type Phase =
  | 'lobby'
  | 'team-turn'
  | 'team-summary'
  | 'tiebreaker'
  | 'game-over'

export type GameState = {
  gameName: string
  teams: Team[]
  questions: Question[]
  rounds: Record<string, Round>
  /** manual score override per team id; null/undefined = use revealed count */
  scoreOverrides: Record<string, number | null>
  phase: Phase
  activeTeamId: string | null
  timer: TimerState
  tiebreaker: TiebreakerState
  /** show the scoreboard overlay on Monitor 1 */
  showScores: boolean
  soundOn: boolean
}

export const ROTATION_LIMIT = 2
export const ANSWERS_PER_QUESTION = 10
export const TIMER_MS = 5000

export const TEAM_COLORS: { name: string; value: string }[] = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Pink', value: '#ec4899' },
]
