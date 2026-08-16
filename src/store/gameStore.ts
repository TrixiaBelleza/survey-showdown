import { create } from 'zustand'
import type { GameState, Player, Question, Team, TrialSnapshot } from '../types'
import { ANSWERS_PER_QUESTION, TEAM_COLORS, TIMER_MS } from '../types'
import { createSampleState, emptyRound, emptyTimer, TRIAL_QUESTIONS } from '../data/sampleGame'
import { buildRandomTeams } from '../lib/generateTeams'
import { migrateState } from './migrate'
import { uid } from '../lib/id'

type Patch<T> = Partial<T>

export type Actions = {
  setGameName: (name: string) => void
  setRoundDurationMs: (ms: number) => void
  addTeam: () => void
  updateTeam: (teamId: string, patch: Patch<Team>) => void
  removeTeam: (teamId: string) => void
  moveTeam: (teamId: string, dir: -1 | 1) => void
  addPlayer: (teamId: string, name: string) => void
  updatePlayer: (teamId: string, playerId: string, patch: Patch<Player>) => void
  removePlayer: (teamId: string, playerId: string) => void
  movePlayer: (teamId: string, playerId: string, dir: -1 | 1) => void
  assignQuestion: (teamId: string, questionId: string | null) => void
  generateTeams: (names: string[], teamCount: number, teamLabels?: string[]) => void

  addQuestion: () => string
  updateQuestion: (questionId: string, patch: Patch<Question>) => void
  duplicateQuestion: (questionId: string) => void
  removeQuestion: (questionId: string) => void
  updateAnswer: (questionId: string, answerId: string, patch: { text?: string; note?: string }) => void
  moveAnswer: (questionId: string, answerId: string, dir: -1 | 1) => void

  setActiveTeam: (teamId: string | null) => void
  startTeam: (teamId: string) => void
  selectPlayer: (playerId: string) => void
  nextPlayer: () => void
  nextRotation: () => void
  toggleReveal: (answerId: string) => void
  undoLastReveal: () => void
  resetBoard: (teamId: string) => void
  endTeamTurn: () => void
  nextTeam: () => void
  backToLobby: () => void
  endGame: () => void
  resetGameProgress: () => void
  resetEverything: () => void

  setScoreOverride: (teamId: string, value: number | null) => void
  bumpScore: (teamId: string, delta: number) => void
  setShowScores: (show: boolean) => void
  setShowRosters: (show: boolean) => void
  setShowResultsBoard: (show: boolean) => void
  toggleSound: () => void

  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
  hideTimer: () => void

  startRoundTimer: () => void
  pauseRoundTimer: () => void
  resetRoundTimer: () => void

  enterTrialMode: () => void
  exitTrialMode: () => void

  hydrate: (state: GameState) => void
}

export type Store = GameState & { actions: Actions }

function ensureRound(state: GameState, teamId: string) {
  if (!state.rounds[teamId]) state.rounds[teamId] = emptyRound()
  return state.rounds[teamId]
}

function clearedTimer(durationMs: number) {
  return emptyTimer(durationMs)
}

function snapshotForTrial(state: GameState): TrialSnapshot {
  return {
    teams: state.teams.map((t) => ({ ...t, players: t.players.map((p) => ({ ...p })) })),
    questions: state.questions.map((q) => ({ ...q, answers: q.answers.map((a) => ({ ...a })) })),
    rounds: Object.fromEntries(
      Object.entries(state.rounds).map(([k, v]) => [
        k,
        { ...v, revealed: [...v.revealed], revealElapsedMs: [...(v.revealElapsedMs ?? [])] },
      ]),
    ),
    scoreOverrides: { ...state.scoreOverrides },
    phase: state.phase,
    activeTeamId: state.activeTeamId,
    tiebreaker: {
      ...state.tiebreaker,
      teamIds: [...state.tiebreaker.teamIds],
      revealed: [...state.tiebreaker.revealed],
    },
    showScores: state.showScores,
    showResultsBoard: state.showResultsBoard,
    gameName: state.gameName,
  }
}

