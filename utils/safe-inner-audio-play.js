/**
 * @file safe-inner-audio-play.js
 * @module utils
 * @description 基础设施工具：safe-inner-audio-play.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * InnerAudioContext.play() 在 H5 返回 Promise；被 stop/destroy/pause 打断时会 reject AbortError，属正常情况。
 */

export function isAudioPlayInterruptedError(err) {
	if (!err) return false
	if (err.code === 'PINYIN_PLAY_ABORTED') return true
	const name = String(err.name || '')
	const msg = String(err.message || err)
	return (
		name === 'AbortError' ||
		/interrupted by a call to pause/i.test(msg) ||
		/interrupted by a new load request/i.test(msg)
	)
}

/** 调用 play 并吞掉「被中断」类 rejection，避免 Uncaught (in promise) AbortError */
export function safeInnerAudioPlay(inner) {
	if (!inner || typeof inner.play !== 'function') return
	try {
		const ret = inner.play()
		if (ret && typeof ret.then === 'function') {
			ret.catch((err) => {
				if (!isAudioPlayInterruptedError(err)) {
					console.warn('[inner-audio] play rejected', err)
				}
			})
		}
	} catch (err) {
		if (!isAudioPlayInterruptedError(err)) throw err
	}
}
