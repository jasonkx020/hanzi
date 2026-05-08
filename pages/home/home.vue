<template>
	<view class="page">
		<view class="vip-strip" @click="goVip">
			<text class="vip-strip-icon">◇</text>
			<text class="vip-strip-text">{{ vipActive ? '会员已开通' : '家长专区 · 开通会员' }}</text>
			<text class="vip-strip-arrow">›</text>
		</view>

		<view class="card">
			<text class="label">当前进度</text>
			<text class="summary">{{ summary }}</text>
			<button class="btn-ghost" size="mini" @click="goSettings">调整教材与进度</button>
		</view>

		<view class="entry-list">
			<view class="entry-card" @click="goTextbook">
				<text class="entry-icon">📘</text>
				<view class="entry-main">
					<text class="entry-title">课本同步学</text>
					<text class="entry-desc">跟着课本学生字，按课次系统学习</text>
				</view>
			</view>
			<view class="entry-card" @click="goGame">
				<text class="entry-icon">🎈</text>
				<view class="entry-main">
					<text class="entry-title">趣味识字营</text>
					<text class="entry-desc">边玩边学，通过闯关记得更牢</text>
				</view>
			</view>
			<view class="entry-card" @click="goDaily">
				<text class="entry-icon">⭐</text>
				<view class="entry-main">
					<text class="entry-title">每日一练</text>
					<text class="entry-desc">每天 10 个字，优先复习易错字</text>
				</view>
			</view>
		</view>

		<view class="tips">
			<text class="tips-text">🐼 萌萌提醒：{{ encourageText }}</text>
		</view>
	</view>
</template>

<script>
import { getCurriculumSummary } from '@/repositories/curriculum-repository.js'
import { buildEncourageText } from '@/services/reward-service.js'
import { isVipActive } from '@/utils/vip.js'
import { startTextbookLearning } from '@/modules/literacy/usecases/start-textbook-learning.js'
import { startLiteracyGame } from '@/modules/literacy/usecases/start-literacy-game.js'
import { startDailyTraining } from '@/modules/literacy/usecases/start-daily-training.js'

export default {
	data() {
		return {
			summary: '',
			vipActive: false,
			encourageText: ''
		}
	},
	onShow() {
		this.refresh()
	},
	methods: {
		refresh() {
			this.summary = getCurriculumSummary()
			this.vipActive = isVipActive()
			this.encourageText = buildEncourageText({ remain: 5 })
		},
		goVip() {
			uni.navigateTo({ url: '/pages/vip/vip' })
		},
		goSettings() {
			uni.navigateTo({ url: '/pages/settings/curriculum' })
		},
		goTextbook() {
			startTextbookLearning()
		},
		goGame() {
			startLiteracyGame()
		},
		goDaily() {
			startDailyTraining()
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 28rpx;
	background: #f4f1ea;
	box-sizing: border-box;
}

.vip-strip {
	display: flex;
	align-items: center;
	padding: 18rpx 22rpx;
	margin-bottom: 24rpx;
	border-radius: 16rpx;
	background: linear-gradient(90deg, #3d4a5c 0%, #4a5d4a 100%);
}

.vip-strip-icon {
	margin-right: 12rpx;
	color: #e8d5a3;
	font-size: 24rpx;
}

.vip-strip-text {
	flex: 1;
	font-size: 24rpx;
	color: #f5f2ea;
}

.vip-strip-arrow {
	margin-left: 12rpx;
	font-size: 36rpx;
	color: rgba(255, 255, 255, 0.65);
}

.card {
	background: #fffef9;
	border-radius: 20rpx;
	padding: 28rpx;
	margin-bottom: 28rpx;
	box-shadow: 0 6rpx 20rpx rgba(44, 36, 25, 0.06);
}

.label {
	display: block;
	font-size: 24rpx;
	color: #8a8279;
	margin-bottom: 8rpx;
}

.summary {
	display: block;
	font-size: 30rpx;
	font-weight: 600;
	color: #2c2419;
	margin-bottom: 16rpx;
}

.btn-ghost {
	margin-top: 8rpx;
}

.entry-list {
	display: flex;
	flex-direction: column;
	margin-bottom: 24rpx;
}

.entry-list > .entry-card + .entry-card {
	margin-top: 18rpx;
}

.entry-card {
	display: flex;
	align-items: center;
	padding: 20rpx;
	background: #fff;
	border-radius: 20rpx;
	box-shadow: 0 6rpx 20rpx rgba(44, 36, 25, 0.07);
}

.entry-icon {
	font-size: 56rpx;
	margin-right: 18rpx;
}

.entry-main {
	flex: 1;
}

.entry-title {
	display: block;
	font-size: 31rpx;
	font-weight: 600;
	color: #2c2419;
	margin-bottom: 6rpx;
}

.entry-desc {
	display: block;
	font-size: 24rpx;
	color: #7a746e;
	line-height: 1.5;
}

.tips {
	background: #fff4de;
	border-radius: 14rpx;
	padding: 16rpx 18rpx;
}

.tips-text {
	font-size: 24rpx;
	color: #7a5f2a;
}
</style>
