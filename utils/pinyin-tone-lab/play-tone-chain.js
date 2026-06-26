/**
 * @file play-tone-chain.js
 * @module utils
 * @description 基础设施工具：play-tone-chain.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import {
	applyToneToSyllableStem,
	getLocalPinyinAudioPath,
	playPinyinLocalAudio,
	sleepUnlessCancelled,
	isPinyinPlayAborted
} from '@/utils/play-pinyin-local-audio.js'
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'

/**
 * 慢速四声连读：mā → má → mǎ → mà
 * @param {string} bareOrSymbol
 * @param {{ gapMs?: number }} [opts]
 */
export async function playToneChainForBare(bareOrSymbol, opts = {}) {
	const bare = stripPinyinToneMarks(String(bareOrSymbol || '').trim().toLowerCase())
	if (!bare) return false
	const gapMs = opts.gapMs != null ? opts.gapMs : 450
	const isCancelled = opts.isCancelled
	let anyOk = false
	for (let t = 1; t <= 4; t++) {
		if (typeof isCancelled === 'function' && isCancelled()) return anyOk
		const stem = applyToneToSyllableStem(bare, t)
		if (!stem) continue
		const path = getLocalPinyinAudioPath(stem)
		try {
			await playPinyinLocalAudio(path, { timeoutMs: 3500 })
			anyOk = true
		} catch (e) {
			if (isPinyinPlayAborted(e)) {
				if (typeof isCancelled === 'function' && isCancelled()) return anyOk
				return anyOk
			}
		}
		if (t < 4 && gapMs > 0) {
			if (!(await sleepUnlessCancelled(gapMs, isCancelled))) return anyOk
		}
	}
	return anyOk
}
