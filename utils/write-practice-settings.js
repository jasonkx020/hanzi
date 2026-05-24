/** 写字练习页：普通（有语音） / 快速（无语音引导） */
export const WRITE_PRACTICE_PACE_NORMAL = 'normal'
export const WRITE_PRACTICE_PACE_FAST = 'fast'

const STORAGE_KEY = 'write_practice_pace'

export function getWritePracticePace() {
	try {
		const v = uni.getStorageSync(STORAGE_KEY)
		return v === WRITE_PRACTICE_PACE_FAST ? WRITE_PRACTICE_PACE_FAST : WRITE_PRACTICE_PACE_NORMAL
	} catch (_) {
		return WRITE_PRACTICE_PACE_NORMAL
	}
}

export function setWritePracticePace(pace) {
	const v = pace === WRITE_PRACTICE_PACE_FAST ? WRITE_PRACTICE_PACE_FAST : WRITE_PRACTICE_PACE_NORMAL
	try {
		uni.setStorageSync(STORAGE_KEY, v)
	} catch (_) {}
	return v
}
