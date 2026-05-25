/**
 * 四线三格行内分格与换行：按音节占位宽度贪心装箱，避免挤格、重叠。
 */
import { estimateSyllableWidthUnits } from '@/utils/pinyin-homework-chunk.js'

const SIZE_CELL_H_RPX = {
	compact: 88,
	grid: 144,
	tone: 116,
	md: 58,
	lg: 80,
	xl: 116
}

/** 与 pflr--* 样式一致：字号 ≈ 格高 * 42/58 */
export function estimateGlyphFontRpx(size) {
	const h = SIZE_CELL_H_RPX[size] || SIZE_CELL_H_RPX.md
	return (h * 42) / 58
}

/**
 * 根据容器宽度估算一行可容纳的「宽度单位」总量
 * @param {number} containerWidthPx
 * @param {string} size
 */
export function maxUnitsPerRowForWidth(containerWidthPx, size) {
	const w = Number(containerWidthPx) || 0
	if (w <= 0) return 14
	const fontRpx = estimateGlyphFontRpx(size)
	let winW = 375
	try {
		winW = Number(uni.getSystemInfoSync().windowWidth) || winW
	} catch (_) {}
	const unitPx = Math.max(10, (fontRpx / 750) * winW * 0.52)
	return Math.max(6, Math.min(24, Math.floor(w / unitPx)))
}

/**
 * @param {Array<{ syl: string, glyphs: object[], empty: boolean, index: number }>} columns
 * @param {{ maxUnitsPerRow?: number, maxPerRow?: number, unitOverrides?: Record<number, number> }} opts
 */
export function buildFourLinesRowLayout(columns, opts = {}) {
	const list = Array.isArray(columns) ? columns : []
	if (!list.length) {
		return [{ cells: [], totalUnits: 0 }]
	}

	const maxPerRow = Math.min(12, Math.max(1, Math.floor(Number(opts.maxPerRow)) || 6))
	const maxUnitsPerRow = Math.max(4, Number(opts.maxUnitsPerRow) || 14)
	const overrides = opts.unitOverrides || {}

	const items = list.map((col, index) => {
		if (col.empty) {
			return { ...col, index, units: 1, widthUnits: 1 }
		}
		const base = estimateSyllableWidthUnits(col.syl)
		const mul = Math.max(1, Number(overrides[index]) || 1)
		const widthUnits = Math.max(2, base * mul)
		return { ...col, index, units: base, widthUnits }
	})

	const rows = []
	let current = []
	let rowUnits = 0

	const flush = () => {
		if (!current.length) return
		const totalUnits = current.reduce((s, c) => s + c.widthUnits, 0)
		rows.push({ cells: current.slice(), totalUnits })
		current = []
		rowUnits = 0
	}

	for (const item of items) {
		const u = item.widthUnits
		const overCount = current.length >= maxPerRow
		const overUnits = current.length > 0 && rowUnits + u > maxUnitsPerRow
		if (overCount || overUnits) flush()
		if (u > maxUnitsPerRow && current.length) flush()
		current.push(item)
		rowUnits += u
		if (current.length >= maxPerRow || rowUnits >= maxUnitsPerRow) flush()
	}
	flush()

	return rows.length ? rows : [{ cells: [], totalUnits: 0 }]
}
