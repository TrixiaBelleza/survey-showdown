import { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmModal } from '../components/ConfirmModal'
import { Console } from '../components/host/Console'
import { RightRail } from '../components/host/RightRail'
import { TeamsColumn } from '../components/host/TeamsColumn'
import { openDisplayWindow } from '../lib/openDisplay'
import { play, setSoundEnabled, unlockAudio } from '../lib/sound'
import { useGame } from '../store/gameStore'
import { questionOfTeam, roundOf, teamById } from '../store/selectors'
import '../styles/host.css'

type Confirmation = {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  run: () => void
}

const PHASE_LABEL: Record<string, string> = {
  lobby: 'Lobby',
  'team-turn': 'Turn in progress',
  'team-summary': 'Round complete',
  tiebreaker: 'Tiebreaker',
  'game-over': 'Game over',
}

export function Host() {
  const state = useGame()
  const actions = state.actions
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const team = teamById(state, state.activeTeamId)
  const question = questionOfTeam(state, state.activeTeamId)
  const round = roundOf(state, state.activeTeamId)

  const inTurn = state.phase === 'team-turn'
  const inTiebreaker = state.phase === 'tiebreaker' && state.tiebreaker.active
  const revealedCount = inTiebreaker ? state.tiebreaker.revealed.length : round.revealed.length
  const revealContext = inTiebreaker ? `tb:${state.tiebreaker.questionId}` : `team:${state.activeTeamId}`

  useEffect(() => setSoundEnabled(state.soundOn), [state.soundOn])

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const revealedRef = useRef(revealedCount)
  const revealContextRef = useRef(revealContext)
  useEffect(() => {
    if (revealContext !== revealContextRef.current) {
      revealContextRef.current = revealContext
      revealedRef.current = revealedCount
      return
    }
    if (revealedCount > revealedRef.current) play('reveal')
    else if (revealedCount < revealedRef.current) play('undo')
    revealedRef.current = revealedCount
  }, [revealContext, revealedCount])

  useEffect(() => {
    const endsAt = state.timer.endsAt
    if (!endsAt) return
    const remaining = endsAt - Date.now()
    if (remaining <= 0) return

    play('start')
    const tick = window.setInterval(() => {
      if (Date.now() < endsAt) play('tick')
    }, 1000)
    const buzzer = window.setTimeout(() => {
      window.clearInterval(tick)
      play('time')
    }, remaining)

    return () => {
      window.clearInterval(tick)
      window.clearTimeout(buzzer)
    }
  }, [state.timer.endsAt])

  useEffect(() => {
    if (state.tiebreaker.winnerTeamId) play('win')
  }, [state.tiebreaker.winnerTeamId])

  const requestResetBoard = useCallback(
    (teamId: string, teamName: string) =>
      setConfirmation({
        title: 'Reset this board?',
        message: `All revealed answers, the rotation counter, and any manual score for ${teamName} will be cleared. This cannot be undone.`,
        confirmLabel: 'Reset board',
        danger: true,
        run: () => actions.resetBoard(teamId),
      }),
    [actions],
  )

  const requestRemoveTeam = useCallback(
    (teamId: string, teamName: string) =>
      setConfirmation({
        title: `Delete ${teamName}?`,
        message: 'The team, its players, and its round progress will be removed.',
        confirmLabel: 'Delete team',
        danger: true,
        run: () => actions.removeTeam(teamId),
      }),
    [actions],
  )

  const requestRemoveQuestion = useCallback(
    (questionId: string, text: string) =>
      setConfirmation({
        title: 'Delete question?',
        message: `“${text.slice(0, 90)}” will be removed from the bank and unassigned from any team.`,
        confirmLabel: 'Delete question',
        danger: true,
        run: () => actions.removeQuestion(questionId),
      }),
    [actions],
  )

  const requestResetGame = useCallback(
    () =>
      setConfirmation({
        title: 'Reset game progress?',
        message: 'Revealed answers, scores, rotations, and the tiebreaker are cleared. Teams, players, and questions stay.',
        confirmLabel: 'Reset progress',
        danger: true,
        run: actions.resetGameProgress,
      }),
    [actions],
  )

  const requestResetAll = useCallback(
    () =>
      setConfirmation({
        title: 'Restore the sample game?',
        message: 'Everything you have entered will be replaced by the four sample teams and questions.',
        confirmLabel: 'Restore sample',
        danger: true,
        run: actions.resetEverything,
      }),
    [actions],
  )

  const requestEndGame = useCallback(
    () =>
      setConfirmation({
        title: 'End the game?',
        message: 'Monitor 1 switches to the final standings. You can return to the lobby afterwards.',
        confirmLabel: 'End game',
        run: actions.endGame,
      }),
    [actions],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmation) return
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const answers = inTiebreaker
        ? state.questions.find((q) => q.id === state.tiebreaker.questionId)?.answers ?? []
        : question?.answers ?? []

      if (e.code === 'Space') {
        e.preventDefault()
        if (state.timer.endsAt) actions.pauseTimer()
        else actions.startTimer()
        return
      }

      if (/^[0-9]$/.test(e.key)) {
        const index = e.key === '0' ? 9 : Number(e.key) - 1
        const answer = answers[index]
        if (!answer) return
        e.preventDefault()
        if (inTiebreaker) actions.tbToggleReveal(answer.id)
        else if (inTurn) actions.toggleReveal(answer.id)
        return
      }

      switch (e.key.toLowerCase()) {
        case 'enter':
          if (inTurn) {
            e.preventDefault()
            actions.nextPlayer()
          } else if (inTiebreaker) {
            e.preventDefault()
            actions.tbNextTeam()
          }
          break
        case 'u':
          if (inTurn) actions.undoLastReveal()
          break
        case 'r':
          if (inTurn) actions.nextRotation()
          break
        case 'e':
          if (inTurn) actions.endTeamTurn()
          break
        case 's':
          actions.setShowScores(!state.showScores)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [actions, confirmation, inTiebreaker, inTurn, question, state.questions, state.showScores, state.tiebreaker.questionId, state.timer.endsAt])

  return (
    <div className="host">
      <div className="host-top">
        <span className="host-logo">{state.gameName}</span>
        <span className="host-phase">
          <span className="pip" />
          {PHASE_LABEL[state.phase] ?? state.phase}
        </span>
        {team && (
          <span className="host-phase" style={{ borderColor: team.color, color: '#fff' }}>
            <span className="pip" style={{ background: team.color, boxShadow: `0 0 10px ${team.color}` }} />
            {team.name}
            {inTurn && question ? ` · ${round.revealed.length}/${question.answers.length}` : ''}
          </span>
        )}
        <span className="host-top-spacer" />
        <button className={`btn sm ${state.showScores ? 'primary' : ''}`} onClick={() => actions.setShowScores(!state.showScores)}>
          {state.showScores ? 'Hide Scores' : 'Show Scores'}
        </button>
        <button className="btn sm" onClick={requestEndGame}>
          End Game
        </button>
        <button className="btn sm primary" onClick={openDisplayWindow}>
          ⧉ Open Game Display
        </button>
      </div>

      <div className="host-body">
        <TeamsColumn onRequestRemoveTeam={requestRemoveTeam} />
        <Console onRequestResetBoard={requestResetBoard} />
        <RightRail
          onRequestResetGame={requestResetGame}
          onRequestResetAll={requestResetAll}
          onRequestRemoveQuestion={requestRemoveQuestion}
        />
      </div>

      {confirmation && (
        <ConfirmModal
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmation.confirmLabel}
          danger={confirmation.danger}
          onConfirm={() => {
            confirmation.run()
            setConfirmation(null)
          }}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </div>
  )
}
