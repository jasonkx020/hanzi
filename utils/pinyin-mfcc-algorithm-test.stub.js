export function listMfccFingerprintSymbols() {
	return []
}

export function listMfccLetterSymbols() {
	return []
}

export function hasMfccFingerprint() {
	return false
}

export function getMfccFingerprintPreview() {
	return null
}

export async function runMfccCompareUserRecording() {
	throw new Error('评分调试仅支持 App')
}

export async function runMfccScoreDebugCompare() {
	throw new Error('评分调试仅支持 App')
}

export async function runMfccSelfTestFromOpus() {
	throw new Error('MFCC 自检仅支持 App')
}

export const DEFAULT_OPUS_WEB_PATH = '/static/pinyin/m.opus'
export const PINYIN_MFCC_PASS_SCORE = 0.5
