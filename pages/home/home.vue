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

		<view class="actions">
			<button type="primary" @click="goCatalog">浏览字表</button>
			<button type="default" @click="goSession">开始学习</button>
		</view>

		<text class="hint">字库查询接入 SQLite 后，此处将展示本册统计与继续学习。</text>
	</view>
</template>

<script>
import { getCurriculumPrefs, formatCurriculumSummary } from '@/utils/curriculum-storage.js'
import { isVipActive } from '@/utils/vip.js'

export default {
	data() {
		return {
			summary: '',
			vipActive: false
		}
	},
	onShow() {
		this.refresh()
	},
	methods: {
		refresh() {
			this.summary = formatCurriculumSummary(getCurriculumPrefs())
			this.vipActive = isVipActive()
		},
		goVip() {
			uni.navigateTo({ url: '/pages/vip/vip' })
		},
		goSettings() {
			uni.navigateTo({ url: '/pages/settings/curriculum' })
		},
		goCatalog() {
			uni.switchTab({ url: '/pages/catalog/catalog' })
		},
		goSession() {
			uni.switchTab({ url: '/pages/learn/session' })
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
	gap: 12rpx;
	padding: 18rpx 22rpx;
	margin-bottom: 24rpx;
	border-radius: 16rpx;
	background: linear-gradient(90deg, #3d4a5c 0%, #4a5d4a 100%);
}

.vip-strip-icon {
	color: #e8d5a3;
	font-size: 24rpx;
}

.vip-strip-text {
	flex: 1;
	font-size: 24rpx;
	color: #f5f2ea;
}

.vip-strip-arrow {
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

.actions {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
	margin-bottom: 24rpx;
}

.hint {
	font-size: 22rpx;
	color: #a8a29e;
	line-height: 1.5;
}
</style>
