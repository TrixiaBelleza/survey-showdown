import { teamVars } from '../../lib/css'
import { useGame } from '../../store/gameStore'
import { HostTimer } from '../TimerReadout'
import {
  maxGuesses,
  questionOfTeam,
  rankedTeams,
  roundOf,
  teamById,
  teamScore,
  turnShouldEnd,
} from '../../store/selectors'
import { ROTATION_LIMIT } from '../../types'

type Props = {
  onRequestResetBoard: (teamId: string, teamName: string) => void
}

export function Console({ onRequestResetBoard }: Props) {
  const state = useGame()
  const actions = state.actions

  const team = teamById(state, state.activeTeamId)
  const round = roundOf(state, state.activeTeamId)
  const question = questionOfTeam(state, state.activeTeamId)
  const tb = state.tiebreaker
  const tbQuestion = state.questions.find((q) => q.id === tb.questionId) ?? null
  const tbTeam = teamById(state, tb.currentTeamId)

  const timerFace = <HostTimer />

  const timerButtons = (
    <div className="btn-grid three">
      <button className="btn sm go" onClick={actions.startTimer}>
        Start <span className="kbd">Space</span>
      </button>
      <button className="btn sm" onClick={actions.pauseTimer}>
        Pause
      </button>
      <button className="btn sm ghost" onClick={actions.resetTimer}>
        Reset
      </button>
    </div>
  )

  // ---------- tiebreaker ----------
  if (state.phase === 'tiebreaker' && tb.active) {
    const winner = teamById(state, tb.winnerTeamId)
    return (
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Tiebreaker Console</span>
          <span className="host-phase">
            <span className="pip" style={{ background: 'var(--gold)' }} />
            {winner ? `${winner.name} wins` : 'In progress'}
          </span>
        </div>
        <div className="panel-body console">
          {winner ? (
            <div className="alert">
              <span>
                {winner.name} revealed the #1 answer — tiebreaker won. Use “End Tiebreaker” to show final standings.
              </span>
              <button className="btn sm primary" onClick={actions.endTiebreaker}>
                End Tiebreaker
              </button>
            </div>
          ) : (
            <div className="alert">
              <span>First team to reveal the ★ #1 answer wins. Alternate teams with “Next Team”.</span>
            </div>
          )}

          <div className="console-question">
            <small>Tiebreaker question</small>
            <p>{tbQuestion?.text ?? 'Pick a tiebreaker question in the Tiebreaker tab'}</p>
          </div>

          <div className="player-strip">
            {tb.teamIds.map((id) => {
              const t = teamById(state, id)
              if (!t) return null
              return (
                <button
                  key={id}
                  className={`player-chip${tb.currentTeamId === id ? ' on' : ''}`}
                  onClick={() => actions.tbSelectTeam(id)}
                >
                  <span className="team-dot" style={{ width: 9, height: 9, background: t.color }} />
                  {t.name}
                </button>
              )
            })}
          </div>

          <div className="player-strip">
            {(tbTeam?.players ?? []).map((p, i) => (
              <button
                key={p.id}
                className={`player-chip${tb.currentPlayerId === p.id ? ' on' : ''}`}
                onClick={() => actions.tbSelectPlayer(p.id)}
              >
                <span className="n">{i + 1}</span>
                {p.name}
              </button>
            ))}
          </div>

          <div className="turn-grid">
            <div className="ans-list scroll">
              {(tbQuestion?.answers ?? []).map((a, i) => {
                const revealed = tb.revealed.includes(a.id)
                return (
                  <button
                    key={a.id}
                    className={`ans-row${revealed ? ' revealed' : ''}${a.rank === 1 ? ' top-rank' : ''}`}
                    onClick={() => actions.tbToggleReveal(a.id)}
                  >
                    <span className="ans-num">{i + 1}</span>
                    <span className="ans-text">{a.text}</span>
                    <span className="ans-state">{revealed ? '✅ Revealed' : 'Hidden'}</span>
                  </button>
                )
              })}
            </div>

            <div className="stack">
              <div className="now-box" style={teamVars(tbTeam?.color ?? '#6d8cff')}>
                <small>{tbTeam?.name ?? 'No team'} — on the buzzer</small>
                <strong>{tbTeam?.players.find((p) => p.id === tb.currentPlayerId)?.name ?? '—'}</strong>
              </div>
              {timerFace}
              {timerButtons}
              <div className="divider" />
              <button className="btn primary" onClick={actions.tbNextTeam}>
                Next Team →
              </button>
              <button className="btn ghost" onClick={actions.tbReset}>
                Reset Tiebreaker Board
              </button>
              <button className="btn" onClick={actions.endTiebreaker}>
                End Tiebreaker
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---------- final standings ----------
  if (state.phase === 'game-over') {
    const rows = rankedTeams(state)
    return (
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Game Over</span>
        </div>
        <div className="panel-body console">
          <div className="big-cta">
            <h2>Final Standings</h2>
            <div className="score-table" style={{ width: 360 }}>
              {rows.map(({ team: t, score, rank }) => (
                <div key={t.id} className="score-row" style={teamVars(t.color)}>
                  <span className="team-dot" />
                  <span className="nm">
                    {rank}. {t.name}
                  </span>
                  <span className="team-chip">{score}</span>
                  <span />
                </div>
              ))}
            </div>
            <div className="btn-grid">
              <button className="btn" onClick={actions.backToLobby}>
                Back to Lobby
              </button>
              <button className="btn ghost" onClick={() => actions.setShowScores(!state.showScores)}>
                {state.showScores ? 'Hide Scores' : 'Show Scores'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---------- team summary ----------
  if (state.phase === 'team-summary' && team) {
    const total = question?.answers.length ?? 10
    return (
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Round Complete — {team.name}</span>
        </div>
        <div className="panel-body console">
          <div className="big-cta">
            <h2 style={{ color: team.color }}>{team.name}</h2>
            <div className="summary-score">
              {teamScore(state, team.id)} / {total}
            </div>
            <p>
              Answers revealed. Adjust the score in the Scoreboard tab if needed, then move on to the next team.
            </p>
            <div className="btn-grid">
              <button className="btn xl primary" onClick={actions.nextTeam}>
                Next Team →
              </button>
              <button className="btn xl" onClick={() => actions.startTeam(team.id)}>
                Reopen This Turn
              </button>
            </div>
            <button className="btn ghost sm" onClick={() => actions.setShowScores(!state.showScores)}>
              {state.showScores ? 'Hide scoreboard on Monitor 1' : 'Show scoreboard on Monitor 1'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- active turn ----------
  if (state.phase === 'team-turn' && team && question) {
    const shouldEnd = turnShouldEnd(state, team.id)
    const currentIndex = team.players.findIndex((p) => p.id === round.currentPlayerId)
    const currentName = team.players[currentIndex]?.name ?? null
    return (
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title" style={{ color: team.color }}>
            {team.name} — Turn In Progress
          </span>
          <span className="host-phase">
            <span className="pip" />
            {round.rotation > ROTATION_LIMIT
              ? 'All rotations used'
              : `Rotation ${round.rotation} of ${ROTATION_LIMIT}`}{' '}
            · {round.guesses}/{maxGuesses(state, team.id)} turns used
          </span>
        </div>
        <div className="panel-body console">
          {shouldEnd && (
            <div className="alert warn">
              <span>
                {round.revealed.length >= question.answers.length
                  ? 'All answers revealed — end the turn.'
                  : `${ROTATION_LIMIT} rotations complete — end the turn.`}
              </span>
              <button className="btn sm danger" onClick={actions.endTeamTurn}>
                End Team Turn
              </button>
            </div>
          )}

          <div className="console-question">
            <small>{question.category || 'Survey question'}</small>
            <p>{question.text}</p>
          </div>

          <div className="player-strip">
            {team.players.map((p, i) => (
              <button
                key={p.id}
                className={`player-chip${round.currentPlayerId === p.id ? ' on' : ''}`}
                onClick={() => actions.selectPlayer(p.id)}
              >
                <span className="n">{i + 1}</span>
                {p.name}
              </button>
            ))}
            {team.players.length === 0 && <span className="hint">Add players to this team on the left.</span>}
          </div>

          <div className="turn-grid">
            <div className="ans-list scroll">
              {question.answers.map((a, i) => {
                const revealed = round.revealed.includes(a.id)
                return (
                  <button
                    key={a.id}
                    className={`ans-row${revealed ? ' revealed' : ''}`}
                    onClick={() => actions.toggleReveal(a.id)}
                    title={a.note}
                  >
                    <span className="ans-num">{i + 1}</span>
                    <span className="ans-text">{a.text}</span>
                    <span className="ans-state">
                      {revealed ? '✅ Revealed' : 'Hidden'}
                      <span className="kbd">{i === 9 ? '0' : i + 1}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="stack">
              <div className="now-box" style={teamVars(team.color)}>
                <small>Current player</small>
                <strong>{currentName ?? 'None selected'}</strong>
              </div>
              {timerFace}
              {timerButtons}
              <button className="btn xl primary" onClick={actions.nextPlayer} disabled={!round.currentPlayerId}>
                Next Player <span className="kbd">Enter</span>
              </button>
              <div className="btn-grid">
                <button className="btn sm" onClick={actions.nextRotation}>
                  Next Rotation
                </button>
                <button className="btn sm ghost" onClick={actions.undoLastReveal} disabled={round.revealed.length === 0}>
                  Undo Reveal
                </button>
              </div>
              <button className="btn danger" onClick={actions.endTeamTurn}>
                End Team Turn
              </button>
              <button className="btn ghost sm" onClick={() => onRequestResetBoard(team.id, team.name)}>
                Reset Board
              </button>
              <div className="hint">
                Space = start/pause timer · Enter = next player · 1–9,0 = reveal · U = undo · E = end turn
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---------- lobby ----------
  const upNext = team ?? state.teams.find((t) => !roundOf(state, t.id).ended) ?? null
  const gameStarted = state.teams.some((t) => roundOf(state, t.id).started)
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Game Lobby</span>
      </div>
      <div className="panel-body console">
        <div className="big-cta">
          <h2>{state.gameName}</h2>
          {upNext ? (
            <>
              <p>
                Up next: <b style={{ color: upNext.color }}>{upNext.name}</b> —{' '}
                {questionOfTeam(state, upNext.id)?.text ?? 'no question assigned yet'}
              </p>
              <button
                className="btn xl go"
                onClick={() => actions.startTeam(upNext.id)}
                disabled={!upNext.questionId || upNext.players.length === 0}
              >
                {gameStarted ? 'Start Team' : 'Start Game'} — {upNext.name}
              </button>
              {(!upNext.questionId || upNext.players.length === 0) && (
                <p className="hint">Assign a question and at least one player to this team first.</p>
              )}
              {state.activeTeamId !== upNext.id && (
                <button className="btn sm ghost" onClick={() => actions.setActiveTeam(upNext.id)}>
                  Put {upNext.name} on Monitor 1
                </button>
              )}
            </>
          ) : (
            <>
              <p>Every team has finished a turn. Show the scores, run a tiebreaker, or end the game.</p>
              <div className="btn-grid">
                <button className="btn xl primary" onClick={() => actions.setShowScores(!state.showScores)}>
                  {state.showScores ? 'Hide Scores' : 'Show Scores'}
                </button>
                <button className="btn xl" onClick={actions.endGame}>
                  End Game
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
