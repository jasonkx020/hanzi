/**
 * @file lesson-mode-session.js
 * @module utils
 * @description 基础设施工具：lesson-mode-session.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 课次模式页一次性传参（避免 URL 过长）。
 * 写入后由小测/跟读等页读取并立即清除。
 */

const STORAGE_KEY = 'lesson_session_transfer_v1'

/**
 * @param {object} payload
 * @param {string} [payload.lessonTitle]
 * @param {number|null} [payload.rjLessonIdx]
 * @param {Array<{ hanzi: string, pinyin?: string }>} payload.rows
 */
export function putLessonQuizTransfer(payload) {
	try {
		uni.setStorageSync(STORAGE_KEY, {
			type: 'quiz',
			payload: payload || {},
			at: Date.now()
		})
	} catch (e) {
		console.warn('[lesson-mode-session] putLessonQuizTransfer', e)
	}
}

/** @returns {null | { lessonTitle?: string, rjLessonIdx?: number|null, rows: Array<{ hanzi: string, pinyin?: string }> }} */
export function takeLessonQuizTransfer() {
	try {
		const o = uni.getStorageSync(STORAGE_KEY)
		uni.removeStorageSync(STORAGE_KEY)
		if (!o || o.type !== 'quiz' || !o.payload) return null
		return o.payload
	} catch (e) {
		console.warn('[lesson-mode-session] takeLessonQuizTransfer', e)
		return null
	}
}

/**
 * 跟读页传参（与 quiz 同结构，读页后清除）。
 * @param {object} payload 同 putLessonQuizTransfer
 */
export function putLessonFollowTransfer(payload) {
	try {
		uni.setStorageSync(STORAGE_KEY, {
			type: 'follow',
			payload: payload || {},
			at: Date.now()
		})
	} catch (e) {
		console.warn('[lesson-mode-session] putLessonFollowTransfer', e)
	}
}

/** @returns {null | { lessonTitle?: string, rjLessonIdx?: number|null, rows: Array<{ hanzi: string, pinyin?: string }> }} */
export function takeLessonFollowTransfer() {
	try {
		const o = uni.getStorageSync(STORAGE_KEY)
		uni.removeStorageSync(STORAGE_KEY)
		if (!o || o.type !== 'follow' || !o.payload) return null
		return o.payload
	} catch (e) {
		console.warn('[lesson-mode-session] takeLessonFollowTransfer', e)
		return null
	}
}

/**
 * 听写（幼儿听音点字）页传参，结构同 quiz。
 * @param {object} payload 同 putLessonQuizTransfer
 */
export function putLessonDictationTransfer(payload) {
	try {
		uni.setStorageSync(STORAGE_KEY, {
			type: 'dictation',
			payload: payload || {},
			at: Date.now()
		})
	} catch (e) {
		console.warn('[lesson-mode-session] putLessonDictationTransfer', e)
	}
}

/** @returns {null | { lessonTitle?: string, rjLessonIdx?: number|null, rows: Array<{ hanzi: string, pinyin?: string }> }} */
export function takeLessonDictationTransfer() {
	try {
		const o = uni.getStorageSync(STORAGE_KEY)
		uni.removeStorageSync(STORAGE_KEY)
		if (!o || o.type !== 'dictation' || !o.payload) return null
		return o.payload
	} catch (e) {
		console.warn('[lesson-mode-session] takeLessonDictationTransfer', e)
		return null
	}
}

/**
 * 本课写字练习传参（结构同 quiz）。
 * @param {object} payload
 * @param {string} [payload.lessonTitle]
 * @param {number|null} [payload.rjLessonIdx]
 * @param {Array<{ hanzi: string, pinyin?: string }>} payload.rows
 */
export function putLessonWriteTransfer(payload) {
	try {
		uni.setStorageSync(STORAGE_KEY, {
			type: 'write',
			payload: payload || {},
			at: Date.now()
		})
	} catch (e) {
		console.warn('[lesson-mode-session] putLessonWriteTransfer', e)
	}
}

/** @returns {null | { lessonTitle?: string, rjLessonIdx?: number|null, rows: Array<{ hanzi: string, pinyin?: string }> }} */
export function takeLessonWriteTransfer() {
	try {
		const o = uni.getStorageSync(STORAGE_KEY)
		uni.removeStorageSync(STORAGE_KEY)
		if (!o || o.type !== 'write' || !o.payload) return null
		return o.payload
	} catch (e) {
		console.warn('[lesson-mode-session] takeLessonWriteTransfer', e)
		return null
	}
}

/**
 * 本课拼音小测传参。
 * @param {object} payload
 * @param {string} [payload.lessonTitle]
 * @param {number|null} [payload.rjLessonIdx]
 * @param {string[]} payload.symbols 本课（全面覆盖）
 * @param {string[]} [payload.priorSymbols] 前面课次拼音（随机混入）
 */
export function putLessonPinyinQuizTransfer(payload) {
	try {
		uni.setStorageSync(STORAGE_KEY, {
			type: 'pinyin_quiz',
			payload: payload || {},
			at: Date.now()
		})
	} catch (e) {
		console.warn('[lesson-mode-session] putLessonPinyinQuizTransfer', e)
	}
}

/** @returns {null | { lessonTitle?: string, rjLessonIdx?: number|null, symbols: string[], priorSymbols?: string[] }} */
export function takeLessonPinyinQuizTransfer() {
	try {
		const o = uni.getStorageSync(STORAGE_KEY)
		uni.removeStorageSync(STORAGE_KEY)
		if (!o || o.type !== 'pinyin_quiz' || !o.payload) return null
		return o.payload
	} catch (e) {
		console.warn('[lesson-mode-session] takeLessonPinyinQuizTransfer', e)
		return null
	}
}
