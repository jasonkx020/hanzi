import { playLocalPinyinNeutralThenTone1 } from '@/utils/play-pinyin-local-audio.js'

/** 乐园内播放整体认读（与拼音页一致：仅本地 opus，无调→一声替补，不 TTS） */
export async function playWholeLabSymbol(symbol) {
	const text = String(symbol || '').trim().toLowerCase()
	if (!text) return false
	return playLocalPinyinNeutralThenTone1(text, true)
}
