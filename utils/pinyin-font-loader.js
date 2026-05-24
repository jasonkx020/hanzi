/**
 * 拼音展示字体：与 static/styles/pinyin-font.css 同一套 @font-face。
 * App / 小程序：uni.loadFontFace 仅用 /static/... 站点路径（勿用 _www、file://、绝对路径）。
 * H5 仅依赖 CSS。
 */

/** 与 pinyin-font.css :root --meng-pinyin-font-family */
export const MENG_PINYIN_FONT_FAMILY_VAR = '--meng-pinyin-font-family'

/** 与 pinyin-font.css .font-pinyin 使用的族名 */
export const PINYIN_FONT_FAMILY_NAME = 'pinyin'

/**
 * 与 pinyin-font.css 各 @font-face 一致（path 为站点路径 /static/...）
 * @type {Record<string, { family: string, sources: Array<{ path: string, format: string }> }>}
 */
export const PINYIN_FONT_FACES = {
	pinyin: {
		family: 'pinyin',
		sources: [
			{ path: '/static/fonts/pinyin-regular.woff2', format: 'woff2' },
			{ path: '/static/fonts/Pinyin-Regular.ttf', format: 'truetype' }
		]
	},
	pinyinstep: {
		family: 'pinyinstep',
		sources: [
			{ path: '/static/fonts/pinyin-step.woff2', format: 'woff2' },
			{ path: '/static/fonts/pinyin-step.ttf', format: 'truetype' }
		]
	},
	pinyinWenkaiLight: {
		family: 'pinyin-wenkai-light',
		sources: [
			{ path: '/static/fonts/pinyin-wenkai-light.woff2', format: 'woff2' },
			{ path: '/static/fonts/pinyin-wenkai-light.ttf', format: 'truetype' }
		]
	}
}

/** @deprecated 请用 PINYIN_FONT_FACES.pinyin.sources */
export const PINYIN_FONT_URL = PINYIN_FONT_FACES.pinyin.sources[0].path

/** 与 pinyin-font.css --meng-pinyin-font-family、.font-pinyin 一致 */
export const PINYIN_FONT_FAMILY_CSS =
	"'pinyin', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif"

function normalizeStaticWebPath(path) {
	const p = String(path || '').trim()
	if (!p.startsWith('/static/')) return ''
	return p
}

/** 单次 loadFontFace 的 source（仅 /static/...） */
function buildLoadFontFaceSource(path, format) {
	const web = normalizeStaticWebPath(path)
	if (!web) return ''
	if (format) return `url("${web}") format("${format}")`
	return `url("${web}")`
}

/**
 * 生成与 CSS @font-face 同结构的多源字符串（供文档/调试，不用于 App loadFontFace）
 */
export function buildPinyinFontFaceSource(face, opts = {}) {
	const list = face && Array.isArray(face.sources) ? face.sources : []
	const indexes =
		opts.sourceIndexes != null ? opts.sourceIndexes : list.map((_, i) => i)
	const parts = []
	for (const i of indexes) {
		const s = list[i]
		if (!s) continue
		const one = buildLoadFontFaceSource(s.path, s.format)
		if (one) parts.push(one)
	}
	return parts.join(', ')
}

/** App 端尝试列表：TTF 优先、每格式单独请求、含别名 */
function buildAppLoadAttempts(face) {
	const raw = face && Array.isArray(face.sources) ? face.sources : []
	const expanded = []
	const seen = new Set()

	const push = (path, format) => {
		const web = normalizeStaticWebPath(path)
		if (!web) return
		const key = `${web}|${format || ''}`
		if (seen.has(key)) return
		seen.add(key)
		expanded.push({ path: web, format: format || '' })
	}

	for (const s of raw) {
		push(s.path, s.format)
	}

	expanded.sort((a, b) => {
		if (a.format === 'truetype' && b.format !== 'truetype') return -1
		if (b.format === 'truetype' && a.format !== 'truetype') return 1
		return 0
	})

	const attempts = []
	for (const s of expanded) {
		if (s.format) attempts.push(buildLoadFontFaceSource(s.path, s.format))
		attempts.push(buildLoadFontFaceSource(s.path, ''))
	}
	return [...new Set(attempts.filter(Boolean))]
}

function loadFontFaceOnce(family, source, { quiet = false } = {}) {
	if (!source) return Promise.resolve(false)
	return new Promise((resolve) => {
		try {
			if (typeof uni.loadFontFace !== 'function') {
				resolve(false)
				return
			}
			uni.loadFontFace({
				family,
				source,
				global: true,
				success: () => resolve(true),
				fail: () => resolve(false)
			})
		} catch (_) {
			resolve(false)
		}
	})
}

async function loadFontFaceWithCandidates(face) {
	// const { family } = face
	// const attempts = buildAppLoadAttempts(face)
	// for (const source of attempts) {
	// 	if (await loadFontFaceOnce(family, source, { quiet: true })) {
	// 		return true
	// 	}
	// }
	// console.warn(
	// 	'[pinyin-font] loadFontFace unavailable, fallback to CSS/system',
	// 	family
	// )
	// return false
	return true
}

let loadPromise = null

/**
 * 注册主展示体 pinyin（与 .font-pinyin 一致）
 * @returns {Promise<boolean>}
 */
export function ensurePinyinFontLoaded() {
	if (loadPromise) return loadPromise

	// #ifdef H5
	loadPromise = Promise.resolve(true)
	return loadPromise
	// #endif

	loadPromise = loadFontFaceWithCandidates(PINYIN_FONT_FACES.pinyin)
	return loadPromise
}

/**
 * 按需注册其它 @font-face（与 CSS 族名一致）
 * @param {'pinyinstep'|'pinyinWenkaiLight'} key
 */
export function ensurePinyinAuxFontLoaded(key) {
	const face = PINYIN_FONT_FACES[key]
	if (!face) return Promise.resolve(false)
	// #ifdef H5
	return Promise.resolve(true)
	// #endif
	return loadFontFaceWithCandidates(face)
}

/**
 * 首屏尚无页面栈时 uni.loadFontFace 可能失败，延后重试（供 App.vue onLaunch）
 */
export function schedulePinyinFontLoad(maxAttempts = 25, intervalMs = 120) {
	const tryOnce = (attempt) => {
		try {
			if (typeof uni.loadFontFace !== 'function') return
			const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
			if (!pages.length && attempt < maxAttempts) {
				setTimeout(() => tryOnce(attempt + 1), intervalMs)
				return
			}
			ensurePinyinFontLoaded()
		} catch (e) {
			console.warn('[pinyin-font] schedule load', e)
		}
	}
	setTimeout(() => tryOnce(0), 0)
}
