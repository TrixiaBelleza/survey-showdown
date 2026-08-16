import { AnswerCard } from '../components/AnswerCard'
import { DisplayTimer } from '../components/TimerReadout'
import { teamVars } from '../lib/css'
import { useGame } from '../store/gameStore'
import { questionOfTeam, rankedTeams, roundOf, teamById, teamScore } from '../store/selectors'
import { ROTATION_LIMIT } from '../types'
import '../styles/display.css'

export function Display() {
  const state = useGame()

  const activeTeam = teamById(state, state.activeTeamId)
  const round = roundOf(state, state.activeTeamId)
  const question = questionOfTeam(state, state.activeTeamId)
  const tb = state.tiebreaker
  const tbQuestion = state.questions.find((q) => q.id === tb.questionId) ?? null
  const tbTeam = teamById(state, tb.currentTeamId)

  // ---------- scoreboard takeover ----------
  if (state.showScores || state.phase === 'game-over') {
    const rows = rankedTeams(state)
    const finished = state.phase === 'game-over'
    const winner = tb.winnerTeamId ? teamById(state, tb.winnerTeamId) : rows[0]?.rank === 1 && rows.filter((r) => r.rank === 1).length === 1 ? rows[0].team : null
    return (
      <div className="display">
        <div className="dsp-header">
          <span className="dsp-brand">{state.gameName}</span>
          <span className="dsp-brand">{finished ? 'Final Standings' : 'Scoreboard'}</span>
        </div>
        <div className="dsp-center">
          <h1 className="dsp-title" style={{ fontSize: '9vh' }}>
            {finished ? 'Final Scores' : 'Answers Revealed'}
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
          {finished && winner && (
            <div className="dsp-winner" style={teamVars(winner.color)}>
              <small>Champion</small>
              <strong>{winner.name}</strong>
            </div>
          )}
          {finished && !winner && <div className="dsp-banner">Tie at the top — tiebreaker required</div>}
        </div>
      </div>
    )
  }

  // ---------- tiebreaker ----------
  if (state.phase === 'tiebreaker' && tb.active) {
    const winner = teamById(state, tb.winnerTeamId)
    const tbPlayerName = tbTeam?.players.find((p) => p.id === tb.currentPlayerId)?.name ?? null
    return (
      <div className="display" style={teamVars(tbTeam?.color ?? '#6d8cff')}>
        <div className="dsp-header">
          <div className="dsp-team">
            <span className="dsp-team-dot" />
            <span className="dsp-team-name">Tiebreaker</span>
          </div>
          <div className="dsp-tb-teams">
            {tb.teamIds.map((id) => {
              const t = teamById(state, id)
              if (!t) return null
              return (
                <div key={id} className={`dsp-tb-team${id === tb.currentTeamId ? ' active' : ''}`} style={teamVars(t.color)}>
                  <span className="dsp-team-dot" style={{ width: '2.2vh', height: '2.2vh' }} />
                  {t.name}
                </div>
              )
            })}
          </div>
        </div>

        <div className="dsp-question">
          <small>Tiebreaker Question — first team to reveal the #1 answer wins</small>
          <p>{tbQuestion?.text ?? 'No tiebreaker question selected'}</p>
        </div>

        {winner ? (
          <div className="dsp-center">
            <div className="dsp-winner" style={teamVars(winner.color)}>
              <small>Tiebreaker Winner</small>
              <strong>{winner.name}</strong>
            </div>
            <div className="dsp-banner">Revealed the #1 answer</div>
          </div>
        ) : (
          <div className="dsp-board">
            {(tbQuestion?.answers ?? []).map((a, i) => (
              <AnswerCard key={a.id} index={i + 1} text={a.text} revealed={tb.revealed.includes(a.id)} highlight={a.rank === 1} />
            ))}
          </div>
        )}

        {!winner && (
          <div className="dsp-footer">
            <div className="dsp-player" style={teamVars(tbTeam?.color ?? '#6d8cff')}>
              <small>{tbTeam ? `${tbTeam.name} — Current Player` : 'Current Player'}</small>
              <strong>{tbPlayerName ?? '—'}</strong>
            </div>
            <DisplayTimer />
            <div className="dsp-meta">
              <span className="dsp-meta-row">
                Revealed <b>{tb.revealed.length}</b> / {tbQuestion?.answers.length ?? 0}
              </span>
              <span className="dsp-meta-row">Teams alternate turns</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---------- team turn ----------
  if (state.phase === 'team-turn' && activeTeam && question) {
    const playerName = activeTeam.players.find((p) => p.id === round.currentPlayerId)?.name ?? null
    const playerIndex = activeTeam.players.findIndex((p) => p.id === round.currentPlayerId)
    return (
      <div className="display" style={teamVars(activeTeam.color)}>
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
          <small>Survey Question</small>
          <p>{question.text}</p>
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
          <DisplayTimer />
          <div className="dsp-meta">
            <span className="dsp-meta-row">
              Rotation <b>{Math.min(round.rotation, ROTATION_LIMIT)}</b> of {ROTATION_LIMIT}
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
      <div className="dsp-center">
        <h1 className="dsp-title">{state.gameName}</h1>
        <div className="dsp-subtitle">Survey · Showdown · Live</div>
        {activeTeam ? (
          <div className="dsp-upnext" style={teamVars(activeTeam.color)}>
            <small>Up Next</small>
            <strong>{activeTeam.name}</strong>
          </div>
        ) : (
          <div className="dsp-lobby-teams">
            {state.teams.map((t) => (
              <div key={t.id} className="dsp-lobby-team" style={teamVars(t.color)}>
                <span className="dsp-team-dot" style={{ width: '2.4vh', height: '2.4vh' }} />
                {t.name}
                <em>{t.players.length} players</em>
              </div>
            ))}
          </div>
        )}
        {state.teams.length === 0 && <div className="dsp-empty">Add teams in the Host Control Panel</div>}
      </div>
    </div>
  )
}