import '@vex/ui/fonts.css'
import '@vex/ui/style.css'

import { VxBuild, syncDocumentTitle } from '@vex/ui'
import { createAccount } from '@vex/ui/account'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./pages/LandingPage.vue'), meta: { title: 'Links' } },
    { path: '/account', component: () => import('./pages/AccountPage.vue'), meta: { title: 'Profile' } },
    { path: '/obs_sources', component: () => import('./pages/ObsSourcesPage.vue'), meta: { title: 'OBS sources' } },
    // Browser source for OBS: transparent, no site chrome or starfield.
    { path: '/obs_sources/countdown', component: () => import('./pages/CountdownPage.vue'), meta: { title: 'Countdown' } },
    // Hands an https link over to an app link (obsidian://, …); see lib/redirect.
    { path: '/tools/httpsredirect', component: () => import('./pages/HttpsRedirectPage.vue'), meta: { title: 'Open app link' } },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('./pages/NotFoundPage.vue'), meta: { title: 'Not found' } },
  ],
})

syncDocumentTitle(router, 'vexoul.net')

// The shared *.vexoul.net sign-in: auth.vexoul.net, or VITE_AUTH_BASE when set (empty turns sign-in off).
createApp(App).use(router).use(VxBuild, { commit: __COMMIT__ }).use(createAccount()).mount('#app')
