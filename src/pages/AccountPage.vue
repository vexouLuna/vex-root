<script setup lang="ts">
import { VxAccount, VxAvatar, VxButton, VxCallout, VxConfirm, VxEmptyState, VxPageHead, VxSiteShell, VxSpinner } from '@vex/ui'
import { useAccount } from '@vex/ui/account'
import { ref, watch } from 'vue'
import { memberSince, reconnectUrl } from '@/lib/account'

const account = useAccount()
const user = account.user
const since = ref<string | null>(null) // /v2/me's created_at: the account's user type doesn't carry it
const busy = ref<'everywhere' | 'progress' | 'forget' | null>(null)
const notice = ref<{ tone: 'ok' | 'error'; text: string } | null>(null)
const clearing = ref(false)
const forgetting = ref(false)
const forgotten = ref(false)

watch(
  user,
  async (u) => {
    since.value = null
    if (!u) return
    try {
      const res = await account.request('/v2/me', { headers: { Accept: 'application/json' } })
      const created = res.ok ? (await res.json()).created_at : null
      if (typeof created === 'string') since.value = memberSince(created)
    } catch {
      // "Member since" is a nicety: leave it out
    }
  },
  { immediate: true },
)

async function signOutEverywhere(): Promise<void> {
  busy.value = 'everywhere'
  await account.signOut({ everywhere: true })
  busy.value = null
}

function reconnect(): void {
  window.location.assign(reconnectUrl(account.base, window.location.href))
}

async function clearProgress(): Promise<void> {
  busy.value = 'progress'
  try {
    const res = await account.request('/v2/progress', { method: 'DELETE' })
    notice.value = res.ok
      ? { tone: 'ok', text: 'Your watch progress is cleared.' }
      : { tone: 'error', text: `Couldn't clear your watch progress (${res.status}). Try again.` }
  } catch {
    notice.value = { tone: 'error', text: "Couldn't reach the sign-in service. Try again." }
  }
  busy.value = null
  clearing.value = false
}

async function forget(): Promise<void> {
  if (!user.value) return
  busy.value = 'forget'
  try {
    const res = await account.request('/v2/me', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: user.value.login }),
    })
    if (res.ok) {
      notice.value = null
      forgotten.value = true
      forgetting.value = false
      await account.refresh()
    } else {
      notice.value = { tone: 'error', text: `Couldn't forget you (${res.status}). Nothing was deleted. Try again.` }
      forgetting.value = false
    }
  } catch {
    notice.value = { tone: 'error', text: "Couldn't reach the sign-in service. Nothing was deleted." }
    forgetting.value = false
  }
  busy.value = null
}
</script>

<template>
  <VxSiteShell site="root">
    <template #account><VxAccount profile-href="/account" /></template>
    <div class="account">
      <VxPageHead title="Profile" />

      <VxCallout v-if="forgotten" tone="ok" title="You're forgotten">
        Your vexoul.net sign-in, sessions and watch progress are deleted, and we asked Twitch to drop the
        connection (you can also remove it under Connections in your Twitch settings). Signing in again
        starts a new, empty account.
      </VxCallout>
      <VxCallout v-if="notice" :tone="notice.tone">{{ notice.text }}</VxCallout>

      <div v-if="!account.ready.value" class="loading"><VxSpinner /></div>

      <VxEmptyState
        v-else-if="!user"
        title="Signed out"
        :text="account.enabled ? 'Sign in with Twitch to see your profile.' : 'Sign-in is not available here.'"
      >
        <template #actions>
          <VxButton variant="primary" :disabled="!account.enabled" @click="account.signIn()">Sign in with Twitch</VxButton>
        </template>
      </VxEmptyState>

      <template v-else>
        <section class="who vx-panel">
          <VxAvatar :src="user.avatar ?? undefined" :name="user.displayName" :size="64" />
          <div class="who-text">
            <div class="name" :style="user.color ? { color: user.color } : undefined">{{ user.displayName }}</div>
            <div class="vx-mono vx-muted">{{ user.login }}</div>
            <div v-if="since" class="vx-muted">Member since {{ since }}</div>
          </div>
          <p class="who-note vx-muted">
            Your name, picture and colour come from Twitch. Change them in your
            <a href="https://www.twitch.tv/settings/profile" target="_blank" rel="noopener">Twitch settings</a>.
          </p>
        </section>

        <section class="rows vx-panel">
          <div class="row">
            <div>
              <h2>Sign out everywhere</h2>
              <p class="vx-muted">Ends your sign-in on every vexoul.net site and device, this one too.</p>
            </div>
            <VxButton :loading="busy === 'everywhere'" @click="signOutEverywhere">Sign out everywhere</VxButton>
          </div>
          <div class="row">
            <div>
              <h2>Reconnect Twitch</h2>
              <p class="vx-muted">Asks Twitch to approve vexoul.net again, for a fresh connection.</p>
            </div>
            <VxButton @click="reconnect">Reconnect Twitch</VxButton>
          </div>
          <div class="row">
            <div>
              <h2>Clear watch progress</h2>
              <p class="vx-muted">Forgets where you stopped in every VOD.</p>
            </div>
            <VxButton @click="clearing = true">Clear watch progress</VxButton>
          </div>
        </section>

        <section class="rows danger vx-panel">
          <div class="row">
            <div>
              <h2>Forget me</h2>
              <p class="vx-muted">
                Deletes your vexoul.net sign-in, sessions and watch progress, and disconnects Twitch. Chat logs
                and anything the doomtp bot keeps are not affected.
              </p>
            </div>
            <VxButton variant="danger" @click="forgetting = true">Forget me</VxButton>
          </div>
        </section>
      </template>
    </div>

    <VxConfirm
      v-model:open="clearing"
      title="Clear watch progress?"
      confirm-label="Clear"
      tone="danger"
      :loading="busy === 'progress'"
      @confirm="clearProgress"
    >
      Every VOD will start from the beginning again. This can't be undone.
    </VxConfirm>

    <VxConfirm
      v-if="user"
      v-model:open="forgetting"
      title="Forget me?"
      confirm-label="Forget me"
      tone="danger"
      :confirm-text="user.login"
      confirm-ignore-case
      :loading="busy === 'forget'"
      @confirm="forget"
    >
      This deletes your account here for good. It can't be undone.
    </VxConfirm>
  </VxSiteShell>
</template>

<style scoped>
.account { display: flex; flex-direction: column; gap: 20px; max-width: 720px; width: 100%; margin: 0 auto; }
/* The column's gap already spaces the head. */
.account > .vx-pagehead { margin-bottom: 0; }
.loading { display: flex; justify-content: center; padding: 40px 0; }
.who { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 16px; align-items: center; padding: 20px; }
.who-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.name { font-size: 20px; font-weight: 600; color: var(--vx-ink); overflow-wrap: anywhere; }
.who-note { grid-column: 1 / -1; margin: 10px 0 0; font-size: 13px; }
.who-note a { color: var(--vx-accent); }
.rows { display: flex; flex-direction: column; padding: 0 20px; }
.row { display: flex; gap: 16px; align-items: center; justify-content: space-between; padding: 16px 0; }
.row + .row { border-top: 1px solid var(--vx-line); }
.row h2 { margin: 0 0 4px; font-size: 15px; font-weight: 600; }
.row p { margin: 0; font-size: 13px; line-height: 1.5; }
.row > :deep(.vx-btn) { flex: none; }
.danger { border-color: var(--vx-bad); }
.danger h2 { color: var(--vx-bad); }
@container vx-site (max-width: 700px) {
  .row { flex-direction: column; align-items: stretch; }
}
</style>
