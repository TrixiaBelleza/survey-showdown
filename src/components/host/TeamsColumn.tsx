import { useState } from 'react'
import { teamVars } from '../../lib/css'
import { useGame } from '../../store/gameStore'
import { roundOf, teamScore } from '../../store/selectors'
import { TEAM_COLORS } from '../../types'

type Props = {
  onRequestRemoveTeam: (teamId: string, teamName: string) => void
}

export function TeamsColumn({ onRequestRemoveTeam }: Props) {
  const state = useGame()
  const actions = state.actions
  const [expanded, setExpanded] = useState<string | null>(state.teams[0]?.id ?? null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const toggle = (id: string) => setExpanded((cur) => (cur === id ? null : id))

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Teams &amp; Players</span>
        <button className="btn sm" onClick={actions.addTeam}>
          + Add Team
        </button>
      </div>
      <div className="panel-body scroll">
        {state.teams.length === 0 && <p className="hint">No teams yet. Use “+ Add Team” to build your roster.</p>}
        {state.teams.map((team, teamIndex) => {
          const round = roundOf(state, team.id)
          const isActive = state.activeTeamId === team.id
          const isOpen = expanded === team.id
          return (
            <div key={team.id} className={`team-card${isActive ? ' active' : ''}${round.ended ? ' done' : ''}`} style={teamVars(team.color)}>
              <button className="team-head" onClick={() => toggle(team.id)}>
                <span className="team-dot" />
                <span className="team-name">{team.name}</span>
                <span className="team-count">{team.players.length}p</span>
                {round.ended && <span className="team-count">done</span>}
                <span className="team-chip">{teamScore(state, team.id)}</span>
                <span className="team-count">{isOpen ? '▾' : '▸'}</span>
              </button>

              {isOpen && (
                <div className="team-body">
                  <div className="btn-grid">
                    <button
                      className={`btn sm ${isActive ? 'primary' : ''}`}
                      onClick={() => actions.setActiveTeam(team.id)}
                      disabled={isActive}
                    >
                      {isActive ? 'Active' : 'Set Active'}
                    </button>
                    <button className="btn sm go" onClick={() => actions.startTeam(team.id)}>
                      Start Team
                    </button>
                  </div>

                  <div className="mini-row">
                    <span className="mini-label">Name</span>
                    <input
                      className="field"
                      value={team.name}
                      onChange={(e) => actions.updateTeam(team.id, { name: e.target.value })}
                    />
                  </div>

                  <div className="mini-row">
                    <span className="mini-label">Color</span>
                    <div className="swatches">
                      {TEAM_COLORS.map((c) => (
                        <button
                          key={c.value}
                          title={c.name}
                          className={`swatch${team.color === c.value ? ' on' : ''}`}
                          style={{ background: c.value }}
                          onClick={() => actions.updateTeam(team.id, { color: c.value })}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mini-row">
                    <span className="mini-label">Question</span>
                    <select
                      className="field"
                      value={team.questionId ?? ''}
                      onChange={(e) => actions.assignQuestion(team.id, e.target.value || null)}
                    >
                      <option value="">— none —</option>
                      {state.questions.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.text.slice(0, 44)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="divider" />
                  <span className="section-label">{team.players.length} Players</span>

                  {team.players.map((p, i) => (
                    <div key={p.id} className={`player-row${round.currentPlayerId === p.id ? ' current' : ''}`}>
                      <span className="idx">{i + 1}</span>
                      <input
                        className="field"
                        value={p.name}
                        onChange={(e) => actions.updatePlayer(team.id, p.id, { name: e.target.value })}
                      />
                      <button className="btn icon ghost" title="Move up" onClick={() => actions.movePlayer(team.id, p.id, -1)}>
                        ↑
                      </button>
                      <button className="btn icon ghost" title="Move down" onClick={() => actions.movePlayer(team.id, p.id, 1)}>
                        ↓
                      </button>
                      <button className="btn icon ghost" title="Remove player" onClick={() => actions.removePlayer(team.id, p.id)}>
                        ✕
                      </button>
                    </div>
                  ))}

                  <form
                    className="mini-row"
                    onSubmit={(e) => {
                      e.preventDefault()
                      actions.addPlayer(team.id, drafts[team.id] ?? '')
                      setDrafts((d) => ({ ...d, [team.id]: '' }))
                    }}
                  >
                    <input
                      className="field"
                      placeholder="Add participant…"
                      value={drafts[team.id] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [team.id]: e.target.value }))}
                    />
                    <button className="btn sm" type="submit">
                      +
                    </button>
                  </form>

                  <div className="divider" />
                  <div className="btn-grid three">
                    <button className="btn sm ghost" onClick={() => actions.moveTeam(team.id, -1)} disabled={teamIndex === 0}>
                      ↑ Move
                    </button>
                    <button
                      className="btn sm ghost"
                      onClick={() => actions.moveTeam(team.id, 1)}
                      disabled={teamIndex === state.teams.length - 1}
                    >
                      ↓ Move
                    </button>
                    <button className="btn sm danger" onClick={() => onRequestRemoveTeam(team.id, team.name)}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
