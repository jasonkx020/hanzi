/**
 * 拼音页 Tab 视图预计算（避免切换时重复 chunk / 分类计算）
 */
import { chunkHomeworkSymbols } from '@/utils/pinyin-homework-chunk.js'
import { getPinyinSymbolCategory } from '@/utils/pinyin-pep-category.js'
import { buildPinyinReadingDisplay } from '@/utils/pinyin-reading-split.js'

/** 拼音页四线格：尽量铺满屏宽，不补空格子占位；每音节左右各约 1 字宽（见 index 页 .pflr-glyphs-row padding） */
const PINYIN_HOMEWORK_CHUNK_OPTS = {
	maxPerRow: 4,
	maxUnitsPerRow: 14,
	padToMaxPerRow: false,
	sidePadUnits: 2
}

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
		rows: chunkHomeworkSymbols(sec.symbols, PINYIN_HOMEWORK_CHUNK_OPTS).map((chunk, ri) => {
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
	const list = Array.isArray(symbols) ? symbols : []
	return list.map((sym, ri) => {
		const raw = sym != null ? String(sym).trim() : ''
		if (!raw) {
			return {
				chunk: ['—'],
				drillDisplayLine: '—',
				drillSegments: [],
				drillWhole: '',
				drillLookup: [],
				ri,
				si,
				kind,
				sheetBg: '',
				sheetBd: '',
				scrollPadId: `pyar-pad-${kind}-${si}-${ri}`,
				scrollId: `pyar-${kind}-${si}-${ri}`
			}
		}
		const display = buildPinyinReadingDisplay(raw)
		const line = display.displayLine || display.whole || raw
		const sheet = sheetForChunk([raw], categoryTab)
		return {
			chunk: [line],
			drillDisplayLine: line,
			drillSegments: display.segments || [],
			drillWhole: display.whole || raw,
			drillLookup:
				display.lookupSequence.length > 0
					? display.lookupSequence
					: [display.whole || raw],
			drillBlendType: display.blendType,
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
		const lookup = row.drillLookup || row.chunk || []
		lookup.forEach((sym, ci) => {
			if (!sym) return
			const isLast = ci === lookup.length - 1 && lookup.length > 1
			slots.push({
				kind: 'drill',
				symbol: sym,
				asNeutral: false,
				/** part=只播该段；whole=连读最后一步只播整音节 */
				drillPlay: isLast ? 'whole' : 'part',
				slotKey: `drill|0|${row.ri}|${ci}`,
				scrollId: row.scrollId,
				scrollPadId: row.scrollPadId,
				sectionTitle: '拼读练习',
				si: 0,
				ri: row.ri,
				ci,
				drillWhole: row.drillWhole || sym
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
