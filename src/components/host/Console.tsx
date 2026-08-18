import { teamVars } from '../../lib/css'
import { useGame } from '../../store/gameStore'
import { HostRoundTimer, HostTimer } from '../TimerReadout'
import {
  questionOfTeam,
  resultsRows,
  roundOf,
  teamById,
  teamScore,
  turnShouldEnd,
} from '../../store/selectors'

type Props = {
  onRequestResetBoard: (teamId: string, teamName: string) => void
}

export function Console({ onRequestResetBoard }: Props) {
  const state = useGame()
  const actions = state.actions

  const team = teamById(state, state.activeTeamId)
  const round = roundOf(state, state.activeTeamId)
  const question = questionOfTeam(state, state.activeTeamId)

  const roundClock = (
    <>
      <span className="section-label">Team clock</span>
      <HostRoundTimer />
      <div className="btn-grid three">
        <button className="btn sm go" onClick={actions.startRoundTimer}>
          Start
        </button>
        <button className="btn sm" onClick={actions.pauseRoundTimer}>
          Pause
        </button>
        <button className="btn sm ghost" onClick={actions.resetRoundTimer}>
          Reset
        </button>
      </div>
    </>
  )

  const playerBuzz = (
    <>
      <span className="section-label">Player buzz (optional 5s)</span>
      <HostTimer />
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
    </>
  )

  // ---------- final standings ----------
  if (state.phase === 'game-over') {
    const rows = resultsRows(state)
    return (
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Game Over</span>
        </div>
        <div className="panel-body console">
          <div className="big-cta">
            <h2>Final Results</h2>
            <div className="score-table" style={{ width: 'min(520px, 100%)' }}>
              <div className="score-row" style={{ opacity: 0.7 }}>
                <span />
                <span className="nm">Team</span>
                <span className="team-chip">Words</span>
                <span className="manual-flag" style={{ minWidth: 64, textAlign: 'right' }}>
                  Last word
                </span>
              </div>
              {rows.map((r) => (
                <div key={r.team.id} className={`score-row${r.rank === 1 ? ' active' : ''}`} style={teamVars(r.team.color)}>
                  <span className="team-dot" />
                  <span className="nm">
                    {r.rank}. {r.team.name}
                  </span>
                  <span className="team-chip">{r.words}</span>
                  <span className="manual-flag" style={{ minWidth: 64, textAlign: 'right' }}>
                    {r.lastWordAt}
                  </span>
                </div>
              ))}
            </div>
            <div className="btn-grid">
              <button className="btn" onClick={actions.backToLobby}>
                Back to Lobby
              </button>
              <button
                className={`btn ${state.showResultsBoard ? 'primary' : 'ghost'}`}
                onClick={() => actions.setShowResultsBoard(!state.showResultsBoard)}
              >
                {state.showResultsBoard ? 'Hide Results Board' : 'Show Results Board'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---------- team summary ----------
  if (state.phase === 'team-summary' && team && question) {
    const total = question.answers.length
    const hiddenLeft = total - round.revealed.length
    return (
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Round Complete — {team.name}</span>
          <span className="host-phase">
            <span className="pip" />
            Score {teamScore(state, team.id)} · Board {round.revealed.length}/{total}
          </span>
        </div>
        <div className="panel-body console">
          <div className="alert">
            <span>
              {hiddenLeft > 0
                ? 'Turn over. For STEAL / show-remaining: turn OFF “Score on flip”, then flip leftover cards — audience sees them, this team does not earn points.'
                : 'Board is fully revealed. Award STEAL points with Scoreboard +1 if needed, then next team.'}
            </span>
          </div>

          <label className={`score-flip-toggle${state.scoreOnReveal ? '' : ' off'}`}>
            <input
              type="checkbox"
              checked={state.scoreOnReveal}
              onChange={(e) => actions.setScoreOnReveal(e.target.checked)}
            />
            <span>
              <b>Score on flip</b>
              {state.scoreOnReveal
                ? ' — flips count toward this team’s score'
                : ' — OFF: flips are show-only (STEAL / leftover board)'}
            </span>
          </label>

          <div className="console-question">
            <small>{question.category || 'Question'}</small>
            <p>{question.text}</p>
          </div>

          <div className="turn-grid">
            <div className="ans-list scroll">
              {question.answers.map((a, i) => {
                const revealed = round.revealed.includes(a.id)
                const scored = (round.scoredRevealed ?? []).includes(a.id)
                return (
                  <button
                    key={a.id}
                    className={`ans-row${revealed ? ' revealed' : ''}${revealed && !scored ? ' show-only' : ''}`}
                    onClick={() => actions.toggleReveal(a.id)}
                    title={a.note}
                  >
                    <span className="ans-num">{i + 1}</span>
                    <span className="ans-text">{a.text}</span>
                    <span className="ans-state">
                      {!revealed ? 'Hidden' : scored ? '✅ Scored' : '👁 Show only'}
                      <span className="kbd">{i === 9 ? '0' : i + 1}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="stack">
              <div className="summary-score" style={{ fontSize: 56 }}>
                {teamScore(state, team.id)}
                <span style={{ fontSize: 16, display: 'block', color: 'var(--text-dim)' }}>/ {total} scored</span>
              </div>
              <button className="btn xl primary" onClick={actions.nextTeam}>
                Next Team →
              </button>
              <button
                className="btn xl"
                onClick={() => {
                  actions.setScoreOnReveal(true)
                  actions.startTeam(team.id)
                }}
              >
                Reopen This Turn
              </button>
              <button className="btn ghost sm" onClick={() => actions.setShowScores(!state.showScores)}>
                {state.showScores ? 'Hide scoreboard on Monitor 1' : 'Show scoreboard on Monitor 1'}
              </button>
            </div>
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
            Rotation {round.rotation} · {round.guesses} turns used · Score {teamScore(state, team.id)}
          </span>
        </div>
        <div className="panel-body console">
          {shouldEnd && (
            <div className="alert warn">
              <span>All answers revealed — end the turn.</span>
              <button className="btn sm danger" onClick={actions.endTeamTurn}>
                End Team Turn
              </button>
            </div>
          )}

          <label className={`score-flip-toggle${state.scoreOnReveal ? '' : ' off'}`}>
            <input
              type="checkbox"
              checked={state.scoreOnReveal}
              onChange={(e) => actions.setScoreOnReveal(e.target.checked)}
            />
            <span>
              <b>Score on flip</b>
              {state.scoreOnReveal ? ' — ON (normal play)' : ' — OFF (show cards without scoring)'}
            </span>
          </label>

          <div className="console-question">
            <small>{question.category || 'Question'}</small>
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
                const scored = (round.scoredRevealed ?? []).includes(a.id)
                return (
                  <button
                    key={a.id}
                    className={`ans-row${revealed ? ' revealed' : ''}${revealed && !scored ? ' show-only' : ''}`}
                    onClick={() => actions.toggleReveal(a.id)}
                    title={a.note}
                  >
                    <span className="ans-num">{i + 1}</span>
                    <span className="ans-text">{a.text}</span>
                    <span className="ans-state">
                      {!revealed ? 'Hidden' : scored ? '✅ Scored' : '👁 Show only'}
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
              {roundClock}
              <div className="divider" />
              {playerBuzz}
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
                Team clock auto-starts with Start Team. Space = optional 5s buzz · Enter = next player · 1–9,0 =
                reveal · U = undo · E = end turn
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
              <p>Every team has finished a turn. Show the results board (words + last-word time), or end the game.</p>
              <div className="btn-grid">
                <button
                  className="btn xl primary"
                  onClick={() => actions.setShowResultsBoard(!state.showResultsBoard)}
                >
                  {state.showResultsBoard ? 'Hide Results Board' : 'Show Results Board'}
                </button>
                <button className="btn xl" onClick={actions.endGame}>
                  End Game
                </button>
              </div>
            </>
          )}
        </div>

        <div className="roster-overview">
          <div className="roster-overview-head">
            <span>Team Rosters</span>
            <button
              className={`btn sm ${state.showRosters ? 'primary' : 'ghost'}`}
              onClick={() => actions.setShowRosters(!state.showRosters)}
            >
              {state.showRosters ? 'Hide on Monitor 1' : 'Show on Monitor 1'}
            </button>
          </div>
          <div className="roster-overview-grid">
            {state.teams.map((t) => (
              <div
                key={t.id}
                className={`roster-overview-card${t.id === upNext?.id ? ' active' : ''}`}
                style={teamVars(t.color)}
              >
                <header>
                  <span className="dot" />
                  {t.name}
                  <em>{t.players.length}</em>
                </header>
                <div className="roster-overview-names">
                  {t.players.map((p) => (
                    <span key={p.id}>{p.name}</span>
                  ))}
                  {t.players.length === 0 && <span className="muted">No players yet</span>}
                </div>
              </div>
            ))}
            {state.teams.length === 0 && <p className="hint">Add teams on the left, or generate them from a name list.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
