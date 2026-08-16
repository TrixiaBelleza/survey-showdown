import type { Player, Team } from '../types'
import { TEAM_COLORS } from '../types'
import { uid } from './id'

/** Split a pasted roster into unique trimmed names. Supports newlines, commas, and semicolons. */
export function parseParticipantNames(raw: string): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const piece of raw.split(/[\n,;]+/)) {
    const name = piece.trim().replace(/\s+/g, ' ')
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Randomly divides names into `teamCount` teams.
 * Sizes differ by at most one when the count does not divide evenly
 * (e.g. 47 people → 4 teams of 12, 12, 12, 11).
 */
export function buildRandomTeams(names: string[], teamCount: number, teamLabels?: string[]): Team[] {
  // Never create more teams than people — leftover empty teams would just confuse the host.
  const count = Math.max(1, Math.min(TEAM_COLORS.length, Math.floor(teamCount), Math.max(1, names.length)))
  const shuffled = shuffle(names)
  const buckets: string[][] = Array.from({ length: count }, () => [])

  // Deal round-robin so leftovers land on the first few teams (uneven is fine).
  shuffled.forEach((name, i) => {
    buckets[i % count].push(name)
  })

  return buckets.map((players, i) => {
    const color = TEAM_COLORS[i % TEAM_COLORS.length]
    const label = teamLabels?.[i]?.trim() || color.name
    return {
      id: uid('team'),
      name: label,
      color: color.value,
      questionId: null as string | null,
      players: players.map(
        (name): Player => ({
          id: uid('p'),
          name,
        }),
      ),
    }
  })
}

export function summarizeTeamSizes(teams: Team[]): string {
  return teams.map((t) => `${t.name}: ${t.players.length}`).join(' · ')
}
