// The run of a random overlay (wheel, case, cards): which options are still in, a draw that lasts its spin time,
// its two sounds, and Remove / Reset after a result. The page animates; this keeps the state, in the page alone.
import { computed, onUnmounted, ref, watch, type Ref } from 'vue'
import type { OverlayOption, OverlayValues } from './overlays'
import { spinSeconds, weightedPick } from './random'

export interface RandomSettings {
  o: OverlayOption[]
  t: number
  j: number
  spin: string
  done: string
  vol: number
  rm: boolean
}

export function useDraw(values: Ref<OverlayValues | null>, fileSrc: (ref: string) => string) {
  const settings = computed(() => values.value as unknown as RandomSettings | null)
  /** The options still in: the settings', less those removed since the last Reset. */
  const active = ref<OverlayOption[]>([])
  /** The last result's index in `active`, -1 before the first or after a Remove. */
  const result = ref(-1)
  const busy = ref(false)
  const removed = ref(0)

  watch(settings, (s) => reset(s), { immediate: true })

  let spinning: HTMLAudioElement | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  function sound(ref: string, loop = false): HTMLAudioElement | undefined {
    const src = ref && fileSrc(ref)
    if (!src || !settings.value) return undefined
    const audio = new Audio(src)
    audio.volume = settings.value.vol / 100
    audio.loop = loop
    // OBS allows autoplay; a normal browser tab may block it until the page is clicked.
    audio.play().catch(() => {})
    return audio
  }

  /** Starts a draw: the option it lands on and how long to animate, or null when busy or nothing can come up. */
  function draw(): { index: number; seconds: number } | null {
    const s = settings.value
    if (!s || busy.value) return null
    const index = weightedPick(active.value)
    if (index < 0) return null
    const seconds = spinSeconds(s.t, s.j)
    busy.value = true
    result.value = -1
    spinning = sound(s.spin, true)
    timer = setTimeout(() => {
      spinning?.pause()
      spinning = undefined
      busy.value = false
      result.value = index
      sound(s.done)
    }, seconds * 1000)
    return { index, seconds }
  }

  /** Drops the last result for the next draws. */
  function remove(): void {
    if (busy.value || result.value < 0) return
    active.value = active.value.filter((_, i) => i !== result.value)
    result.value = -1
    removed.value++
  }

  function reset(s = settings.value): void {
    if (busy.value) return
    active.value = s ? [...s.o] : [] // the same objects, so a page can key things (a colour) to the settings' order
    result.value = -1
    removed.value = 0
  }

  onUnmounted(() => {
    clearTimeout(timer)
    spinning?.pause()
  })

  const canRemove = computed(() => !!settings.value?.rm && !busy.value && result.value >= 0)
  return { settings, active, result, busy, removed, canRemove, draw, remove, reset: () => reset() }
}
