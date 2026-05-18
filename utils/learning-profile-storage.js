/**
 * 学习档案（家庭年卡最多 2 位孩子，进度按档案分桶存储）
 */

import { DEFAULT_CURRICULUM_PREFS } from '@/constants/curriculum-schema.js'
import { getCurriculumPrefs, setCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { hasFamilyPlan } from '@/utils/vip-entitlements.js'
import { STORAGE_KEYS } from '@/constants/curriculum-schema.js'

const STORAGE_PROFILES = 'learning_profiles_v1'
const DEFAULT_PROFILE_ID = 'p_default'

function defaultStore() {
	return {
		activeId: DEFAULT_PROFILE_ID,
		profiles: [
			{
				id: DEFAULT_PROFILE_ID,
				name: '孩子 1',
				createdAt: Date.now()
			}
		]
	}
}

function readStore() {
	try {
		const raw = uni.getStorageSync(STORAGE_PROFILES)
		if (!raw || typeof raw !== 'object') return defaultStore()
		const profiles = Array.isArray(raw.profiles) ? raw.profiles : defaultStore().profiles
		return {
			activeId: raw.activeId || DEFAULT_PROFILE_ID,
			profiles: profiles.length ? profiles : defaultStore().profiles
		}
	} catch (_) {
		return defaultStore()
	}
}

function writeStore(store) {
	try {
		uni.setStorageSync(STORAGE_PROFILES, store)
	} catch (_) {}
}

export function getActiveProfileId() {
	return readStore().activeId || DEFAULT_PROFILE_ID
}

export function listLearningProfiles() {
	return readStore().profiles.map((p) => ({ ...p }))
}

export function maxLearningProfiles() {
	return hasFamilyPlan() ? 2 : 1
}

export function getActiveProfile() {
	const store = readStore()
	return store.profiles.find((p) => p.id === store.activeId) || store.profiles[0]
}

/** 字进度 / 课进度 Storage 键（按档案隔离） */
export function getUserCharProgressStorageKey() {
	const id = getActiveProfileId()
	return id === DEFAULT_PROFILE_ID
		? STORAGE_KEYS.USER_CHAR_PROGRESS
		: `${STORAGE_KEYS.USER_CHAR_PROGRESS}__${id}`
}

export function getUserLessonProgressStorageKey() {
	const id = getActiveProfileId()
	return id === DEFAULT_PROFILE_ID
		? STORAGE_KEYS.USER_LESSON_PROGRESS
		: `${STORAGE_KEYS.USER_LESSON_PROGRESS}__${id}`
}

/**
 * 切换活跃档案（会恢复该档案保存的教材偏好）
 * @param {string} profileId
 */
export function switchLearningProfile(profileId) {
	const store = readStore()
	const p = store.profiles.find((x) => x.id === profileId)
	if (!p) return false
	store.activeId = profileId
	writeStore(store)
	if (p.curriculumPrefs && typeof p.curriculumPrefs === 'object') {
		setCurriculumPrefs(p.curriculumPrefs)
	}
	return true
}

/** 保存当前教材偏好到活跃档案 */
export function persistCurriculumToActiveProfile() {
	const prefs = getCurriculumPrefs()
	const store = readStore()
	const idx = store.profiles.findIndex((p) => p.id === store.activeId)
	if (idx < 0) return
	store.profiles[idx] = {
		...store.profiles[idx],
		curriculumPrefs: { ...prefs },
		updatedAt: Date.now()
	}
	writeStore(store)
}

export function renameLearningProfile(profileId, name) {
	const label = String(name || '').trim().slice(0, 12)
	if (!label) return false
	const store = readStore()
	const idx = store.profiles.findIndex((p) => p.id === profileId)
	if (idx < 0) return false
	store.profiles[idx] = { ...store.profiles[idx], name: label }
	writeStore(store)
	return true
}

export function createLearningProfile(name) {
	const store = readStore()
	if (store.profiles.length >= maxLearningProfiles()) return null
	const label = String(name || '').trim().slice(0, 12) || `孩子 ${store.profiles.length + 1}`
	const id = `p_${Date.now().toString(36)}`
	store.profiles.push({
		id,
		name: label,
		curriculumPrefs: { ...DEFAULT_CURRICULUM_PREFS },
		createdAt: Date.now()
	})
	writeStore(store)
	return id
}

export function clearLearningProfilesForDebug() {
	try {
		uni.removeStorageSync(STORAGE_PROFILES)
	} catch (_) {}
}
