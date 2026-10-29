<script setup lang="ts">
import { VxAccount, VxPageHead, VxSiteShell } from '@vex/ui'
import LinkList from '@/components/LinkList.vue'
import { TWITCH_LINK, VODS_LINK, type LinkGroup } from '@/lib/links'

const groups: LinkGroup[] = [
  {
    title: 'Homebrew',
    links: [{ name: 'Countdown', handle: '?h=&m=&s=&text=', href: '/obs_sources/countdown?m=5' }],
  },
  {
    title: 'External',
    links: [TWITCH_LINK, VODS_LINK],
  },
]
</script>

<template>
  <VxSiteShell site="root">
    <template #account><VxAccount profile-href="/account" /></template>
    <VxPageHead title="OBS sources" subtitle="Browser sources for the stream. Add one to OBS as a browser source with a transparent background." />
    <LinkList :groups="groups" />
  </VxSiteShell>
</template>

<style scoped>
</style>
