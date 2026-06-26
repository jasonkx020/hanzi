/**
 * @file sections.js
 * @module utils
 * @description 基础设施工具：sections.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 声母分块（与人教版拼音页、闯关题库一致）
 */
export const INITIAL_SECTIONS = [
	{
		sectionKey: 'bilabial',
		title: '双唇音',
		kidTitle: '嘴唇音',
		emoji: '👄',
		kidTip: '上下嘴唇轻轻合在一起',
		symbols: ['b', 'p', 'm']
	},
	{
		sectionKey: 'labiodental',
		title: '唇齿音',
		kidTitle: '牙齿唇音',
		emoji: '🦷',
		kidTip: '上牙轻轻碰下唇',
		symbols: ['f']
	},
	{
		sectionKey: 'apical',
		title: '舌尖中音',
		kidTitle: '舌尖音',
		emoji: '👅',
		kidTip: '舌尖顶上排牙齿后面',
		symbols: ['d', 't', 'n', 'l']
	},
	{
		sectionKey: 'velar',
		title: '舌根音',
		kidTitle: '喉咙音',
		emoji: '🗣️',
		kidTip: '舌根靠软腭，像咳嗽前那样',
		symbols: ['g', 'k', 'h']
	},
	{
		sectionKey: 'palatal',
		title: '舌面音',
		kidTitle: '舌面音',
		emoji: '😊',
		kidTip: '舌面前部抬起，像微笑',
		symbols: ['j', 'q', 'x']
	},
	{
		sectionKey: 'retroflex',
		title: '翘舌音',
		kidTitle: '翘舌头',
		emoji: '👆',
		kidTip: '舌尖往上翘，卷起来一点',
		symbols: ['zh', 'ch', 'sh', 'r']
	},
	{
		sectionKey: 'alveolar',
		title: '平舌音',
		kidTitle: '平舌头',
		emoji: '😛',
		kidTip: '舌尖放平，顶住上齿背',
		symbols: ['z', 'c', 's']
	},
	{
		sectionKey: 'glide',
		title: '隔音字母',
		kidTitle: 'y 和 w',
		emoji: '🎵',
		kidTip: '写在开头，帮助音节更好读',
		symbols: ['y', 'w']
	}
]

export function getAllInitialSymbols() {
	return INITIAL_SECTIONS.flatMap((s) => s.symbols)
}

/** @param {string} symbol */
export function findInitialSection(symbol) {
	const s = String(symbol || '').trim().toLowerCase()
	if (!s) return null
	return INITIAL_SECTIONS.find((sec) => sec.symbols.includes(s)) || null
}
