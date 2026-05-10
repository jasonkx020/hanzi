/**
 * Tab 主页面：状态栏占位 + 底部给自定义 tabBar 留白 + 同步选中项
 */
export default {
	data() {
		return {
			statusBarHeight: 44
		}
	},
	computed: {
		tabPageStyle() {
			return {
				paddingTop: `${this.statusBarHeight || 44}px`
			}
		}
	},
	onLoad() {
		try {
			const s = uni.getSystemInfoSync()
			this.statusBarHeight = Number(s.statusBarHeight) || 44
		} catch (_) {}
	},
	methods: {
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
