import { QUOTA_KEYS } from '@/utils/vip-quota.js'

/** 广告位标识（埋点 placement 字段） */
export const AD_PLACEMENTS = {
	HOME_BANNER: 'home_banner',
	DAILY_EXTRA_ROUND: 'daily_extra_round',
	WRITE_EXTRA_CHARS: 'write_extra_chars',
	GAME_EXTRA_SESSION: 'game_extra_session',
	DICT_EXTRA_LOOKUPS: 'dict_extra_lookups'
}

/**
 * 激励视频奖励：增加当日配额 bonus（不直接减少 used）
 * @type {Record<string, { quotaKey: string, amount: number, shortLabel: string }>}
 */
export const AD_REWARD_BY_PLACEMENT = {
	[AD_PLACEMENTS.DAILY_EXTRA_ROUND]: {
		quotaKey: QUOTA_KEYS.DAILY_SESSION,
		amount: 1,
		shortLabel: '1 轮每日一练'
	},
	[AD_PLACEMENTS.WRITE_EXTRA_CHARS]: {
		quotaKey: QUOTA_KEYS.WRITE_CHARS,
		amount: 2,
		shortLabel: '2 次写字'
	},
	[AD_PLACEMENTS.GAME_EXTRA_SESSION]: {
		quotaKey: QUOTA_KEYS.GAME_SESSION,
		amount: 1,
		shortLabel: '1 次气球营'
	},
	[AD_PLACEMENTS.DICT_EXTRA_LOOKUPS]: {
		quotaKey: QUOTA_KEYS.DICT_LOOKUP,
		amount: 5,
		shortLabel: '5 次查字'
	}
}
