import { getAudioNarrator } from '@/utils/audio-settings.js'
import {
	applyToneToSyllableStem,
	getLocalPinyinAudioPath,
	playPinyinLocalAudio,
	playLocalPinyinNeutralThenTone1,
	playToneGridCell
} from '@/utils/play-pinyin-local-audio.js'
import { speakPinyinSymbolAsync } from '@/utils/speak-pinyin-symbol.js'

/** 乐园内播放整体认读（与拼音页整体认读格一致：无调→一声→TTS） */
export async function playWholeLabSymbol(symbol) {
	const text = String(symbol || '').trim().toLowerCase()
	if (!text) return false
	const narrator = getAudioNarrator()
	const played = await playLocalPinyinNeutralThenTone1(text, true)
	if (played) return true
	const stem = applyToneToSyllableStem(text, 1) || text
	try {
		await playPinyinLocalAudio(getLocalPinyinAudioPath(stem), { timeoutMs: 3500 })
		return true
	} catch (_) {}
	const tts = await speakPinyinSymbolAsync(stem, narrator)
	if (tts) return true
	return playToneGridCell(stem, { narrator })
}
