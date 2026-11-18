// What the random overlays (wheel, case opening, card draw) share: a weighted pick and how long it spins.
import type { OverlayOption } from './overlays'

export type Rand = () => number

/** The index of one option, each as likely as its weight; -1 when no option has any weight. */
export function weightedPick(options: readonly OverlayOption[], rand: Rand = Math.random): number {
  const total = options.reduce((sum, o) => sum + o.weight, 0)
  if (!(total > 0)) return -1
  let at = rand() * total
  for (const [i, o] of options.entries()) {
    if (o.weight <= 0) continue
    at -= o.weight
    if (at < 0) return i
  }
  // rand() of almost 1 and rounding: the last option with a weight.
  return options.findLastIndex((o) => o.weight > 0)
}

/** Spin seconds give or take up to `jitter` seconds, never under a quarter second. */
export function spinSeconds(seconds: number, jitter: number, rand: Rand = Math.random): number {
  return Math.max(0.25, seconds + (rand() * 2 - 1) * Math.max(0, jitter))
}

/** Each option's share of the total weight (0 for all when nothing has weight). */
export function shares(options: readonly OverlayOption[]): number[] {
  const total = options.reduce((sum, o) => sum + o.weight, 0)
  return options.map((o) => (total > 0 ? o.weight / total : 0))
}

/** Where on the wheel (degrees, clockwise from the top) each slice starts and ends; a slice is its share. */
export function slices(options: readonly OverlayOption[]): { from: number; to: number }[] {
  let at = 0
  return shares(options).map((s) => {
    const from = at
    at += s * 360
    return { from, to: at }
  })
}

/** The wheel's next rotation (degrees, growing) that stops a random point of slice `index` under the top
 *  pointer, after at least `turns` whole turns from `current`. */
export function wheelStop(options: readonly OverlayOption[], index: number, current: number, turns = 5, rand: Rand = Math.random): number {
  const s = slices(options)[index]
  if (!s) return current
  const margin = (s.to - s.from) * 0.1 // not right on a line, where the pointer reads ambiguous
  const point = s.from + margin + rand() * (s.to - s.from - 2 * margin)
  // Rotating the wheel by r brings the point at angle a to a + r; it is under the pointer when that is 0 mod 360.
  const base = current - (current % 360) + turns * 360
  return base + ((360 - point) % 360)
}

/** CS-style rarity colours, rarest last. */
export const TIERS = [
  { name: 'common', color: '#4b69ff' },
  { name: 'rare', color: '#8847ff' },
  { name: 'epic', color: '#d32ce6' },
  { name: 'legendary', color: '#eb4b4b' },
  { name: 'mythic', color: '#e4ae39' },
] as const

/** An option's rarity colour by its share of the weight: at least 20% common, 8% rare, 3% epic, 1% legendary,
 *  below that mythic. */
export function tierOf(share: number): (typeof TIERS)[number] {
  const index = share >= 0.2 ? 0 : share >= 0.08 ? 1 : share >= 0.03 ? 2 : share >= 0.01 ? 3 : 4
  return TIERS[index]
}
