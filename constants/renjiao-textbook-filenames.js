/**
 * @file renjiao-textbook-filenames.js
 * @module constants
 * @description 常量定义：renjiao-textbook-filenames.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 人教课文 / 附录表 JSON 文件名（英文，便于跨平台与工具链）
 * 与 static/booktext/renjiaoban/ 下实际文件一致。
 */

/**
 * @param {number|string} grade 0～6
 * @param {string} semester 「上」「下」
 * @param {'main'|'literacy'|'writing'|'words'|'idioms'} [kind] 缺省为课文主 JSON
 * @returns {string} 仅文件名，不含目录
 */
export function renjiaoTextbookJsonFile(grade, semester, kind = 'main') {
	const g = Number(grade)
	const sem = semester === '下' ? 'down' : 'up'
	if (kind === 'main') {
		if (g === 0) return 'preschool-bridge.json'
		if (!Number.isFinite(g) || g < 1 || g > 6) return ''
		return `grade${g}-${sem}.json`
	}
	if (!Number.isFinite(g) || g < 1 || g > 6) return ''
	const suf =
		kind === 'literacy'
			? 'literacy'
			: kind === 'writing'
				? 'writing'
				: kind === 'words'
					? 'words'
					: kind === 'idioms'
						? 'idioms'
						: ''
	if (!suf) return ''
	return `grade${g}-${sem}-${suf}.json`
}
