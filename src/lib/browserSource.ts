import { onMounted, onUnmounted } from 'vue'

/** Makes the page a bare, see-through one while an OBS browser source is on it (the library paints it black
 *  under a site shell), and puts the page back after. */
export function useBrowserSource(): void {
  const saved = { html: '', body: '' }
  onMounted(() => {
    saved.html = document.documentElement.style.cssText
    saved.body = document.body.style.cssText
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    document.body.style.margin = '0'
    document.body.style.overflow = 'hidden'
  })
  onUnmounted(() => {
    document.documentElement.style.cssText = saved.html
    document.body.style.cssText = saved.body
  })
}
