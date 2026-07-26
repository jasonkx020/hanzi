/** 取消 TabBar 后的主路径跳转（原 switchTab / reLaunch 入口） */

export function reLaunchHome() {
	uni.reLaunch({ url: '/pages/home/home' })
}

export function navigateToDictionaryHome() {
	uni.navigateTo({ url: '/pages/dictionary/index' })
}

export function navigateToMe() {
	uni.navigateTo({ url: '/pages/me/me' })
}
