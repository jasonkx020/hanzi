import {
	applyToneToSyllableStem,
	getLocalPinyinAudioPath,
	playPinyinLocalAudio,
	sleep,
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
	let anyOk = false
	for (let t = 1; t <= 4; t++) {
		const stem = applyToneToSyllableStem(bare, t)
		if (!stem) continue
		const path = getLocalPinyinAudioPath(stem)
		try {
			await playPinyinLocalAudio(path, { timeoutMs: 3500 })
			anyOk = true
		} catch (e) {
			if (isPinyinPlayAborted(e)) return anyOk
		}
		if (t < 4 && gapMs > 0) await sleep(gapMs)
	}
	return anyOk
}
