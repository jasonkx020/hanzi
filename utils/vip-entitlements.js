/**
 * 会员扩展权益：家庭年卡、年级永久解锁、复习包（P4）
 */

import { TEXTBOOK_VERSION_IDS } from '@/constants/curriculum-schema.js'
import { isVipActive } from '@/utils/vip.js'

const STORAGE_KEY = 'vip_entitlements_v1'

function defaultEntitlements() {
	return {
		familyPlan: false,
		reviewPack: false,
		/** @type {Record<string, number[]>} 版本 id -> 已解锁年级 */
		gradeUnlocks: {}
	}
}

export function loadVipEntitlements() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEY)
		if (!raw || typeof raw !== 'object') return defaultEntitlements()
		return {
			...defaultEntitlements(),
			...raw,
			gradeUnlocks: { ...(raw.gradeUnlocks || {}) }
		}
	} catch (_) {
		return defaultEntitlements()
	}
}

function saveVipEntitlements(ent) {
	try {
		uni.setStorageSync(STORAGE_KEY, ent)
	} catch (_) {}
}

export function hasFamilyPlan() {
	if (!isVipActive()) return false
	return !!loadVipEntitlements().familyPlan
}

export function setFamilyPlanActive(on = true) {
	const ent = loadVipEntitlements()
	ent.familyPlan = !!on
	saveVipEntitlements(ent)
}

export function hasReviewPack() {
	return !!loadVipEntitlements().reviewPack
}

export function setReviewPackUnlocked(on = true) {
	const ent = loadVipEntitlements()
	ent.reviewPack = !!on
	saveVipEntitlements(ent)
}

export function unlockGradeForVersion(grade, textbookVersionId = TEXTBOOK_VERSION_IDS.TONGBIAN_RJ) {
	const g = Math.floor(Number(grade))
	if (!Number.isFinite(g) || g < 1 || g > 6) return
	const tv = String(textbookVersionId || TEXTBOOK_VERSION_IDS.TONGBIAN_RJ)
	const ent = loadVipEntitlements()
	const list = ent.gradeUnlocks[tv] || []
	if (!list.includes(g)) list.push(g)
	list.sort((a, b) => a - b)
	ent.gradeUnlocks[tv] = list
	saveVipEntitlements(ent)
}

export function isGradePermanentlyUnlocked(grade, textbookVersionId) {
	if (isVipActive()) return true
	const g = Math.floor(Number(grade))
	if (!Number.isFinite(g) || g < 1 || g > 6) return false
	const tv = String(textbookVersionId || TEXTBOOK_VERSION_IDS.TONGBIAN_RJ)
	const list = loadVipEntitlements().gradeUnlocks[tv] || []
	return list.includes(g)
}

export function listUnlockedGrades(textbookVersionId) {
	const tv = String(textbookVersionId || TEXTBOOK_VERSION_IDS.TONGBIAN_RJ)
	return [...(loadVipEntitlements().gradeUnlocks[tv] || [])]
}

export function clearVipEntitlementsForDebug() {
	try {
		uni.removeStorageSync(STORAGE_KEY)
	} catch (_) {}
}
