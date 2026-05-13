/**
 * 将展示用拼音字符串拆成音节-token，便于四线三格逐格渲染
 */
export function splitPinyinDisplayTokens(raw) {
	if (raw == null) return []
	const s = String(raw).trim()
	if (!s || s === '—' || s === '-') return []
	return s
		.split(/[\s,，、|;]+/)
		.map((t) => t.trim())
		.filter(Boolean)
}
