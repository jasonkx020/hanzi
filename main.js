import './utils/cnchar-setup.js'
import { installDebugConsoleHook } from '@/utils/debug-console-hook.js'

installDebugConsoleHook()

import App from './App'
import MengStatusBarSpacer from '@/components/meng-status-bar-spacer.vue'
import MengTabBar from '@/components/meng-tab-bar.vue'
import { initLocale } from '@/utils/i18n.js'

initLocale()

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
Vue.component('MengStatusBarSpacer', MengStatusBarSpacer)
Vue.component('MengTabBar', MengTabBar)
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  initLocale()
  const app = createSSRApp(App)
  app.component('MengStatusBarSpacer', MengStatusBarSpacer)
  app.component('MengTabBar', MengTabBar)
  return {
    app
  }
}
// #endif