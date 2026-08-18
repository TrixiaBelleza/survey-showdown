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
  const canReveal = inTurn || state.phase === 'team-summary'
  const revealedCount = round.revealed.length
  const revealContext = `team:${state.activeTeamId}`

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
    const endsAt = state.roundTimer.endsAt
    if (!endsAt) return
    const remaining = endsAt - Date.now()
    if (remaining <= 0) return

    // Silent until the final 10 seconds — then one warning cue, then buzzer at zero
    let warning = 0
    if (remaining > 10_000) {
      warning = window.setTimeout(() => play('warning'), remaining - 10_000)
    } else {
      play('warning')
    }
    const buzzer = window.setTimeout(() => play('time'), remaining)

    return () => {
      if (warning) window.clearTimeout(warning)
      window.clearTimeout(buzzer)
    }
  }, [state.roundTimer.endsAt])

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
        message: 'Revealed answers, scores, rotations, and last-word times are cleared. Teams, players, and questions stay.',
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
        message: 'Monitor 1 switches to the results board (words + last-word times). You can return to the lobby afterwards.',
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

      const answers = question?.answers ?? []

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
        if (canReveal) actions.toggleReveal(answer.id)
        return
      }

      switch (e.key.toLowerCase()) {
        case 'enter':
          if (inTurn) {
            e.preventDefault()
            actions.nextPlayer()
          }
          break
        case 'u':
          if (canReveal) actions.undoLastReveal()
          break
        case 'r':
          if (inTurn) actions.nextRotation()
          break
        case 'e':
          if (inTurn) actions.endTeamTurn()
          break
        case 's':
          actions.setShowResultsBoard(!state.showResultsBoard)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [actions, canReveal, confirmation, inTurn, question, state.showResultsBoard, state.timer.endsAt])

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
        {state.trialMode ? (
          <button className="btn sm danger" onClick={actions.exitTrialMode}>
            Exit Trial Mode
          </button>
        ) : (
          <button
            className="btn sm"
            onClick={actions.enterTrialMode}
            disabled={state.teams.length === 0}
            title={
              state.teams.length === 0
                ? 'Add at least one team in Setup first'
                : 'Practice with your Setup teams and funny trial questions'
            }
          >
            Trial Mode
          </button>
        )}
        <button
          className={`btn sm ${state.scoreOnReveal ? 'go' : 'danger'}`}
          onClick={() => actions.setScoreOnReveal(!state.scoreOnReveal)}
          title={
            state.scoreOnReveal
              ? 'Flips count toward the team score. Turn off for STEAL / show leftover cards.'
              : 'Score on flip is OFF — cards flip for the audience without awarding points.'
          }
        >
          {state.scoreOnReveal ? 'Score on flip: ON' : 'Score on flip: OFF'}
        </button>
        <button
          className={`btn sm ${state.showRosters ? 'primary' : ''}`}
          onClick={() => actions.setShowRosters(!state.showRosters)}
          title="Put every team's player list on Monitor 1"
        >
          {state.showRosters ? 'Hide Rosters' : 'Show Rosters'}
        </button>
        <button
          className={`btn sm ${state.showResultsBoard ? 'primary' : ''}`}
          onClick={() => actions.setShowResultsBoard(!state.showResultsBoard)}
          title="Words + last-word elapsed time on Monitor 1"
        >
          {state.showResultsBoard ? 'Hide Results' : 'Show Results'}
        </button>
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
