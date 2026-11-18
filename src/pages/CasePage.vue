<script setup lang="ts">
// OBS browser source: /obs_sources/case?p=<preset id> (or the settings in the link).
// Transparent, no site chrome. A case; Open rolls a strip of items past a marker for the spin time give or take
// the jitter and stops on a weighted pick. Items are coloured by their rarity (their share of the weight) unless
// they have a colour of their own. Unset pictures are placeholders. The controls strip along the bottom is cropped.
import { VxButton, VxPlaceholder } from '@vex/ui'
import { computed, nextTick, ref } from 'vue'
import OverlayControls from '@/components/OverlayControls.vue'
import { useBrowserSource } from '@/lib/browserSource'
import type { OverlayOption } from '@/lib/overlays'
import { shares, tierOf, weightedPick } from '@/lib/random'
import { useDraw } from '@/lib/useDraw'
import { useOverlayValues } from '@/lib/useOverlay'

const REEL = 60 // items on the strip
const WINNER = 52 // where the pick sits on it, with a few after it so the strip doesn't end at the marker

const { values, error, fileSrc } = useOverlayValues('case')
const { settings, active, result, busy, removed, canRemove, draw, remove, reset } = useDraw(values, fileSrc)
const caseImage = computed(() => fileSrc((values.value?.img as string | undefined) ?? ''))
/** Pictures that didn't load (deleted since, or a dead link): drawn as placeholders. */
const failed = ref(new Set<string>())

/** Rarity by the weights of all the options in the settings, so removing one doesn't recolour the rest. */
const colorOf = computed(() => {
  const all = settings.value?.o ?? []
  const s = shares(all)
  return new Map(all.map((o, i) => [o, o.color ?? tierOf(s[i]).color]))
})

const reel = ref<OverlayOption[]>([])
const offset = ref(0)
const seconds = ref(0)
const opened = ref(false)
const card = computed(() => Math.round(Math.max(90, Math.min(170, window.innerWidth / 5))))

async function open(): Promise<void> {
  if (busy.value || !active.value.length) return
  // The strip is filler drawn by weight too (it looks like the odds), with the pick at WINNER.
  const filler = Array.from({ length: REEL }, () => active.value[weightedPick(active.value)] ?? active.value[0])
  opened.value = true
  seconds.value = 0
  offset.value = 0
  reel.value = filler
  await nextTick()
  // Let the browser draw the strip at rest before it moves, or there is nothing to animate from.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const d = draw()
  if (!d) return
  reel.value = filler.map((o, i) => (i === WINNER ? active.value[d.index] : o))
  seconds.value = d.seconds
  // Stop somewhere inside the winner's card, not always dead centre.
  const jitter = (Math.random() - 0.5) * card.value * 0.7
  offset.value = WINNER * card.value + card.value / 2 - window.innerWidth / 2 + jitter
}

const picked = computed(() => (result.value >= 0 ? active.value[result.value] : undefined))

useBrowserSource()
</script>

<template>
  <div class="stage">
    <p v-if="error" class="msg">{{ error }}</p>
    <p v-else-if="settings && !active.length" class="msg">No items left{{ removed ? ': press Reset' : '' }}.</p>
    <template v-else-if="settings">
      <button v-if="!opened" class="case" type="button" aria-label="Open the case" @click="open">
        <img v-if="caseImage && !failed.has(caseImage)" :src="caseImage" alt="" @error="failed.add(caseImage)" />
        <VxPlaceholder v-else label="case" :w="260" :h="180" />
      </button>
      <div v-else class="reel-box">
        <div class="marker" aria-hidden="true" />
        <ol
          class="reel"
          :style="{ transform: `translateX(${-offset}px)`, transition: seconds ? `transform ${seconds}s cubic-bezier(0.08, 0.6, 0.12, 1)` : 'none' }"
        >
          <li
            v-for="(o, i) in reel"
            :key="i"
            class="item"
            :class="{ won: picked && i === WINNER }"
            :style="{ width: `${card}px`, '--tier': colorOf.get(o) }"
          >
            <img v-if="o.image && !failed.has(o.image)" :src="fileSrc(o.image)" alt="" @error="failed.add(o.image)" />
            <VxPlaceholder v-else :label="o.name.slice(0, 2).toLowerCase()" :w="card - 24" :h="Math.round((card - 24) * 0.7)" />
            <span class="name">{{ o.name }}</span>
          </li>
        </ol>
      </div>
      <p v-if="picked" class="result" role="status" :style="{ '--tier': colorOf.get(picked) }">{{ picked.name }}</p>
    </template>
  </div>
  <OverlayControls v-if="settings">
    <VxButton size="sm" variant="primary" :disabled="busy || !active.length" @click="open">{{ picked ? 'Open again' : 'Open' }}</VxButton>
    <VxButton v-if="canRemove" size="sm" @click="remove">Remove “{{ picked?.name }}”</VxButton>
    <VxButton v-if="removed" size="sm" :disabled="busy" @click="reset">Reset ({{ removed }} out)</VxButton>
    <VxButton v-if="opened" size="sm" variant="ghost" :disabled="busy" @click="opened = false">Show the case</VxButton>
  </OverlayControls>
</template>

<style scoped>
/* The visible area: the page less the 40px strip that is cropped off. */
.stage { position: fixed; inset: 0 0 40px 0; display: grid; grid-template-columns: minmax(0, 1fr); place-items: center; overflow: hidden; font-family: var(--vx-font-sans); }
.case { all: unset; cursor: pointer; display: grid; place-items: center; max-width: 90%; max-height: 90%; }
.case img { max-width: 100%; max-height: calc(100vh - 80px); object-fit: contain; filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.5)); }
.reel-box { position: relative; width: 100%; overflow: hidden; padding: 12px 0; background: rgba(11, 14, 23, 0.7); }
.marker { position: absolute; z-index: 2; left: 50%; top: 0; bottom: 0; width: 3px; transform: translateX(-50%); background: #e4ae39; box-shadow: 0 0 10px #e4ae39; }
.reel { position: relative; z-index: 1; list-style: none; margin: 0; padding: 0; display: flex; will-change: transform; }
.item {
  flex: none; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 12px 0;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(to top, color-mix(in srgb, var(--tier) 35%, transparent), transparent 70%);
  border-bottom: 4px solid var(--tier);
}
.item img { width: 100%; aspect-ratio: 10 / 7; object-fit: contain; }
.item .name { width: 100%; padding-bottom: 6px; color: #fff; font-size: 13px; font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item.won { outline: 2px solid var(--tier); outline-offset: -2px; background: color-mix(in srgb, var(--tier) 45%, transparent); }
.result, .msg {
  position: absolute; left: 50%; bottom: 8%; transform: translateX(-50%); margin: 0; max-width: 90%;
  padding: 6px 16px; border-radius: 10px; background: rgba(11, 14, 23, 0.85); color: #fff; border: 2px solid var(--tier, transparent);
  font: 700 clamp(16px, 6vmin, 40px) / 1.2 var(--vx-font-sans); text-align: center; overflow-wrap: anywhere;
}
.msg { position: static; transform: none; font-size: 16px; font-weight: 500; }
</style>
