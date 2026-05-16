/**
 * 拼音作业本分行：按音节「占位宽度」贪心装箱，避免一行内过长拼音挤在一起重叠。
 */

/**
 * 估算音节在四线格中占用的相对宽度（约等于字母个数，略加权）
 * @param {string} sym
 * @returns {number}
 */
export function estimateSyllableWidthUnits(sym) {
	const s = String(sym || '').trim()
	if (!s) return 0
	const chars = [...s.normalize('NFC')]
	let units = 0
	for (const ch of chars) {
		const cp = ch.codePointAt(0) || 0
		if (cp >= 0x0100 && cp <= 0x024f) {
			units += 1.2
		} else {
			units += 1
		}
	}
	return Math.max(2, units)
}

/**
 * @param {string[]} symbols
 * @param {number | { maxPerRow?: number, maxUnitsPerRow?: number, padToMaxPerRow?: boolean }} [options]
 * @returns {(string|null)[][]}
 */
export function chunkHomeworkSymbols(symbols, options) {
	const arr = Array.isArray(symbols) ? symbols.map((s) => String(s || '').trim()).filter(Boolean) : []
	if (!arr.length) return []

	const opts = typeof options === 'number' ? { maxPerRow: options } : options || {}
	const maxPerRow = Math.min(99, Math.max(1, Math.floor(Number(opts.maxPerRow)) || 3))
	const maxUnitsPerRow =
		Number(opts.maxUnitsPerRow) > 0 ? Number(opts.maxUnitsPerRow) : maxPerRow * 2.35
	/** 默认补满每行 maxPerRow 格（一行最多 3 个音节，避免四格时 long 拼音重叠） */
	const padToMaxPerRow = opts.padToMaxPerRow !== false

	const rows = []
	let current = []
	let units = 0

	const flush = () => {
		if (!current.length) return
		const row = current.slice()
		if (padToMaxPerRow) {
			while (row.length < maxPerRow) row.push(null)
		}
		rows.push(row)
		current = []
		units = 0
	}

	for (const sym of arr) {
		const u = estimateSyllableWidthUnits(sym)
		const overCount = current.length >= maxPerRow
		const overUnits = current.length > 0 && units + u > maxUnitsPerRow
		if (overCount || overUnits) flush()

		if (u > maxUnitsPerRow && current.length) flush()

		current.push(sym)
		units += u

		if (current.length >= maxPerRow || units >= maxUnitsPerRow) flush()
	}
	flush()
	return rows
}
