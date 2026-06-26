/**
 * @file tab-main-page.js
 * @module mixins
 * @description Vue mixin：tab-main-page.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { getMengNavMetrics } from '@/utils/meng-nav-metrics.js'

/**
 * Tab 主页面：顶图铺满状态栏区 + 底部给自定义 tabBar 留白 + 同步选中项
 */
export default {
	data() {
		return {
			statusBarHeight: 44
		}
	},
	computed: {
		/** 根节点不再顶 padding，避免页头与顶图之间露底色（微信小程序常见全屏顶图） */
		tabPageStyle() {
			return { paddingTop: 0 }
		},
	},
	onLoad() {
		this.refreshStatusBarMetrics()
	},
	onShow() {
		this.refreshStatusBarMetrics()
	},
	methods: {
		refreshStatusBarMetrics() {
			this.statusBarHeight = getMengNavMetrics().statusBarPx
		},
		setTabBarIndex(index) {
			this.$nextTick(() => {
				let bar = null
				try {
					if (typeof this.getTabBar === 'function') bar = this.getTabBar()
				} catch (_) {}
				if (!bar) return
				if (typeof bar.setData === 'function') {
					bar.setData({ selected: index })
				} else if (bar.$vm && typeof bar.$vm.syncSelected === 'function') {
					bar.$vm.syncSelected(index)
				} else if (bar.$vm) {
					bar.$vm.selected = index
				}
			})
		}
	}
}
