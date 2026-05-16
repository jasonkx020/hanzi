/**
 * 进入写字练习（笔顺书写测验）
 * @param {{ hanzi?: string }} [options]
 */
export function startWritePractice(options = {}) {
	const raw = String(options.hanzi || '').trim()
	const pure = raw.match(/[\u4e00-\u9fff]/)?.[0] || ''
	const q = pure ? `?hanzi=${encodeURIComponent(pure)}` : ''
	uni.navigateTo({ url: `/pages/literacy/write-practice${q}` })
}
