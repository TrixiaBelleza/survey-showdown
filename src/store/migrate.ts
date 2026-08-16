import type { GameState, Round } from '../types'
import { ROUND_DURATION_MS, TIMER_MS } from '../types'
import { emptyTimer } from '../data/sampleGame'

function migrateRound(raw: Partial<Round> | undefined): Round {
  const revealed = raw?.revealed ?? []
  const revealElapsedMs = raw?.revealElapsedMs ?? []
  // Keep arrays aligned if an old save has fewer elapsed entries than reveals.
  while (revealElapsedMs.length < revealed.length) revealElapsedMs.push(0)
  const trimmed = revealElapsedMs.slice(0, revealed.length)
  return {
    revealed: [...revealed],
    revealElapsedMs: trimmed,
    lastRevealElapsedMs:
      typeof raw?.lastRevealElapsedMs === 'number'
        ? raw.lastRevealElapsedMs
        : trimmed.length > 0
          ? trimmed[trimmed.length - 1]!
          : null,
    turnStartedAt: typeof raw?.turnStartedAt === 'number' ? raw.turnStartedAt : null,
    rotation: raw?.rotation ?? 1,
    currentPlayerId: raw?.currentPlayerId ?? null,
    guesses: raw?.guesses ?? 0,
    started: raw?.started ?? false,
    ended: raw?.ended ?? false,
  }
}

/** Fill in fields added after v1 so old localStorage still loads cleanly. */
export function migrateState(raw: Partial<GameState> & Pick<GameState, 'teams' | 'questions'>): GameState {
  const duration = typeof raw.roundDurationMs === 'number' ? raw.roundDurationMs : ROUND_DURATION_MS
  const roundsIn = raw.rounds ?? {}
  const rounds: Record<string, Round> = {}
  for (const [id, r] of Object.entries(roundsIn)) {
    rounds[id] = migrateRound(r)
  }
  // If mid-tiebreaker in an old save, drop back to lobby/scoreboard-friendly state.
  let phase = raw.phase ?? 'lobby'
  if (phase === 'tiebreaker') phase = 'lobby'

  return {
    gameName: raw.gameName ?? 'Survey Showdown',
    teams: raw.teams,
    questions: raw.questions,
    rounds,
    scoreOverrides: raw.scoreOverrides ?? {},
    phase,
    activeTeamId: raw.activeTeamId ?? null,
    timer: raw.timer ?? emptyTimer(TIMER_MS),
    roundTimer: raw.roundTimer ?? emptyTimer(duration),
    roundDurationMs: duration,
    tiebreaker: {
      active: false,
      questionId: raw.tiebreaker?.questionId ?? null,
      teamIds: [],
      revealed: [],
      currentTeamId: null,
      currentPlayerId: null,
      winnerTeamId: null,
    },
    showScores: raw.showScores ?? false,
    showRosters: raw.showRosters ?? false,
    showResultsBoard: raw.showResultsBoard ?? false,
    soundOn: raw.soundOn ?? true,
    trialMode: raw.trialMode ?? false,
    trialSnapshot: raw.trialSnapshot ?? null,
  }
}
