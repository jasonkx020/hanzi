<script>
// #ifdef APP-PLUS
import { ensureCurriculumDatabase } from '@/utils/curriculum-db.js'
// #endif
	export default {
		onLaunch: function() {
			console.log('App Launch')
			// #ifdef APP-PLUS
			ensureCurriculumDatabase().catch(() => {})
			try {
				const bg = '#F4F1EA'
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
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/* 原生导航栏与页面同色 #F4F1EA，无需再为透明导航垫高 */
	page {
		background-color: #f4f1ea;
		box-sizing: border-box;
		width: 100%;
		min-height: 100%;
	}

	/* 避免个别端根节点默认底色断层 */
	uni-page-body,
	#app,
	html,
	body {
		background-color: #f4f1ea;
		width: 100%;
		min-height: 100%;
	}
</style>
