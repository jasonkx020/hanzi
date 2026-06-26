/**
 * @file audio-settings.js
 * @module utils
 * @description 基础设施工具：audio-settings.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
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
