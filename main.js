/**
 * @file main.js
 * @module main
 * @description 应用入口 main.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import './utils/cnchar-setup.js'
import { installDebugConsoleHook } from '@/utils/debug-console-hook.js'

installDebugConsoleHook()

import App from './App'
import MengStatusBarSpacer from '@/components/meng-status-bar-spacer.vue'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
Vue.component('MengStatusBarSpacer', MengStatusBarSpacer)
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
  return {
    app
  }
}
// #endif