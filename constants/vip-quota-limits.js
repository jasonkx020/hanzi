import { QUOTA_KEYS } from '@/utils/vip-quota.js'

/** 免费版每日配额（会员跳过校验） */
export const VIP_QUOTA_LIMITS = {
	[QUOTA_KEYS.DICT_LOOKUP]: 18,
	[QUOTA_KEYS.WRITE_CHARS]: 3,
	[QUOTA_KEYS.PINYIN_FOLLOW]: 5,
	[QUOTA_KEYS.DRILL_SHUFFLE]: 3,
	[QUOTA_KEYS.DAILY_SESSION]: 1,
	[QUOTA_KEYS.GAME_SESSION]: 2,
	[QUOTA_KEYS.STROKE_REPLAY]: 6
}

/** 非会员易错字列表最多展示条数 */
export const FREE_WRONG_OFTEN_VISIBLE = 5
