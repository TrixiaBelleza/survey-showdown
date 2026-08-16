import type { CSSProperties } from 'react'

export type StyleVars = CSSProperties & Record<`--${string}`, string>

export function teamVars(color: string): StyleVars {
  return { '--team-color': color }
}
