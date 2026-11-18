// The OBS browser sources and their settings. Everything else is built from this list: the routes (main.ts),
// the forms and links on /obs_sources (OverlayForm.vue), and what each overlay's page reads from its address.
//
// To add an overlay: write its page in src/pages/ (call useBrowserSource() and useOverlayValues() there) and add
// one entry to OVERLAYS. A setting left out of a link means its field's "empty" value (see empty()), so the page
// must treat a missing setting as that. A link may instead carry a saved preset's public id (`?p=`), which the
// page reads from vex-auth: that is how settings too big for a link (an option list) reach OBS.
import { siteInfo } from '@vex/ui'
import type { Component } from 'vue'

/** One entry of an option list (a wheel's slices, a case's items, a deck's cards). */
export interface OverlayOption {
  name: string
  /** How likely it is, relative to the others; 0 never comes up. */
  weight: number
  /** #rrggbb, or left out for the overlay's own colour. */
  color?: string
  /** A file (see isFileRef), or left out for a placeholder. */
  image?: string
}

interface FieldBase {
  /** The query parameter the overlay's page reads. */
  key: string
  label: string
  help?: string
}
export type OverlayField =
  | (FieldBase & { type: 'number'; default: number; max?: number })
  /** `pattern`: what a valid value looks like (anything else counts as not set); `lower`: it is lowercased first. */
  | (FieldBase & { type: 'text'; default: string; placeholder?: string; pattern?: RegExp; lower?: boolean })
  | (FieldBase & { type: 'toggle'; default: boolean })
  /** Its first option is the one a link leaves out. */
  | (FieldBase & { type: 'select'; default: string; options: { value: string; label: string }[] })
  /** A list of options with weights; `images` offers a picture per option. Carried in a link as JSON. */
  | (FieldBase & { type: 'options'; default: OverlayOption[]; images?: boolean })
  /** An uploaded file or an https URL (see isFileRef). */
  | (FieldBase & { type: 'file'; default: string; accept: 'image' | 'audio' })

export interface OverlayDef {
  /** Also names its saved presets in vex-auth: `obs.<id>`. */
  id: string
  name: string
  about: string
  /** Where its page is. `{key}` stands for a text field's value (an overlay of one channel): that field is part of
   *  the path, not of the query, and the link is not made until it is set. */
  path: string
  /** The page when it lives in this site; left out, the overlay's page is on another site, at `base`. */
  page?: () => Promise<{ default: Component }>
  /** The origin its page is on when that is another site (`siteInfo(...).href`); no route is made here. */
  base?: string
  fields: OverlayField[]
}

export type OverlayValue = string | number | boolean | OverlayOption[]
export type OverlayValues = Record<string, OverlayValue>

export const OPTIONS_MAX = 100
export const OPTION_NAME_MAX = 80
const WEIGHT_MAX = 1_000_000
/** Past this a link is unwieldy (and some tools cut it): save the settings as a preset and use its link. */
export const LINK_MAX = 2000
/** The query parameter a preset link carries its public id in. No field may use it. */
export const PRESET_PARAM = 'p'

const VOLUME = (fallback: number): OverlayField => ({ key: 'vol', label: 'Volume %', type: 'number', default: fallback, max: 100 })
const SAMPLE: OverlayOption[] = [
  { name: 'Yes', weight: 1 },
  { name: 'No', weight: 1 },
  { name: 'Maybe', weight: 1 },
]
/** What the wheel, the case and the cards share: the options, how long a spin lasts, its sounds and Remove. */
const RANDOM_FIELDS = (images: boolean): OverlayField[] => [
  { key: 'o', label: 'Options', type: 'options', default: SAMPLE, images, help: 'An option comes up as often as its weight says, against the others.' },
  { key: 't', label: 'Spin seconds', type: 'number', default: 5 },
  // At random, so no two spins last the same.
  { key: 'j', label: '± seconds', type: 'number', default: 1 },
  { key: 'spin', label: 'Sound while spinning', type: 'file', accept: 'audio', default: '' },
  { key: 'done', label: 'Sound at the result', type: 'file', accept: 'audio', default: '' },
  VOLUME(50),
  { key: 'rm', label: 'Offer Remove', type: 'toggle', default: true, help: 'After a result: drop it for the next spins.' },
]
const CONTROLS_NOTE = 'Spin with the buttons under it: make the source 40px taller than you want to show, crop that off the bottom, and use OBS’s Interact window.'

