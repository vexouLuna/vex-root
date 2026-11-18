import { describe, expect, it } from 'vitest'
import {
  OPTIONS_MAX,
  OPTION_NAME_MAX,
  OVERLAYS,
  PRESET_PARAM,
  exportOptions,
  fileUrl,
  importOptions,
  isFileRef,
  overlayUrl,
  parseOptions,
  presetUrl,
  sameValues,
  valuesFromUrl,
  type OverlayDef,
} from '../src/lib/overlays'

const ID = 'AbCdEfGhIjKlMnOpQrStUv'

describe('parseOptions', () => {
  it('reads options, plain names and {options}, as data or JSON', () => {
    const want = [{ name: 'a', weight: 1 }, { name: 'b', weight: 2 }]
    expect(parseOptions(['a', { name: 'b', weight: 2 }])).toEqual(want)
    expect(parseOptions(JSON.stringify({ options: want }))).toEqual(want)
  })

  it('tidies each entry and drops the broken ones', () => {
    expect(
      parseOptions([
        { name: '  spaced  ', weight: '3', color: '#AABBCC', image: ID },
        { name: 'bad weight', weight: -1, color: 'red', image: 'javascript:alert(1)' },
        { name: 'zero', weight: 0 },
        { name: '' },
        { weight: 5 },
        null,
        42,
        { name: 'huge', weight: 1e12, image: 'https://example.com/x.png' },
      ]),
    ).toEqual([
      { name: 'spaced', weight: 3, color: '#aabbcc', image: ID },
      { name: 'bad weight', weight: 1 },
      { name: 'zero', weight: 0 },
      { name: 'huge', weight: 1_000_000, image: 'https://example.com/x.png' },
    ])
  })

  it('caps the list and the names', () => {
    const many = parseOptions(Array.from({ length: OPTIONS_MAX + 5 }, (_, i) => 'x'.repeat(OPTION_NAME_MAX + 10) + i))!
    expect(many).toHaveLength(OPTIONS_MAX)
    expect(many[0].name).toHaveLength(OPTION_NAME_MAX)
  })

  it('refuses what is not a list', () => {
    for (const raw of ['nope', '{"a":1}', 3, { options: 'x' }, null]) expect(parseOptions(raw)).toBeUndefined()
  })
})

describe('JSON import and export', () => {
  it('round-trips', () => {
    const options = [{ name: 'Red', weight: 2, color: '#ff0000' }, { name: 'Blue', weight: 1, image: ID }]
    expect(importOptions(exportOptions(options))).toEqual({ options })
  })

  it('says why a file is refused', () => {
    expect(importOptions('not json')).toEqual({ error: 'That file is not a JSON list of options.' })
    expect(importOptions('[{"weight":1}]')).toEqual({ error: 'That file has no option with a name.' })
  })
})

describe('files', () => {
  it('takes upload ids and https URLs only', () => {
    expect(isFileRef(ID)).toBe(true)
    expect(isFileRef('https://example.com/a.mp3')).toBe(true)
    for (const bad of ['http://example.com/a.mp3', 'javascript:alert(1)', 'data:image/png;base64,xx', 'short', '../x']) expect(isFileRef(bad), bad).toBe(false)
  })

  it('points an upload at vex-auth and leaves a URL as it is', () => {
    expect(fileUrl('https://auth.vexoul.net', ID)).toBe(`https://auth.vexoul.net/v2/public/files/${ID}`)
    expect(fileUrl('https://auth.vexoul.net', 'https://example.com/a.png')).toBe('https://example.com/a.png')
    expect(fileUrl('https://auth.vexoul.net', 'javascript:alert(1)')).toBe('')
    expect(fileUrl('https://auth.vexoul.net', undefined)).toBe('')
  })
})

const listy: OverlayDef = {
  ...OVERLAYS[0],
  id: 'listy',
  path: '/obs_sources/listy',
  fields: [
    { key: 'o', label: 'Options', type: 'options', default: [{ name: 'a', weight: 1 }] },
    { key: 'snd', label: 'Sound', type: 'file', accept: 'audio', default: '' },
  ],
}

describe('option and file settings in a link', () => {
  it('carry the list as JSON and read it back', () => {
    const values = { o: [{ name: 'a & b', weight: 2, color: '#123456' }], snd: ID }
    const url = overlayUrl('https://vexoul.net', listy, values)
    expect(new URL(url).searchParams.get('o')).toBe('[{"name":"a & b","weight":2,"color":"#123456"}]')
    expect(valuesFromUrl(listy, url)).toEqual(values)
  })

  it('leave out an empty list and refuse a bad file', () => {
    expect(overlayUrl('https://vexoul.net', listy, { o: [], snd: 'javascript:x' })).toBe('https://vexoul.net/obs_sources/listy')
  })

  it('compare lists by content', () => {
    expect(sameValues(listy, { o: [{ name: 'a', weight: 1 }], snd: '' }, { o: [{ name: 'a', weight: 1 }], snd: '' })).toBe(true)
    expect(sameValues(listy, { o: [{ name: 'a', weight: 1 }], snd: '' }, { o: [{ name: 'a', weight: 2 }], snd: '' })).toBe(false)
  })
})

describe('presetUrl', () => {
  it('carries only the public id', () => {
    expect(presetUrl('https://vexoul.net', listy, ID)).toBe(`https://vexoul.net/obs_sources/listy?${PRESET_PARAM}=${ID}`)
  })

  it('is a key no overlay field uses', () => {
    for (const o of OVERLAYS) expect(o.fields.map((f) => f.key), o.id).not.toContain(PRESET_PARAM)
  })
})
