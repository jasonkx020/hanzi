/**
 * @file pinyin-lab-play.js
 * @module utils
 * @description 基础设施工具：pinyin-lab-play.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 拼音乐园 / 闯关等子页：统一本地播放会话（快速连点以最后一次为准）。
 */
import { runPinyinPlaySession, cancelPinyinPlay } from '@/utils/pinyin-play-session.js'

export { cancelPinyinPlay }

/**
 * @param {(ctx: { isCancelled: () => boolean }) => Promise<boolean>} playFn
 * @returns {Promise<boolean>}
 */
export async function playLabPinyinAudio(playFn) {
	return runPinyinPlaySession(async ({ isCancelled }) => {
		try {
			const ok = await playFn({ isCancelled })
			return !!ok && !isCancelled()
		} catch (_) {
			return false
		}
	})
}