export const OVERLAYS: OverlayDef[] = [
  {
    id: 'countdown',
    name: 'Countdown',
    about: 'Counts down, then flashes a bell and loops a quiet alarm (or your sound). Pause, restart and add time with the buttons under it: make the source 40px taller than you want to show and crop that off the bottom, then use OBS’s Interact window.',
    path: '/obs_sources/countdown',
    page: () => import('@/pages/CountdownPage.vue'),
    fields: [
      { key: 'h', label: 'Hours', type: 'number', default: 0 },
      { key: 'm', label: 'Minutes', type: 'number', default: 5 },
      { key: 's', label: 'Seconds', type: 'number', default: 0 },
      { key: 'text', label: 'Text', type: 'text', default: '' },
      { key: 'sound', label: 'Sound at zero', type: 'file', accept: 'audio', default: '', help: 'Left empty: the quiet alarm.' },
      VOLUME(10),
    ],
  },
  {
    id: 'wheel',
    name: 'Wheel of luck',
    about: `A wheel with a slice per option, as big as its weight. ${CONTROLS_NOTE}`,
    path: '/obs_sources/wheel',
    page: () => import('@/pages/WheelPage.vue'),
    fields: RANDOM_FIELDS(false),
  },
  {
    id: 'case',
    name: 'Case opening',
    about: `A case that opens onto a strip of items rolling past a marker, stopping on a weighted pick. Each item is coloured by how rare its weight makes it (blue, purple, pink, red, gold), unless it has its own colour. ${CONTROLS_NOTE}`,
    path: '/obs_sources/case',
    page: () => import('@/pages/CasePage.vue'),
    fields: [{ key: 'img', label: 'Case picture', type: 'file', accept: 'image', default: '' }, ...RANDOM_FIELDS(true)],
  },
  {
    id: 'cards',
    name: 'Card draw',
    about: `A deck that shuffles for the spin time, then turns over one card, a weighted pick. Each option's picture is its card's face; the back is one picture for the deck. ${CONTROLS_NOTE}`,
    path: '/obs_sources/cards',
    page: () => import('@/pages/CardsPage.vue'),
    fields: [{ key: 'back', label: 'Card back', type: 'file', accept: 'image', default: '' }, ...RANDOM_FIELDS(true)],
  },
  {
    id: 'chat',
    name: 'Chat',
    about: 'The channel’s chat as it is said, over your stream, with its emotes, badges and name colours. A deleted message, a timed-out chatter’s messages and a cleared chat disappear. Needs the bot in the channel, with its public chat log on. The page lives on dtp.vexoul.net.',
    path: '/overlay/{login}',
    base: siteInfo('dtp').href,
    fields: [
      { key: 'login', label: 'Channel', type: 'text', default: '', placeholder: 'twitch login', pattern: /^[a-z0-9_]{1,25}$/, lower: true, help: 'The channel’s Twitch login.' },
      { key: 'size', label: 'Text size (px)', type: 'number', default: 24, max: 96, help: '12 to 96.' },
      { key: 'emote', label: 'Emote size (px)', type: 'number', default: 0, max: 192, help: '0: a little over the text.' },
      { key: 'color', label: 'Name colour', type: 'text', default: '', placeholder: 'rrggbb', pattern: /^#?[0-9a-f]{6}$/i, help: 'Empty: each chatter’s own colour. Else one colour for every name, like ff8800.' },
      { key: 'names', label: 'Names', type: 'select', default: 'display', options: [{ value: 'display', label: 'Display name' }, { value: 'login', label: 'Login' }, { value: 'both', label: 'Both, when they differ' }] },
      { key: 'badges', label: 'Badges', type: 'select', default: 'on', options: [{ value: 'on', label: 'Shown' }, { value: 'off', label: 'Hidden' }] },
      { key: 'pronouns', label: 'Pronouns', type: 'toggle', default: false, help: 'Asks pronouns.alejo.io (the Twitch Chat Pronouns service) for each chatter’s pronouns: it receives their Twitch login from the browser OBS runs. Off sends nothing.' },
      { key: 'lines', label: 'Most lines', type: 'number', default: 20, max: 100 },
      { key: 'fade', label: 'Fade after (seconds)', type: 'number', default: 0, max: 3600, help: '0: lines stay until newer ones push them off. Else at least 5.' },
      { key: 'history', label: 'Start with (lines)', type: 'number', default: 0, max: 100, help: 'Recent lines from the chat log, shown at the start.' },
      { key: 'notices', label: 'Subs, raids and the like', type: 'toggle', default: false },
      { key: 'commands', label: 'Commands', type: 'toggle', default: false, help: 'Show messages that are commands, like !so someone.' },
      { key: 'shadow', label: 'Text shadow', type: 'select', default: 'on', options: [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }] },
    ],
  },
]

