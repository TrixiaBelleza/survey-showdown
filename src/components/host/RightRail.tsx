import { useState } from 'react'
import { ConfirmModal } from '../ConfirmModal'
import { parseParticipantNames } from '../../lib/generateTeams'
import { teamVars } from '../../lib/css'
import { useGame } from '../../store/gameStore'
import { formatElapsed, isScoreManual, resultsRows, roundOf, teamScore, tiedLeaderIds } from '../../store/selectors'
import { ANSWERS_PER_QUESTION, TEAM_COLORS } from '../../types'

type Tab = 'scores' | 'questions' | 'setup'

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
            ['setup', 'Setup'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="panel-body scroll">
        {tab === 'scores' && <ScoresTab tied={tied} />}
        {tab === 'questions' && <QuestionsTab onRequestRemoveQuestion={onRequestRemoveQuestion} />}
        {tab === 'setup' && <SetupTab onRequestResetGame={onRequestResetGame} onRequestResetAll={onRequestResetAll} />}
        {tab === 'scores' && (
          <>
            <div className="divider" />
            <div className="btn-grid">
              <button
                className={`btn sm ${state.showResultsBoard ? 'primary' : ''}`}
                onClick={() => actions.setShowResultsBoard(!state.showResultsBoard)}
              >
                {state.showResultsBoard ? 'Hide Results' : 'Show Results'}
              </button>
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

function ScoresTab({ tied }: { tied: string[] }) {
  const state = useGame()
  const actions = state.actions
  const rows = resultsRows(state)

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
                {round.lastRevealElapsedMs != null && (
                  <span className="manual-flag" style={{ color: 'var(--text-faint)' }}>
                    {' '}
                    · last @ {formatElapsed(round.lastRevealElapsedMs)}
                  </span>
                )}
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
                <button className="btn icon" title="Bonus +5" onClick={() => actions.bumpScore(t.id, 5)}>
                  +5
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
        Scores default to answers revealed. Type any number, or use +1 / +5 / −1 for bonus adjustments. ⟲ returns to the
        automatic count. Last-word times come from card flips only (not from manual score edits).
      </p>
      {tied.length > 1 && (
        <div className="alert">
          <span>
            Tie on words: {tied.map((id) => state.teams.find((t) => t.id === id)?.name).join(', ')}. Faster last-word
            time wins — use Show Results.
          </span>
        </div>
      )}

      <div className="divider" />
      <span className="section-label">Results preview</span>
      <div className="score-table">
        {rows.map((r) => (
          <div key={r.team.id} className={`score-row${r.rank === 1 ? ' active' : ''}`} style={teamVars(r.team.color)}>
            <span className="team-dot" />
            <span className="nm">
              {r.rank}. {r.team.name}
            </span>
            <span className="team-chip">{r.words}</span>
            <span className="manual-flag" style={{ minWidth: 48, textAlign: 'right' }}>
              {r.lastWordAt}
            </span>
          </div>
        ))}
      </div>
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
      <span className="section-label">Team Round Timer</span>
      <p className="hint">
        Each team gets this long to reveal answers. Shown on the Game Display. Default 2:30. A warning sound plays at
        10 seconds remaining (no ticking before that).
      </p>
      <div className="mini-row">
        <span className="mini-label">Minutes</span>
        <input
          className="field"
          type="number"
          min={0}
          max={29}
          value={Math.floor(state.roundDurationMs / 60_000)}
          onChange={(e) => {
            const mins = Math.max(0, Number(e.target.value) || 0)
            const secs = Math.floor((state.roundDurationMs % 60_000) / 1000)
            actions.setRoundDurationMs(mins * 60_000 + secs * 1000)
          }}
        />
        <span className="mini-label">Seconds</span>
        <input
          className="field"
          type="number"
          min={0}
          max={59}
          value={Math.floor((state.roundDurationMs % 60_000) / 1000)}
          onChange={(e) => {
            const secs = Math.max(0, Math.min(59, Number(e.target.value) || 0))
            const mins = Math.floor(state.roundDurationMs / 60_000)
            actions.setRoundDurationMs(mins * 60_000 + secs * 1000)
          }}
        />
      </div>

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
        Game sounds (card flip, 10s warning, buzzer)
      </label>
      <label className="check">
        <input type="checkbox" checked={state.showScores} onChange={(e) => actions.setShowScores(e.target.checked)} />
        Show the scoreboard on Monitor 1
      </label>
      <label className="check">
        <input type="checkbox" checked={state.showRosters} onChange={(e) => actions.setShowRosters(e.target.checked)} />
        Show every team's roster on Monitor 1
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={state.showResultsBoard}
          onChange={(e) => actions.setShowResultsBoard(e.target.checked)}
        />
        Show the speed results board on Monitor 1
      </label>

      <div className="divider" />
      <span className="section-label">Trial Mode</span>
      <p className="hint">
        Practice with your current Setup teams and the funny trial questions. Real questions and scores are restored when you
        exit. Add at least one team first.
      </p>
      {state.trialMode ? (
        <button className="btn danger block" onClick={actions.exitTrialMode}>
          Exit Trial Mode
        </button>
      ) : (
        <button className="btn primary block" onClick={actions.enterTrialMode} disabled={state.teams.length === 0}>
          Start Trial Mode
        </button>
      )}

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
