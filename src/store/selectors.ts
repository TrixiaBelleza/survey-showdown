import type { GameState, Question, Round, Team } from '../types'
import { emptyRound } from '../data/sampleGame'
import { ROTATION_LIMIT } from '../types'

export function roundOf(state: GameState, teamId: string | null): Round {
  if (!teamId) return emptyRound()
  return state.rounds[teamId] ?? emptyRound()
}

export function teamById(state: GameState, teamId: string | null): Team | null {
  return state.teams.find((t) => t.id === teamId) ?? null
}

export function questionOfTeam(state: GameState, teamId: string | null): Question | null {
  const team = teamById(state, teamId)
  if (!team) return null
  return state.questions.find((q) => q.id === team.questionId) ?? null
}

export function teamScore(state: GameState, teamId: string): number {
  const override = state.scoreOverrides[teamId]
  if (typeof override === 'number') return override
  return roundOf(state, teamId).revealed.length
}

export function isScoreManual(state: GameState, teamId: string): boolean {
  return typeof state.scoreOverrides[teamId] === 'number'
}

export function currentPlayerName(state: GameState, teamId: string | null): string | null {
  const team = teamById(state, teamId)
  const round = roundOf(state, teamId)
  return team?.players.find((p) => p.id === round.currentPlayerId)?.name ?? null
}

/** Turn is over per the rules: every answer revealed, or both rotations used up. */
export function turnShouldEnd(state: GameState, teamId: string | null): boolean {
  const team = teamById(state, teamId)
  const question = questionOfTeam(state, teamId)
  const round = roundOf(state, teamId)
  if (!team || !question) return false
  const allRevealed = question.answers.length > 0 && round.revealed.length >= question.answers.length
  const rotationsDone = round.rotation > ROTATION_LIMIT
  return allRevealed || rotationsDone
}

export function maxGuesses(state: GameState, teamId: string | null): number {
  const team = teamById(state, teamId)
  return (team?.players.length ?? 0) * ROTATION_LIMIT
}

/** Team ids sharing the top score, when more than one team is on it. */
export function tiedLeaderIds(state: GameState): string[] {
  const played = state.teams.filter((t) => roundOf(state, t.id).started || typeof state.scoreOverrides[t.id] === 'number')
  const pool = played.length > 0 ? played : state.teams
  if (pool.length < 2) return []
  const top = Math.max(...pool.map((t) => teamScore(state, t.id)))
  const leaders = pool.filter((t) => teamScore(state, t.id) === top)
  return leaders.length > 1 ? leaders.map((t) => t.id) : []
}

export function rankedTeams(state: GameState): { team: Team; score: number; rank: number }[] {
  const rows = state.teams
    .map((team) => ({ team, score: teamScore(state, team.id) }))
    .sort((a, b) => b.score - a.score)
  let lastScore: number | null = null
  let lastRank = 0
  return rows.map((row, i) => {
    const rank = row.score === lastScore ? lastRank : i + 1
    lastScore = row.score
    lastRank = rank
    return { ...row, rank }
  })
}
