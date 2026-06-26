/**
 * @file pinyin-audio-build-constants.mjs
 * @module scripts
 * @description 源文件：pinyin-audio-build-constants.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * Node 构建脚本用音频规范（须与 constants/pinyin-audio-sample-rate.js 一致）
 */
export const PINYIN_AUDIO_SAMPLE_RATE = 48000
export const PINYIN_AUDIO_CHANNELS = 1
export const PINYIN_AUDIO_BITS = 16
export const PINYIN_AUDIO_PCM_FORMAT = 's16le'

/** ffmpeg 解码 opus → PCM 参数 */
export const FFMPEG_PCM_ARGS = [
	'-ac',
	String(PINYIN_AUDIO_CHANNELS),
	'-ar',
	String(PINYIN_AUDIO_SAMPLE_RATE),
	'-f',
	PINYIN_AUDIO_PCM_FORMAT
]
