/**
 * 拼音跟读 MFCC 参数（构建脚本 scripts/lib/mfcc-node-test-core.mjs 须与此一致）
 */
import { PINYIN_PCM_SAMPLE_RATE } from './pinyin-audio-sample-rate.js'

export const PINYIN_MFCC_META_VERSION = 3

export const PINYIN_MFCC_SAMPLE_RATE = PINYIN_PCM_SAMPLE_RATE
/** Meyda bufferSize，须为 2 的幂 */
export const PINYIN_MFCC_FRAME_SIZE = 2048
export const PINYIN_MFCC_HOP_SIZE = 512
export const PINYIN_MFCC_COEFFS = 13

/** Meyda extractor 名称 */
export const PINYIN_MFCC_EXTRACTOR = 'mfcc'

/** 去静音 RMS 阈值 */
export const PINYIN_MFCC_TRIM_THRESHOLD = 0.014

/** 有效发音最短时长（毫秒）；有足够 MFCC 帧时可由门控函数放宽 */
export const PINYIN_MFCC_MIN_EFFECTIVE_MS = 100

/** 至少提取出的 MFCC 帧数（有帧即认为有发音，避免 trim 后时长偏短误杀） */
export const PINYIN_MFCC_MIN_FRAMES_FOR_GATE = 6

/** 有效发音帧占比下限 */
export const PINYIN_MFCC_MIN_VOICED_RATIO = 0.06

/** DTW 归一化后映射为 matchScore 的系数 */
export const PINYIN_MFCC_DTW_SCALE = 0.42

/** 及格：matchScore 下限 */
export const PINYIN_MFCC_PASS_SCORE = 0.5

export function buildPinyinMfccMeta(extractorLabel = 'meyda') {
	return {
		version: PINYIN_MFCC_META_VERSION,
		opusNativeSampleRate: PINYIN_PCM_SAMPLE_RATE,
		sampleRate: PINYIN_MFCC_SAMPLE_RATE,
		channels: 1,
		bitsPerSample: 16,
		pcmFormat: 's16le',
		frameSize: PINYIN_MFCC_FRAME_SIZE,
		hopSize: PINYIN_MFCC_HOP_SIZE,
		mfccCoeffs: PINYIN_MFCC_COEFFS,
		extractor: extractorLabel
	}
}
