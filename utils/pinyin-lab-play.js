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
