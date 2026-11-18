<script setup lang="ts">
// A file setting: one of the user's uploads (picked, or uploaded here), or an https URL pasted in.
import { VxButton, VxInput, VxSelect } from '@vex/ui'
import { useAccount } from '@vex/ui/account'
import { computed, ref } from 'vue'
import { useFiles } from '@/lib/files'
import { fileUrl, isFileRef } from '@/lib/overlays'

const props = defineProps<{ accept: 'image' | 'audio'; id?: string; label?: string }>()
const model = defineModel<string>({ required: true })

const account = useAccount()
const files = useFiles()
const signedIn = computed(() => !!account.user.value)
const mine = computed(() => files.list.value.filter((f) => f.content_type.startsWith(`${props.accept}/`)))
const isUpload = computed(() => mine.value.some((f) => f.id === model.value))
const NONE = '-'
const URL_PICK = 'url'
const pasting = ref(!!model.value && !isUpload.value && !/^[A-Za-z0-9_-]{16,64}$/.test(model.value))
const choices = computed(() => [
  { value: NONE, label: props.accept === 'image' ? 'No image' : 'No sound' },
  ...mine.value.map((f) => ({ value: f.id, label: f.name })),
  { value: URL_PICK, label: 'A link…' },
])
const picked = computed(() => (pasting.value ? URL_PICK : model.value ? (isUpload.value ? model.value : URL_PICK) : NONE))

function pick(v: string | undefined): void {
  pasting.value = v === URL_PICK
  if (v === URL_PICK) {
    if (isUpload.value) model.value = ''
    return
  }
  model.value = !v || v === NONE ? '' : v
}

const pasted = computed({
  get: () => (isUpload.value ? '' : model.value),
  set: (v: string) => {
    model.value = v.trim()
  },
})
const badUrl = computed(() => pasting.value && !!pasted.value && !isFileRef(pasted.value))

const input = ref<HTMLInputElement>()
const busy = ref(false)
const error = ref('')
async function upload(e: Event): Promise<void> {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  busy.value = true
  error.value = ''
  try {
    model.value = (await files.upload(file)).id
    pasting.value = false
  } catch (err) {
    error.value = (err as Error).message
  }
  busy.value = false
}

const src = computed(() => fileUrl(account.base, model.value))
const audio = ref<HTMLAudioElement>()
const playing = ref(false)
function toggle(): void {
  if (!audio.value) return
  if (playing.value) {
    audio.value.pause()
    audio.value.currentTime = 0
  } else void audio.value.play().catch(() => (playing.value = false))
}
</script>

<template>
  <div class="file">
    <div class="vx-form-row">
      <VxSelect v-if="signedIn" :id="id" :model-value="picked" :options="choices" size="sm" width="170px" :aria-label="label" @update:model-value="pick" />
      <VxInput
        v-if="pasting || !signedIn"
        :id="signedIn ? undefined : id"
        v-model="pasted"
        type="url"
        placeholder="https://…"
        :aria-label="label ? `${label} link` : 'Link'"
        :invalid="badUrl"
        mono
        grow
        :width="140"
      />
      <template v-if="signedIn">
        <input ref="input" type="file" class="hidden" :accept="`${accept}/*`" @change="upload" />
        <VxButton size="sm" :loading="busy" @click="input?.click()">Upload</VxButton>
      </template>
      <img v-if="accept === 'image' && src" class="thumb" :src="src" alt="" />
      <template v-if="accept === 'audio' && src">
        <audio ref="audio" :src="src" preload="none" @play="playing = true" @pause="playing = false" @ended="playing = false" />
        <VxButton size="sm" variant="ghost" :label="playing ? 'Stop' : 'Play'" @click="toggle">{{ playing ? 'Stop' : 'Play' }}</VxButton>
      </template>
    </div>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <p v-else-if="badUrl" class="err">A link must start with https://</p>
  </div>
</template>

<style scoped>
.file { display: grid; gap: 4px; min-width: 0; }
.hidden { display: none; }
.thumb { width: 26px; height: 26px; object-fit: cover; border-radius: var(--vx-radius-sm); border: 1px solid var(--vx-line); }
.err { margin: 0; font-size: 12px; color: var(--vx-bad); }
</style>
