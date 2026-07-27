/** Tab 主路径跳转（须与 pages.json tabBar.list 一致） */

function switchTabOrFallback(url, fallback) {
	uni.switchTab({
		url,
		fail: () => {
			if (typeof fallback === 'function') fallback()
			else uni.reLaunch({ url })
		}
	})
}

export function reLaunchHome() {
	switchTabOrFallback('/pages/home/home')
}

export function navigateToDictionaryHome() {
	switchTabOrFallback('/pages/dictionary/index')
}

export function navigateToMe() {
	switchTabOrFallback('/pages/me/me')
}
