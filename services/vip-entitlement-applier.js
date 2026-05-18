/**
 * 支付成功后写入对应权益（订阅 / 年级包 / 复习包）
 */

import { findVipProduct } from '@/constants/vip-products.js'
import { TEXTBOOK_VERSION_IDS } from '@/constants/curriculum-schema.js'
import {
	setFamilyPlanActive,
	unlockGradeForVersion,
	setReviewPackUnlocked
} from '@/utils/vip-entitlements.js'
import { extendVipByDays } from '@/utils/vip.js'

/**
 * @param {string} productId
 * @param {{ expireAtMs?: number }} [orderResult]
 */
export function applyProductEntitlement(productId, orderResult = {}) {
	const product = findVipProduct(productId)
	if (!product) return { ok: false, reason: 'unknown_product' }

	if (product.kind === 'subscription') {
		if (orderResult.expireAtMs) {
			// expireAt 已由 pay-service 写入
		} else if (product.durationDays) {
			extendVipByDays(product.durationDays)
		}
		if (product.familyPlan) setFamilyPlanActive(true)
		return { ok: true, kind: 'subscription', familyPlan: !!product.familyPlan }
	}

	if (product.kind === 'grade_pack') {
		unlockGradeForVersion(product.grade, TEXTBOOK_VERSION_IDS.TONGBIAN_RJ)
		return { ok: true, kind: 'grade_pack', grade: product.grade }
	}

	if (product.kind === 'review_pack') {
		setReviewPackUnlocked(true)
		return { ok: true, kind: 'review_pack' }
	}

	return { ok: false, reason: 'unsupported_kind' }
}
