<script setup lang="ts">
import { VxAccount, VxPageHead, VxSiteShell } from '@vex/ui'
import OverlayForm from '@/components/OverlayForm.vue'
import { OVERLAYS } from '@/lib/overlays'
</script>

<template>
  <VxSiteShell site="root">
    <template #account><VxAccount profile-href="/account" /></template>
    <VxPageHead title="OBS sources">
      Browser sources for the stream. Set one up, copy its link and add it to OBS as a browser source with a
      transparent background.
    </VxPageHead>
    <div class="overlays">
      <OverlayForm v-for="o in OVERLAYS" :key="o.id" :overlay="o" />
    </div>
  </VxSiteShell>
</template>

<style scoped>
.overlays { display: flex; flex-direction: column; gap: 20px; max-width: 720px; }
</style>
