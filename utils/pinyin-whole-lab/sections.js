/**
 * @file sections.js
 * @module utils
 * @description 基础设施工具：sections.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 整体认读分块（与人教版拼音页、闯关题库一致）
 */
export const WHOLE_SECTIONS = [
	{
		sectionKey: 'zhishi',
		title: '第一类',
		kidTitle: '翘舌整体读',
		emoji: '🐉',
		kidTip: 'zhi chi shi ri zi ci si，不用拼，整音节记住',
		symbols: ['zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si']
	},
	{
		sectionKey: 'yiwu',
		title: '第二类',
		kidTitle: 'yi wu yu 整体读',
		emoji: '⭐',
		kidTip: 'yi wu yu 等，按规则写成整体，直接读',
		symbols: ['yi', 'wu', 'yu', 'ye', 'yue', 'yuan', 'yin', 'yun', 'ying']
	}
]

export function getAllWholeSymbols() {
	return WHOLE_SECTIONS.flatMap((s) => s.symbols)
}

/** @param {string} symbol */
export function findWholeSection(symbol) {
	const s = String(symbol || '').trim().toLowerCase()
	if (!s) return null
	return WHOLE_SECTIONS.find((sec) => sec.symbols.includes(s)) || null
}
