/**
 * @file pinyin-audio-sample-rate.js
 * @module constants
 * @description 常量定义：pinyin-audio-sample-rate.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 拼音本地音频（opus）规范
 * 与 PinYinSound 构建输出一致：48000 Hz · mono · s16le
 */

/** 示范 opus 原生采样率 */
export const PINYIN_OPUS_NATIVE_SAMPLE_RATE = 48000

/** 解码 / 旁路 PCM 采样率 */
export const PINYIN_PCM_SAMPLE_RATE = PINYIN_OPUS_NATIVE_SAMPLE_RATE

export const PINYIN_PCM_CHANNELS = 1
export const PINYIN_PCM_BITS = 16
export const PINYIN_PCM_FORMAT = 's16le'
export const PINYIN_PCM_BYTES_PER_SAMPLE = PINYIN_PCM_BITS / 8
