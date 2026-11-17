// The OBS browser sources and their settings. Everything else is built from this list: the routes (main.ts),
// the forms and links on /obs_sources (OverlayForm.vue), and what each overlay's page reads from its address.
//
// To add an overlay: write its page in src/pages/ (call useBrowserSource() and overlayValues() there) and add
// one entry to OVERLAYS. A setting left out of a link means its field's "empty" value (see EMPTY), so the page
// must treat a missing setting as that.
import type { Component } from 'vue'

interface FieldBase {
  /** The query parameter the overlay's page reads. */
  key: string
  label: string
  help?: string
}
export type OverlayField =
  | (FieldBase & { type: 'number'; default: number })
  | (FieldBase & { type: 'text'; default: string; placeholder?: string })
  | (FieldBase & { type: 'toggle'; default: boolean })
  /** Its first option is the one a link leaves out. */
  | (FieldBase & { type: 'select'; default: string; options: { value: string; label: string }[] })

export interface OverlayDef {
  /** Also names its saved presets in vex-auth: `obs.<id>`. */
  id: string
  name: string
  about: string
  path: string
  page: () => Promise<{ default: Component }>
  fields: OverlayField[]
}

export type OverlayValue = string | number | boolean
export type OverlayValues = Record<string, OverlayValue>

export const OVERLAYS: OverlayDef[] = [
  {
    id: 'countdown',
    name: 'Countdown',
    about: 'Counts down, then flashes a bell and loops a quiet alarm.',
    path: '/obs_sources/countdown',
    page: () => import('@/pages/CountdownPage.vue'),
    fields: [
      { key: 'h', label: 'Hours', type: 'number', default: 0 },
      { key: 'm', label: 'Minutes', type: 'number', default: 5 },
      { key: 's', label: 'Seconds', type: 'number', default: 0 },
      { key: 'text', label: 'Text', type: 'text', default: '' },
    ],
  },
]

/** What a setting is when a link doesn't carry it. */
function empty(f: OverlayField): OverlayValue {
  if (f.type === 'number') return 0
  if (f.type === 'toggle') return false
  return f.type === 'select' ? (f.options[0]?.value ?? '') : ''
}

/** One setting out of whatever holds it (a form field, a saved preset, a query string), or undefined if it
 *  isn't a value this field can have. */
function parse(f: OverlayField, raw: unknown): OverlayValue | undefined {
  if (raw === undefined || raw === null) return undefined
  if (f.type === 'number') {
    const n = Number(raw)
    return raw !== '' && Number.isFinite(n) && n >= 0 ? n : undefined
  }
  if (f.type === 'toggle') return raw === true || raw === '1' ? true : raw === false || raw === '0' ? false : undefined
  if (typeof raw !== 'string') return undefined
  return f.type === 'select' && !f.options.some((o) => o.value === raw) ? undefined : raw
}

/** The overlay's settings out of anything keyed like them; a missing or broken one is its `fallback`. */
export function coerce(def: OverlayDef, get: (key: string) => unknown, fallback: 'default' | 'empty' = 'default'): OverlayValues {
  return Object.fromEntries(def.fields.map((f) => [f.key, parse(f, get(f.key)) ?? (fallback === 'default' ? f.default : empty(f))]))
}

export const defaults = (def: OverlayDef): OverlayValues => coerce(def, () => undefined)

/** The settings in a query string (a URLSearchParams, or vue-router's route.query). What an overlay's page calls. */
export function overlayValues(def: OverlayDef, query: URLSearchParams | Record<string, unknown>): OverlayValues {
  const get = (k: string): unknown => {
    if (query instanceof URLSearchParams) return query.get(k)
    const v = query[k]
    return Array.isArray(v) ? v[0] : v
  }
  return coerce(def, get, 'empty')
}

/** The browser-source link. Settings at their empty value are left out. */
export function overlayUrl(origin: string, def: OverlayDef, values: OverlayValues): string {
  const clean = coerce(def, (k) => values[k], 'empty')
  const query = new URLSearchParams()
  for (const f of def.fields) {
    const v = clean[f.key]
    if (v !== empty(f)) query.set(f.key, typeof v === 'boolean' ? '1' : String(v))
  }
  const qs = query.toString()
  return `${origin}${def.path}${qs ? `?${qs}` : ''}`
}

/** The settings a link made by overlayUrl carries, or null when it isn't a link to this overlay. */
export function valuesFromUrl(def: OverlayDef, link: string): OverlayValues | null {
  let url: URL
  try {
    url = new URL(link.trim())
  } catch {
    return null
  }
  return url.pathname.replace(/\/+$/, '') === def.path ? overlayValues(def, url.searchParams) : null
}

/** Whether two sets of settings are the same overlay state. */
export const sameValues = (def: OverlayDef, a: OverlayValues, b: OverlayValues): boolean => def.fields.every((f) => a[f.key] === b[f.key])
