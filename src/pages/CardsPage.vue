<script setup lang="ts">
// OBS browser source: /obs_sources/cards?p=<preset id> (or the settings in the link).
// Transparent, no site chrome. A deck; Draw shuffles it for the spin time give or take the jitter, then turns
// over one card, a weighted pick. An option's picture is its card's face, the back one picture for the deck;
// unset ones are placeholders. The controls strip along the bottom is cropped off.
import { VxButton, VxPlaceholder } from '@vex/ui'
import { computed, ref } from 'vue'
import OverlayControls from '@/components/OverlayControls.vue'
import { useBrowserSource } from '@/lib/browserSource'
import { useDraw } from '@/lib/useDraw'
import { useOverlayValues } from '@/lib/useOverlay'

const SHUFFLED = 6 // cards seen moving in the shuffle

const { values, error, fileSrc } = useOverlayValues('cards')
const { settings, active, result, busy, removed, canRemove, draw, remove, reset } = useDraw(values, fileSrc)
const back = computed(() => fileSrc((values.value?.back as string | undefined) ?? ''))
const picked = computed(() => (result.value >= 0 ? active.value[result.value] : undefined))
/** Pictures that didn't load (deleted since, or a dead link): drawn as placeholders. */
const failed = ref(new Set<string>())

// The card's height: the visible area (the page less the 40px strip) with a margin; the width follows.
const cardH = computed(() => Math.round(Math.max(120, Math.min(window.innerHeight - 40 - 40, (window.innerWidth - 40) / 0.7))))
const cardW = computed(() => Math.round(cardH.value * 0.7))

function deal(): void {
  draw()
}

useBrowserSource()
</script>

<template>
  <div class="stage" :style="{ '--w': `${cardW}px`, '--h': `${cardH}px` }">
    <p v-if="error" class="msg">{{ error }}</p>
    <p v-else-if="settings && !active.length" class="msg">No cards left{{ removed ? ': press Reset' : '' }}.</p>
    <template v-else-if="settings">
      <!-- The face shows once a card is drawn; until then, the deck (shuffling while busy). -->
      <div v-if="picked" :key="result" class="card face" :style="picked.color ? { borderColor: picked.color } : undefined">
        <img v-if="picked.image && !failed.has(picked.image)" :src="fileSrc(picked.image)" alt="" @error="failed.add(picked.image)" />
        <VxPlaceholder v-else :label="picked.name.slice(0, 2).toLowerCase()" :w="cardW - 24" :h="cardH - 70" />
        <span class="name" role="status">{{ picked.name }}</span>
      </div>
      <button v-else class="deck" :class="{ shuffling: busy }" type="button" aria-label="Draw a card" @click="deal">
        <span v-for="i in SHUFFLED" :key="i" class="card back" :style="{ '--i': i }">
          <img v-if="back && !failed.has(back)" :src="back" alt="" @error="failed.add(back)" />
          <VxPlaceholder v-else label="card back" :w="cardW - 16" :h="cardH - 16" />
        </span>
      </button>
    </template>
  </div>
  <OverlayControls v-if="settings">
    <VxButton size="sm" variant="primary" :disabled="busy || !active.length" @click="deal">{{ picked ? 'Draw again' : 'Draw' }}</VxButton>
    <VxButton v-if="canRemove" size="sm" @click="remove">Remove “{{ picked?.name }}”</VxButton>
    <VxButton v-if="removed" size="sm" :disabled="busy" @click="reset">Reset ({{ removed }} out)</VxButton>
  </OverlayControls>
</template>

<style scoped>
/* The visible area: the page less the 40px strip that is cropped off. */
.stage { position: fixed; inset: 0 0 40px 0; display: grid; place-items: center; overflow: hidden; font-family: var(--vx-font-sans); perspective: 1200px; }
.deck { all: unset; cursor: pointer; position: relative; width: var(--w); height: var(--h); }
.card {
  box-sizing: border-box; width: var(--w); height: var(--h); border-radius: 14px; overflow: hidden;
  border: 3px solid #fff; background: #1a1f33; box-shadow: 0 8px 22px rgba(0, 0, 0, 0.5);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.card img { width: 100%; height: 100%; object-fit: cover; }
.back { position: absolute; inset: 0; padding: 5px; transform: translate(calc(var(--i) * -1.5px), calc(var(--i) * -1.5px)); }
.shuffling .back { animation: riffle 0.55s ease-in-out infinite alternate; animation-delay: calc(var(--i) * -0.09s); }
@keyframes riffle {
  0% { transform: translateX(calc(var(--w) * -0.55)) rotate(-8deg); }
  50% { transform: translateY(-6%) rotate(0deg); }
  100% { transform: translateX(calc(var(--w) * 0.55)) rotate(8deg); }
}
.face { gap: 10px; padding: 12px; animation: turn 0.6s ease-out; }
.face img { flex: 1; min-height: 0; height: auto; object-fit: contain; }
.face .name { color: #fff; font-weight: 700; font-size: clamp(14px, calc(var(--h) / 14), 28px); text-align: center; overflow-wrap: anywhere; }
@keyframes turn {
  from { transform: rotateY(90deg) scale(0.9); }
  to { transform: rotateY(0) scale(1); }
}
.msg { margin: 0; padding: 6px 16px; border-radius: 10px; background: rgba(11, 14, 23, 0.85); color: #fff; font-size: 16px; }
</style>
