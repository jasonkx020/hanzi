<script>
import { initAppStores } from '@/store/index.js'
import { schedulePinyinFontLoad } from '@/utils/pinyin-font-loader.js'
import { applyMengSafeAreaCssVars } from '@/utils/meng-nav-metrics.js'
import { VIP_PAY_SYNC_ON_LAUNCH } from '@/config/vip-pay-config.js'
import {
	syncVipEntitlementFromServer,
	resumePendingVipPurchaseIfAny
} from '@/services/vip-pay-service.js'
import { ensurePreschoolCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { initLocale } from '@/utils/i18n.js'
	export default {
		onLaunch: function() {
			console.log('App Launch')
			try {
				initLocale()
			} catch (_) {}
			try {
				uni.hideTabBar({ animation: false })
			} catch (_) {}
			try {
				ensurePreschoolCurriculumPrefs()
			} catch (_) {}
			applyMengSafeAreaCssVars()
			setTimeout(() => applyMengSafeAreaCssVars(), 80)
			setTimeout(() => applyMengSafeAreaCssVars(), 320)
			initAppStores()
			if (VIP_PAY_SYNC_ON_LAUNCH) {
				resumePendingVipPurchaseIfAny().catch(() => {})
				syncVipEntitlementFromServer().catch(() => {})
			}
			// #ifndef H5
			schedulePinyinFontLoad()
			// #endif
			// #ifdef APP-PLUS
			try {
				const bg = '#F6F3EC'
				const applyWebviewBg = (wv) => {
					if (wv && typeof wv.setStyle === 'function') {
						wv.setStyle({ background: bg })
					}
				}
				applyWebviewBg(plus.webview.currentWebview())
				try {
					const launch = plus.webview.getLaunchWebview && plus.webview.getLaunchWebview()
					if (launch) applyWebviewBg(launch)
				} catch (_) {}
				if (typeof plus.navigator.setStatusBarStyle === 'function') {
					plus.navigator.setStatusBarStyle('dark')
				}
				if (
					plus.os.name === 'Android' &&
					typeof plus.navigator.setStatusBarBackground === 'function'
				) {
					plus.navigator.setStatusBarBackground(bg)
				}
			} catch (e) {
				console.warn('[App] app-plus top bg', e)
			}
			// #endif
		},
		onShow: function() {
			console.log('App Show')
			try {
				uni.hideTabBar({ animation: false })
			} catch (_) {}
			applyMengSafeAreaCssVars()
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
@import './static/styles/app-theme.css';
@import './static/styles/meng-page.css';
@import './static/styles/pinyin-font.css';
	/* 页面底色与 App 回弹露底同色 */
	page {
		background-color: var(--meng-page-bg);
		box-sizing: border-box;
		width: 100%;
		min-height: 100%;
	}

	/* 主页面底部留白，避免内容被自定义 Tab 遮挡 */
	.tab-root-page {
		padding-bottom: calc(132rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(132rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
		width: 100%;
		max-width: 100%;
		overflow-x: hidden;
	}

	/* 避免个别端根节点默认底色断层 */
	uni-page-body,
	#app,
	html,
	body {
		background-color: var(--meng-page-bg);
		width: 100%;
		max-width: 100%;
		min-height: 100%;
		overflow-x: hidden;
	}

	/* #ifdef H5 */
	/* iOS Safari：惯性滚动 + 边界橡皮筋回弹（系统默认，避免被 overscroll-behavior 关掉） */
	html {
		height: 100%;
	}
	body {
		min-height: 100%;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior-y: auto;
	}
	.tab-root-page {
		touch-action: pan-y;
	}
	/*
	 * PC 宽屏：页面按手机宽度居中，避免布局被拉满后与真机不一致。
	 * 与 pages.json rpxCalcMaxDeviceWidth=480 / Base=375 配套。
	 */
	page {
		max-width: 480px;
		margin-left: auto;
		margin-right: auto;
	}
	uni-page-body {
		max-width: 480px;
		margin-left: auto;
		margin-right: auto;
		box-shadow: 0 0 0 1px rgba(44, 36, 25, 0.06);
	}
	/* #endif */
</style>
