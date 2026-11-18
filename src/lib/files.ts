// The signed-in user's uploaded overlay files (vex-auth /v2/files), shared by every file field on the page.
import { useAccount } from '@vex/ui/account'
import { effectScope, ref, watch } from 'vue'

export interface StoredFile {
  id: string
  name: string
  content_type: string
  size_bytes: number
  created_at: string
}

/** The service's file cap, for the message before an upload is even sent. */
export const FILE_MAX_BYTES = 4 * 1024 * 1024

const list = ref<StoredFile[]>([])
const usedBytes = ref(0)
const maxBytes = ref(0)
let watching = false

/** Why vex-auth refused an upload, in words. */
export function uploadError(status: number, body: { errors?: { type?: string }[] } | null): string {
  if (status === 413) return 'That file is too big: at most 4 MB.'
  if (status === 429) return 'Too many uploads at once. Wait a minute.'
  const type = body?.errors?.[0]?.type
  if (type === 'file_type') return 'Only PNG, JPEG, GIF, WebP images and MP3, Ogg, WAV, FLAC, M4A sounds.'
  if (type === 'too_big') return 'Your files are full (50 MB). Delete some on your profile page.'
  if (type === 'too_many') return 'You have 200 files already. Delete some on your profile page.'
  return `The upload failed (${status}). Try again.`
}

export function useFiles() {
  const account = useAccount()

  async function load(): Promise<void> {
    if (!account.user.value) {
      list.value = []
      return
    }
    try {
      const res = await account.request('/v2/files', { headers: { Accept: 'application/json' } })
      if (!res.ok) return
      const page: { items: StoredFile[]; used_bytes: number; max_bytes: number } = await res.json()
      list.value = page.items
      usedBytes.value = page.used_bytes
      maxBytes.value = page.max_bytes
    } catch {
      // The pickers just offer no uploads; uploading still says what went wrong.
    }
  }

  if (!watching) {
    watching = true
    // Detached: the list outlives whichever field asked first.
    effectScope(true).run(() => watch(account.user, load, { immediate: true }))
  }

  /** Uploads one file; resolves to it, or throws an Error saying why not. */
  async function upload(file: File): Promise<StoredFile> {
    if (file.size > FILE_MAX_BYTES) throw new Error(uploadError(413, null))
    let res: Response
    try {
      res = await account.request(`/v2/files?${new URLSearchParams({ name: file.name.slice(0, 120) })}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file,
      })
    } catch {
      throw new Error("Couldn't reach the sign-in service. Try again.")
    }
    if (!res.ok) throw new Error(uploadError(res.status, await res.json().catch(() => null)))
    const stored: StoredFile = await res.json()
    list.value = [stored, ...list.value]
    usedBytes.value += stored.size_bytes
    return stored
  }

  async function remove(id: string): Promise<boolean> {
    try {
      const res = await account.request(`/v2/files/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) return false
    } catch {
      return false
    }
    const gone = list.value.find((f) => f.id === id)
    list.value = list.value.filter((f) => f.id !== id)
    if (gone) usedBytes.value -= gone.size_bytes
    return true
  }

  return { list, usedBytes, maxBytes, upload, remove, reload: load }
}
