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
	min-width: 148rpx;
	max-width: 148rpx;
	padding: 4rpx 0;
}

.meng-page-nav__back--placeholder {
	opacity: 0;
	pointer-events: none;
}

.meng-page-nav__back-pill {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 2rpx;
	min-height: 80rpx;
	padding: 0 22rpx 0 14rpx;
	border-radius: 999rpx;
	background: rgba(255, 248, 242, 0.92);
	border: 2rpx solid rgba(255, 255, 255, 0.98);
	box-shadow:
		0 6rpx 20rpx rgba(92, 61, 46, 0.12),
		0 0 0 1rpx rgba(236, 64, 122, 0.08);
	box-sizing: border-box;
}

.meng-page-nav__back--hover .meng-page-nav__back-pill {
	transform: scale(0.96);
	opacity: 0.92;
}

.meng-page-nav__back-arrow {
	font-size: 56rpx;
	line-height: 1;
	font-weight: 400;
	color: var(--meng-accent-solid, #ec407a);
	margin-top: -6rpx;
	margin-right: -4rpx;
}

.meng-page-nav__back-label {
	font-size: 28rpx;
	font-weight: 700;
	color: var(--meng-chocolate, #5c3d2e);
	letter-spacing: 2rpx;
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
