/**
 * @file tone-rows.js
 * @module utils
 * @description 基础设施工具：tone-rows.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { stripPinyinToneMarks } from '@/utils/pinyin-strip-tone.js'
import { applyToneToSyllableStem } from '@/utils/play-pinyin-local-audio.js'
import { getPinyinSymbolCategory } from '@/utils/pinyin-pep-category.js'

/** 儿童界面展示无声调原形（v → ü） */
export function formatBareStemDisplay(bare) {
	return String(bare || '')
		.trim()
		.replace(/v/g, 'ü')
}

function normalizeTonedSyllable(stem) {
	const s = String(stem || '').trim()
	if (!s) return ''
	try {
		return s.normalize('NFC')
	} catch (_) {
		return s
	}
}

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
			const toned = normalizeTonedSyllable(stem)
			return {
				display: toned || '—',
				play: toned,
				tone: t,
				asNeutral: false,
				disabled: !toned
			}
		})
		return {
			bare: sym,
			bareStem: bare,
			stemLabel: formatBareStemDisplay(bare),
			cat,
			cells
		}
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
