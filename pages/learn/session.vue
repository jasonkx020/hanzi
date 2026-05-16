<template>
	<view class="page">
		<text class="title">学习</text>
		<text class="desc">学习主入口已迁移到每日一练模块，点击进入新架构页面。</text>
		<button type="primary" @click="goDaily">进入每日一练</button>
	</view>
</template>

<script>
export default {
	methods: {
		goDaily() {
			uni.navigateTo({ url: '/pages/literacy/daily' })
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 32rpx;
	background: var(--meng-page-bg);
	box-sizing: border-box;
}

.title {
	display: block;
	font-size: 36rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 16rpx;
}

.desc {
	display: block;
	font-size: 26rpx;
	color: #5a534c;
	line-height: 1.55;
	margin-bottom: 24rpx;
}
</style>
