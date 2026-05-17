<template>
	<view class="page tab-root-page me-page" :style="tabPageStyle">
		<view class="me-hero">
			<image class="me-hero-bg" :src="assets.heroBg" mode="aspectFill" />
			<view class="me-hero-overlay" />
			<view class="me-hero-body">
				<meng-avatar pose="wave" size="lg" />
				<view class="me-hero-text">
					<text class="me-hero-title">我的萌萌</text>
					<text class="me-hero-sub">{{ summary }}</text>
				</view>
			</view>
		</view>

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
	</view>
</template>

<script>
import { formatCurriculumSummary, getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { getLearnedChars, getWrongChars } from '@/repositories/learning-repository.js'
import tabMain from '@/mixins/tab-main-page.js'
import MengAvatar from '@/components/meng-avatar.vue'
import { MENG_ASSETS } from '@/utils/mengmeng-assets.js'
import {
	MENG_VOICE,
	playMengmengVoice,
	playMengmengVoiceOnce,
	stopMengmengVoice
} from '@/utils/mengmeng-voice.js'

export default {
	components: { MengAvatar },
	mixins: [tabMain],
	data() {
		return {
			assets: MENG_ASSETS,
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
		playMengmengVoiceOnce(MENG_VOICE.ME_WELCOME).catch(() => {})
	},
	onHide() {
		stopMengmengVoice()
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
			playMengmengVoice(MENG_VOICE.HOME_STROKE_LAB, { debounceMs: 160 }).catch(() => {})
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
.me-page {
	min-height: 100vh;
	background: var(--meng-page-bg);
	padding: 0 32rpx 32rpx;
	box-sizing: border-box;
}

.me-hero {
	position: relative;
	margin: 0 -32rpx 24rpx;
	padding: 28rpx 32rpx 24rpx;
	overflow: hidden;
	min-height: 200rpx;
}

.me-hero-bg {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	z-index: 0;
}

.me-hero-overlay {
	position: absolute;
	inset: 0;
	z-index: 1;
	background: var(--meng-hero-overlay);
}

.me-hero-body {
	position: relative;
	z-index: 2;
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 20rpx;
}

.me-hero-text {
	flex: 1;
	min-width: 0;
}

.me-hero-title {
	display: block;
	font-size: 36rpx;
	font-weight: 800;
	color: var(--meng-text);
	line-height: 1.25;
}

.me-hero-sub {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	color: var(--meng-text-secondary);
	line-height: 1.4;
}

.stat-row {
	display: flex;
	flex-direction: row;
	margin-bottom: 24rpx;
	gap: 20rpx;
}

.stat-card {
	flex: 1;
	background: var(--meng-card-solid);
	border-radius: 24rpx;
	padding: 28rpx 20rpx;
	text-align: center;
	box-shadow: 0 8rpx 24rpx var(--meng-shadow);
	border: 1rpx solid var(--meng-border);
}

.stat-num {
	display: block;
	font-size: 44rpx;
	font-weight: 800;
	color: var(--meng-accent-solid);
	line-height: 1.1;
}

.stat-label {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	color: var(--meng-text-muted);
}

.section-label {
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text-muted);
	margin-bottom: 12rpx;
	padding-left: 4rpx;
}

.section-label-spaced {
	margin-top: 28rpx;
}

.list {
	background: var(--meng-card-solid);
	border-radius: 24rpx;
	overflow: hidden;
	border: 1rpx solid var(--meng-border);
	box-shadow: 0 6rpx 20rpx var(--meng-shadow);
}

.list-gap {
	margin-bottom: 8rpx;
}

.item {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 24rpx;
	font-size: 30rpx;
	color: var(--meng-text);
	border-bottom: 1rpx solid var(--meng-border);
}

.item:last-child {
	border-bottom: none;
}

.item-sub .sub-indent {
	padding-left: 8rpx;
	color: var(--meng-text-secondary);
}

.arrow {
	font-size: 36rpx;
	color: var(--meng-text-muted);
	line-height: 1;
}
</style>
