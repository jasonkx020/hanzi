import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'
import { applyToneToSyllableStem } from '@/utils/play-pinyin-local-audio.js'
import { getPinyinSymbolCategory } from '@/utils/pinyin-pep-category.js'

/**
 * @param {string[]} symbols
 * @param {string} categoryTab
 */
export function buildToneRows(symbols, categoryTab) {
	return (symbols || []).map((sym) => {
		const bare = stripPinyinToneMarks(String(sym).trim().toLowerCase())
		const cat = getPinyinSymbolCategory(sym, categoryTab)
		const cells = [1, 2, 3, 4].map((t) => {
			const stem = applyToneToSyllableStem(bare, t)
			return {
				display: stem || '—',
				play: stem,
				tone: t,
				asNeutral: false,
				disabled: !stem
			}
		})
		return { bare: sym, bareStem: bare, cat, cells }
	})
}

/** @param {{ key: string, title: string, rows: object[] }[]} blocks */
export function flattenToneBlocks(blocks) {
	const out = []
	for (const block of blocks || []) {
		for (const row of block.rows || []) {
			out.push({ ...row, blockKey: block.key, blockTitle: block.title })
		}
	}
	return out
}
