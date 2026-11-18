<script setup lang="ts">
// OBS browser source: /obs_sources/countdown?h=0&m=5&s=0&text=starting%20soon (or ?p=<preset id>)
// Transparent page, no site chrome. At zero it flashes a bell and loops a quiet alarm, or the chosen sound.
// Under the two lines sit small controls (pause, restart, add or take a minute): the source is made taller
// and cropped, so they show only in OBS's Interact window. Their state lives in this page alone.
import { VxButton } from '@vex/ui'
import { computed, onUnmounted, ref, watch } from 'vue'
import alarmUrl from '@/assets/alarm.mp3'
import OverlayControls from '@/components/OverlayControls.vue'
import { useBrowserSource } from '@/lib/browserSource'
import { useOverlayValues } from '@/lib/useOverlay'

// Its settings are declared in lib/overlays, which also builds the form and the link.
const { values, error, fileSrc } = useOverlayValues('countdown')
const settings = computed(() => values.value as { h: number; m: number; s: number; text: string; sound: string; vol: number } | null)
const total = computed(() => (settings.value ? 3600 * settings.value.h + 60 * settings.value.m + settings.value.s : 0))

/** Milliseconds left: counted from `end` while running, frozen in `left` while paused. */
const end = ref(0)
const paused = ref(false)
const left = ref(0)
const shown = ref('0:00:00')
const pad = (n: number) => String(n).padStart(2, '0')

let timer: ReturnType<typeof setInterval> | undefined
let flip = false
let audio: HTMLAudioElement | undefined

function stopSound(): void {
  audio?.pause()
  audio = undefined
}

function run(): void {
  // No time given: show the help line, never ring.
  if (!settings.value || total.value === 0) return
  const ms = paused.value ? left.value : end.value - Date.now()
  if (ms > 0) {
    const s = Math.ceil(ms / 1000)
    shown.value = `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
    return
  }
  flip = !flip
  shown.value = flip ? '⠀🔔' : '🔔⠀'
  if (!audio) {
    audio = new Audio(fileSrc(settings.value.sound) || alarmUrl)
    audio.volume = settings.value.vol / 100
    audio.loop = true
    // OBS allows autoplay; a normal browser tab may block it until the page is clicked.
    audio.play().catch(() => {})
  }
}

function restart(): void {
  stopSound()
  paused.value = false
  end.value = Date.now() + total.value * 1000
  run()
}

function togglePause(): void {
  if (paused.value) end.value = Date.now() + left.value
  else left.value = Math.max(0, end.value - Date.now())
  paused.value = !paused.value
  run()
}

/** Adds (or takes away) time; past zero it starts counting again. */
function add(seconds: number): void {
  const now = paused.value ? left.value : end.value - Date.now()
  const next = Math.max(0, now) + seconds * 1000
  if (next > 0) stopSound()
  if (paused.value) left.value = Math.max(0, next)
  else end.value = Date.now() + Math.max(0, next)
  run()
}

useBrowserSource()
watch(
  settings,
  (s) => {
    if (!s) return
    restart()
    clearInterval(timer)
    timer = setInterval(run, 250)
  },
  { immediate: true },
)
onUnmounted(() => {
  clearInterval(timer)
  stopSound()
})
</script>

<template>
  <div class="countdown">
    <p class="line">{{ error || (settings && total === 0 ? 'Add ?m=5 (or h, s, text) to the address' : shown) }}</p>
    <p class="line">{{ settings?.text || ' ' }}</p>
  </div>
  <OverlayControls v-if="settings && total > 0">
    <VxButton size="sm" @click="togglePause">{{ paused ? 'Play' : 'Pause' }}</VxButton>
    <VxButton size="sm" @click="restart">Restart</VxButton>
    <VxButton size="sm" @click="add(-60)">−1 min</VxButton>
    <VxButton size="sm" @click="add(60)">+1 min</VxButton>
    <VxButton size="sm" @click="add(300)">+5 min</VxButton>
  </OverlayControls>
</template>

<style scoped>
.line {
  margin: 0;
  padding: 0;
  text-align: center;
  color: white;
  font-family: monospace;
  text-shadow: 1px 1px 1px black;
}
</style>
