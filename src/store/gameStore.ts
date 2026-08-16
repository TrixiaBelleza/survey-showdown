import { create } from 'zustand'
import type { GameState, Player, Question, Team } from '../types'
import { ANSWERS_PER_QUESTION, ROTATION_LIMIT, TEAM_COLORS } from '../types'
import { createSampleState, emptyRound } from '../data/sampleGame'
import { buildRandomTeams } from '../lib/generateTeams'
import { uid } from '../lib/id'

type Patch<T> = Partial<T>

export type Actions = {
  // config
  setGameName: (name: string) => void
  addTeam: () => void
  updateTeam: (teamId: string, patch: Patch<Team>) => void
  removeTeam: (teamId: string) => void
  moveTeam: (teamId: string, dir: -1 | 1) => void
  addPlayer: (teamId: string, name: string) => void
  updatePlayer: (teamId: string, playerId: string, patch: Patch<Player>) => void
  removePlayer: (teamId: string, playerId: string) => void
  movePlayer: (teamId: string, playerId: string, dir: -1 | 1) => void
  assignQuestion: (teamId: string, questionId: string | null) => void
  /** Replace all teams with a random split of the given names. Keeps the question bank. */
  generateTeams: (names: string[], teamCount: number, teamLabels?: string[]) => void

  // question bank
  addQuestion: () => string
  updateQuestion: (questionId: string, patch: Patch<Question>) => void
  duplicateQuestion: (questionId: string) => void
  removeQuestion: (questionId: string) => void
  updateAnswer: (questionId: string, answerId: string, patch: { text?: string; note?: string }) => void
  moveAnswer: (questionId: string, answerId: string, dir: -1 | 1) => void

  // flow
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

  // score
  setScoreOverride: (teamId: string, value: number | null) => void
  bumpScore: (teamId: string, delta: number) => void
  setShowScores: (show: boolean) => void
  toggleSound: () => void

  // timer
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
  hideTimer: () => void

  // tiebreaker
  startTiebreaker: (teamIds: string[], questionId: string) => void
  setTiebreakerQuestion: (questionId: string) => void
  tbSelectTeam: (teamId: string) => void
  tbSelectPlayer: (playerId: string) => void
  tbToggleReveal: (answerId: string) => void
  tbNextTeam: () => void
  tbReset: () => void
  endTiebreaker: () => void

  /** used by the cross-window sync layer */
  hydrate: (state: GameState) => void
}

export type Store = GameState & { actions: Actions }

function ensureRound(state: GameState, teamId: string) {
  if (!state.rounds[teamId]) state.rounds[teamId] = emptyRound()
  return state.rounds[teamId]
}

function clearedTimer(state: GameState) {
  return { ...state.timer, endsAt: null, pausedMs: null, visible: false }
}

