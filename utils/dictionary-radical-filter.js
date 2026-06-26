/**
 * @file dictionary-radical-filter.js
 * @module utils
 * @description 基础设施工具：dictionary-radical-filter.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 部首筛选：cnchar 部首与左右旁写法对照（如 氵↔水、亻↔人）。
 */
import { getRadicalLabel } from '@/repositories/dictionary-repository.js'

/** @type {Record<string, string[]>} */
const RADICAL_EQUIVALENTS = {
	亻: ['亻', '人'],
	人: ['亻', '人'],
	氵: ['氵', '水'],
	水: ['氵', '水'],
	扌: ['扌', '手'],
	手: ['扌', '手'],
	讠: ['讠', '言'],
	言: ['讠', '言'],
	忄: ['忄', '心'],
	心: ['忄', '心'],
	礻: ['礻', '示'],
	示: ['礻', '示'],
	衤: ['衤', '衣'],
	衣: ['衤', '衣'],
	饣: ['饣', '食'],
	食: ['饣', '食'],
	钅: ['钅', '金'],
	金: ['钅', '金'],
	纟: ['纟', '糸', '丝', '糹'],
	糸: ['纟', '糸', '丝'],
	刂: ['刂', '刀'],
	刀: ['刂', '刀'],
	阝: ['阝', '阜', '邑'],
	攵: ['攵', '夂', '文'],
	艹: ['艹', '艸', '草'],
	草: ['艹', '艸', '草'],
	王: ['王', '玉'],
	玉: ['王', '玉'],
	疒: ['疒', '病'],
	辶: ['辶', '辵', '走'],
	廴: ['廴', '建'],
	贝: ['贝', '貝', '见'],
	见: ['见', '見', '贝']
}

/**
 * @param {string} filterRad 用户选中的部首 chip
 * @returns {Set<string>}
 */
export function radicalFilterSet(filterRad) {
	const key = String(filterRad || '').trim()
	if (!key) return new Set()
	const list = RADICAL_EQUIVALENTS[key] || [key]
	return new Set(list)
}

/**
 * @param {string} hanzi
 * @param {string} filterRad
 */
export function charMatchesRadicalFilter(hanzi, filterRad) {
	const key = String(filterRad || '').trim()
	if (!key) return false
	const label = getRadicalLabel(hanzi)
	const allowed = radicalFilterSet(key)
	if (allowed.has(label)) return true
	return label === key
}
