/**
 * 跟读评分（Meyda + MFCC + DTW，仅 App）
 */

/** 评分过程调试日志（console + 调试页）；发版前可改为 false */
export const FOLLOW_READ_SCORE_DEBUG = false

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

/**
 * App wxz-record：固定墙钟录音时长（含首尾静音，不按有效发声截断）
 * 与 TARGET_EFFECTIVE_MS 对齐，便于评分拿到连续 2s PCM。
 */
export const PINYIN_FOLLOW_READ_WXZ_FIXED_WALL_MS = PINYIN_FOLLOW_READ_TARGET_EFFECTIVE_MS

/** 墙钟已满 2s 但 PCM 仍不足时，最多再等多久以凑满数据 */
export const PINYIN_FOLLOW_READ_PCM_CAPTURE_GRACE_MS = 2500

export function getFollowReadTargetEffectiveMs(options = {}) {
	const v = Number(options?.targetEffectiveMs)
	if (Number.isFinite(v) && v > 0) {
		return Math.min(PINYIN_FOLLOW_READ_MAX_WALL_MS, Math.max(400, Math.round(v)))
	}
	return PINYIN_FOLLOW_READ_TARGET_EFFECTIVE_MS
}

/** 手动 stop 等待 onStop 超时（毫秒） */
export const PINYIN_FOLLOW_READ_STOP_TIMEOUT_MS = 5000
