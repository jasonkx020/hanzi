<template>
	<view class="redirect-page">
		<text class="redirect-text">正在进入字卡…</text>
	</view>
</template>

<script>
/**
 * 兼容旧链接：字卡中间页已并入查字详情（关卡学习页）。
 * /pages/literacy/lesson?rjLesson=N | ?hint=…
 * → /pages/dictionary/result?rjLesson=N | ?lesson=…
 */
function buildResultUrl(query) {
	const q = query || {}
	const rjRaw = q.rjLesson
	if (rjRaw != null && rjRaw !== '') {
		const n = Number(rjRaw)
		if (Number.isFinite(n) && n >= 0) {
			return `/pages/dictionary/result?rjLesson=${encodeURIComponent(String(n))}`
		}
	}
	const hint = q.hint ? decodeURIComponent(q.hint) : q.lesson ? decodeURIComponent(q.lesson) : ''
	const hanzi = q.hanzi ? decodeURIComponent(q.hanzi) : ''
	const parts = []
	if (hint) parts.push(`lesson=${encodeURIComponent(hint)}`)
	if (hanzi) parts.push(`hanzi=${encodeURIComponent(hanzi)}`)
	if (q.pinyin) parts.push(`pinyin=${encodeURIComponent(decodeURIComponent(q.pinyin))}`)
	return `/pages/dictionary/result${parts.length ? `?${parts.join('&')}` : ''}`
}

export default {
	onLoad(query) {
		const url = buildResultUrl(query)
		uni.redirectTo({
			url,
			fail: () => {
				uni.reLaunch({ url })
			}
		})
	}
}
</script>

<style scoped>
.redirect-page {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--meng-page-bg, #fffaf5);
}
.redirect-text {
	font-size: 28rpx;
	color: #8a8279;
}
</style>
