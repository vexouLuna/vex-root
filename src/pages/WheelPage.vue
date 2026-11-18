<script setup lang="ts">
// OBS browser source: /obs_sources/wheel?p=<preset id> (or the settings in the link).
// Transparent, no site chrome. A wheel with a slice per option, as big as its weight; Spin turns it for the spin
// time give or take the jitter and stops on a weighted pick. The controls strip along the bottom is cropped off.
import { VxButton } from '@vex/ui'
import { computed, ref } from 'vue'
import OverlayControls from '@/components/OverlayControls.vue'
import { useBrowserSource } from '@/lib/browserSource'
import { slices, wheelStop } from '@/lib/random'
import { useDraw } from '@/lib/useDraw'
import { useOverlayValues } from '@/lib/useOverlay'

const PALETTE = ['#8b7cff', '#ff6b9a', '#3ec7c2', '#ffb347', '#6aa8ff', '#b56cff', '#5fd38d', '#ff7a59']

const { values, error, fileSrc } = useOverlayValues('wheel')
const { settings, active, result, busy, removed, canRemove, draw, remove, reset } = useDraw(values, fileSrc)

const rotation = ref(0)
const seconds = ref(0)

const R = 100
function point(deg: number, r = R): string {
  const a = ((deg - 90) * Math.PI) / 180
  return `${(r * Math.cos(a)).toFixed(3)} ${(r * Math.sin(a)).toFixed(3)}`
}

// A palette colour per option of the settings, so one keeps its colour when another is removed. Neighbours never
// share one, the last and the first included.
const paletteOf = computed(() => {
  const all = settings.value?.o ?? []
  return new Map(all.map((o, i) => [o, PALETTE[(i % PALETTE.length === 0 && i === all.length - 1 && i > 0 ? 1 : i) % PALETTE.length]]))
})

const parts = computed(() => {
  return slices(active.value).map((s, i) => {
    const o = active.value[i]
    const sweep = s.to - s.from
    const mid = (s.from + s.to) / 2
    const color = o.color ?? paletteOf.value.get(o) ?? PALETTE[0]
    const path =
      sweep >= 359.999
        ? `M 0 ${-R} A ${R} ${R} 0 1 1 0 ${R} A ${R} ${R} 0 1 1 0 ${-R} Z`
        : `M 0 0 L ${point(s.from)} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${point(s.to)} Z`
    const size = Math.min(11, Math.max(4, sweep / 4.5))
    return { o, path, color, mid, sweep, size }
  })
})

function spin(): void {
  const d = draw()
  if (!d) return
  seconds.value = d.seconds
  rotation.value = wheelStop(active.value, d.index, rotation.value)
}

const picked = computed(() => (result.value >= 0 ? active.value[result.value] : undefined))

useBrowserSource()
</script>

<template>
  <div class="stage">
    <p v-if="error" class="msg">{{ error }}</p>
    <p v-else-if="settings && !active.length" class="msg">No options left{{ removed ? ': press Reset' : '' }}.</p>
    <svg v-else-if="settings" class="wheel" viewBox="-110 -114 220 228" role="img" :aria-label="picked ? `Wheel: ${picked.name}` : 'Wheel'" @click="spin">
      <g :style="{ transform: `rotate(${rotation}deg)`, transition: busy ? `transform ${seconds}s cubic-bezier(0.1, 0.75, 0.15, 1)` : 'none' }">
        <!-- Labels run along the slice's middle, ending at the rim. -->
        <g v-for="(p, i) in parts" :key="i">
          <path :d="p.path" :fill="p.color" :class="{ dim: picked && picked !== p.o }" />
          <text
            v-if="p.sweep > 3"
            :transform="`rotate(${p.mid - 90}) translate(${R - 8} 0)`"
            text-anchor="end"
            dominant-baseline="central"
            :font-size="p.size"
          >
            {{ p.o.name.length > 18 ? `${p.o.name.slice(0, 17)}…` : p.o.name }}
          </text>
        </g>
        <circle r="100" class="rim" />
      </g>
      <circle r="9" class="hub" />
      <path d="M -7 -112 L 7 -112 L 0 -96 Z" class="pointer" />
    </svg>
    <p v-if="picked" class="result" role="status">{{ picked.name }}</p>
  </div>
  <OverlayControls v-if="settings">
    <VxButton size="sm" variant="primary" :disabled="busy || !active.length" @click="spin">{{ picked ? 'Spin again' : 'Spin' }}</VxButton>
    <VxButton v-if="canRemove" size="sm" @click="remove">Remove “{{ picked?.name }}”</VxButton>
    <VxButton v-if="removed" size="sm" :disabled="busy" @click="reset">Reset ({{ removed }} out)</VxButton>
  </OverlayControls>
</template>

<style scoped>
/* The visible area: the page less the 40px strip that is cropped off. */
.stage { position: fixed; inset: 0 0 40px 0; display: grid; place-items: center; }
.wheel { width: min(100vw, 100vh - 40px); height: min(100vw, 100vh - 40px); cursor: pointer; overflow: visible; }
.wheel text { fill: #fff; font-family: var(--vx-font-sans); font-weight: 700; paint-order: stroke; stroke: rgba(0, 0, 0, 0.45); stroke-width: 1.2px; pointer-events: none; }
.wheel path { stroke: rgba(0, 0, 0, 0.25); stroke-width: 0.6; transition: opacity 0.3s; }
.wheel path.dim { opacity: 0.45; }
.rim { fill: none; stroke: #fff; stroke-width: 2.5; }
.hub { fill: #fff; stroke: rgba(0, 0, 0, 0.35); stroke-width: 1; }
.pointer { fill: #fff; stroke: rgba(0, 0, 0, 0.5); stroke-width: 1; }
.result, .msg {
  position: absolute; left: 50%; bottom: 8%; transform: translateX(-50%); margin: 0; max-width: 90%;
  padding: 6px 16px; border-radius: 10px; background: rgba(11, 14, 23, 0.85); color: #fff;
  font: 700 clamp(16px, 6vmin, 40px) / 1.2 var(--vx-font-sans); text-align: center; overflow-wrap: anywhere;
}
.msg { position: static; transform: none; font-size: 16px; font-weight: 500; }
</style>
