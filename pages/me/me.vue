<template>
	<view class="page tab-root-page" :style="tabPageStyle">
		<view class="stat-row">
			<view class="stat-card">
				<text class="stat-num">{{ learnedCount }}</text>
				<text class="stat-label">已学字</text>
			</view>
			<view class="stat-card">
				<text class="stat-num">{{ wrongCount }}</text>
				<text class="stat-label">待复习</text>
			</view>
		</view>
		<view class="section-label">学习总览</view>
		<view class="list">
			<view class="item" @click="goReport">
				<text>家长报告</text>
				<text class="arrow">›</text>
			</view>
			<view class="item" @click="goMedals">
				<text>勋章墙</text>
				<text class="arrow">›</text>
			</view>
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
			<view class="item" @click="goGuardian">
				<text>家长管理</text>
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
import { getLearnedChars, getWrongChars } from '@/repositories/learning-repository.js'
import tabMain from '@/mixins/tab-main-page.js'

export default {
	mixins: [tabMain],
	data() {
		return {
			summary: '',
			learnedCount: 0,
			wrongCount: 0
		}
	},
	onShow() {
		this.setTabBarIndex(3)
		this.summary = formatCurriculumSummary(getCurriculumPrefs())
		this.learnedCount = getLearnedChars().length
		this.wrongCount = getWrongChars().length
	},
	methods: {
		goReport() {
			uni.navigateTo({ url: '/pages/me/report' })
		},
		goMedals() {
			uni.navigateTo({ url: '/pages/me/medals' })
		},
		goCurriculum() {
			uni.navigateTo({ url: '/pages/settings/curriculum' })
		},
		goGuardian() {
			uni.navigateTo({ url: '/pages/settings/guardian' })
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
	background: var(--meng-page-bg);
	padding: 32rpx;
	box-sizing: border-box;
}

.stat-row {
	display: flex;
	flex-direction: row;
	margin-bottom: 24rpx;
	margin-top: 4rpx;
}

.stat-card {
	flex: 1;
	min-width: 0;
	background: #fffef9;
	border-radius: 16rpx;
	padding: 18rpx;
	text-align: center;
}

.stat-card + .stat-card {
	margin-left: 14rpx;
}

.stat-num {
	display: block;
	font-size: 42rpx;
	font-weight: 700;
	color: var(--meng-text);
}

.stat-label {
	display: block;
	font-size: 22rpx;
	color: #8a8279;
	margin-top: 6rpx;
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
	color: var(--meng-text);
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
