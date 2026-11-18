<script setup lang="ts">
// One OBS source's settings form, built from its definition in lib/overlays: makes its link, reads one back,
// and keeps named presets in the account. Nothing here knows a particular overlay.
import { VxButton, VxCallout, VxField, VxInput, VxSelect, VxSwitch, VxTable, useToast, type TableColumn } from '@vex/ui'
import { useAccount } from '@vex/ui/account'
import { computed, reactive, ref, watch } from 'vue'
import FileField from '@/components/FileField.vue'
import OptionListField from '@/components/OptionListField.vue'
import {
  LINK_MAX,
  PRESET_PARAM,
  coerce,
  defaults,
  overlayUrl,
  presetUrl,
  sameValues,
  valuesFromUrl,
  type OverlayDef,
  type OverlayOption,
  type OverlayValues,
} from '@/lib/overlays'

const props = defineProps<{ overlay: OverlayDef }>()
const toast = useToast()

const values = reactive(defaults(props.overlay))
const current = computed(() => coerce(props.overlay, (k) => values[k], 'empty'))
const urlOf = (v: OverlayValues): string => overlayUrl(window.location.origin, props.overlay, v)
const fullLink = computed(() => urlOf(current.value))

async function copy(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url)
    toast.show('Link copied')
  } catch {
    toast.show("Couldn't copy the link. Select it and copy it by hand.", { kind: 'error' })
  }
}

const importing = ref(false)
const pasted = ref('')
const importError = ref('')
async function importLink(): Promise<void> {
  let found = valuesFromUrl(props.overlay, String(pasted.value))
  const publicId = found && new URL(String(pasted.value).trim()).searchParams.get(PRESET_PARAM)
  if (publicId) {
    // A preset's link: its settings are in vex-auth.
    found = null
    try {
      const res = await fetch(`${account.base}/v2/public/presets/${encodeURIComponent(publicId)}`)
      if (res.ok) {
        const stored: { value: Record<string, unknown> } = await res.json()
        found = coerce(props.overlay, (k) => stored.value[k], 'empty')
      }
    } catch {
      // said below
    }
  }
  if (!found) {
    importError.value = publicId ? "That preset couldn't be loaded: it may have been deleted." : `That isn't a ${props.overlay.name} link.`
    return
  }
  Object.assign(values, found)
  importing.value = false
  pasted.value = ''
  importError.value = ''
}

// Presets: named sets of these settings, kept by vex-auth for the signed-in user.
interface Preset {
  name: string
  value: OverlayValues
  publicId: string
}
const account = useAccount()
const user = account.user
const presetsPath = `/v2/presets/obs.${props.overlay.id}`
const presets = ref<Preset[]>([])
const selected = ref<string>()
const presetName = ref('')
const busy = ref<'save' | 'delete' | null>(null)
const error = ref('')
const showAll = ref(false)

async function call(path: string, init?: RequestInit): Promise<Response | null> {
  error.value = ''
  try {
    const res = await account.request(path, init)
    if (res.ok) return res
    error.value = res.status === 422 ? "That preset can't be saved: the name is too long, or there are too many." : `The sign-in service refused (${res.status}). Try again.`
  } catch {
    error.value = "Couldn't reach the sign-in service. Try again."
  }
  return null
}

watch(
  user,
  async (u) => {
    presets.value = []
    selected.value = undefined
    if (!u) return
    const res = await call(presetsPath, { headers: { Accept: 'application/json' } })
    if (!res) return
    const items: { name: string; value: Record<string, unknown>; public_id: string }[] = (await res.json()).items ?? []
    // Whatever was stored, a preset here only ever holds this overlay's settings.
    presets.value = items.map((p) => ({ name: p.name, value: coerce(props.overlay, (k) => p.value[k]), publicId: p.public_id }))
  },
  { immediate: true },
)

