/**
 * 将展示用拼音字符串拆成音节-token，便于四线三格逐格渲染。
 * 会去掉中英文括号；按空白、逗号、顿号、斜杠等分隔。
 */
export function splitPinyinDisplayTokens(raw) {
	if (raw == null) return []
	let s = String(raw).trim().replace(/[()（）]/g, '')
	if (!s || s === '—' || s === '-') return []
	return s
		.split(/[\s,，、|;\/／]+/)
		.map((t) => t.replace(/[()（）]/g, '').trim())
		.filter(Boolean)
}
