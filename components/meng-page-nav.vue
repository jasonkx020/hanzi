<!--
  @file meng-page-nav.vue
  @layer L1 表现层
  @description UI 组件源文件：meng-page-nav.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<view class="meng-page-nav" :class="{ 'meng-page-nav--fixed': fixed }">
		<meng-status-bar-spacer v-if="insetStatusBar" :height-px="statusBarPx" />
		<view class="meng-page-nav__inner">
			<view
				v-if="showBack"
				class="meng-page-nav__back"
				hover-class="meng-page-nav__back--hover"
				hover-stay-time="80"
				@click="onBack"
			>
				<view class="meng-page-nav__back-pill">
					<text class="meng-page-nav__back-arrow" aria-hidden="true">‹</text>
					<text class="meng-page-nav__back-label">返回</text>
				</view>
			</view>
			<view v-else class="meng-page-nav__back meng-page-nav__back--placeholder" />
			<text class="meng-page-nav__title clamp-1">{{ displayTitle }}</text>
			<view class="meng-page-nav__right">
				<slot name="right" />
			</view>
		</view>
	</view>
</template>

<script>
import { getMengNavMetrics } from '@/utils/meng-nav-metrics.js'
import MengStatusBarSpacer from '@/components/meng-status-bar-spacer.vue'

export default {
	name: 'MengPageNav',
	components: { MengStatusBarSpacer },
	props: {
		title: { type: String, default: '' },
		showBack: { type: Boolean, default: true },
		/** 是否 fixed 在视口顶部（查字结果等全屏滚动页） */
		fixed: { type: Boolean, default: false },
		/**
		 * 是否在本组件内预留状态栏高度。
		 * 父级已用 heroBleed（paddingTop）顶开安全区时请设为 false，避免返回键下移。
		 */
		insetStatusBar: { type: Boolean, default: true }
	},
	emits: ['back'],
	data() {
		return {
			statusBarPx: 44
		}
	},
	computed: {
		displayTitle() {
			return this.title
		}
	},
	created() {
		this.refreshStatusBarPx()
	},
	pageLifetimes: {
		show() {
			this.refreshStatusBarPx()
		}
	},
	methods: {
		refreshStatusBarPx() {
			this.statusBarPx = getMengNavMetrics().statusBarPx
		},
		onBack() {
			if (this.$listeners && this.$listeners.back) {
				this.$emit('back')
				return
			}
			const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
			if (pages.length > 1) {
				uni.navigateBack()
				return
			}
			uni.switchTab({ url: '/pages/home/home' })
		}
	}
}
</script>

<style scoped>
.meng-page-nav {
	position: relative;
	z-index: 20;
	flex-shrink: 0;
	background: transparent;
	border-bottom: none;
	box-sizing: border-box;
}

.meng-page-nav--fixed {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
}

.meng-page-nav__inner {
	min-height: 96rpx;
	height: 96rpx;
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 0 12rpx 0 4rpx;
	box-sizing: border-box;
}

.meng-page-nav__back {
	flex-shrink: 0;
	min-width: 120rpx;
	max-width: 160rpx;
	padding: 0;
}

.meng-page-nav__back--placeholder {
	opacity: 0;
	pointer-events: none;
}

.meng-page-nav__back-pill {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-start;
	gap: 4rpx;
	min-height: 72rpx;
	padding: 8rpx 12rpx 8rpx 4rpx;
	border-radius: 0;
	background: transparent;
	border: none;
	box-shadow: none;
	box-sizing: border-box;
}

.meng-page-nav__back--hover .meng-page-nav__back-pill {
	opacity: 0.65;
}

.meng-page-nav__back-arrow {
	display: block;
	font-size: 48rpx;
	line-height: 1;
	font-weight: 500;
	color: var(--meng-accent-solid, #ec407a);
	width: 28rpx;
	text-align: center;
	transform: translateY(-1rpx);
}

.meng-page-nav__back-label {
	display: block;
	font-size: 30rpx;
	font-weight: 600;
	color: var(--meng-chocolate, #5c3d2e);
	letter-spacing: 1rpx;
	line-height: 1.2;
}

.meng-page-nav__title {
	flex: 1;
	min-width: 0;
	text-align: center;
	font-size: 32rpx;
	font-weight: 700;
	color: var(--meng-text, #2c2419);
	letter-spacing: 1rpx;
	padding: 0 8rpx;
}

.meng-page-nav__right {
	width: auto;
	min-width: 80rpx;
	min-height: 80rpx;
	padding-left: 8rpx;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex-shrink: 0;
}
</style>
