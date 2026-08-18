import { AnswerCard } from '../components/AnswerCard'
import { DisplayRoundTimer } from '../components/TimerReadout'
import { teamVars } from '../lib/css'
import { useGame } from '../store/gameStore'
import { questionOfTeam, rankedTeams, resultsRows, roundOf, teamById, teamScore } from '../store/selectors'
import '../styles/display.css'

export function Display() {
  const state = useGame()

  const activeTeam = teamById(state, state.activeTeamId)
  const round = roundOf(state, state.activeTeamId)
  const question = questionOfTeam(state, state.activeTeamId)
  const trialBanner = state.trialMode ? <div className="dsp-trial-banner">Trial Mode — practice only</div> : null

  // ---------- speed results board (final standings + host toggle) ----------
  if (state.showResultsBoard || state.phase === 'game-over') {
    const rows = resultsRows(state)
    const finished = state.phase === 'game-over'
    const leaders = rows.filter((r) => r.rank === 1)
    const winner = leaders.length === 1 ? leaders[0]!.team : null
    return (
      <div className="display">
        {trialBanner}
        <div className="dsp-header">
          <span className="dsp-brand">{state.gameName}</span>
          <span className="dsp-brand">{finished ? 'Final Results' : 'Results'}</span>
        </div>
        <div className="dsp-center">
          <h1 className="dsp-title" style={{ fontSize: '7vh' }}>
            {finished ? 'Final Results' : 'Results Board'}
          </h1>
          <div className="dsp-results">
            <div className="dsp-results-head">
              <span>Team</span>
              <span>Words</span>
              <span>Last word at</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.team.id}
                className={`dsp-results-row${r.rank === 1 ? ' leader' : ''}`}
                style={teamVars(r.team.color)}
              >
                <span className="dsp-results-team">
                  <span className="dsp-score-rank">{r.rank}</span>
                  <span className="dsp-team-dot" style={{ width: '2vh', height: '2vh' }} />
                  {r.team.name}
                </span>
                <span className="dsp-results-words">{r.words}</span>
                <span className="dsp-results-time">{r.lastWordAt}</span>
              </div>
            ))}
          </div>
          {finished && winner && (
            <div className="dsp-winner" style={teamVars(winner.color)}>
              <small>Champion</small>
              <strong>{winner.name}</strong>
            </div>
          )}
          {finished && !winner && leaders.length > 1 && (
            <div className="dsp-banner">Joint leaders — same words and last-word time</div>
          )}
        </div>
      </div>
    )
  }

  // ---------- scoreboard takeover ----------
  if (state.showScores) {
    const rows = rankedTeams(state)
    return (
      <div className="display">
        <div className="dsp-header">
          <span className="dsp-brand">{state.gameName}</span>
          <span className="dsp-brand">Scoreboard</span>
        </div>
        <div className="dsp-center">
          <h1 className="dsp-title" style={{ fontSize: '9vh' }}>
            Answers Revealed
          </h1>
          <div className="dsp-scores">
            {rows.map(({ team, score, rank }) => (
              <div key={team.id} className={`dsp-score-row${rank === 1 ? ' leader' : ''}`} style={teamVars(team.color)}>
                <span className="dsp-score-rank">{rank}</span>
                <span className="dsp-score-name">{team.name}</span>
                <span className="dsp-score-value">
                  <b>{score}</b>
                  <span>Answers</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ---------- roster takeover ----------
  if (state.showRosters) {
    return (
      <div className="display">
        {trialBanner}
        <div className="dsp-header">
          <span className="dsp-brand">{state.gameName}</span>
          <span className="dsp-brand">Teams</span>
        </div>
        <div className="dsp-center">
          <h1 className="dsp-title" style={{ fontSize: '8vh' }}>
            Find Your Team
          </h1>
          <div className={`dsp-roster-grid cols-${Math.min(state.teams.length || 1, 4)}`}>
            {state.teams.map((t) => (
              <div key={t.id} className="dsp-roster-card" style={teamVars(t.color)}>
                <header>
                  <span className="dsp-team-dot" style={{ width: '2.2vh', height: '2.2vh' }} />
                  <span>{t.name}</span>
                </header>
                <ul>
                  {t.players.map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                  {t.players.length === 0 && <li className="muted">No players yet</li>}
                </ul>
              </div>
            ))}
          </div>
          {state.teams.length === 0 && <div className="dsp-empty">Add teams in the Host Control Panel</div>}
        </div>
      </div>
    )
  }

  // ---------- team turn ----------
  if (state.phase === 'team-turn' && activeTeam && question) {
    const playerName = activeTeam.players.find((p) => p.id === round.currentPlayerId)?.name ?? null
    const playerIndex = activeTeam.players.findIndex((p) => p.id === round.currentPlayerId)
    return (
      <div className="display" style={teamVars(activeTeam.color)}>
        {trialBanner}
        <div className="dsp-header">
          <div className="dsp-team">
            <span className="dsp-team-dot" />
            <span className="dsp-team-name">{activeTeam.name}</span>
          </div>
          <span className="dsp-brand">{state.gameName}</span>
          <div className="dsp-progress">
            <b>
              {round.revealed.length}/{question.answers.length}
            </b>
            <span>Answers</span>
          </div>
        </div>

        <div className="dsp-question">
          <small>Question</small>
          <p>{question.text}</p>
        </div>

        <div className="dsp-roster-strip">
          {activeTeam.players.map((p, i) => (
            <span key={p.id} className={`dsp-roster-chip${i === playerIndex ? ' active' : i < playerIndex ? ' used' : ''}`}>
              {p.name}
            </span>
          ))}
        </div>

        <div className="dsp-board">
          {question.answers.map((a, i) => (
            <AnswerCard key={a.id} index={i + 1} text={a.text} revealed={round.revealed.includes(a.id)} />
          ))}
        </div>

        <div className="dsp-footer">
          <div className="dsp-player">
            <small>Current Player</small>
            <strong>{playerName ?? 'Waiting…'}</strong>
          </div>
          <DisplayRoundTimer />
          <div className="dsp-meta">
            <span className="dsp-meta-row">
              Rotation <b>{round.rotation}</b>
            </span>
            <div className="dsp-dots">
              {activeTeam.players.map((p, i) => (
                <span key={p.id} className={`dsp-dot${i === playerIndex ? ' active' : i < playerIndex ? ' used' : ''}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---------- team summary ----------
  if (state.phase === 'team-summary' && activeTeam) {
    const score = teamScore(state, activeTeam.id)
    const total = question?.answers.length ?? 10
    return (
      <div className="display" style={teamVars(activeTeam.color)}>
        <div className="dsp-header">
          <span className="dsp-brand">{state.gameName}</span>
          <span className="dsp-brand">Round Complete</span>
        </div>
        <div className="dsp-center">
          <div className="dsp-upnext" style={teamVars(activeTeam.color)}>
            <small>Team</small>
            <strong>{activeTeam.name}</strong>
          </div>
          <div className="dsp-score-value">
            <b style={{ fontSize: '18vh' }}>{score}</b>
            <span style={{ fontSize: '3vh' }}>/ {total} Answers Revealed</span>
          </div>
        </div>
        {question && (
          <div className="dsp-board" style={{ flex: '0 0 26vh' }}>
            {question.answers.map((a, i) => (
              <AnswerCard key={a.id} index={i + 1} text={a.text} revealed={round.revealed.includes(a.id)} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ---------- lobby / title ----------
  return (
    <div className="display">
      {trialBanner}
      <div className="dsp-center">
        <h1 className="dsp-title">{state.gameName}</h1>
        <div className="dsp-subtitle">Mega · Family · Feud</div>
        {activeTeam && (
          <div className="dsp-upnext" style={teamVars(activeTeam.color)}>
            <small>Up Next</small>
            <strong>{activeTeam.name}</strong>
            {activeTeam.players.length > 0 && <em>{activeTeam.players.map((p) => p.name).join(' · ')}</em>}
          </div>
        )}
        <div className={`dsp-roster-grid cols-${Math.min(state.teams.length || 1, 4)}`}>
          {state.teams.map((t) => (
            <div key={t.id} className={`dsp-roster-card${t.id === activeTeam?.id ? ' active' : ''}`} style={teamVars(t.color)}>
              <header>
                <span className="dsp-team-dot" style={{ width: '2.2vh', height: '2.2vh' }} />
                <span>{t.name}</span>
              </header>
              <ul>
                {t.players.map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
                {t.players.length === 0 && <li className="muted">No players yet</li>}
              </ul>
            </div>
          ))}
        </div>
        {state.teams.length === 0 && <div className="dsp-empty">Add teams in the Host Control Panel</div>}
      </div>
    </div>
  )
}
