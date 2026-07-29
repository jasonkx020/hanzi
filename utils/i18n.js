/**
 * 轻量 UI 多语言（zh-Hans / en）
 * 教学内容（汉字、课文、拼音值）不走本模块。
 */
import zhHans from '@/locale/zh-Hans.js'
import en from '@/locale/en.js'

export const LOCALES = Object.freeze(['zh-Hans', 'en'])
export const DEFAULT_LOCALE = 'zh-Hans'
export const LOCALE_STORAGE_KEY = 'meng_locale'
export const LOCALE_CHANGE_EVENT = 'meng-locale-changed'

const MESSAGES = {
	'zh-Hans': zhHans,
	en
}

/** @type {string} */
let currentLocale = DEFAULT_LOCALE

function isValidLocale(code) {
	return LOCALES.includes(code)
}

function readStoredLocale() {
	try {
		const v = uni.getStorageSync(LOCALE_STORAGE_KEY)
		if (typeof v === 'string' && isValidLocale(v)) return v
	} catch (_) {}
	return DEFAULT_LOCALE
}

function writeStoredLocale(code) {
	try {
		uni.setStorageSync(LOCALE_STORAGE_KEY, code)
	} catch (_) {}
}

/** 启动时调用：从 Storage 恢复 */
export function initLocale() {
	currentLocale = readStoredLocale()
	return currentLocale
}

export function getLocale() {
	return currentLocale
}

export function getLocaleDisplayName(code = currentLocale) {
	if (code === 'en') return t('locale.en')
	return t('locale.zhHans')
}

export function listLocales() {
	return LOCALES.map((code) => ({
		code,
		label: code === 'en' ? (MESSAGES.en['locale.en'] || 'English') : (MESSAGES['zh-Hans']['locale.zhHans'] || '简体中文')
	}))
}

/**
 * @param {string} code
 * @returns {boolean} 是否发生变更
 */
export function setLocale(code) {
	if (!isValidLocale(code) || code === currentLocale) return false
	currentLocale = code
	writeStoredLocale(code)
	try {
		uni.$emit(LOCALE_CHANGE_EVENT, code)
	} catch (_) {}
	return true
}

/**
 * @param {Record<string, string|number>|null|undefined} params
 * @param {string} template
 */
function interpolate(template, params) {
	if (!params || typeof template !== 'string') return template
	return template.replace(/\{(\w+)\}/g, (_, key) => {
		const v = params[key]
		return v == null ? '' : String(v)
	})
}

/**
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @param {string} [locale]
 */
export function t(key, params, locale) {
	const loc = locale && isValidLocale(locale) ? locale : currentLocale
	const primary = MESSAGES[loc] || {}
	const fallback = MESSAGES[DEFAULT_LOCALE] || {}
	const raw = primary[key] != null ? primary[key] : fallback[key]
	if (raw == null) return key
	return interpolate(String(raw), params)
}

export function onLocaleChange(handler) {
	try {
		uni.$on(LOCALE_CHANGE_EVENT, handler)
	} catch (_) {}
	return () => {
		try {
			uni.$off(LOCALE_CHANGE_EVENT, handler)
		} catch (_) {}
	}
}
