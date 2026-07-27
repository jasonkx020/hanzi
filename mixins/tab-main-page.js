import { getMengNavMetrics } from '@/utils/meng-nav-metrics.js'

/**
 * Tab 主页面壳：顶图铺满状态栏区 + 底部自定义 Tab 选中同步
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
		}
	},
	onLoad() {
		this.refreshStatusBarMetrics()
	},
	onShow() {
		this.refreshStatusBarMetrics()
		try {
			uni.hideTabBar({ animation: false })
		} catch (_) {}
	},
	methods: {
		refreshStatusBarMetrics() {
			this.statusBarHeight = getMengNavMetrics().statusBarPx
		},
		/**
		 * 同步自定义 TabBar 选中项
		 * @param {number} index 0 首页 / 1 查字 / 2 我的
		 */
		setTabBarIndex(index) {
			const i = Number(index)
			if (!Number.isFinite(i) || i < 0) return
			try {
				const page = typeof getCurrentPages === 'function' ? getCurrentPages().slice(-1)[0] : null
				const getter =
					(page && typeof page.getTabBar === 'function' && page.getTabBar.bind(page)) ||
					(this.$scope && typeof this.$scope.getTabBar === 'function' && this.$scope.getTabBar.bind(this.$scope)) ||
					(typeof this.getTabBar === 'function' && this.getTabBar.bind(this)) ||
					null
				const bar = getter ? getter() : null
				if (bar && typeof bar.syncSelected === 'function') {
					bar.syncSelected(i)
					return
				}
			} catch (_) {}
			try {
				uni.$emit('meng-tab-selected', i)
			} catch (_) {}
		}
	}
}