export const useGame = create<Store>()((set, get) => {
  /** immutably clone the parts of state an action touches, then mutate freely */
  const mutate = (fn: (draft: GameState) => void) =>
    set((prev) => {
      const draft: GameState = {
        ...prev,
        teams: prev.teams.map((t) => ({ ...t, players: [...t.players] })),
        questions: prev.questions.map((q) => ({ ...q, answers: [...q.answers] })),
        rounds: Object.fromEntries(Object.entries(prev.rounds).map(([k, v]) => [k, { ...v, revealed: [...v.revealed] }])),
        scoreOverrides: { ...prev.scoreOverrides },
        timer: { ...prev.timer },
        tiebreaker: { ...prev.tiebreaker, teamIds: [...prev.tiebreaker.teamIds], revealed: [...prev.tiebreaker.revealed] },
      }
      fn(draft)
      return draft
    })

  return {
    ...createSampleState(),
    actions: {
      setGameName: (name) => mutate((d) => void (d.gameName = name)),

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
          // Keep the question bank; assign one question per team by index when available.
          teams.forEach((t, i) => {
            t.questionId = d.questions[i]?.id ?? null
          })
          d.teams = teams
          d.rounds = Object.fromEntries(teams.map((t) => [t.id, emptyRound()]))
          d.scoreOverrides = {}
          d.phase = 'lobby'
          d.activeTeamId = null
          d.showScores = false
          d.timer = clearedTimer(d)
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
          d.timer = clearedTimer(d)
          if (teamId && d.phase === 'team-summary') d.phase = 'lobby'
        }),

      startTeam: (teamId) =>
        mutate((d) => {
          const t = d.teams.find((x) => x.id === teamId)
          if (!t) return
          d.activeTeamId = teamId
          d.phase = 'team-turn'
          d.showScores = false
          d.timer = clearedTimer(d)
          const round = ensureRound(d, teamId)
          round.started = true
          round.ended = false
          if (!round.currentPlayerId) round.currentPlayerId = t.players[0]?.id ?? null
        }),

      selectPlayer: (playerId) =>
        mutate((d) => {
          if (!d.activeTeamId) return
          const round = ensureRound(d, d.activeTeamId)
          round.currentPlayerId = playerId
          d.timer = clearedTimer(d)
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
          d.timer = clearedTimer(d)
        }),

      nextRotation: () =>
        mutate((d) => {
          if (!d.activeTeamId) return
          const team = d.teams.find((t) => t.id === d.activeTeamId)
          const round = ensureRound(d, d.activeTeamId)
          round.rotation += 1
          round.currentPlayerId = team?.players[0]?.id ?? null
          d.timer = clearedTimer(d)
        }),

      toggleReveal: (answerId) =>
        mutate((d) => {
          if (!d.activeTeamId) return
          const round = ensureRound(d, d.activeTeamId)
          round.revealed = round.revealed.includes(answerId)
            ? round.revealed.filter((id) => id !== answerId)
            : [...round.revealed, answerId]
        }),

      undoLastReveal: () =>
        mutate((d) => {
          if (!d.activeTeamId) return
          const round = ensureRound(d, d.activeTeamId)
          round.revealed = round.revealed.slice(0, -1)
        }),

      resetBoard: (teamId) =>
        mutate((d) => {
          d.rounds[teamId] = emptyRound()
          delete d.scoreOverrides[teamId]
          d.timer = clearedTimer(d)
          if (d.activeTeamId === teamId && d.phase === 'team-summary') d.phase = 'lobby'
        }),

      endTeamTurn: () =>
        mutate((d) => {
          if (!d.activeTeamId) return
          const round = ensureRound(d, d.activeTeamId)
          round.ended = true
          round.started = true
          d.phase = 'team-summary'
          d.timer = clearedTimer(d)
        }),

      nextTeam: () =>
        mutate((d) => {
          const i = d.teams.findIndex((t) => t.id === d.activeTeamId)
          const nextUp = d.teams.slice(i + 1).find((t) => !d.rounds[t.id]?.ended) ?? d.teams.find((t) => !d.rounds[t.id]?.ended)
          d.activeTeamId = nextUp?.id ?? null
          d.phase = 'lobby'
          d.showScores = false
          d.timer = clearedTimer(d)
        }),

      backToLobby: () =>
        mutate((d) => {
          d.phase = 'lobby'
          d.timer = clearedTimer(d)
        }),

      endGame: () =>
        mutate((d) => {
          d.phase = 'game-over'
          d.showScores = true
          d.timer = clearedTimer(d)
          d.tiebreaker.active = false
        }),

      resetGameProgress: () =>
        mutate((d) => {
          d.rounds = Object.fromEntries(d.teams.map((t) => [t.id, emptyRound()]))
          d.scoreOverrides = {}
          d.phase = 'lobby'
          d.activeTeamId = null
          d.showScores = false
          d.timer = clearedTimer(d)
          d.tiebreaker = { ...d.tiebreaker, active: false, teamIds: [], revealed: [], currentTeamId: null, currentPlayerId: null, winnerTeamId: null }
        }),

      resetEverything: () => set({ ...createSampleState(), actions: get().actions }),

      setScoreOverride: (teamId, value) =>
        mutate((d) => {
          if (value === null) delete d.scoreOverrides[teamId]
          else d.scoreOverrides[teamId] = Math.max(0, Math.min(ANSWERS_PER_QUESTION * 2, value))
        }),

      bumpScore: (teamId, delta) =>
        mutate((d) => {
          const current = d.scoreOverrides[teamId] ?? d.rounds[teamId]?.revealed.length ?? 0
          d.scoreOverrides[teamId] = Math.max(0, current + delta)
        }),

      setShowScores: (show) => mutate((d) => void (d.showScores = show)),
      toggleSound: () => mutate((d) => void (d.soundOn = !d.soundOn)),

      /** Start, resume from pause, or restart after TIME! — always a full 5s unless paused mid-count. */
      startTimer: () =>
        mutate((d) => {
          const remaining = d.timer.pausedMs && d.timer.pausedMs > 0 ? d.timer.pausedMs : d.timer.durationMs
          d.timer = { ...d.timer, endsAt: Date.now() + remaining, pausedMs: null, visible: true }
        }),

      pauseTimer: () =>
        mutate((d) => {
          if (!d.timer.endsAt) return
          d.timer = { ...d.timer, pausedMs: Math.max(0, d.timer.endsAt - Date.now()), endsAt: null }
        }),

      resetTimer: () =>
        mutate((d) => {
          d.timer = { ...d.timer, endsAt: null, pausedMs: d.timer.durationMs, visible: true }
        }),

      hideTimer: () => mutate((d) => void (d.timer = clearedTimer(d))),

      startTiebreaker: (teamIds, questionId) =>
        mutate((d) => {
          d.phase = 'tiebreaker'
          d.showScores = false
          d.timer = clearedTimer(d)
          d.tiebreaker = {
            active: true,
            questionId,
            teamIds,
            revealed: [],
            currentTeamId: teamIds[0] ?? null,
            currentPlayerId: d.teams.find((t) => t.id === teamIds[0])?.players[0]?.id ?? null,
            winnerTeamId: null,
          }
        }),

      setTiebreakerQuestion: (questionId) => mutate((d) => void (d.tiebreaker.questionId = questionId)),

      tbSelectTeam: (teamId) =>
        mutate((d) => {
          d.tiebreaker.currentTeamId = teamId
          d.tiebreaker.currentPlayerId = d.teams.find((t) => t.id === teamId)?.players[0]?.id ?? null
          d.timer = clearedTimer(d)
        }),

      tbSelectPlayer: (playerId) =>
        mutate((d) => {
          d.tiebreaker.currentPlayerId = playerId
          d.timer = clearedTimer(d)
        }),

      tbToggleReveal: (answerId) =>
        mutate((d) => {
          const tb = d.tiebreaker
          const q = d.questions.find((x) => x.id === tb.questionId)
          const answer = q?.answers.find((a) => a.id === answerId)
          if (tb.revealed.includes(answerId)) {
            tb.revealed = tb.revealed.filter((id) => id !== answerId)
            if (answer?.rank === 1) tb.winnerTeamId = null
          } else {
            tb.revealed = [...tb.revealed, answerId]
            if (answer?.rank === 1) tb.winnerTeamId = tb.currentTeamId
          }
        }),

      tbNextTeam: () =>
        mutate((d) => {
          const tb = d.tiebreaker
          if (tb.teamIds.length === 0) return
          const i = tb.teamIds.indexOf(tb.currentTeamId ?? '')
          const nextId = tb.teamIds[(i + 1) % tb.teamIds.length]
          tb.currentTeamId = nextId
          tb.currentPlayerId = d.teams.find((t) => t.id === nextId)?.players[0]?.id ?? null
          d.timer = clearedTimer(d)
        }),

      tbReset: () =>
        mutate((d) => {
          d.tiebreaker.revealed = []
          d.tiebreaker.winnerTeamId = null
          d.tiebreaker.currentTeamId = d.tiebreaker.teamIds[0] ?? null
          d.timer = clearedTimer(d)
        }),

      endTiebreaker: () =>
        mutate((d) => {
          d.tiebreaker.active = false
          d.phase = 'game-over'
          d.showScores = true
          d.timer = clearedTimer(d)
        }),

      hydrate: (state) => set({ ...state, actions: get().actions }),
    },
  }
})

export const useActions = () => useGame((s) => s.actions)

export const ROTATIONS_ALLOWED = ROTATION_LIMIT
