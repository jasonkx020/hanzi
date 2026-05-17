<template>
	<view class="page meng-page-shell meng-page-pad">
		<view class="card meng-card">
			<meng-avatar pose="book" size="md" />
			<text class="title">单字学习</text>
			<text class="desc">整合字形、笔顺、组词、跟读与单字测验。</text>
		</view>
	</view>
</template>
<script>
import MengAvatar from '@/components/meng-avatar.vue'
export default { components: { MengAvatar } }
</script>
<style scoped>
.page { box-sizing: border-box; }
.card { display: flex; flex-direction: column; align-items: center; text-align: center; }
.title { display: block; font-size: 32rpx; font-weight: 700; color: var(--meng-text); margin-bottom: 10rpx; }
.desc { display: block; font-size: 25rpx; color: #6b6560; }
</style>