const selectedPreset = computed(() => presets.value.find((p) => p.name === selected.value))
/** The selected preset no longer holds what the form shows. */
const changed = computed(() => !!selectedPreset.value && !sameValues(props.overlay, selectedPreset.value.value, current.value))
/** A saved preset's short link, which follows its edits; else the link with every setting in it. */
const link = computed(() =>
  selectedPreset.value && !changed.value ? presetUrl(window.location.origin, props.overlay, selectedPreset.value.publicId) : fullLink.value,
)
const tooLong = computed(() => link.value.length > LINK_MAX)

// Only picking one (or Revert) loads it: a save also selects its preset, and must not undo edits made meanwhile.
function load(name: string | undefined): void {
  const preset = presets.value.find((p) => p.name === name)
  if (!preset) return
  Object.assign(values, preset.value)
  selected.value = preset.name
  presetName.value = preset.name
}

async function save(): Promise<void> {
  const name = String(presetName.value).trim()
  if (!name) return
  busy.value = 'save'
  const value = { ...current.value }
  const res = await call(`${presetsPath}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
  if (res) {
    const saved: { name: string; public_id: string } = await res.json()
    const preset = { name: saved.name, value, publicId: saved.public_id }
    presets.value = [...presets.value.filter((p) => p.name !== saved.name), preset].sort((a, b) => a.name.localeCompare(b.name))
    selected.value = saved.name
    toast.show(`Preset "${saved.name}" saved`)
  }
  busy.value = null
}

async function remove(): Promise<void> {
  const name = selected.value
  if (!name) return
  busy.value = 'delete'
  const res = await call(`${presetsPath}/${encodeURIComponent(name)}`, { method: 'DELETE' })
  if (res) {
    presets.value = presets.value.filter((p) => p.name !== name)
    selected.value = undefined
    presetName.value = ''
    toast.show(`Preset "${name}" deleted`)
  }
  busy.value = null
}

const saveLabel = computed(() => (presets.value.some((p) => p.name === String(presetName.value).trim()) ? 'Update' : 'Save'))

const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Preset', nowrap: true },
  { key: 'url', label: 'Link', mono: true, muted: true, wrap: true },
  { key: 'actions', label: '', align: 'right', nowrap: true },
]
const rows = computed(() => presets.value.map((p) => ({ name: p.name, url: presetUrl(window.location.origin, props.overlay, p.publicId) })))
</script>

<template>
  <section class="overlay vx-panel">
    <header>
      <h2>{{ overlay.name }}</h2>
      <p class="vx-muted small">{{ overlay.about }}</p>
    </header>

    <div class="vx-form-row">
      <VxField v-for="f in overlay.fields" :key="f.key" :label="f.label" :help="f.help" :class="`is-${f.type}`">
        <template #default="{ id }">
          <OptionListField v-if="f.type === 'options'" :id="id" v-model="values[f.key] as OverlayOption[]" :images="f.images" :label="`${overlay.name} ${f.label}`" />
          <FileField v-else-if="f.type === 'file'" :id="id" v-model="values[f.key] as string" :accept="f.accept" :label="f.label" />
          <VxSwitch v-else-if="f.type === 'toggle'" :id="id" v-model="values[f.key] as boolean" />
          <VxSelect v-else-if="f.type === 'select'" :id="id" v-model="values[f.key] as string" :options="f.options" />
          <VxInput v-else :id="id" v-model="values[f.key] as string | number" :type="f.type" :placeholder="f.type === 'text' ? f.placeholder : undefined" />
        </template>
      </VxField>
    </div>

    <VxField
      :label="selectedPreset && !changed ? `Link to the preset “${selectedPreset.name}”` : 'Link'"
      :help="selectedPreset && !changed ? 'Saving the preset again changes the source too: no need to paste a new link.' : undefined"
      :error="tooLong ? (user ? 'This link is very long: save these settings as a preset for a short one.' : 'This link is very long: sign in and save these settings as a preset for a short one.') : undefined"
    >
      <template #default="{ id }">
        <div class="vx-form-row">
          <VxInput :id="id" :model-value="link" mono grow :width="240" readonly @focus="($event.target as HTMLInputElement).select()" />
          <VxButton variant="primary" @click="copy(link)">Copy</VxButton>
          <VxButton :href="link" external>Open</VxButton>
          <VxButton :pressed="importing" @click="importing = !importing">Import link</VxButton>
        </div>
      </template>
    </VxField>

    <VxField v-if="importing" label="Paste a link to load its settings" :error="importError || undefined">
      <template #default="{ id }">
        <form class="vx-form-row" @submit.prevent="importLink">
          <VxInput :id="id" v-model="pasted" type="url" mono grow :width="240" :invalid="!!importError" />
          <VxButton type="submit">Load</VxButton>
        </form>
      </template>
    </VxField>

    <div class="presets">
      <div class="head">
        <h3 class="vx-eyebrow">Presets</h3>
        <VxButton v-if="presets.length" size="sm" :pressed="showAll" :aria-expanded="showAll" @click="showAll = !showAll">
          {{ showAll ? 'Hide all' : `Show all (${presets.length})` }}
        </VxButton>
      </div>

      <template v-if="user">
        <form class="vx-form-row" @submit.prevent="save">
          <VxSelect
            :model-value="selected"
            :options="presets.map((p) => ({ value: p.name, label: p.name }))"
            :placeholder="presets.length ? 'Load a preset' : 'None saved yet'"
            :disabled="!presets.length"
            width="200px"
            @update:model-value="load"
          />
          <VxInput v-model="presetName" placeholder="Preset name" aria-label="Preset name" maxlength="64" grow :width="160" />
          <VxButton type="submit" :variant="changed ? 'primary' : 'default'" :loading="busy === 'save'" :disabled="!String(presetName).trim()">{{ saveLabel }}</VxButton>
          <VxButton v-if="changed" @click="load(selected)">Revert</VxButton>
          <VxButton variant="danger" :loading="busy === 'delete'" :disabled="!selected" @click="remove">Delete</VxButton>
        </form>
        <p v-if="changed" class="vx-muted small" role="status"><span class="dot" aria-hidden="true">●</span> Unsaved changes to "{{ selected }}"</p>

        <VxTable v-if="showAll && presets.length" wrap :columns="COLUMNS" :rows="rows" row-key="name" :label="`${overlay.name} presets`">
          <template #cell-actions="{ row }">
            <VxButton size="sm" variant="ghost" @click="load(row.name)">Load</VxButton>
            <VxButton size="sm" variant="ghost" @click="copy(row.url)">Copy</VxButton>
          </template>
        </VxTable>
      </template>
      <p v-else class="vx-muted small">
        <template v-if="account.enabled"><a href="#" @click.prevent="account.signIn()">Sign in with Twitch</a> to save these settings as presets.</template>
        <template v-else>Sign-in is not available here, so presets can't be saved.</template>
      </p>

      <VxCallout v-if="error" tone="error" dismissable @dismiss="error = ''">{{ error }}</VxCallout>
    </div>
  </section>
</template>

<style scoped>
.overlay { display: grid; gap: 14px; padding: 14px 16px; }
h2 { margin: 0 0 2px; font-size: 17px; font-weight: 600; color: var(--vx-ink); }
.small { font-size: 12px; margin: 0; }
.small a { color: var(--vx-accent); }
.is-number { flex: 0 1 96px; }
.is-text { flex: 1 1 220px; }
.is-options { flex: 1 1 100%; }
.is-file { flex: 1 1 280px; }
.presets { display: grid; gap: 8px; padding-top: 14px; border-top: 1px solid var(--vx-line); }
.head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; min-height: var(--vx-ctl-sm); }
/* The library styles a page's h3 as an accented doc heading; here it is a panel's eyebrow. */
.head h3 { margin: 0; font-size: var(--vx-text-xs); font-weight: 400; color: var(--vx-muted); }
.dot { color: var(--vx-warn); }
</style>
