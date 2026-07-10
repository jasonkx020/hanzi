/**
 * @file cnchar-spell-display.js
 * @module utils
 * @description 基础设施工具：cnchar-spell-display.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 将 cnchar 拼音结果格式化为界面展示用法。
 *
 * - 典型调用：`spellDisplayString('萌', 'tone', 'poly', 'low')` → 带调、多音字括号形式、「小写」（API 语义由 cnchar 决定）。
 * - 词语 + `array`：`spellDisplayString('银行行长', 'poly', 'tone', 'array', 'low')`
 *   cnchar 返回按字数组时用空格串联，便于在「笔顺」等页单行展示。
 *
 * 依赖 main.js 已引入的 `./utils/cnchar-setup.js`（含 cnchar-poly）；此处再挂一次同名实例，避免独立引用时遗漏插件。
 */
import cnchar, { ensureCncharReadySync } from './cnchar-setup.js'
import { appendDebugLog } from './debug-console-hook.js'

/** 调试：同时写 console + 调试页缓冲（构建移除 console 时仍可在日志页看到） */
function debugSpell(label, payload) {
	try {
		console.log(label, payload)
	} catch (_) {}
	try {
		const extra =
			payload !== undefined && typeof payload === 'object'
				? JSON.stringify(payload)
				: String(payload ?? '')
		appendDebugLog('log', label, extra)
	} catch (_) {}
}

/**
 * @param {string} text 汉字字符串
 * @param {...string} args 透传 cnchar.spell，顺序与文档一致（如 `'tone','poly','low'` 或 `'poly','tone','array','low'`）
 * @returns {string}
 */
export function spellDisplayString(text, ...args) {
	const t = String(text ?? '').trim()
	if (!t) return ''
	try {
		ensureCncharReadySync()
		const raw = cnchar.spell(t, ...args)
		let out
		if (args.includes('array') && Array.isArray(raw)) {
			out = raw
				.map((x) => (x != null ? String(x) : '').trim())
				.filter(Boolean)
				.join(' ')
		} else if (raw == null) {
			debugSpell('[spellDisplayString]', {
				input: t,
				args,
				raw: raw,
				note: 'raw is null'
			})
			return ''
		} else {
			out = String(raw)
		}
		debugSpell('[spellDisplayString]', { input: t, args, raw, out })
		return out
	} catch (_) {
		return ''
	}
}

/**
 * 单字多音：展开 cnchar spell 结果为若干带调拼音串（如 长 → cháng, zhǎng）。
 * 兼容 array 返回 ["(cháng|zhǎng)"] 或字符串 "(cháng|zhǎng)"。
 */
function expandSpellCellsToReadings(raw) {
	const cells = Array.isArray(raw) ? raw : [raw == null ? '' : raw]
	const out = []
	for (const cell of cells) {
		const s = String(cell ?? '').trim()
		if (!s) continue
		const m = /^\(([^)]+)\)$/.exec(s)
		if (m) {
			for (const part of m[1].split('|')) {
				const p = part.trim()
				if (p) out.push(p)
			}
		} else {
			out.push(s)
		}
	}
	return out
}

function readingDedupeKey(s) {
	return String(s || '').trim().toLowerCase()
}

/**
 * 将界面/字库里的拼音文案拆成若干「单个读音」串，供按音节查找音频。
 * - 空格、/、逗号、分号：分隔多个条目。
 * - (cháng|zhǎng)：与 cnchar poly 一致，拆成多条带调拼音。
 * @param {string} display
 * @returns {string[]}
 */
export function parsePinyinDisplayToReadings(display) {
	const str = String(display || '').trim()
	if (!str || str === '—') return []
	const tokens = str.split(/[\s/／，,；;]+/).filter(Boolean)
	const out = []
	const seen = new Set()
	for (const tok of tokens) {
		for (const r of expandSpellCellsToReadings(tok)) {
			const k = readingDedupeKey(r)
			if (!k || seen.has(k)) continue
			seen.add(k)
			out.push(r)
		}
	}
	return out
}

/**
 * @param {string} char 单个汉字
 * @returns {string[]} 全部读音
 */
export function listSpellReadingsForHanzi(char) {
	const c = String(char || '').match(/[\u4e00-\u9fff]/)?.[0]
	if (!c) return []
	try {
		ensureCncharReadySync()
		let raw = cnchar.spell(c, 'tone', 'poly', 'array', 'low')
		debugSpell('[listSpellReadingsForHanzi]', {
			input: c,
			raw: raw,
			note: 'raw'
		})
		let list = expandSpellCellsToReadings(raw)
		if (!list.length) {
			raw = cnchar.spell(c, 'tone', 'poly', 'low')
			list = expandSpellCellsToReadings(raw)
		}
		return list
	} catch (_) {
		return []
	}
}
