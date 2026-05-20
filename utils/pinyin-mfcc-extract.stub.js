/**
 * MFCC 占位（小程序 / H5 不打包 Meyda）
 */
export { serializeMfccEntry, deserializeMfccEntry } from './pinyin-mfcc-serialize.js'

export function isMfccRuntimeAvailable() {
	return false
}

export function extractMfccFromFloat32() {
	throw new Error('MFCC 评分仅支持 App')
}

export function extractMfccFromInt16() {
	throw new Error('MFCC 评分仅支持 App')
}
