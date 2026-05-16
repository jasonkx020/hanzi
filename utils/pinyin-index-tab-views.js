/**
 * 拼音页 Tab 视图预计算（避免切换时重复 chunk / 分类计算）
 */
import { chunkHomeworkSymbols } from '@/utils/pinyin-homework-chunk.js'
import { getPinyinSymbolCategory } from '@/utils/pinyin-pep-category.js'

function sheetForChunk(chunk, categoryTab) {
	const list = Array.isArray(chunk) ? chunk : []
	for (let i = 0; i < list.length; i++) {
		const sym = list[i]
		if (sym == null || !String(sym).trim()) continue
		const cat = getPinyinSymbolCategory(sym, categoryTab)
		return { bg: cat.bg || '', bd: cat.bd || '' }
	}
	return { bg: '', bd: '' }
}

/**
 * @param {Array<{ title: string, desc?: string, symbols: string[] }>} sections
 * @param {string} kind
 * @param {string} categoryTab
 */
export function buildHomeworkSectionViews(sections, kind, categoryTab) {
	return (sections || []).map((sec, si) => ({
		title: sec.title,
		desc: sec.desc || '',
		si,
		kind,
		rows: chunkHomeworkSymbols(sec.symbols).map((chunk, ri) => {
			const sheet = sheetForChunk(chunk, categoryTab)
			return {
				chunk,
				ri,
				sheetBg: sheet.bg,
				sheetBd: sheet.bd,
				scrollPadId: `pyar-pad-${kind}-${si}-${ri}`,
				scrollId: `pyar-${kind}-${si}-${ri}`
			}
		})
	}))
}

/**
 * @param {string[]} symbols
 */
export function buildHomeworkDrillRows(symbols) {
	const kind = 'drill'
	const si = 0
	const categoryTab = '拼读练习'
	return chunkHomeworkSymbols(symbols).map((chunk, ri) => {
		const sheet = sheetForChunk(chunk, categoryTab)
		return {
			chunk,
			ri,
			si,
			kind,
			sheetBg: sheet.bg,
			sheetBd: sheet.bd,
			scrollPadId: `pyar-pad-${kind}-${si}-${ri}`,
			scrollId: `pyar-${kind}-${si}-${ri}`
		}
	})
}

/**
 * 从预计算作业行生成连读 slot 列表
 * @param {ReturnType<buildHomeworkSectionViews>} sectionViews
 */
export function autoReadSlotsFromSectionViews(sectionViews) {
	const slots = []
	;(sectionViews || []).forEach((sec) => {
		const kind = sec.kind
		;(sec.rows || []).forEach((row) => {
			;(row.chunk || []).forEach((sym, ci) => {
				if (!sym) return
				slots.push({
					kind,
					symbol: sym,
					asNeutral: false,
					slotKey: `${kind}|${sec.si}|${row.ri}|${ci}`,
					scrollId: row.scrollId,
					scrollPadId: row.scrollPadId,
					sectionTitle: sec.title,
					si: sec.si,
					ri: row.ri,
					ci
				})
			})
		})
	})
	return slots
}

/**
 * @param {ReturnType<buildHomeworkDrillRows>} drillRows
 */
export function autoReadSlotsFromDrillRows(drillRows) {
	const slots = []
	;(drillRows || []).forEach((row) => {
		;(row.chunk || []).forEach((sym, ci) => {
			if (!sym) return
			slots.push({
				kind: 'drill',
				symbol: sym,
				asNeutral: false,
				slotKey: `drill|0|${row.ri}|${ci}`,
				scrollId: row.scrollId,
				scrollPadId: row.scrollPadId,
				sectionTitle: '拼读练习',
				si: 0,
				ri: row.ri,
				ci
			})
		})
	})
	return slots
}

/**
 * @param {Array<{ key: string, title: string, rows: Array<{ cells: Array<{ play?: string, disabled?: boolean, asNeutral?: boolean }> }> }>} blocks
 */
export function autoReadSlotsFromToneBlocks(blocks) {
	const slots = []
	;(blocks || []).forEach((block) => {
		;(block.rows || []).forEach((row, rowIdx) => {
			;(row.cells || []).forEach((c, ci) => {
				if (!c.play || c.disabled) return
				slots.push({
					kind: 'tone',
					symbol: c.play,
					asNeutral: !!c.asNeutral,
					slotKey: `tone|${block.key}|${rowIdx}|${ci}`,
					scrollId: `pyar-tone-${block.key}-${rowIdx}`,
					scrollPadId: `pyar-pad-tone-${block.key}-${rowIdx}`,
					sectionTitle: block.title,
					blockKey: block.key,
					rowIdx,
					ci
				})
			})
		})
	})
	return slots
}