const FILE_ID = /^[A-Za-z0-9_-]{16,64}$/
const COLOR = /^#[0-9a-f]{6}$/i

/** A file setting holds a vex-auth upload's id or an https URL to a file somewhere else. */
export function isFileRef(value: string): boolean {
  if (FILE_ID.test(value)) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/** Where a file setting points: an upload's public address on vex-auth (at `authBase`), or the URL itself. */
export function fileUrl(authBase: string, ref: string | undefined): string {
  if (!ref || !isFileRef(ref)) return ''
  return FILE_ID.test(ref) ? `${authBase}/v2/public/files/${ref}` : ref
}

/** An option list out of whatever holds one (a form, a preset, a link, an imported file): a list of options or of
 *  plain names, or `{options: [...]}`, as data or as JSON. Broken entries are dropped and the rest tidied; undefined
 *  when it isn't a list at all. */
export function parseOptions(raw: unknown): OverlayOption[] | undefined {
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      return undefined
    }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'options' in raw) raw = raw.options
  if (!Array.isArray(raw)) return undefined
  const out: OverlayOption[] = []
  for (const item of raw as unknown[]) {
    if (out.length >= OPTIONS_MAX) break
    const o = (typeof item === 'string' ? { name: item } : item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name.trim().slice(0, OPTION_NAME_MAX) : ''
    if (!name) continue
    const w = o.weight === undefined || o.weight === '' ? 1 : Number(o.weight)
    const option: OverlayOption = { name, weight: Number.isFinite(w) && w >= 0 ? Math.min(w, WEIGHT_MAX) : 1 }
    if (typeof o.color === 'string' && COLOR.test(o.color)) option.color = o.color.toLowerCase()
    if (typeof o.image === 'string' && isFileRef(o.image)) option.image = o.image
    out.push(option)
  }
  return out
}

/** An option list as a file to keep or share. */
export const exportOptions = (options: readonly OverlayOption[]): string => `${JSON.stringify({ options }, null, 2)}\n`

/** An imported file's options, or why it can't be used. */
export function importOptions(text: string): { options: OverlayOption[] } | { error: string } {
  const options = parseOptions(text)
  if (!options) return { error: 'That file is not a JSON list of options.' }
  if (!options.length) return { error: 'That file has no option with a name.' }
  return { options }
}

/** What a setting is when a link doesn't carry it. */
function empty(f: OverlayField): OverlayValue {
  if (f.type === 'number') return 0
  if (f.type === 'toggle') return false
  if (f.type === 'options') return []
  return f.type === 'select' ? (f.options[0]?.value ?? '') : ''
}

/** One setting out of whatever holds it (a form field, a saved preset, a query string), or undefined if it
 *  isn't a value this field can have. */
function parse(f: OverlayField, raw: unknown): OverlayValue | undefined {
  if (raw === undefined || raw === null) return undefined
  if (f.type === 'number') {
    const n = Number(raw)
    return raw !== '' && Number.isFinite(n) && n >= 0 && n <= (f.max ?? Infinity) ? n : undefined
  }
  if (f.type === 'toggle') return raw === true || raw === '1' ? true : raw === false || raw === '0' ? false : undefined
  if (f.type === 'options') return parseOptions(raw)
  if (typeof raw !== 'string') return undefined
  if (f.type === 'file') return raw === '' || isFileRef(raw) ? raw : undefined
  if (f.type === 'text' && f.pattern) {
    const text = f.lower ? raw.trim().toLowerCase() : raw.trim()
    return text === '' || f.pattern.test(text) ? text : undefined
  }
  return f.type === 'select' && !f.options.some((o) => o.value === raw) ? undefined : raw
}

