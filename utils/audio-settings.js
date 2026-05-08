const STORAGE_NARRATOR = 'audio_narrator_v1'

export const AUDIO_NARRATOR = {
	KID: 'kid',
	FEMALE: 'female'
}

export function getAudioNarrator() {
	const v = uni.getStorageSync(STORAGE_NARRATOR)
	return v === AUDIO_NARRATOR.FEMALE ? AUDIO_NARRATOR.FEMALE : AUDIO_NARRATOR.KID
}

export function setAudioNarrator(v) {
	const next = v === AUDIO_NARRATOR.FEMALE ? AUDIO_NARRATOR.FEMALE : AUDIO_NARRATOR.KID
	uni.setStorageSync(STORAGE_NARRATOR, next)
	return next
}

export function getAudioNarratorLabel(v) {
	return v === AUDIO_NARRATOR.FEMALE ? '标准女声' : '童声'
}
