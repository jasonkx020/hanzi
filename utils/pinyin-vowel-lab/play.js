import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'
import {
	applyToneToSyllableStem,
	getLocalPinyinAudioPath,
	playPinyinLocalAudio,
	playLocalPinyinNeutralThenTone1,
	playToneGridCell
} from '@/utils/play-pinyin-local-audio.js'

/** 乐园内播放韵母（与拼音页韵母格一致：先无调再一声，仅本地 opus） */
export async function playVowelLabSymbol(symbol, opts = {}) {
	const isCancelled = opts.isCancelled
	if (typeof isCancelled === 'function' && isCancelled()) return false
	const text = stripPinyinToneMarks(String(symbol || '').trim().toLowerCase()).replace(/v/g, 'ü')
	if (!text) return false
	const played = await playLocalPinyinNeutralThenTone1(text, true, { isCancelled })
	if (played) return true
	if (typeof isCancelled === 'function' && isCancelled()) return false
	const stem = applyToneToSyllableStem(text, 1) || text
	try {
		await playPinyinLocalAudio(getLocalPinyinAudioPath(stem), { timeoutMs: 3500 })
		return !(typeof isCancelled === 'function' && isCancelled())
	} catch (_) {
		return playToneGridCell(stem, { isCancelled })
	}
}
