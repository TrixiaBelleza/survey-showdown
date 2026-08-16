import { openDisplayWindow } from '../lib/openDisplay'
import { useGame } from '../store/gameStore'
import '../styles/host.css'

export function Launch({ onOpenHost }: { onOpenHost: () => void }) {
  const gameName = useGame((s) => s.gameName)
  const teams = useGame((s) => s.teams)

  return (
    <div className="launch">
      <div>
        <h1>{gameName}</h1>
        <div className="tagline">Host Console · Two Screens · One Operator</div>
      </div>

      <div className="launch-cards">
        <button className="launch-card" onClick={onOpenHost}>
          <span className="mon">Monitor 2 — private</span>
          <h3>Open Host Control</h3>
          <p>Teams, players, hidden answers, timer, scoring, and every game-flow button. Keep this on your laptop screen.</p>
        </button>
        <button className="launch-card" onClick={openDisplayWindow}>
          <span className="mon">Monitor 1 — shared in Teams</span>
          <h3>Open Game Display</h3>
          <p>The audience board: question, ten hidden cards, current player, countdown, and scores. Share this window in Teams.</p>
        </button>
      </div>

      <div className="launch-steps">
        1. Open <b>Game Display</b>, drag that window to the monitor you share, then press <b>F11</b> (or ⌃⌘F) for fullscreen.
        <br />
        2. Open <b>Host Control</b> on your private screen and keep it there for the whole game.
        <br />
        3. In Teams, choose <b>Share → Window</b> and pick the Game Display window only.
        <br />
        4. Sample game loaded: {teams.length} teams, {teams.reduce((n, t) => n + t.players.length, 0)} players. Edit anything from Host Control.
      </div>
    </div>
  )
}
