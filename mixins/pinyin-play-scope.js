/**
 * @file pinyin-play-scope.js
 * @module mixins
 * @description Vue mixin：pinyin-play-scope.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 在页面 created 挂载 `this._pyPlay`，onHide/onUnload 自动 cancel。
 * 在组件选项上设置 `pinyinPlayScope: PINYIN_PLAY_SCOPES.XXX`。
 */
import {
	createPinyinPlayScope,
	PINYIN_PLAY_SCOPES
} from '@/utils/pinyin-play-session.js'

export { PINYIN_PLAY_SCOPES }

export default {
	created() {
		const scopeId = this.$options.pinyinPlayScope || PINYIN_PLAY_SCOPES.GLOBAL
		this._pyPlay = createPinyinPlayScope(scopeId)
	},
	onHide() {
		this._pyPlay?.cancel()
	},
	onUnload() {
		this._pyPlay?.cancel()
	}
}