/** The overlay's settings out of anything keyed like them; a missing or broken one is its `fallback`. */
export function coerce(def: OverlayDef, get: (key: string) => unknown, fallback: 'default' | 'empty' = 'default'): OverlayValues {
  return Object.fromEntries(def.fields.map((f) => [f.key, parse(f, get(f.key)) ?? (fallback === 'default' ? structuredClone(f.default) : empty(f))]))
}

export const defaults = (def: OverlayDef): OverlayValues => coerce(def, () => undefined)

/** The settings in a query string (a URLSearchParams, or vue-router's route.query). */
export function overlayValues(def: OverlayDef, query: URLSearchParams | Record<string, unknown>): OverlayValues {
  return coerce(def, (k) => queryParam(query, k), 'empty')
}

/** One parameter of a query string, the first when it is repeated. */
export function queryParam(query: URLSearchParams | Record<string, unknown>, key: string): unknown {
  if (query instanceof URLSearchParams) return query.get(key)
  const v = query[key]
  return Array.isArray(v) ? v[0] : v
}

const PLACEHOLDER = /\{(\w+)\}/g
/** The keys a path takes from the settings. */
const pathKeys = (def: OverlayDef): string[] => [...def.path.matchAll(PLACEHOLDER)].map((m) => m[1]!)

/** The overlay's path with its settings in it, or null while one of them is not set. */
function pathFor(def: OverlayDef, values: OverlayValues): string | null {
  let missing = false
  const path = def.path.replace(PLACEHOLDER, (_, k: string) => {
    const v = String(values[k] ?? '')
    if (!v) missing = true
    return encodeURIComponent(v)
  })
  return missing ? null : path
}

/** The browser-source link, or '' while a setting its path needs is not set. Settings at their empty value are left out. */
export function overlayUrl(origin: string, def: OverlayDef, values: OverlayValues): string {
  const clean = coerce(def, (k) => values[k], 'empty')
  const path = pathFor(def, clean)
  if (path === null) return ''
  const inPath = pathKeys(def)
  const query = new URLSearchParams()
  for (const f of def.fields) {
    if (inPath.includes(f.key)) continue
    const v = clean[f.key]
    if (Array.isArray(v)) {
      if (v.length) query.set(f.key, JSON.stringify(v))
    } else if (v !== empty(f)) query.set(f.key, typeof v === 'boolean' ? '1' : String(v))
  }
  const qs = query.toString()
  return `${def.base ?? origin}${path}${qs ? `?${qs}` : ''}`
}

/** A saved preset's link: the overlay reads its settings from vex-auth, so editing the preset changes the source.
 *  `values` are the preset's, for a path that needs some of them (the channel). */
export function presetUrl(origin: string, def: OverlayDef, publicId: string, values: OverlayValues = {}): string {
  const path = pathFor(def, coerce(def, (k) => values[k], 'empty'))
  return path === null ? '' : `${def.base ?? origin}${path}?${new URLSearchParams({ [PRESET_PARAM]: publicId })}`
}

/** The settings a link made by overlayUrl carries, or null when it isn't a link to this overlay. */
export function valuesFromUrl(def: OverlayDef, link: string): OverlayValues | null {
  let url: URL
  try {
    url = new URL(link.trim())
  } catch {
    return null
  }
  const keys = pathKeys(def)
  const pattern = def.path.split(PLACEHOLDER).map((part, i) => (i % 2 ? '([^/]+)' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('')
  const m = new RegExp(`^${pattern}$`).exec(url.pathname.replace(/\/+$/, ''))
  if (!m) return null
  const fromPath = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1]!)]))
  return coerce(def, (k) => (k in fromPath ? fromPath[k] : queryParam(url.searchParams, k)), 'empty')
}

/** Whether two sets of settings are the same overlay state. */
export const sameValues = (def: OverlayDef, a: OverlayValues, b: OverlayValues): boolean =>
  def.fields.every((f) => JSON.stringify(a[f.key]) === JSON.stringify(b[f.key]))
