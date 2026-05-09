/**
 * 将 cnchar 拼音结果格式化为界面展示用法。
 *
 * - 典型调用：`spellDisplayString('萌', 'tone', 'poly', 'low')` → 带调、多音字括号形式、「小写」（API 语义由 cnchar 决定）。
 * - 词语 + `array`：`spellDisplayString('银行行长', 'poly', 'tone', 'array', 'low')`
 *   cnchar 返回按字数组时用空格串联，便于在「笔顺」等页单行展示。
 *
 * 依赖 main.js 已引入的 `./utils/cnchar-setup.js`（含 cnchar-poly）；此处再挂一次同名实例，避免独立引用时遗漏插件。
 */
import cnchar from './cnchar-setup.js'

/** 单韵母 ɑ（U+0251），教材字形；由拉丁 a 与带调 a 做纯 Unicode 替换 */
const U_ALPH = '\u0251'

/**
 * 将拼音串中的拉丁小写/大写 a（含带调预组合字）换成 ɑ + 相同调号（组合用音标）。
 * 先处理带调字符，再替换剩余 ASCII a/A，避免误拆已替换片段。
 * @param {string} s
 */
function latinAToSingleStoryAlpha(s) {
	let out = String(s)
	// 小写 a 带调（NFC 常见）
	const lowerTone = [
		['\u0101', `${U_ALPH}\u0304`], // ā
		['\u00e1', `${U_ALPH}\u0301`], // á
		['\u01ce', `${U_ALPH}\u030c`], // ǎ
		['\u00e0', `${U_ALPH}\u0300`] // à
	]
	for (const [from, to] of lowerTone) {
		out = out.split(from).join(to)
	}
	// 大写 A 带调（少见）
	const upperTone = [
		['\u0100', `${U_ALPH}\u0304`], // Ā
		['\u00c1', `${U_ALPH}\u0301`], // Á
		['\u01cd', `${U_ALPH}\u030c`], // Ǎ
		['\u00c0', `${U_ALPH}\u0300`] // À
	]
	for (const [from, to] of upperTone) {
		out = out.split(from).join(to)
	}
	out = out.split('a').join(U_ALPH)
	out = out.split('A').join(U_ALPH)
	return out
}

/**
 * @param {string} text 汉字字符串
 * @param {...string} args 透传 cnchar.spell，顺序与文档一致（如 `'tone','poly','low'` 或 `'poly','tone','array','low'`）
 * @returns {string}
 */
export function spellDisplayString(text, ...args) {
	const t = String(text ?? '').trim()
	if (!t) return ''
	try {
		const raw = cnchar.spell(t, ...args)
		let out
		if (args.includes('array') && Array.isArray(raw)) {
			out = raw
				.map((x) => (x != null ? String(x) : '').trim())
				.filter(Boolean)
				.join(' ')
		} else if (raw == null) {
			return ''
		} else {
			out = String(raw)
		}
		return latinAToSingleStoryAlpha(out)
	} catch (_) {
		return ''
	}
}
