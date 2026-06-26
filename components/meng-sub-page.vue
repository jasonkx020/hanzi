<!--
  @file meng-sub-page.vue
  @layer L1 表现层
  @description UI 组件源文件：meng-sub-page.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>

	<view class="meng-sub-page" :class="rootClass">

		<view v-if="showHero" class="meng-sub-page__hero">

			<image class="meng-sub-page__hero-bg" :src="heroBg" mode="aspectFill" />

			<view class="meng-sub-page__hero-overlay" />

			<meng-status-bar-spacer v-if="extendStatusBar" :height-px="statusBarPx" />

			<meng-page-nav
				v-if="showNav"
				class="meng-sub-page__nav"
				:title="resolvedNavTitle"
				:show-back="showBack"
				:inset-status-bar="!extendStatusBar"
			>

				<template #right>

					<slot name="nav-right" />

				</template>

			</meng-page-nav>

			<view class="meng-sub-page__hero-inner">

				<slot name="hero">

					<meng-avatar

						v-if="showAvatar"

						class="meng-sub-page__avatar"

						:pose="avatarPose"

						size="sm"

					/>

					<view v-if="heroTextVisible" class="meng-sub-page__text">

						<text v-if="!showNav && title" class="meng-sub-page__title">{{ title }}</text>

						<text v-if="subtitle" class="meng-sub-page__sub">{{ subtitle }}</text>

					</view>

				</slot>

			</view>

		</view>

		<view v-else-if="showNav" class="meng-sub-page__nav-only">

			<meng-page-nav :title="resolvedNavTitle" :show-back="showBack">

				<template #right>

					<slot name="nav-right" />

				</template>

			</meng-page-nav>

		</view>

		<view class="meng-sub-page__body" :class="bodyClass">

			<slot />

		</view>

	</view>

</template>



<script>

import MengAvatar from '@/components/meng-avatar.vue'

import MengPageNav from '@/components/meng-page-nav.vue'

import MengStatusBarSpacer from '@/components/meng-status-bar-spacer.vue'

import { MENG_ASSETS } from '@/utils/mengmeng-assets.js'

import { getMengNavMetrics } from '@/utils/meng-nav-metrics.js'



export default {

	name: 'MengSubPage',

	components: { MengAvatar, MengPageNav, MengStatusBarSpacer },

	props: {

		title: { type: String, default: '' },

		subtitle: { type: String, default: '' },

		/** 顶栏标题，默认与 title 相同 */

		navTitle: { type: String, default: '' },

		showHero: { type: Boolean, default: true },

		showAvatar: { type: Boolean, default: true },

		avatarPose: { type: String, default: 'happy' },

		heroBg: { type: String, default: () => MENG_ASSETS.heroBg },

		/** 透明浮动返回栏（custom 导航页） */

		showNav: { type: Boolean, default: true },

		showBack: { type: Boolean, default: true },

		/** 内容区是否与顶图重叠（玻璃卡片效果） */

		overlapBody: { type: Boolean, default: true },

		/** 是否为全屏高度布局（听写/小测等） */

		fullHeight: { type: Boolean, default: false },

		/** 内容区是否使用默认内边距 */

		padded: { type: Boolean, default: true },

		/** 无顶图时仍保留页面渐变底 */

		plain: { type: Boolean, default: false },

		/** 顶图是否上探至状态栏 */

		extendStatusBar: { type: Boolean, default: true }

	},

	data() {

		return {
			statusBarPx: 44
		}

	},

	computed: {

		resolvedNavTitle() {

			return this.navTitle || this.title || ''

		},

		heroTextVisible() {

			return this.subtitle || (!this.showNav && this.title)

		},

		rootClass() {

			return {

				'meng-sub-page--full': this.fullHeight,

				'meng-sub-page--plain': this.plain || !this.showHero

			}

		},

		bodyClass() {

			return {

				'meng-sub-page__body--overlap': this.overlapBody && this.showHero,

				'meng-sub-page__body--pad': this.padded,

				'meng-sub-page__body--flex': this.fullHeight

			}

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
		}
	}

}

</script>



<style scoped>

.meng-sub-page {

	min-height: 100vh;

	box-sizing: border-box;

	background: var(--meng-page-bg);

}



.meng-sub-page--full {

	height: 100vh;

	max-height: 100vh;

	overflow: hidden;

	display: flex;

	flex-direction: column;

}



.meng-sub-page--plain {

	background: var(--meng-page-bg);

}



.meng-sub-page__hero {

	position: relative;

	flex-shrink: 0;

	padding-left: 28rpx;

	padding-right: 28rpx;

	padding-bottom: 36rpx;

	/* padding-top 由 heroBleedStyle（状态栏）或全局 env 兜底 */

	overflow: hidden;

	min-height: 148rpx;

	box-sizing: border-box;

}



.meng-sub-page__hero .meng-status-bar-spacer {
	position: relative;
	z-index: 5;
}

.meng-sub-page__nav {

	position: relative;

	z-index: 10;

	margin-left: -28rpx;

	margin-right: -28rpx;

}



.meng-sub-page__nav-only {

	flex-shrink: 0;

	background: var(--meng-cream);

}



.meng-sub-page__hero-bg {

	position: absolute;

	left: 0;

	top: 0;

	width: 100%;

	height: 100%;

	z-index: 0;

}



.meng-sub-page__hero-overlay {

	position: absolute;

	left: 0;

	top: 0;

	right: 0;

	bottom: 0;

	z-index: 1;

	background: var(--meng-hero-overlay);

	pointer-events: none;

}



.meng-sub-page__hero-inner {

	position: relative;

	z-index: 2;

	display: flex;

	flex-direction: row;

	align-items: center;

}

.meng-sub-page__hero-inner > .meng-sub-page__text {

	margin-left: 16rpx;

}



.meng-sub-page__avatar {

	flex-shrink: 0;

}



.meng-sub-page__text {

	flex: 1;

	min-width: 0;

}



.meng-sub-page__title {

	display: block;

	font-size: 38rpx;

	font-weight: 800;

	color: var(--meng-text);

	line-height: 1.2;

}



.meng-sub-page__sub {

	display: block;

	margin-top: 6rpx;

	font-size: 24rpx;

	color: var(--meng-text-secondary);

	line-height: 1.4;

}



.meng-sub-page__body {

	position: relative;

	z-index: 2;

	box-sizing: border-box;

}



.meng-sub-page__body--overlap {

	margin-top: -32rpx;

}



.meng-sub-page__body--pad {

	padding: 0 28rpx calc(32rpx + constant(safe-area-inset-bottom));

	padding: 0 28rpx calc(32rpx + env(safe-area-inset-bottom, 0px));

}



.meng-sub-page__body--flex {

	flex: 1;

	min-height: 0;

	display: flex;

	flex-direction: column;

	padding-bottom: constant(safe-area-inset-bottom);

	padding-bottom: env(safe-area-inset-bottom, 0px);

}

</style>

