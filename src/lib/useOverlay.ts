// What an overlay's page calls for its settings: the ones in its link, or a saved preset's when the link
// carries `?p=<public id>` (read from vex-auth with no sign-in: an OBS source has only its link).
import { useAccount } from '@vex/ui/account'
import { ref, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { OVERLAYS, PRESET_PARAM, coerce, fileUrl, overlayValues, queryParam, type OverlayDef, type OverlayValues } from './overlays'

export interface OverlaySettings {
  def: OverlayDef
  /** Null until a preset has loaded (at once for a plain link). */
  values: Ref<OverlayValues | null>
  /** Why the preset couldn't be read, for the page to show. */
  error: Ref<string>
  /** The address of a file setting (an upload's id or a URL); '' when unset. */
  fileSrc: (ref: string | undefined) => string
}

export function useOverlayValues(id: string): OverlaySettings {
  const def = OVERLAYS.find((o) => o.id === id)
  if (!def) throw new Error(`no overlay ${id}`)
  const account = useAccount()
  const query = useRoute().query
  const values = ref<OverlayValues | null>(null)
  const error = ref('')
  const publicId = queryParam(query, PRESET_PARAM)
  if (typeof publicId === 'string' && publicId) {
    void (async () => {
      try {
        const res = await fetch(`${account.base}/v2/public/presets/${encodeURIComponent(publicId)}`, { headers: { Accept: 'application/json' } })
        if (!res.ok) {
          error.value = res.status === 404 ? 'That preset is gone: save it again and copy its new link.' : `Couldn't load the preset (${res.status}).`
          return
        }
        const stored: { value: Record<string, unknown> } = await res.json()
        values.value = coerce(def, (k) => stored.value[k], 'empty')
      } catch {
        error.value = "Couldn't reach vexoul.net's sign-in service for the preset."
      }
    })()
  } else {
    values.value = overlayValues(def, query)
  }
  return { def, values, error, fileSrc: (ref) => fileUrl(account.base, ref) }
}
