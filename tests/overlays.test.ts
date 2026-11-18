import { describe, expect, it } from 'vitest'
import { OVERLAYS, defaults, overlayUrl, overlayValues, sameValues, valuesFromUrl, type OverlayDef } from '../src/lib/overlays'

const countdown = OVERLAYS.find((o) => o.id === 'countdown')!
const origin = 'https://vexoul.net'

describe('OVERLAYS', () => {
  it('has unique ids, and unique field keys in each', () => {
    expect(new Set(OVERLAYS.map((o) => o.id)).size).toBe(OVERLAYS.length)
    for (const o of OVERLAYS) expect(new Set(o.fields.map((f) => f.key)).size, o.id).toBe(o.fields.length)
  })
})

describe('overlayUrl', () => {
  it('leaves out zero and empty settings', () => {
    expect(overlayUrl(origin, countdown, defaults(countdown))).toBe('https://vexoul.net/obs_sources/countdown?m=5')
    expect(overlayUrl(origin, countdown, { h: 0, m: 0, s: 0, text: '' })).toBe('https://vexoul.net/obs_sources/countdown')
  })

  it('encodes text and tidies numbers typed into the form', () => {
    const url = new URL(overlayUrl(origin, countdown, { h: '1', m: -3, s: '', text: 'be right back & more' }))
    expect(Object.fromEntries(url.searchParams)).toEqual({ h: '1', text: 'be right back & more' })
  })
})

describe('the volume', () => {
  it('is the old 10% on a link without it, such as one made before the setting', () => {
    expect(overlayValues(countdown, new URLSearchParams('m=5')).vol).toBe(10)
    expect(overlayValues(countdown, {}).vol).toBe(10)
  })

  it('keeps 0 as mute through a link, and leaves the default out', () => {
    const muted = overlayUrl(origin, countdown, { ...defaults(countdown), vol: 0 })
    expect(new URL(muted).searchParams.get('vol')).toBe('0')
    expect(valuesFromUrl(countdown, muted)?.vol).toBe(0)
    expect(new URL(overlayUrl(origin, countdown, defaults(countdown))).searchParams.has('vol')).toBe(false)
  })
})

describe('valuesFromUrl', () => {
  it('reads back what overlayUrl wrote', () => {
    const values = { h: 1, m: 0, s: 30, text: 'starting soon?', sound: 'https://example.com/ding.mp3', vol: 50 }
    expect(valuesFromUrl(countdown, overlayUrl(origin, countdown, values))).toEqual(values)
  })

  it('ignores unknown settings and reads a broken number as zero', () => {
    expect(valuesFromUrl(countdown, ' https://vexoul.net/obs_sources/countdown/?m=abc&x=1 ')).toEqual({ h: 0, m: 0, s: 0, text: '', sound: '', vol: 10 })
  })

  it('refuses what is not a link to this overlay', () => {
    const other: OverlayDef = { ...countdown, id: 'other', path: '/obs_sources/other' }
    expect(valuesFromUrl(countdown, 'starting soon')).toBeNull()
    expect(valuesFromUrl(countdown, overlayUrl(origin, other, {}))).toBeNull()
  })
})

// A stand-in overlay with the field types Countdown doesn't use, so adding one that does is already covered.
const sample: OverlayDef = {
  ...countdown,
  id: 'sample',
  path: '/obs_sources/sample',
  fields: [
    { key: 'big', label: 'Big', type: 'toggle', default: true },
    { key: 'side', label: 'Side', type: 'select', default: 'right', options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
    { key: 'n', label: 'N', type: 'number', default: 3 },
  ],
}

describe('toggle and select settings', () => {
  it('start at their defaults and leave out off and the first option', () => {
    expect(defaults(sample)).toEqual({ big: true, side: 'right', n: 3 })
    expect(overlayUrl(origin, sample, defaults(sample))).toBe('https://vexoul.net/obs_sources/sample?big=1&side=right&n=3')
    expect(overlayUrl(origin, sample, { big: false, side: 'left', n: 0 })).toBe('https://vexoul.net/obs_sources/sample')
  })

  it('round-trip through a link, and a bare link means everything off', () => {
    const values = { big: true, side: 'right', n: 1.5 }
    expect(valuesFromUrl(sample, overlayUrl(origin, sample, values))).toEqual(values)
    expect(overlayValues(sample, new URLSearchParams())).toEqual({ big: false, side: 'left', n: 0 })
  })

  it('reads vue-router queries and refuses an option that is not offered', () => {
    expect(overlayValues(sample, { big: ['1', '0'], side: 'up', n: '2' })).toEqual({ big: true, side: 'left', n: 2 })
  })

  it('compares settings by the fields of the overlay only', () => {
    expect(sameValues(sample, { big: true, side: 'left', n: 1, stray: 1 }, { big: true, side: 'left', n: 1 })).toBe(true)
    expect(sameValues(sample, { big: true, side: 'left', n: 1 }, { big: false, side: 'left', n: 1 })).toBe(false)
  })
})
