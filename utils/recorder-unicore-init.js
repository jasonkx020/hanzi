/**
 * Recorder-UniCore 逻辑层一次性加载（App 端 renderjs 另见 components/recorder-unicore-host.vue）
 */
import Recorder from 'recorder-core'
import RecordApp from 'recorder-core/src/app-support/app'
import '@/uni_modules/Recorder-UniCore/app-uni-support.js'

// #ifdef H5 || MP-WEIXIN
import 'recorder-core/src/engine/pcm'
// #endif

// 避免 vue3 tree-shaking 删掉 Recorder
if (typeof Recorder !== 'undefined') {
	Recorder.a = 1
}

export { Recorder, RecordApp }
