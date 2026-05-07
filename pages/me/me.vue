<template>
	<view class="page">
		<view class="head">
			<text class="name">我的</text>
			<text class="sub">教材与会员入口</text>
		</view>
		<view class="section-label">我的字库</view>
		<view class="list">
			<view class="item" @click="goLearned">
				<text>我学过的字库</text>
				<text class="arrow">›</text>
			</view>
			<view class="item item-sub" @click="goWrongOften">
				<text class="sub-indent">我经常错的</text>
				<text class="arrow">›</text>
			</view>
		</view>
		<view class="section-label section-label-spaced">设置与工具</view>
		<view class="list list-gap">
			<view class="item" @click="goCurriculum">
				<text>教材与进度</text>
				<text class="arrow">›</text>
			</view>
			<view class="item" @click="goVip">
				<text>会员中心</text>
				<text class="arrow">›</text>
			</view>
			<view class="item" @click="goStroke">
				<text>笔顺实验室</text>
				<text class="arrow">›</text>
			</view>
		</view>
		<text class="foot">{{ summary }}</text>
	</view>
</template>

<script>
import { formatCurriculumSummary, getCurriculumPrefs } from '@/utils/curriculum-storage.js'

export default {
	data() {
		return {
			summary: ''
		}
	},
	onShow() {
		this.summary = formatCurriculumSummary(getCurriculumPrefs())
	},
	methods: {
		goCurriculum() {
			uni.navigateTo({ url: '/pages/settings/curriculum' })
		},
		goVip() {
			uni.navigateTo({ url: '/pages/vip/vip' })
		},
		goStroke() {
			uni.navigateTo({ url: '/pages/tools/stroke' })
		},
		goLearned() {
			uni.navigateTo({ url: '/pages/me/learned' })
		},
		goWrongOften() {
			uni.navigateTo({ url: '/pages/me/wrong-often' })
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	background: #f4f1ea;
	padding: 32rpx;
	box-sizing: border-box;
}

.head {
	margin-bottom: 32rpx;
}

.name {
	display: block;
	font-size: 40rpx;
	font-weight: 700;
	color: #2c2419;
}

.sub {
	display: block;
	font-size: 24rpx;
	color: #8a8279;
	margin-top: 8rpx;
}

.section-label {
	font-size: 24rpx;
	color: #8a8279;
	margin-bottom: 12rpx;
	padding-left: 8rpx;
}

.section-label-spaced {
	margin-top: 36rpx;
}

.list {
	background: #fffef9;
	border-radius: 16rpx;
	overflow: hidden;
}

.list-gap {
	margin-top: 24rpx;
}

.item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 28rpx 24rpx;
	border-bottom: 1rpx solid #eee;
	font-size: 28rpx;
	color: #2c2419;
}

.item-sub {
	border-top: none;
	padding-top: 20rpx;
	padding-bottom: 20rpx;
}

.sub-indent {
	padding-left: 24rpx;
	font-size: 28rpx;
	color: #4a453d;
}

.arrow {
	font-size: 32rpx;
	color: #c4bcb4;
}

.foot {
	display: block;
	margin-top: 32rpx;
	font-size: 22rpx;
	color: #a8a29e;
}
</style>