function elapsedNow(round: { turnStartedAt: number | null }, roundTimer: GameState['roundTimer'], roundDurationMs: number): number {
  if (round.turnStartedAt) return Math.max(0, Date.now() - round.turnStartedAt)
  // Fallback if turnStartedAt missing (old mid-turn save): infer from round clock.
  if (roundTimer.endsAt) return Math.max(0, roundDurationMs - Math.max(0, roundTimer.endsAt - Date.now()))
  if (typeof roundTimer.pausedMs === 'number') return Math.max(0, roundDurationMs - roundTimer.pausedMs)
  return 0
}

function syncLastReveal(round: { revealElapsedMs: number[]; lastRevealElapsedMs: number | null }) {
  round.lastRevealElapsedMs =
    round.revealElapsedMs.length > 0 ? round.revealElapsedMs[round.revealElapsedMs.length - 1]! : null
}

export const useGame = create<Store>()((set, get) => {
  const mutate = (fn: (draft: GameState) => void) =>
    set((prev) => {
      const draft: GameState = {
        ...prev,
        teams: prev.teams.map((t) => ({ ...t, players: [...t.players] })),
        questions: prev.questions.map((q) => ({ ...q, answers: [...q.answers] })),
        rounds: Object.fromEntries(
          Object.entries(prev.rounds).map(([k, v]) => [
            k,
            { ...v, revealed: [...v.revealed], revealElapsedMs: [...(v.revealElapsedMs ?? [])] },
          ]),
        ),
        scoreOverrides: { ...prev.scoreOverrides },
        timer: { ...prev.timer },
        roundTimer: { ...prev.roundTimer },
        tiebreaker: { ...prev.tiebreaker, teamIds: [...prev.tiebreaker.teamIds], revealed: [...prev.tiebreaker.revealed] },
        trialSnapshot: prev.trialSnapshot,
      }
      fn(draft)
      return draft
    })

  return {
    ...createSampleState(),
    actions: {
      setGameName: (name) => mutate((d) => void (d.gameName = name)),

      setRoundDurationMs: (ms) =>
        mutate((d) => {
          const clamped = Math.max(30_000, Math.min(30 * 60_000, Math.round(ms)))
          d.roundDurationMs = clamped
          if (!d.roundTimer.endsAt) {
            d.roundTimer = {
              ...d.roundTimer,
              durationMs: clamped,
              pausedMs: d.roundTimer.visible ? clamped : null,
            }
          } else {
            d.roundTimer = { ...d.roundTimer, durationMs: clamped }
          }
        }),

      addTeam: () =>
        mutate((d) => {
          const color = TEAM_COLORS[d.teams.length % TEAM_COLORS.length].value
          const id = uid('team')
          d.teams.push({ id, name: `Team ${d.teams.length + 1}`, color, players: [], questionId: null })
          d.rounds[id] = emptyRound()
        }),

      updateTeam: (teamId, patch) =>
        mutate((d) => {
          const t = d.teams.find((x) => x.id === teamId)
          if (t) Object.assign(t, patch)
        }),

      removeTeam: (teamId) =>
        mutate((d) => {
          d.teams = d.teams.filter((t) => t.id !== teamId)
          delete d.rounds[teamId]
          delete d.scoreOverrides[teamId]
          if (d.activeTeamId === teamId) {
            d.activeTeamId = null
            d.phase = 'lobby'
          }
          d.tiebreaker.teamIds = d.tiebreaker.teamIds.filter((id) => id !== teamId)
        }),

      moveTeam: (teamId, dir) =>
        mutate((d) => {
          const i = d.teams.findIndex((t) => t.id === teamId)
          const j = i + dir
          if (i < 0 || j < 0 || j >= d.teams.length) return
          ;[d.teams[i], d.teams[j]] = [d.teams[j], d.teams[i]]
        }),

      addPlayer: (teamId, name) =>
        mutate((d) => {
          const t = d.teams.find((x) => x.id === teamId)
          if (!t || !name.trim()) return
          t.players.push({ id: uid('p'), name: name.trim() })
        }),

      updatePlayer: (teamId, playerId, patch) =>
        mutate((d) => {
          const p = d.teams.find((x) => x.id === teamId)?.players.find((x) => x.id === playerId)
          if (p) Object.assign(p, patch)
        }),

      removePlayer: (teamId, playerId) =>
        mutate((d) => {
          const t = d.teams.find((x) => x.id === teamId)
          if (!t) return
          t.players = t.players.filter((p) => p.id !== playerId)
          const round = d.rounds[teamId]
          if (round?.currentPlayerId === playerId) round.currentPlayerId = null
          if (d.tiebreaker.currentPlayerId === playerId) d.tiebreaker.currentPlayerId = null
        }),

      movePlayer: (teamId, playerId, dir) =>
        mutate((d) => {
          const t = d.teams.find((x) => x.id === teamId)
          if (!t) return
          const i = t.players.findIndex((p) => p.id === playerId)
          const j = i + dir
          if (i < 0 || j < 0 || j >= t.players.length) return
          ;[t.players[i], t.players[j]] = [t.players[j], t.players[i]]
        }),

      assignQuestion: (teamId, questionId) =>
        mutate((d) => {
          const t = d.teams.find((x) => x.id === teamId)
          if (t) t.questionId = questionId
        }),

      generateTeams: (names, teamCount, teamLabels) =>
        mutate((d) => {
          if (names.length === 0) return
          const teams = buildRandomTeams(names, teamCount, teamLabels)
          teams.forEach((t, i) => {
            t.questionId = d.questions[i]?.id ?? null
          })
          d.teams = teams
          d.rounds = Object.fromEntries(teams.map((t) => [t.id, emptyRound()]))
          d.scoreOverrides = {}
          d.phase = 'lobby'
          d.activeTeamId = null
          d.showScores = false
          d.showRosters = false
          d.showResultsBoard = false
          d.timer = clearedTimer(TIMER_MS)
          d.roundTimer = clearedTimer(d.roundDurationMs)
          d.tiebreaker = {
            ...d.tiebreaker,
            active: false,
            teamIds: [],
            revealed: [],
            currentTeamId: null,
            currentPlayerId: null,
            winnerTeamId: null,
          }
        }),

      addQuestion: () => {
        const id = uid('q')
        mutate((d) => {
          d.questions.push({
            id,
            text: 'New question',
            category: '',
            answers: Array.from({ length: ANSWERS_PER_QUESTION }, (_, i) => ({
              id: uid('a'),
              text: `Answer ${i + 1}`,
              rank: i + 1,
            })),
          })
        })
        return id
      },

      updateQuestion: (questionId, patch) =>
        mutate((d) => {
          const q = d.questions.find((x) => x.id === questionId)
          if (q) Object.assign(q, patch)
        }),

      duplicateQuestion: (questionId) =>
        mutate((d) => {
          const q = d.questions.find((x) => x.id === questionId)
          if (!q) return
          d.questions.push({
            ...q,
            id: uid('q'),
            text: `${q.text} (copy)`,
            answers: q.answers.map((a) => ({ ...a, id: uid('a') })),
          })
        }),

      removeQuestion: (questionId) =>
        mutate((d) => {
          d.questions = d.questions.filter((q) => q.id !== questionId)
          for (const t of d.teams) if (t.questionId === questionId) t.questionId = null
          if (d.tiebreaker.questionId === questionId) d.tiebreaker.questionId = null
        }),

      updateAnswer: (questionId, answerId, patch) =>
        mutate((d) => {
          const a = d.questions.find((q) => q.id === questionId)?.answers.find((x) => x.id === answerId)
          if (a) Object.assign(a, patch)
        }),

      moveAnswer: (questionId, answerId, dir) =>
        mutate((d) => {
          const q = d.questions.find((x) => x.id === questionId)
          if (!q) return
          const i = q.answers.findIndex((a) => a.id === answerId)
          const j = i + dir
          if (i < 0 || j < 0 || j >= q.answers.length) return
          ;[q.answers[i], q.answers[j]] = [q.answers[j], q.answers[i]]
          q.answers.forEach((a, idx) => (a.rank = idx + 1))
        }),

      setActiveTeam: (teamId) =>
        mutate((d) => {
          d.activeTeamId = teamId
          d.timer = clearedTimer(TIMER_MS)
          d.roundTimer = clearedTimer(d.roundDurationMs)
          if (teamId && d.phase === 'team-summary') d.phase = 'lobby'
        }),

      startTeam: (teamId) =>
        mutate((d) => {
          const t = d.teams.find((x) => x.id === teamId)
          if (!t) return
          const now = Date.now()
          d.activeTeamId = teamId
          d.phase = 'team-turn'
          d.showScores = false
          d.showRosters = false
          d.showResultsBoard = false
          d.timer = clearedTimer(TIMER_MS)
          d.roundTimer = {
            durationMs: d.roundDurationMs,
            endsAt: now + d.roundDurationMs,
            pausedMs: null,
            visible: true,
          }
          const round = ensureRound(d, teamId)
          round.started = true
          round.ended = false
          round.turnStartedAt = now
          // Fresh turn clock — if the board was empty, keep timing empty; if host is restarting
          // after a reset, arrays are already empty. Don't invent timestamps for leftover reveals.
          if (round.revealed.length === 0) {
            round.revealElapsedMs = []
            round.lastRevealElapsedMs = null
          } else if ((round.revealElapsedMs?.length ?? 0) !== round.revealed.length) {
            round.revealElapsedMs = []
            round.lastRevealElapsedMs = null
          }
          if (!round.currentPlayerId) round.currentPlayerId = t.players[0]?.id ?? null
        }),

      selectPlayer: (playerId) =>
        mutate((d) => {
          if (!d.activeTeamId) return
          const round = ensureRound(d, d.activeTeamId)
          round.currentPlayerId = playerId
          d.timer = clearedTimer(TIMER_MS)
        }),

      nextPlayer: () =>
        mutate((d) => {
          if (!d.activeTeamId) return
          const team = d.teams.find((t) => t.id === d.activeTeamId)
          if (!team || team.players.length === 0) return
          const round = ensureRound(d, d.activeTeamId)
          const i = team.players.findIndex((p) => p.id === round.currentPlayerId)
          round.guesses += 1
          if (i < 0) {
            round.currentPlayerId = team.players[0].id
          } else if (i === team.players.length - 1) {
            round.rotation += 1
            round.currentPlayerId = team.players[0].id
          } else {
            round.currentPlayerId = team.players[i + 1].id
          }
          d.timer = clearedTimer(TIMER_MS)
        }),

      nextRotation: () =>
        mutate((d) => {
          if (!d.activeTeamId) return
          const team = d.teams.find((t) => t.id === d.activeTeamId)
          const round = ensureRound(d, d.activeTeamId)
          round.rotation += 1
          round.currentPlayerId = team?.players[0]?.id ?? null
          d.timer = clearedTimer(TIMER_MS)
        }),

      toggleReveal: (answerId) =>
        mutate((d) => {
          if (!d.activeTeamId) return
          const round = ensureRound(d, d.activeTeamId)
          if (!round.revealElapsedMs) round.revealElapsedMs = []
          const idx = round.revealed.indexOf(answerId)
          if (idx >= 0) {
            round.revealed = round.revealed.filter((id) => id !== answerId)
            round.revealElapsedMs = round.revealElapsedMs.filter((_, i) => i !== idx)
            syncLastReveal(round)
          } else {
            const elapsed = elapsedNow(round, d.roundTimer, d.roundDurationMs)
            if (!round.turnStartedAt) round.turnStartedAt = Date.now() - elapsed
            round.revealed = [...round.revealed, answerId]
            round.revealElapsedMs = [...round.revealElapsedMs, elapsed]
            syncLastReveal(round)
          }
        }),

      undoLastReveal: () =>
        mutate((d) => {
          if (!d.activeTeamId) return
          const round = ensureRound(d, d.activeTeamId)
          round.revealed = round.revealed.slice(0, -1)
          round.revealElapsedMs = (round.revealElapsedMs ?? []).slice(0, -1)
          syncLastReveal(round)
        }),

      resetBoard: (teamId) =>
        mutate((d) => {
          d.rounds[teamId] = emptyRound()
          delete d.scoreOverrides[teamId]
          d.timer = clearedTimer(TIMER_MS)
          d.roundTimer = clearedTimer(d.roundDurationMs)
          if (d.activeTeamId === teamId && d.phase === 'team-summary') d.phase = 'lobby'
        }),

      endTeamTurn: () =>
        mutate((d) => {
          if (!d.activeTeamId) return
          const round = ensureRound(d, d.activeTeamId)
          round.ended = true
          round.started = true
          d.phase = 'team-summary'
          d.timer = clearedTimer(TIMER_MS)
          d.roundTimer = clearedTimer(d.roundDurationMs)
        }),

      nextTeam: () =>
        mutate((d) => {
          const i = d.teams.findIndex((t) => t.id === d.activeTeamId)
          const nextUp =
            d.teams.slice(i + 1).find((t) => !d.rounds[t.id]?.ended) ?? d.teams.find((t) => !d.rounds[t.id]?.ended)
          d.activeTeamId = nextUp?.id ?? null
          d.phase = 'lobby'
          d.showScores = false
          d.showResultsBoard = false
          d.timer = clearedTimer(TIMER_MS)
          d.roundTimer = clearedTimer(d.roundDurationMs)
        }),

      backToLobby: () =>
        mutate((d) => {
          d.phase = 'lobby'
          d.timer = clearedTimer(TIMER_MS)
          d.roundTimer = clearedTimer(d.roundDurationMs)
        }),

      endGame: () =>
        mutate((d) => {
          d.phase = 'game-over'
          d.showScores = false
          d.showRosters = false
          d.showResultsBoard = true
          d.timer = clearedTimer(TIMER_MS)
          d.roundTimer = clearedTimer(d.roundDurationMs)
          d.tiebreaker.active = false
        }),

      resetGameProgress: () =>
        mutate((d) => {
          d.rounds = Object.fromEntries(d.teams.map((t) => [t.id, emptyRound()]))
          d.scoreOverrides = {}
          d.phase = 'lobby'
          d.activeTeamId = null
          d.showScores = false
          d.showRosters = false
          d.showResultsBoard = false
          d.timer = clearedTimer(TIMER_MS)
          d.roundTimer = clearedTimer(d.roundDurationMs)
          d.tiebreaker = {
            ...d.tiebreaker,
            active: false,
            teamIds: [],
            revealed: [],
            currentTeamId: null,
            currentPlayerId: null,
            winnerTeamId: null,
          }
        }),

      resetEverything: () => set({ ...createSampleState(), actions: get().actions }),

      setScoreOverride: (teamId, value) =>
        mutate((d) => {
          if (value === null || Number.isNaN(value)) delete d.scoreOverrides[teamId]
          else d.scoreOverrides[teamId] = Math.max(0, Math.round(value))
        }),

      bumpScore: (teamId, delta) =>
        mutate((d) => {
          const current = d.scoreOverrides[teamId] ?? d.rounds[teamId]?.revealed.length ?? 0
          d.scoreOverrides[teamId] = Math.max(0, current + delta)
        }),

      setShowScores: (show) =>
        mutate((d) => {
          d.showScores = show
          if (show) {
            d.showRosters = false
            d.showResultsBoard = false
          }
        }),

      setShowRosters: (show) =>
        mutate((d) => {
          d.showRosters = show
          if (show) {
            d.showScores = false
            d.showResultsBoard = false
          }
        }),

      setShowResultsBoard: (show) =>
        mutate((d) => {
          d.showResultsBoard = show
          if (show) {
            d.showScores = false
            d.showRosters = false
          }
        }),

      toggleSound: () => mutate((d) => void (d.soundOn = !d.soundOn)),

      startTimer: () =>
        mutate((d) => {
          const remaining = d.timer.pausedMs && d.timer.pausedMs > 0 ? d.timer.pausedMs : TIMER_MS
          d.timer = { durationMs: TIMER_MS, endsAt: Date.now() + remaining, pausedMs: null, visible: true }
        }),

      pauseTimer: () =>
        mutate((d) => {
          if (!d.timer.endsAt) return
          d.timer = { ...d.timer, pausedMs: Math.max(0, d.timer.endsAt - Date.now()), endsAt: null }
        }),

      resetTimer: () =>
        mutate((d) => {
          d.timer = { durationMs: TIMER_MS, endsAt: null, pausedMs: TIMER_MS, visible: true }
        }),

      hideTimer: () => mutate((d) => void (d.timer = clearedTimer(TIMER_MS))),

      startRoundTimer: () =>
        mutate((d) => {
          const remaining =
            d.roundTimer.pausedMs && d.roundTimer.pausedMs > 0 ? d.roundTimer.pausedMs : d.roundDurationMs
          d.roundTimer = {
            durationMs: d.roundDurationMs,
            endsAt: Date.now() + remaining,
            pausedMs: null,
            visible: true,
          }
        }),

      pauseRoundTimer: () =>
        mutate((d) => {
          if (!d.roundTimer.endsAt) return
          d.roundTimer = {
            ...d.roundTimer,
            pausedMs: Math.max(0, d.roundTimer.endsAt - Date.now()),
            endsAt: null,
          }
        }),

      resetRoundTimer: () =>
        mutate((d) => {
          d.roundTimer = {
            durationMs: d.roundDurationMs,
            endsAt: null,
            pausedMs: d.roundDurationMs,
            visible: true,
          }
        }),

      enterTrialMode: () =>
        mutate((d) => {
          if (d.trialMode) return
          if (d.teams.length === 0) return
          d.trialSnapshot = snapshotForTrial(d)
          const trialQuestions = TRIAL_QUESTIONS.map((q) => ({ ...q, answers: q.answers.map((a) => ({ ...a })) }))
          d.trialMode = true
          d.gameName = d.gameName.replace(/\s*—\s*Trial$/, '') + ' — Trial'
          d.teams = d.teams.map((t, i) => ({
            ...t,
            players: t.players.map((p) => ({ ...p })),
            questionId: trialQuestions[i % trialQuestions.length]?.id ?? null,
          }))
          d.questions = trialQuestions
          d.rounds = Object.fromEntries(d.teams.map((t) => [t.id, emptyRound()]))
          d.scoreOverrides = {}
          d.phase = 'lobby'
          d.activeTeamId = d.teams[0]?.id ?? null
          d.showScores = false
          d.showRosters = false
          d.showResultsBoard = false
          d.timer = clearedTimer(TIMER_MS)
          d.roundTimer = clearedTimer(d.roundDurationMs)
          d.tiebreaker = {
            active: false,
            questionId: null,
            teamIds: [],
            revealed: [],
            currentTeamId: null,
            currentPlayerId: null,
            winnerTeamId: null,
          }
        }),

      exitTrialMode: () =>
        mutate((d) => {
          const snap = d.trialSnapshot
          if (!snap) {
            d.trialMode = false
            return
          }
          d.trialMode = false
          d.trialSnapshot = null
          d.gameName = snap.gameName
          d.teams = snap.teams
          d.questions = snap.questions
          d.rounds = snap.rounds
          d.scoreOverrides = snap.scoreOverrides
          d.phase = snap.phase === 'team-turn' || snap.phase === 'tiebreaker' ? 'lobby' : snap.phase
          d.activeTeamId = snap.phase === 'team-turn' || snap.phase === 'tiebreaker' ? null : snap.activeTeamId
          d.tiebreaker = snap.tiebreaker
          d.showScores = snap.showScores
          d.showResultsBoard = snap.showResultsBoard ?? false
          d.timer = clearedTimer(TIMER_MS)
          d.roundTimer = clearedTimer(d.roundDurationMs)
        }),

      hydrate: (state) => set({ ...migrateState(state), actions: get().actions }),
    },
  }
})

export const useActions = () => useGame((s) => s.actions)
