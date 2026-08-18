import type { GameState, Question, Round, Team } from '../types'
import { emptyRound } from '../data/sampleGame'

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

/** Cards that counted for this team (flips made while "Score on flip" was on). */
export function autoScore(state: GameState, teamId: string): number {
  const round = roundOf(state, teamId)
  return round.scoredRevealed?.length ?? round.revealed.length
}

export function scoreBonusOf(state: GameState, teamId: string): number {
  return state.scoreBonus?.[teamId] ?? 0
}

export function teamScore(state: GameState, teamId: string): number {
  const override = state.scoreOverrides[teamId]
  if (typeof override === 'number') return override
  return Math.max(0, autoScore(state, teamId) + scoreBonusOf(state, teamId))
}

/** Score is pinned to a typed number, so reveals no longer move it. */
export function isScoreManual(state: GameState, teamId: string): boolean {
  return typeof state.scoreOverrides[teamId] === 'number'
}

export function currentPlayerName(state: GameState, teamId: string | null): string | null {
  const team = teamById(state, teamId)
  const round = roundOf(state, teamId)
  return team?.players.find((p) => p.id === round.currentPlayerId)?.name ?? null
}

/** Soft prompt only: every answer is already revealed. Host ends the turn (timer / End Turn). */
export function turnShouldEnd(state: GameState, teamId: string | null): boolean {
  const team = teamById(state, teamId)
  const question = questionOfTeam(state, teamId)
  const round = roundOf(state, teamId)
  if (!team || !question) return false
  return question.answers.length > 0 && round.revealed.length >= question.answers.length
}

export type ResultsRow = {
  team: Team
  words: number
  rank: number
}

/** Sorted by words desc, then name. Ties share rank. */
export function resultsRows(state: GameState): ResultsRow[] {
  const rows = state.teams.map((team) => ({
    team,
    words: teamScore(state, team.id),
  }))
  rows.sort((a, b) => {
    if (b.words !== a.words) return b.words - a.words
    return a.team.name.localeCompare(b.team.name)
  })
  let lastWords: number | null = null
  let lastRank = 0
  return rows.map((row, i) => {
    const rank = row.words === lastWords ? lastRank : i + 1
    lastWords = row.words
    lastRank = rank
    return { ...row, rank }
  })
}

/** Team ids sharing the top score, when more than one team is on it (words only). */
export function tiedLeaderIds(state: GameState): string[] {
  const played = state.teams.filter(
    (t) => roundOf(state, t.id).started || isScoreManual(state, t.id) || scoreBonusOf(state, t.id) !== 0,
  )
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
