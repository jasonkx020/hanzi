<template>
	<view class="tab-outer">
		<view class="tab-wrap">
			<view class="tab-inner">
				<view
					v-for="(item, index) in list"
					:key="index"
					class="tab-item"
					:class="{ 'tab-item-active': selected === index }"
					@click="switchTab(index)"
				>
					<view v-if="selected === index" class="tab-active-pill" />
					<view class="tab-icon-wrap">
						<image
							class="tab-icon"
							:class="{ 'tab-icon--inactive': selected !== index }"
							:src="item.iconPathActive"
							mode="aspectFit"
						/>
					</view>
					<text class="tab-text">{{ item.text }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { MENG_ASSETS } from '@/utils/mengmeng-assets.js'

export default {
	data() {
		return {
			selected: 0,
			list: [
				{
					pagePath: '/pages/home/home',
					iconPath: MENG_ASSETS.tab.home,
					iconPathActive: MENG_ASSETS.tab.homeActive,
					text: '识字'
				},
				{
					pagePath: '/pages/pinyin/index',
					iconPath: MENG_ASSETS.tab.learn,
					iconPathActive: MENG_ASSETS.tab.learnActive,
					text: '拼音'
				},
				{
					pagePath: '/pages/dictionary/index',
					iconPath: MENG_ASSETS.tab.catalog,
					iconPathActive: MENG_ASSETS.tab.catalogActive,
					text: '查字'
				},
				{
					pagePath: '/pages/me/me',
					iconPath: MENG_ASSETS.tab.me,
					iconPathActive: MENG_ASSETS.tab.meActive,
					text: '我的'
				}
			]
		}
	},
	mounted() {
		this.syncSelectedFromRoute()
	},
	methods: {
		syncSelected(index) {
			if (index >= 0 && index < this.list.length) this.selected = index
		},
		syncSelectedFromRoute() {
			try {
				const pages = getCurrentPages()
				const cur = pages[pages.length - 1]
				const route = cur && cur.route ? String(cur.route) : ''
				const idx = this.list.findIndex((it) => {
					const p = it.pagePath.replace(/^\//, '')
					return p === route
				})
				if (idx >= 0) this.selected = idx
			} catch (_) {}
		},
		switchTab(index) {
			if (index === this.selected) return
			const url = this.list[index].pagePath
			uni.switchTab({
				url,
				fail: (err) => console.warn('[custom-tab-bar] switchTab', err)
			})
		}
	}
}
</script>

<style>
@import '../static/styles/app-theme.css';

.tab-outer {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
	padding: 0 20rpx calc(12rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
	pointer-events: none;
}

.tab-wrap {
	pointer-events: auto;
	border-radius: var(--meng-tab-float-radius);
	background: var(--meng-tab-bar-bg);
	border: 1rpx solid var(--meng-border);
	box-shadow: var(--meng-tab-bar-shadow), 0 8rpx 32rpx rgba(44, 36, 25, 0.06);
	overflow: hidden;
	/* #ifdef H5 */
	backdrop-filter: blur(20px);
	/* #endif */
}

.tab-inner {
	display: flex;
	flex-direction: row;
	align-items: stretch;
	padding: 8rpx 10rpx 10rpx;
	box-sizing: border-box;
}

.tab-item {
	position: relative;
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 8rpx 4rpx 6rpx;
	border-radius: 22rpx;
	background: transparent;
}

.tab-active-pill {
	position: absolute;
	left: 8rpx;
	right: 8rpx;
	top: 4rpx;
	bottom: 4rpx;
	border-radius: 20rpx;
	background: var(--meng-tab-warm-to);
	box-shadow: inset 0 0 0 2rpx var(--meng-tab-active-border);
	z-index: 0;
}

.tab-icon-wrap {
	position: relative;
	z-index: 1;
	width: var(--meng-tab-icon-size);
	height: var(--meng-tab-icon-size);
	display: flex;
	align-items: center;
	justify-content: center;
}

/* 未选中：统一用选中态资源 + 灰度，避免未选中图带奶油底色块 */
.tab-icon--inactive {
	opacity: 0.55;
	transform: scale(0.94);
	filter: grayscale(1) brightness(0.72);
}

.tab-item-active .tab-icon-wrap {
	transform: translateY(-2rpx);
}

.tab-icon {
	width: var(--meng-tab-icon-size);
	height: var(--meng-tab-icon-size);
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.tab-item-active .tab-icon {
	opacity: 1;
	transform: scale(1.06);
	filter: none;
}

.tab-text {
	position: relative;
	z-index: 1;
	margin-top: 2rpx;
	font-size: 20rpx;
	color: var(--meng-tab-inactive-text);
	line-height: 1.2;
	font-weight: 500;
}

.tab-item-active .tab-text {
	color: var(--meng-tab-active-text);
	font-weight: 700;
	font-size: 21rpx;
}
</style>
