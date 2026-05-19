/**
 * 根据文件头判断录音实际格式（与 recorder.format 可能不一致）
 */

/** @returns {'wav'|'mp3'|'aac'|'pcm_raw'|'unknown'} */
export function sniffRecordingAudioKind(arrayBuffer) {
	if (!arrayBuffer?.byteLength || arrayBuffer.byteLength < 4) return 'unknown'
	const u8 = new Uint8Array(arrayBuffer)
	if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46) {
		return 'wav'
	}
	if (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) {
		return 'mp3'
	}
	if (u8[0] === 0xff && (u8[1] & 0xe0) === 0xe0) {
		return 'mp3'
	}
	if (u8[0] === 0xff && (u8[1] === 0xf1 || u8[1] === 0xf9)) {
		return 'aac'
	}
	return 'pcm_raw'
}
