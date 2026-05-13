/**
 * 汉语拼音书写占格（四线三格）——按《汉语拼音方案》教学书写习惯：
 * - 中格：a o e i u ü 等主体占中格；声调标在主要韵母上，占上格与中格交界区域
 * - 上格：b d h k l 等上伸笔顺；b、f、t 等上伸部分
 * - 下格：g p q y 等下伸笔顺；j 下伸
 *
 * 用于界面辅助定位，非书法替代。
 */

/** 是否 Unicode 组合用附加符号（含声调） */
export function isCombiningDiacritic(ch) {
	if (!ch) return false
	const cp = ch.codePointAt(0)
	if (cp === undefined) return false
	// Combining Diacritical Marks, Marks Supplement, ... 及常见变音记号段
	return (
		(cp >= 0x0300 && cp <= 0x036f) ||
		(cp >= 0x1ab0 && cp <= 0x1aff) ||
		(cp >= 0x1dc0 && cp <= 0x1dff)
	)
}

/**
 * 将音节拆成书写单元（字母/字母+组合调号），便于逐字占格
 */
export function splitPinyinSyllableGlyphs(syllable) {
	const s = String(syllable || '').trim()
	if (!s) return []
	const chars = [...s]
	const out = []
	let i = 0
	while (i < chars.length) {
		let cluster = chars[i]
		i++
		while (i < chars.length && isCombiningDiacritic(chars[i])) {
			cluster += chars[i]
			i++
		}
		out.push(cluster)
	}
	return out.map((ch) => ({
		ch,
		kind: classifyPinyinGlyph(ch),
		// 教材 ɑ（U+0251）常走回退字体，字身高于 o/e/i；略缩字号与四线格内其它字母对齐
		alphMetricFix: ch.includes('\u0251')
	}))
}

/** 取下缀拉丁字母（含 ɑ）用于分类 */
function baseLatinLower(cluster) {
	const flat = cluster.normalize('NFC')
	const parts = [...flat]
	for (let k = parts.length - 1; k >= 0; k--) {
		const seg = parts[k]
		const lower = seg.toLowerCase()
		if (/[a-z\u0251]/.test(lower)) return lower
	}
	return ''
}

/**
 * @returns {'asc'|'desc'|'mid'}
 */
export function classifyPinyinGlyph(cluster) {
	const s = String(cluster || '').trim()
	if (!s) return 'mid'
	const c = baseLatinLower(s)
	if (!c) return 'mid'

	// 上伸占上中格：b d f h k l t（教材常见写法）
	if ('bdfhklt'.includes(c)) return 'asc'
	// 下伸占中下格：g p q y；j 占上中下或中下，界面按下伸微调
	if ('gpqy'.includes(c)) return 'desc'
	if (c === 'j') return 'desc'

	// 其余主体在中格：a o e i u ü ɑ 等
	return 'mid'
}
