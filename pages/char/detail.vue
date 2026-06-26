<!--
  @file detail.vue
  @layer L1 表现层
  @description 路由页面源文件：detail.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<!-- 本页仅作中转 redirectTo 查字结果；须保留 template，否则运行时报缺少 render -->
	<view class="detail-redirect" />
</template>

<script>
export default {
	onLoad(query) {
		const hanzi = query.hanzi ? decodeURIComponent(query.hanzi) : ''
		const pinyin = query.pinyin ? decodeURIComponent(query.pinyin) : ''
		const lesson = query.lesson ? decodeURIComponent(query.lesson) : ''
		uni.redirectTo({
			url: `/pages/dictionary/result?hanzi=${encodeURIComponent(hanzi)}&pinyin=${encodeURIComponent(pinyin)}&lesson=${encodeURIComponent(lesson)}`
		})
	}
}
</script>

<style scoped>
.detail-redirect {
	min-height: 20vh;
}
</style>
