import { t, onLocaleChange, getLocale } from '@/utils/i18n.js'

/**
 * 页面/组件混入：模板用 t()，语言切换时通过 localeTick 触发刷新
 */
export default {
	data() {
		return {
			localeTick: 0
		}
	},
	created() {
		this._offLocale = onLocaleChange(() => {
			this.localeTick += 1
			if (typeof this.onLocaleChanged === 'function') {
				this.onLocaleChanged()
			}
		})
	},
	beforeUnmount() {
		if (typeof this._offLocale === 'function') this._offLocale()
	},
	// #ifndef VUE3
	beforeDestroy() {
		if (typeof this._offLocale === 'function') this._offLocale()
	},
	// #endif
	onShow() {
		this.localeTick += 1
	},
	methods: {
		t(key, params) {
			// 依赖 localeTick，保证切换后重新求值
			void this.localeTick
			return t(key, params)
		},
		currentLocale() {
			void this.localeTick
			return getLocale()
		}
	}
}
