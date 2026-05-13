<script>
import { initAppStores } from '@/store/index.js'
	export default {
		onLaunch: function() {
			console.log('App Launch')
			initAppStores()
			// #ifndef H5
			try {
				if (typeof uni.loadFontFace === 'function') {
					uni.loadFontFace({
						family: 'Pinyin Regular',
						source: 'url("/static/fonts/Pinyin-Regular.ttf")',
						global: true,
						success: () => {},
						fail: (e) => console.warn('[App] loadFontFace Pinyin Regular', e)
					})
				}
			} catch (e) {
				console.warn('[App] loadPinyinFontFace', e)
			}
			// #endif
			// #ifdef APP-PLUS
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
@import './static/styles/pinyin-font.css';
	/* 页面底色与 App 回弹露底同色 */
	page {
		background-color: #f4f1ea;
		box-sizing: border-box;
		width: 100%;
		min-height: 100%;
	}

	/* Tab 主页面底部留白，避免内容被自定义 tabBar 遮挡 */
	.tab-root-page {
		padding-bottom: calc(148rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
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
	/* #endif */
</style>
