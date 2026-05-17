<template>
	<view class="page meng-page-shell meng-page-pad">
		<view class="card">
			<text class="title">勋章墙</text>
			<text class="desc">根据学习数据自动点亮勋章。</text>
		</view>
		<view class="grid">
			<view v-for="m in medals" :key="m.id" class="medal" :class="m.unlocked ? 'medal-on' : 'medal-off'">
				<text class="icon">{{ m.unlocked ? '🏅' : '🔒' }}</text>
				<text class="name">{{ m.name }}</text>
				<text class="rule">{{ m.rule }}</text>
			</view>
		</view>
	</view>
</template>
<script>
import { getLearnedChars, getWrongChars } from '@/repositories/learning-repository.js'

export default {
	data() {
		return {
			medals: []
		}
	},
	onShow() {
		const learned = getLearnedChars().length
		const wrong = getWrongChars().length
		this.medals = [
			{ id: 'm1', name: '识字新星', rule: '累计学会 10 字', unlocked: learned >= 10 },
			{ id: 'm2', name: '稳扎稳打', rule: '累计学会 50 字', unlocked: learned >= 50 },
			{ id: 'm3', name: '复习达人', rule: '待复习控制在 5 以内', unlocked: wrong <= 5 }
		]
	}
}
</script>
<style scoped>
.page { box-sizing: border-box; }
.card { background: #fff; border-radius: 14rpx; padding: 24rpx; margin-bottom: 16rpx; }
.title { display: block; font-size: 32rpx; font-weight: 700; color: var(--meng-text); margin-bottom: 10rpx; }
.desc { display: block; font-size: 25rpx; color: #6b6560; }
.grid { display: flex; flex-direction: row; flex-wrap: wrap; }
.medal {
	flex: 0 0 48%;
	width: 48%;
	max-width: 48%;
	box-sizing: border-box;
	margin-right: 4%;
	margin-bottom: 12rpx;
	border-radius: 12rpx;
	padding: 16rpx;
	background: #fff;
}
.medal:nth-child(2n) { margin-right: 0; }
.medal-on { border: 1rpx solid #ffd36b; }
.medal-off { border: 1rpx solid #e7e1d4; }
.icon { display: block; font-size: 36rpx; margin-bottom: 8rpx; }
.name { display: block; font-size: 27rpx; color: var(--meng-text); font-weight: 600; margin-bottom: 4rpx; }
.rule { display: block; font-size: 22rpx; color: #8a8279; }
</style>
