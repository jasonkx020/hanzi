<template>
	<view class="page">
		<view class="card">
			<text class="title">学习报告</text>
			<text class="desc">基于当前本地学习记录自动统计。</text>
		</view>
		<view class="stats">
			<view class="stat-item">
				<text class="num">{{ learnedCount }}</text>
				<text class="label">累计已学字</text>
			</view>
			<view class="stat-item">
				<text class="num">{{ wrongCount }}</text>
				<text class="label">待复习字</text>
			</view>
			<view class="stat-item">
				<text class="num">{{ masteryRate }}%</text>
				<text class="label">掌握率（估算）</text>
			</view>
		</view>
		<view class="card">
			<text class="sub-title">薄弱字 TOP5</text>
			<text v-if="!topWrong.length" class="empty">暂无错字记录，继续保持。</text>
			<view v-for="(row, idx) in topWrong" :key="`${row.hanzi}-${idx}`" class="weak-row">
				<text class="weak-char">{{ row.hanzi }}</text>
				<text class="weak-count">错 {{ row.wrong_count }} 次</text>
			</view>
		</view>
	</view>
</template>
<script>
import { getLearnedChars, getWrongChars } from '@/repositories/learning-repository.js'

export default {
	data() {
		return {
			learnedCount: 0,
			wrongCount: 0,
			masteryRate: 0,
			topWrong: []
		}
	},
	onShow() {
		const learned = getLearnedChars()
		const wrong = getWrongChars()
		this.learnedCount = learned.length
		this.wrongCount = wrong.length
		const total = learned.length + wrong.length
		this.masteryRate = total > 0 ? Math.round((learned.length / total) * 100) : 100
		this.topWrong = wrong.slice(0, 5)
	}
}
</script>
<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: #f4f1ea; }
.card { background: #fff; border-radius: 14rpx; padding: 24rpx; margin-bottom: 16rpx; }
.title { display: block; font-size: 32rpx; font-weight: 700; color: #2c2419; margin-bottom: 10rpx; }
.desc { display: block; font-size: 25rpx; color: #6b6560; }
.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12rpx; margin-bottom: 16rpx; }
.stat-item { background: #fffef9; border-radius: 12rpx; padding: 18rpx 8rpx; text-align: center; }
.num { display: block; font-size: 34rpx; color: #2c2419; font-weight: 700; }
.label { display: block; margin-top: 6rpx; font-size: 22rpx; color: #8a8279; }
.sub-title { display: block; font-size: 28rpx; color: #2c2419; font-weight: 600; margin-bottom: 10rpx; }
.empty { font-size: 24rpx; color: #8a8279; }
.weak-row { display: flex; justify-content: space-between; padding: 14rpx 0; border-bottom: 1rpx solid #f0ece3; }
.weak-char { font-size: 34rpx; color: #2c2419; font-weight: 600; }
.weak-count { font-size: 24rpx; color: #b85d42; }
</style>
