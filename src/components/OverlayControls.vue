<script setup lang="ts">
// The small control strip an overlay draws along the bottom of its page. The source is made CONTROLS_PX taller
// than what it should show and that much is cropped off in OBS, so the strip shows only in OBS's Interact window.
</script>

<template>
  <div class="controls" role="toolbar" aria-label="Overlay controls"><slot /></div>
</template>

<style scoped>
.controls {
  position: fixed;
  inset: auto 0 0 0;
  height: 40px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 8px;
  overflow-x: auto;
  background: rgba(11, 14, 23, 0.85);
  font-family: var(--vx-font-sans);
  color: var(--vx-ink);
}
</style>
