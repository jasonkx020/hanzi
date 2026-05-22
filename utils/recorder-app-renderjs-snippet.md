# App 页面 renderjs（须写在 .vue 根文件末尾，不能放在子组件）

```html
<!-- #ifdef APP-PLUS -->
<script module="recorderModule" lang="renderjs">
import 'recorder-core'
import RecordApp from 'recorder-core/src/app-support/app'
import '../../uni_modules/Recorder-UniCore/app-uni-support.js'
import 'recorder-core/src/engine/pcm'

export default {
	mounted() {
		RecordApp.UniRenderjsRegister(this)
	}
}
</script>
<!-- #endif -->
```

逻辑层 `mounted` / `onShow` 中调用 `notifyRecorderPageShow(this)`。
