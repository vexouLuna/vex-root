<script setup lang="ts">
// An option list setting: name, weight, optional colour and (when the overlay shows them) a picture per option,
// with JSON import and export.
import { VxButton, VxInput } from '@vex/ui'
import { computed, ref } from 'vue'
import FileField from '@/components/FileField.vue'
import { OPTION_NAME_MAX, OPTIONS_MAX, exportOptions, importOptions, type OverlayOption } from '@/lib/overlays'
import { shares } from '@/lib/random'

const props = defineProps<{ images?: boolean; label: string; id?: string }>()
const model = defineModel<OverlayOption[]>({ required: true })

const chance = computed(() => shares(model.value).map((s) => `${(s * 100).toFixed(s && s < 0.01 ? 2 : 1)}%`))

function patch(i: number, change: Partial<OverlayOption>): void {
  const next = model.value.map((o, j) => (j === i ? { ...o, ...change } : o))
  for (const k of ['color', 'image'] as const) if (next[i][k] === '' || next[i][k] === undefined) delete next[i][k]
  model.value = next
}
const add = (): void => {
  model.value = [...model.value, { name: `Option ${model.value.length + 1}`, weight: 1 }]
}
const drop = (i: number): void => {
  model.value = model.value.filter((_, j) => j !== i)
}

const picker = ref<HTMLInputElement>()
const error = ref('')
async function load(e: Event): Promise<void> {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  const found = importOptions(await file.text())
  if ('error' in found) {
    error.value = found.error
    return
  }
  error.value = ''
  model.value = found.options
}

function save(): void {
  const url = URL.createObjectURL(new Blob([exportOptions(model.value)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div :id="id" class="options">
    <ol class="list">
      <li v-for="(o, i) in model" :key="i" class="row">
        <VxInput
          :model-value="o.name"
          :aria-label="`Option ${i + 1} name`"
          :maxlength="OPTION_NAME_MAX"
          grow
          :width="140"
          @update:model-value="patch(i, { name: String($event) })"
        />
        <label class="weight">
          <span class="vx-muted">Weight</span>
          <VxInput
            :model-value="o.weight"
            type="number"
            :aria-label="`Option ${i + 1} weight`"
            :width="72"
            @update:model-value="patch(i, { weight: Math.max(0, Number($event) || 0) })"
          />
        </label>
        <span class="chance vx-mono vx-muted" :title="`Chance of ${o.name}`">{{ chance[i] }}</span>
        <span class="color">
          <input
            type="color"
            :value="o.color ?? '#8b7cff'"
            :class="{ unset: !o.color }"
            :aria-label="`Option ${i + 1} colour`"
            @input="patch(i, { color: ($event.target as HTMLInputElement).value })"
          />
          <VxButton v-if="o.color" size="sm" variant="ghost" icon label="Default colour" @click="patch(i, { color: undefined })">×</VxButton>
        </span>
        <FileField
          v-if="images"
          class="image"
          accept="image"
          :label="`Option ${i + 1} picture`"
          :model-value="o.image ?? ''"
          @update:model-value="patch(i, { image: $event || undefined })"
        />
        <VxButton size="sm" variant="ghost" icon :label="`Remove ${o.name}`" @click="drop(i)">−</VxButton>
      </li>
    </ol>
    <p v-if="!model.length" class="vx-muted small">No options yet.</p>
    <div class="vx-form-row">
      <VxButton size="sm" :disabled="model.length >= OPTIONS_MAX" @click="add">Add option</VxButton>
      <input ref="picker" type="file" class="hidden" accept="application/json,.json" @change="load" />
      <VxButton size="sm" @click="picker?.click()">Import JSON</VxButton>
      <VxButton size="sm" :disabled="!model.length" @click="save">Export JSON</VxButton>
      <span class="vx-muted small">{{ model.length }} / {{ OPTIONS_MAX }}</span>
    </div>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.options { display: grid; gap: 8px; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; padding-bottom: 6px; border-bottom: 1px solid var(--vx-line); }
.weight { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
.chance { width: 52px; text-align: right; font-size: 12px; }
.color { display: inline-flex; align-items: center; gap: 2px; }
.color input { width: 32px; height: var(--vx-ctl-sm); padding: 0 2px; border: 1px solid var(--vx-line); border-radius: var(--vx-radius-sm); background: transparent; cursor: pointer; }
.color input.unset { opacity: 0.35; }
.image { flex: 1 1 220px; }
.hidden { display: none; }
.small { font-size: 12px; margin: 0; }
.err { margin: 0; font-size: 12px; color: var(--vx-bad); }
</style>
