import { getMengNavMetrics } from '@/utils/meng-nav-metrics.js'

/**
 * 原 Tab 主页面壳：顶图铺满状态栏区（已取消底部 TabBar）
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
		/** @deprecated TabBar 已移除，保留空实现避免旧页面 onShow 报错 */
		setTabBarIndex(_index) {}
	}
}
