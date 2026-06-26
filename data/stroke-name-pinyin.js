/**
 * @file stroke-name-pinyin.js
 * @module data
 * @description 领域数据：stroke-name-pinyin.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 笔画名称 → 带调拼音音节列表（与 static/pinyin/{音节}.opus 文件名一致）。
 * 用于笔顺播报：优先整词映射，避免 cnchar 多音字在笔画语境下读错（如 折 zhé、钩 gōu）。
 * 复合笔画按音节与笔顺动画拐点对齐：首音节在笔起时播，后续音节在拐点/收尾时分段播。
 */

/** 单笔用字在「笔顺名称」语境下的固定读音（带声调符号，对应 opus 文件名） */
export const STROKE_CHAR_PINYIN = {
	横: 'héng',
	竖: 'shù',
	撇: 'piě',
	捺: 'nà',
	点: 'diǎn',
	提: 'tí',
	折: 'zhé',
	钩: 'gōu',
	弯: 'wān',
	卧: 'wò',
	斜: 'xié',
	扁: 'biǎn'
}

/**
 * cnchar-order 完整笔画名 → 音节序列（与教育部笔顺名称一致）
 * @type {Record<string, string[]>}
 */
export const STROKE_LABEL_SYLLABLES = {
	横: ['héng'],
	竖: ['shù'],
	撇: ['piě'],
	捺: ['nà'],
	点: ['diǎn'],
	点2: ['diǎn'],
	提: ['tí'],
	横折: ['héng', 'zhé'],
	横折弯: ['héng', 'zhé', 'wān'],
	横折折: ['héng', 'zhé', 'zhé'],
	横折折折: ['héng', 'zhé', 'zhé', 'zhé'],
	横折折折钩: ['héng', 'zhé', 'zhé', 'zhé', 'gōu'],
	横折折撇: ['héng', 'zhé', 'zhé', 'piě'],
	横折提: ['héng', 'zhé', 'tí'],
	横折钩: ['héng', 'zhé', 'gōu'],
	横撇: ['héng', 'piě'],
	横撇弯钩: ['héng', 'piě', 'wān', 'gōu'],
	横斜钩: ['héng', 'xié', 'gōu'],
	横钩: ['héng', 'gōu'],
	竖弯: ['shù', 'wān'],
	竖弯钩: ['shù', 'wān', 'gōu'],
	竖折折: ['shù', 'zhé', 'zhé'],
	竖折折钩: ['shù', 'zhé', 'zhé', 'gōu'],
	竖折撇: ['shù', 'zhé', 'piě'],
	竖提: ['shù', 'tí'],
	竖钩: ['shù', 'gōu'],
	撇折: ['piě', 'zhé'],
	撇点: ['piě', 'diǎn'],
	卧钩: ['wò', 'gōu'],
	弯钩: ['wān', 'gōu'],
	斜钩: ['xié', 'gōu']
}

/** 去重后的全部笔画名（便于校验、文档） */
export const STROKE_LABEL_NAMES = Object.keys(STROKE_LABEL_SYLLABLES)

/** 播放笔画音频所需的全部带调音节（去重） */
export const STROKE_REQUIRED_SYLLABLES = (() => {
	const set = new Set()
	for (const key of STROKE_LABEL_NAMES) {
		const arr = STROKE_LABEL_SYLLABLES[key]
		for (let i = 0; i < arr.length; i++) set.add(arr[i])
	}
	return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
})()

/** cnchar 同义笔画名分隔符，如「横撇|横钩」表示同一笔 */
const STROKE_ALIAS_SEP = /\s*[|｜/、]\s*/

/** 数据源偶发别字 */
function fixStrokeLabelTypos(s) {
	return String(s || '')
		.trim()
		.replace(/沟/g, '钩')
}

/**
 * 单个别名片段（不含 |）
 * @param {string} part
 */
function normalizeStrokeLabelPart(part) {
	let s = fixStrokeLabelTypos(part)
	if (!s) return ''
	if (s === '点2') return '点2'
	if (s === '横折弯扁') return '横折弯'
	return s
}

/**
 * 「横撇|横钩」等多叫法中取一条标准名：同笔并存时默认「横撇」，否则取 cnchar 顺序里首个已收录名
 * @param {string[]} parts
 */
function pickCanonicalStrokeAlias(parts) {
	const keys = parts.map((p) => normalizeStrokeLabelPart(p)).filter(Boolean)
	if (!keys.length) return ''
	const set = new Set(keys)
	if (set.has('横撇') && set.has('横钩') && STROKE_LABEL_SYLLABLES['横撇']) {
		return '横撇'
	}
	for (let i = 0; i < keys.length; i++) {
		if (STROKE_LABEL_SYLLABLES[keys[i]]) return keys[i]
	}
	return keys[0]
}

/**
 * 规范化笔画名（cnchar 偶发别名、| 同义合并）
 * @param {string} label
 */
export function normalizeStrokeLabel(label) {
	const raw = fixStrokeLabelTypos(label)
	if (!raw) return ''
	if (STROKE_ALIAS_SEP.test(raw)) {
		const parts = raw.split(STROKE_ALIAS_SEP).filter(Boolean)
		if (parts.length) return pickCanonicalStrokeAlias(parts)
	}
	return normalizeStrokeLabelPart(raw)
}

/**
 * 界面展示用笔画名（不显示 | 备选串）
 * @param {string} label
 */
export function formatStrokeLabelDisplay(label) {
	return normalizeStrokeLabel(label) || fixStrokeLabelTypos(label)
}

/**
 * 解析笔画名为带调音节数组（专用于笔顺音频，不用多音字自动推断）
 * @param {string} label
 * @returns {string[]}
 */
export function resolveStrokeLabelSyllables(label) {
	const key = normalizeStrokeLabel(label)
	if (!key) return []
	const exact = STROKE_LABEL_SYLLABLES[key]
	if (exact && exact.length) return exact.slice()

	const chars = key.match(/[\u4e00-\u9fff]/g)
	if (!chars || !chars.length) return []
	const out = []
	for (let i = 0; i < chars.length; i++) {
		const ch = chars[i]
		const py = STROKE_CHAR_PINYIN[ch]
		if (py) out.push(py)
	}
	return out
}
