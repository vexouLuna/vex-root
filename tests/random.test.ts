import { describe, expect, it } from 'vitest'
import { mulberry32 } from '@vex/ui'
import { shares, slices, spinSeconds, tierOf, TIERS, weightedPick, wheelStop } from '../src/lib/random'

const opts = (...weights: number[]) => weights.map((weight, i) => ({ name: `o${i}`, weight }))

describe('weightedPick', () => {
  it('picks by weight at the edges of the range', () => {
    const o = opts(1, 0, 3)
    expect(weightedPick(o, () => 0)).toBe(0)
    expect(weightedPick(o, () => 0.2499)).toBe(0)
    expect(weightedPick(o, () => 0.25)).toBe(2) // the zero weight is never picked
    expect(weightedPick(o, () => 0.999999999)).toBe(2)
    expect(weightedPick(opts(1, 0), () => 0.9999999999999999)).toBe(0)
  })

  it('has nothing to pick without weight', () => {
    expect(weightedPick([], () => 0.5)).toBe(-1)
    expect(weightedPick(opts(0, 0), () => 0.5)).toBe(-1)
  })

  it('comes out near the weights over many picks', () => {
    const rand = mulberry32(7)
    const counts = [0, 0, 0]
    for (let i = 0; i < 30_000; i++) counts[weightedPick(opts(1, 2, 7), rand)]++
    expect(counts[0] / 30_000).toBeCloseTo(0.1, 1)
    expect(counts[1] / 30_000).toBeCloseTo(0.2, 1)
    expect(counts[2] / 30_000).toBeCloseTo(0.7, 1)
  })
})

describe('spinSeconds', () => {
  it('is the time give or take the jitter, never under a quarter second', () => {
    expect(spinSeconds(5, 1, () => 0)).toBe(4)
    expect(spinSeconds(5, 1, () => 0.5)).toBe(5)
    expect(spinSeconds(5, 1, () => 1)).toBe(6)
    expect(spinSeconds(5, -3, () => 0)).toBe(5)
    expect(spinSeconds(0.5, 2, () => 0)).toBe(0.25)
  })
})

describe('the wheel', () => {
  it('gives each option a slice of its share', () => {
    expect(shares(opts(1, 3))).toEqual([0.25, 0.75])
    expect(slices(opts(1, 3))).toEqual([{ from: 0, to: 90 }, { from: 90, to: 360 }])
    expect(shares(opts(0, 0))).toEqual([0, 0])
  })

  it('stops the picked slice under the top pointer, after whole turns forward', () => {
    const o = opts(1, 1, 2)
    for (const [index, current] of [[0, 0], [1, 1234.5], [2, 720]] as const) {
      const r = wheelStop(o, index, current, 5, mulberry32(index))
      expect(r - current).toBeGreaterThanOrEqual(4 * 360)
      // The point now at the pointer was at angle (360 - r mod 360) on the wheel.
      const under = (360 - (r % 360)) % 360
      const s = slices(o)[index]
      expect(under).toBeGreaterThan(s.from)
      expect(under).toBeLessThan(s.to)
    }
  })
})

describe('tierOf', () => {
  it('colours rarer options rarer', () => {
    expect([0.5, 0.1, 0.05, 0.02, 0.001].map((s) => tierOf(s).name)).toEqual(TIERS.map((t) => t.name))
  })
})
