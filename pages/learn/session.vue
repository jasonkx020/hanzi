<template>
	<meng-sub-page title="学习" subtitle="已迁移至每日一练">
		<view class="card meng-card">
			<meng-avatar pose="book" size="md" />
			<text class="desc">学习主入口已迁移到每日一练模块，点击进入新架构页面。</text>
			<button type="primary" @click="goDaily">进入每日一练</button>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import MengAvatar from '@/components/meng-avatar.vue'
export default {
	components: { MengSubPage, MengAvatar },
	methods: {
		goDaily() {
			uni.navigateTo({ url: '/pages/literacy/daily' })
		}
	}
}
</script>

<style scoped>
.page {
	box-sizing: border-box;
}

.card {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
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
