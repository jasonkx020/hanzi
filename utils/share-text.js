/**
 * 文本导出到剪贴板（小程序 / App 通用）
 */

export function copyTextToClipboard(text, successTitle = '已复制到剪贴板') {
	const data = String(text || '')
	if (!data) {
		uni.showToast({ title: '暂无内容', icon: 'none' })
		return Promise.resolve(false)
	}
	return new Promise((resolve) => {
		uni.setClipboardData({
			data,
			success: () => {
				uni.showToast({ title: successTitle, icon: 'success' })
				resolve(true)
			},
			fail: () => {
				uni.showToast({ title: '复制失败', icon: 'none' })
				resolve(false)
			}
		})
	})
}
