import './utils/cnchar-setup.js'
import { installDebugConsoleHook } from '@/utils/debug-console-hook.js'

installDebugConsoleHook()

import App from './App'
import MengStatusBarSpacer from '@/components/meng-status-bar-spacer.vue'
import CustomTabBar from '@/custom-tab-bar/index.vue'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
Vue.component('MengStatusBarSpacer', MengStatusBarSpacer)
Vue.component('CustomTabBar', CustomTabBar)
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  app.component('MengStatusBarSpacer', MengStatusBarSpacer)
  app.component('CustomTabBar', CustomTabBar)
  return {
    app
  }
}
// #endif