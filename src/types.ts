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
  /** rank 1 = most common survey answer (display order). */
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
  /** Subset of `revealed` that counts toward the team's score (excludes STEAL show-board flips) */
  scoredRevealed: string[]
  /** @deprecated unused — kept for old localStorage saves */
  revealElapsedMs: number[]
  /** @deprecated unused — kept for old localStorage saves */
  lastRevealElapsedMs: number | null
  /** @deprecated unused — kept for old localStorage saves */
  turnStartedAt: number | null
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
  /** timer widget is on screen */
  visible: boolean
}

/** Legacy stub kept so old localStorage saves still migrate. */
export type TiebreakerState = {
  active: boolean
  questionId: string | null
  teamIds: string[]
  revealed: string[]
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

/** Snapshot used to restore the real game after Trial Mode. */
export type TrialSnapshot = {
  teams: Team[]
  questions: Question[]
  rounds: Record<string, Round>
  scoreOverrides: Record<string, number | null>
  scoreBonus: Record<string, number>
  phase: Phase
  activeTeamId: string | null
  tiebreaker: TiebreakerState
  showScores: boolean
  showResultsBoard: boolean
  gameName: string
}

export type GameState = {
  gameName: string
  teams: Team[]
  questions: Question[]
  rounds: Record<string, Round>
  /** pinned score per team id; null/undefined = use revealed count + bonus */
  scoreOverrides: Record<string, number | null>
  /** additive adjustment per team id (STEAL / bonus); reveals keep counting on top of it */
  scoreBonus: Record<string, number>
  phase: Phase
  activeTeamId: string | null
  /** optional 5-second per-player buzz (host pacing aid) */
  timer: TimerState
  /** team turn clock — shown on Monitor 1 */
  roundTimer: TimerState
  /** configured length for each team turn (default 2:30) */
  roundDurationMs: number
  /** Legacy stub for old saves — UI no longer drives a ★ #1 tiebreaker */
  tiebreaker: TiebreakerState
  /** show the scoreboard overlay on Monitor 1 */
  showScores: boolean
  /** show every team's roster on Monitor 1 */
  showRosters: boolean
  /** show the results table on Monitor 1 */
  showResultsBoard: boolean
  /**
   * When true, flipping a card adds to the team's score.
   * Turn off for STEAL / show-remaining so cards appear without awarding points.
   */
  scoreOnReveal: boolean
  soundOn: boolean
  trialMode: boolean
  trialSnapshot: TrialSnapshot | null
}

export const ANSWERS_PER_QUESTION = 10
export const TIMER_MS = 5000
/** Default team turn length: 2 minutes 30 seconds */
export const ROUND_DURATION_MS = 150_000
/** Play a warning sound when the round clock reaches this many ms remaining */
export const ROUND_WARNING_MS = 10_000

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