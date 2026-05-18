import { VIP_QUOTA_LIMITS } from '@/constants/vip-quota-limits.js'
import { gateAndPromptWithAd, VIP_FEATURE, QUOTA_KEYS } from '@/utils/vip-gate.js'
import { AD_PLACEMENTS } from '@/constants/ad-placements.js'

/**
 * 进入写字练习（笔顺书写测验）
 * @param {{ hanzi?: string }} [options]
 */
export async function startWritePractice(options = {}) {
	const g = await gateAndPromptWithAd(VIP_FEATURE.STROKE_UNLIMITED, {
		quotaKey: QUOTA_KEYS.WRITE_CHARS,
		quotaLimit: VIP_QUOTA_LIMITS[QUOTA_KEYS.WRITE_CHARS],
		quotaTitle: '今日写字次数已用完',
		quotaMessage: '免费版每日可练 3 个字。开通会员后写字练习不限次。',
		adPlacement: AD_PLACEMENTS.WRITE_EXTRA_CHARS
	})
	if (!g.ok) return
	const raw = String(options.hanzi || '').trim()
	const pure = raw.match(/[\u4e00-\u9fff]/)?.[0] || ''
	const q = pure ? `?hanzi=${encodeURIComponent(pure)}` : ''
	uni.navigateTo({ url: `/pages/literacy/write-practice${q}` })
}
