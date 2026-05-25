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
