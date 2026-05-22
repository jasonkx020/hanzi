/**
 * 拼音跟读 / 相似度评分统一音频规范
 * 与 PinYinSound aconvert_mp3_to_opus.py 输出一致：48000 Hz · mono · s16le（16bit）
 *
 * 用于：示范 opus、MFCC 预提取、用户 PCM 录音、DTW 评分、_pcm 旁路
 */

/** 示范 opus 原生采样率 */
export const PINYIN_OPUS_NATIVE_SAMPLE_RATE = 48000

/** 全链路 PCM 采样率（预提取 / 解码 / 录音 / 评分） */
export const PINYIN_PCM_SAMPLE_RATE = PINYIN_OPUS_NATIVE_SAMPLE_RATE

/** MFCC 提取目标采样率（与 PINYIN_PCM_SAMPLE_RATE 相同） */
export const PINYIN_MFCC_SAMPLE_RATE = PINYIN_PCM_SAMPLE_RATE

/** App Recorder-UniCore 录音 PCM */
export const PINYIN_RECORD_PCM_SAMPLE_RATE = PINYIN_PCM_SAMPLE_RATE

export const PINYIN_PCM_CHANNELS = 1
export const PINYIN_PCM_BITS = 16
export const PINYIN_PCM_FORMAT = 's16le'
export const PINYIN_PCM_BYTES_PER_SAMPLE = PINYIN_PCM_BITS / 8

/**
 * RecordApp onProcess 目标块大小参考（字节）。
 * 3840 ≈ 40ms @48k mono s16le。
 */
export const PINYIN_RECORD_PCM_FRAME_BYTES = 3840

/** @deprecated 使用 PINYIN_RECORD_PCM_FRAME_BYTES */
export const PINYIN_RECORD_WXZ_FRAME_BYTES = PINYIN_RECORD_PCM_FRAME_BYTES

/** 跟读需录满的 PCM 时长（毫秒），与 config 中 TARGET_EFFECTIVE_MS 对齐 */
export const PINYIN_RECORD_CAPTURE_MS = 2000

/** 跟读评分合并后的 PCM 体积目标：2s @48k mono s16le */
export const PINYIN_RECORD_TARGET_PCM_BYTES = Math.floor(
	(PINYIN_RECORD_PCM_SAMPLE_RATE *
		PINYIN_PCM_BYTES_PER_SAMPLE *
		PINYIN_RECORD_CAPTURE_MS) /
		1000
)

/** 有效发声累计：按回调实际 byteLength 估算 */
export const PINYIN_RECORD_PCM_FRAME_SIZE_KB = Math.ceil(
	(PINYIN_RECORD_PCM_FRAME_BYTES * 2) / 1024
)

/** 约 50ms @ 48kHz mono s16le：PCM 帧合并 / 评分最低字节数 */
export const PINYIN_RECORD_MIN_PCM_MS = 50
export const PINYIN_RECORD_MIN_PCM_BYTES = Math.floor(
	(PINYIN_RECORD_PCM_SAMPLE_RATE * PINYIN_PCM_BYTES_PER_SAMPLE * PINYIN_RECORD_MIN_PCM_MS) /
		1000
)
export const PINYIN_RECORD_MIN_PCM_SAMPLES = Math.floor(
	(PINYIN_RECORD_PCM_SAMPLE_RATE * PINYIN_RECORD_MIN_PCM_MS) / 1000
)

/** 供日志 / 调试页展示 */
export function formatPinyinAudioSpec() {
	return `${PINYIN_PCM_SAMPLE_RATE}Hz · mono · ${PINYIN_PCM_BITS}bit (${PINYIN_PCM_FORMAT})`
}
