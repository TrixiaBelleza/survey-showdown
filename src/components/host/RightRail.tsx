import { useEffect, useState } from 'react'
import { ConfirmModal } from '../ConfirmModal'
import { parseParticipantNames } from '../../lib/generateTeams'
import { teamVars } from '../../lib/css'
import { useGame } from '../../store/gameStore'
import { isScoreManual, roundOf, teamScore, tiedLeaderIds } from '../../store/selectors'
import { ANSWERS_PER_QUESTION, TEAM_COLORS } from '../../types'

type Tab = 'scores' | 'questions' | 'tiebreaker' | 'setup'

type Props = {
  onRequestResetGame: () => void
  onRequestResetAll: () => void
  onRequestRemoveQuestion: (questionId: string, text: string) => void
}

export function RightRail({ onRequestResetGame, onRequestResetAll, onRequestRemoveQuestion }: Props) {
  const state = useGame()
  const actions = state.actions
  const [tab, setTab] = useState<Tab>('scores')
  const tied = tiedLeaderIds(state)

  return (
    <div className="panel">
      <div className="tabs">
        {(
          [
            ['scores', 'Scoreboard'],
            ['questions', 'Questions'],
            ['tiebreaker', 'Tiebreak'],
            ['setup', 'Setup'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="panel-body scroll">
        {tab === 'scores' && <ScoresTab tied={tied} onGoTiebreaker={() => setTab('tiebreaker')} />}
        {tab === 'questions' && <QuestionsTab onRequestRemoveQuestion={onRequestRemoveQuestion} />}
        {tab === 'tiebreaker' && <TiebreakerTab tied={tied} />}
        {tab === 'setup' && <SetupTab onRequestResetGame={onRequestResetGame} onRequestResetAll={onRequestResetAll} />}
        {tab === 'scores' && (
          <>
            <div className="divider" />
            <div className="btn-grid">
              <button className={`btn sm ${state.showScores ? 'primary' : ''}`} onClick={() => actions.setShowScores(!state.showScores)}>
                {state.showScores ? 'Hide Scores' : 'Show Scores'}
              </button>
              <button className="btn sm" onClick={actions.endGame}>
                End Game
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ScoresTab({ tied, onGoTiebreaker }: { tied: string[]; onGoTiebreaker: () => void }) {
  const state = useGame()
  const actions = state.actions

  return (
    <>
      <span className="section-label">Answers Revealed</span>
      <div className="score-table">
        {state.teams.map((t) => {
          const manual = isScoreManual(state, t.id)
          const round = roundOf(state, t.id)
          return (
            <div key={t.id} className={`score-row${state.activeTeamId === t.id ? ' active' : ''}`} style={teamVars(t.color)}>
              <span className="team-dot" />
              <span className="nm">
                {t.name}
                {manual && <span className="manual-flag"> · manual</span>}
                {!manual && round.ended && <span className="manual-flag" style={{ color: 'var(--text-faint)' }}> · final</span>}
              </span>
              <input
                className="field"
                type="number"
                min={0}
                value={teamScore(state, t.id)}
                onChange={(e) => actions.setScoreOverride(t.id, Number(e.target.value))}
              />
              <span style={{ display: 'flex', gap: 4 }}>
                <button className="btn icon" onClick={() => actions.bumpScore(t.id, 1)}>
                  +1
                </button>
                <button className="btn icon" onClick={() => actions.bumpScore(t.id, -1)}>
                  −1
                </button>
                <button className="btn icon ghost" title="Back to auto count" onClick={() => actions.setScoreOverride(t.id, null)}>
                  ⟲
                </button>
              </span>
            </div>
          )
        })}
      </div>
      {state.teams.length === 0 && <p className="hint">Add teams to see scores.</p>}
      <p className="hint">
        Scores auto-count revealed answers. Editing a value pins it as a manual score (⟲ returns to auto).
      </p>
      {tied.length > 1 && (
        <div className="alert">
          <span>
            Tie at the top: {tied.map((id) => state.teams.find((t) => t.id === id)?.name).join(', ')}
          </span>
          <button className="btn sm primary" onClick={onGoTiebreaker}>
            Tiebreaker
          </button>
        </div>
      )}
    </>
  )
}

function QuestionsTab({ onRequestRemoveQuestion }: { onRequestRemoveQuestion: (id: string, text: string) => void }) {
  const state = useGame()
  const actions = state.actions
  const [open, setOpen] = useState<string | null>(null)

  return (
    <>
      <span className="section-label">Question Assignment</span>
      {state.teams.map((t) => (
        <div key={t.id} className="assign-row" style={teamVars(t.color)}>
          <span className="team-dot" />
          <span className="nm">{t.name}</span>
          <select className="field" value={t.questionId ?? ''} onChange={(e) => actions.assignQuestion(t.id, e.target.value || null)}>
            <option value="">— none —</option>
            {state.questions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.text.slice(0, 40)}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div className="divider" />
      <div className="mini-row">
        <span className="section-label">Question Bank</span>
        <span style={{ flex: 1 }} />
        <button className="btn sm" onClick={() => setOpen(actions.addQuestion())}>
          + New
        </button>
      </div>

      {state.questions.map((q) => {
        const assignedTo = state.teams.filter((t) => t.questionId === q.id)
        const isOpen = open === q.id
        return (
          <div key={q.id} className={`q-item${isOpen ? ' on' : ''}`}>
            <button className="q-head" onClick={() => setOpen(isOpen ? null : q.id)}>
              <span className="q-text">{q.text}</span>
              <span className="q-meta">
                {assignedTo.length > 0 ? assignedTo.map((t) => t.name).join(', ') : q.category || 'unused'}
                <br />
                {q.answers.length} answers
              </span>
            </button>
            {isOpen && (
              <div className="q-body">
                <textarea
                  className="field"
                  rows={2}
                  value={q.text}
                  onChange={(e) => actions.updateQuestion(q.id, { text: e.target.value })}
                />
                <input
                  className="field"
                  placeholder="Category (optional)"
                  value={q.category ?? ''}
                  onChange={(e) => actions.updateQuestion(q.id, { category: e.target.value })}
                />
                <span className="section-label">Answers — order sets rank (1 = most common)</span>
                {q.answers.map((a, i) => (
                  <div key={a.id} className="q-answer-row">
                    <span className="idx">{i + 1}</span>
                    <input
                      className="field"
                      value={a.text}
                      onChange={(e) => actions.updateAnswer(q.id, a.id, { text: e.target.value })}
                    />
                    <span style={{ display: 'flex', gap: 3 }}>
                      <button className="btn icon ghost" onClick={() => actions.moveAnswer(q.id, a.id, -1)} disabled={i === 0}>
                        ↑
                      </button>
                      <button
                        className="btn icon ghost"
                        onClick={() => actions.moveAnswer(q.id, a.id, 1)}
                        disabled={i === q.answers.length - 1}
                      >
                        ↓
                      </button>
                    </span>
                  </div>
                ))}
                {q.answers.length !== ANSWERS_PER_QUESTION && (
                  <p className="hint">This question has {q.answers.length} answers — the board expects {ANSWERS_PER_QUESTION}.</p>
                )}
                <div className="btn-grid">
                  <button className="btn sm" onClick={() => actions.duplicateQuestion(q.id)}>
                    Duplicate
                  </button>
                  <button className="btn sm danger" onClick={() => onRequestRemoveQuestion(q.id, q.text)}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

function TiebreakerTab({ tied }: { tied: string[] }) {
  const state = useGame()
  const actions = state.actions
  const tb = state.tiebreaker
  const [picked, setPicked] = useState<string[]>(tied)

  useEffect(() => {
    if (!tb.active && tied.length > 1) setPicked(tied)
  }, [tied.join('|'), tb.active])

  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  return (
    <>
      <span className="section-label">Tiebreaker Question</span>
      <select className="field" value={tb.questionId ?? ''} onChange={(e) => actions.setTiebreakerQuestion(e.target.value)}>
        <option value="">— pick a question —</option>
        {state.questions.map((q) => (
          <option key={q.id} value={q.id}>
            {q.text.slice(0, 46)}
          </option>
        ))}
      </select>
      <p className="hint">The ★ #1 ranked answer wins the tiebreaker. Reorder answers in the Questions tab to set rank.</p>

      <div className="divider" />
      <span className="section-label">Participating Teams</span>
      {state.teams.map((t) => (
        <label key={t.id} className={`tb-team-row${picked.includes(t.id) ? ' on' : ''}`} style={teamVars(t.color)}>
          <input type="checkbox" checked={picked.includes(t.id)} onChange={() => toggle(t.id)} />
          <span className="team-dot" />
          <span style={{ flex: 1 }}>{t.name}</span>
          <span className="team-chip">{teamScore(state, t.id)}</span>
        </label>
      ))}

      <div className="divider" />
      {tb.active ? (
        <div className="stack">
          <div className="alert">
            <span>Tiebreaker running{tb.winnerTeamId ? ` — winner: ${state.teams.find((t) => t.id === tb.winnerTeamId)?.name}` : ''}</span>
          </div>
          <button className="btn ghost" onClick={actions.tbReset}>
            Reset Tiebreaker Board
          </button>
          <button className="btn danger" onClick={actions.endTiebreaker}>
            End Tiebreaker
          </button>
        </div>
      ) : (
        <button
          className="btn xl primary block"
          disabled={picked.length < 2 || !tb.questionId}
          onClick={() => tb.questionId && actions.startTiebreaker(picked, tb.questionId)}
        >
          Start Tiebreaker
        </button>
      )}
      {picked.length < 2 && <p className="hint">Select at least two teams.</p>}
    </>
  )
}

function SetupTab({ onRequestResetGame, onRequestResetAll }: { onRequestResetGame: () => void; onRequestResetAll: () => void }) {
  const state = useGame()
  const actions = state.actions
  const [roster, setRoster] = useState('')
  const [teamCount, setTeamCount] = useState(Math.max(2, state.teams.length || 4))
  const [teamLabels, setTeamLabels] = useState('')
  const [pendingGenerate, setPendingGenerate] = useState(false)
  const [lastSummary, setLastSummary] = useState<string | null>(null)

  const parsed = parseParticipantNames(roster)
  const minPer = parsed.length === 0 ? 0 : Math.floor(parsed.length / teamCount)
  const maxPer = parsed.length === 0 ? 0 : Math.ceil(parsed.length / teamCount)
  const defaultLabels = TEAM_COLORS.slice(0, teamCount)
    .map((c) => c.name)
    .join(', ')

  const runGenerate = () => {
    const names = parseParticipantNames(roster)
    if (names.length === 0) return
    const labels = teamLabels
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    actions.generateTeams(names, teamCount, labels.length > 0 ? labels : undefined)
    const sizes = useGame
      .getState()
      .teams.map((t) => `${t.name}: ${t.players.length}`)
      .join(' · ')
    setLastSummary(sizes)
    setPendingGenerate(false)
  }

  const requestGenerate = () => {
    if (parsed.length === 0) return
    if (state.teams.length > 0) {
      setPendingGenerate(true)
      return
    }
    runGenerate()
  }

  return (
    <>
      <span className="section-label">Game Name</span>
      <input className="field" value={state.gameName} onChange={(e) => actions.setGameName(e.target.value)} />

      <div className="divider" />
      <span className="section-label">Generate Teams</span>
      <p className="hint">
        Paste the full roster (one name per line, or comma-separated). Generate Teams shuffles everyone and splits them.
        Uneven sizes are fine — when the count does not divide evenly, some teams get one extra person.
      </p>
      <textarea
        className="field roster-input"
        rows={8}
        placeholder={'Anna\nBen\nCarla\nDavid\n…'}
        value={roster}
        onChange={(e) => setRoster(e.target.value)}
      />
      <div className="mini-row">
        <span className="mini-label">Teams</span>
        <input
          className="field"
          type="number"
          min={1}
          max={8}
          value={teamCount}
          onChange={(e) => setTeamCount(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
        />
      </div>
      <input
        className="field"
        placeholder={`Team names (optional) — default: ${defaultLabels}`}
        value={teamLabels}
        onChange={(e) => setTeamLabels(e.target.value)}
      />
      <p className="hint">
        {parsed.length === 0
          ? 'No names yet.'
          : minPer === maxPer
            ? `${parsed.length} unique names → ${teamCount} teams of ${minPer}`
            : `${parsed.length} unique names → ${teamCount} teams of ${minPer}–${maxPer}`}
      </p>
      <button className="btn xl primary block" disabled={parsed.length === 0} onClick={requestGenerate}>
        Generate Teams
      </button>
      {lastSummary && <p className="hint">Last generate: {lastSummary}</p>}

      <div className="divider" />
      <span className="section-label">Presentation</span>
      <label className="check">
        <input type="checkbox" checked={state.soundOn} onChange={actions.toggleSound} />
        Game sounds (card flip, countdown, buzzer)
      </label>
      <label className="check">
        <input type="checkbox" checked={state.showScores} onChange={(e) => actions.setShowScores(e.target.checked)} />
        Show the scoreboard on Monitor 1
      </label>

      <div className="divider" />
      <span className="section-label">Keyboard Shortcuts</span>
      <p className="hint">
        <b>Space</b> — start / pause the 5-second timer
        <br />
        <b>Enter</b> — next player
        <br />
        <b>1–9, 0</b> — reveal / hide answers 1–10
        <br />
        <b>U</b> — undo last reveal
        <br />
        <b>R</b> — next rotation
        <br />
        <b>E</b> — end team turn
        <br />
        <b>S</b> — toggle scoreboard on Monitor 1
      </p>

      <div className="divider" />
      <span className="section-label">Danger Zone</span>
      <button className="btn danger block" onClick={onRequestResetGame}>
        Reset Game Progress
      </button>
      <p className="hint">Clears revealed answers, scores, and rotations. Teams, players, and questions are kept.</p>
      <button className="btn danger block" onClick={onRequestResetAll}>
        Restore Sample Game
      </button>
      <p className="hint">Wipes everything and reloads the four sample teams and questions.</p>

      {pendingGenerate && (
        <ConfirmModal
          title="Replace existing teams?"
          message={`This will wipe the current ${state.teams.length} team(s) and randomly divide ${parsed.length} participants into ${teamCount} new teams. Questions stay; game progress for those teams is cleared.`}
          confirmLabel="Generate teams"
          danger
          onConfirm={runGenerate}
          onCancel={() => setPendingGenerate(false)}
        />
      )}
    </>
  )
}
