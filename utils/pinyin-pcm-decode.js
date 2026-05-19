/**
 * 裸 PCM / WAV 转 Float32（App 录音 format=pcm 或 wav）
 */
import { FOLLOW_READ_TARGET_SR } from './pinyin-follow-read-audio-features.js'

/** @param {Uint8Array} u8 */
export function findPcmPayloadOffset(u8) {
	if (!u8?.length || u8.length < 12) return 0
	if (u8[0] !== 0x52 || u8[1] !== 0x49 || u8[2] !== 0x46 || u8[3] !== 0x46) {
		return 0
	}
	let pos = 12
	while (pos + 8 <= u8.length) {
		const id = String.fromCharCode(u8[pos], u8[pos + 1], u8[pos + 2], u8[pos + 3])
		const size =
			(u8[pos + 4] | (u8[pos + 5] << 8) | (u8[pos + 6] << 16) | (u8[pos + 7] << 24)) >>> 0
		if (id === 'data') return pos + 8
		pos += 8 + size
	}
	return 44
}

/**
 * @param {ArrayBuffer} arrayBuffer
 * @param {number} [sampleRate]
 */
function int16ToFloat32(int16) {
	const samples = new Float32Array(int16.length)
	for (let i = 0; i < int16.length; i++) samples[i] = int16[i] / 32768
	return samples
}

/** 裸 PCM s16le，无文件头 */
export function decodeRawPcmS16le(arrayBuffer, sampleRate = FOLLOW_READ_TARGET_SR) {
	if (!arrayBuffer?.byteLength) throw new Error('empty pcm')
	const n = Math.floor(arrayBuffer.byteLength / 2)
	if (n < 1) throw new Error('pcm too short')
	const int16 = new Int16Array(arrayBuffer, 0, n)
	return { int16, samples: int16ToFloat32(int16), sampleRate }
}

export function decodePcmOrWavToMono(arrayBuffer, sampleRate = FOLLOW_READ_TARGET_SR) {
	if (!arrayBuffer?.byteLength) {
		throw new Error('empty pcm')
	}
	const u8 = new Uint8Array(arrayBuffer)
	const offset = findPcmPayloadOffset(u8)
	const byteLen = arrayBuffer.byteLength - offset
	if (byteLen < 2) {
		throw new Error('pcm too short')
	}
	const n = Math.floor(byteLen / 2)
	const int16 = new Int16Array(arrayBuffer, offset, n)
	return { int16, samples: int16ToFloat32(int16), sampleRate }
}

/** wav / pcm 统一出口 */
export function decodePcmLikeToInt16(arrayBuffer, sniffKind, sampleRate = FOLLOW_READ_TARGET_SR) {
	if (sniffKind === 'pcm_raw') {
		return decodeRawPcmS16le(arrayBuffer, sampleRate)
	}
	return decodePcmOrWavToMono(arrayBuffer, sampleRate)
}

/** @param {string} hint @param {string} [filePath] */
export function inferRecordingAudioHint(hint, filePath = '') {
	const h = String(hint || '').toLowerCase()
	if (h === 'pcm' || h.endsWith('.pcm')) return 'pcm'
	const p = String(filePath || '').toLowerCase()
	if (p.endsWith('.pcm')) return 'pcm'
	if (p.endsWith('.wav')) return 'wav'
	return h || 'mp3'
}

export function isPcmLikeRecording(format, filePath = '') {
	const hint = inferRecordingAudioHint(format, filePath)
	return hint === 'pcm' || hint === 'wav'
}

/**
 * ArrayBuffer → Int16 单声道（pcm/wav）
 * @returns {{ int16: Int16Array, sampleRate: number, decodePath: 'pcm' }}
 */
export function arrayBufferToPcmInt16(arrayBuffer, sampleRate = FOLLOW_READ_TARGET_SR, sniffKind = 'wav') {
	const { int16, samples } = decodePcmLikeToInt16(arrayBuffer, sniffKind, sampleRate)
	return { int16, samples, sampleRate, decodePath: 'pcm' }
}
