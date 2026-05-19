import { isMfccRuntimeAvailable } from '@/utils/pinyin-mfcc-extract.js'

/**
 * 跟读评分 v2（Meyda + MFCC + DTW）
 * 设为 false 可回退 v1 包络方案。
 */
export const USE_MFCC_SCORING = true

/** 评分过程调试日志（console + 调试页）；发版前可改为 false */
export const FOLLOW_READ_SCORE_DEBUG = true

/** 跟读结束后自动播放用户录音（确认是否录到声）；发版前可改为 false */
export const FOLLOW_READ_DEBUG_PLAY_RECORDING = FOLLOW_READ_SCORE_DEBUG

/** 「我的」页始终显示「麦克风录音测试」入口（不依赖调试开关） */
export const PINYIN_RECORD_TEST_ENTRY_ALWAYS = true

/** 跟读需累计的有效发声时长（毫秒），达到后结束录音 */
export const PINYIN_FOLLOW_READ_TARGET_EFFECTIVE_MS = 2000

/** 墙钟最长录音时间（毫秒），超时仍未凑满有效时长则结束 */
export const PINYIN_FOLLOW_READ_MAX_WALL_MS = 10000

/** 使用有效发声时长结束（推荐）；false 时用下方固定墙钟时长 */
export const PINYIN_FOLLOW_READ_USE_EFFECTIVE_DURATION = true

/** 跟读固定墙钟时长（毫秒）；仅当 USE_EFFECTIVE_DURATION=false 且 USE_FIXED_DURATION=true */
export const PINYIN_FOLLOW_READ_FIXED_MS = 2000

/** 是否使用固定墙钟定时结束 */
export const PINYIN_FOLLOW_READ_USE_FIXED_DURATION = false

export function getFollowReadTargetEffectiveMs(options = {}) {
	const v = Number(options?.targetEffectiveMs)
	if (Number.isFinite(v) && v > 0) {
		return Math.min(PINYIN_FOLLOW_READ_MAX_WALL_MS, Math.max(400, Math.round(v)))
	}
	return PINYIN_FOLLOW_READ_TARGET_EFFECTIVE_MS
}

/** 跟读录音优先 pcm 裸流（App 必开；跳过 decodeAudioData） */
export const PINYIN_FOLLOW_READ_PREFER_PCM = true

/** 手动 stop 等待 onStop 超时（毫秒） */
export const PINYIN_FOLLOW_READ_STOP_TIMEOUT_MS = 5000

/**
 * 是否走 MFCC 路径（配置开启且当前端 Meyda 可用）
 * App 若 Meyda 不可用会自动走 v1。
 */
export function shouldUseMfccScoring() {
	if (!USE_MFCC_SCORING) return false
	return isMfccRuntimeAvailable()
}
