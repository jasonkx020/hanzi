const GRADE_CN = ['', '一', '二', '三', '四', '五', '六']
const STATIC_BOOKTEXT_ROOT = '/static/booktext/renjiaoban/'

function buildFileName(grade, semester) {
	const g = Number(grade)
	if (!Number.isFinite(g) || g < 1 || g > 6) return ''
	return `${GRADE_CN[g]}年级${semester === '下' ? '下册' : '上册'}.json`
}

function requestText(url) {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method: 'GET',
			responseType: 'text',
			success: (res) => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(String(res.data || ''))
					return
				}
				reject(new Error(`HTTP ${res.statusCode}`))
			},
			fail: reject
		})
	})
}

/**
 * 读取 static/booktext/renjiaoban 中的统编语文课文
 */
export async function loadRenjiaoTextbookTexts({ grade, semester }) {
	const fileName = buildFileName(grade, semester)
	if (!fileName) return []
	const urlCandidates = [
		`${STATIC_BOOKTEXT_ROOT}${fileName}`,
		`./static/booktext/renjiaoban/${fileName}`
	]
	try {
		let text = ''
		let lastError = null
		for (let i = 0; i < urlCandidates.length; i++) {
			try {
				text = await requestText(urlCandidates[i])
				if (text) break
			} catch (e) {
				lastError = e
			}
		}
		if (!text) throw lastError || new Error('empty textbook json')
		const arr = JSON.parse(text)
		if (!Array.isArray(arr)) return []
		return arr
			.map((it) => ({
				title: String(it && it.title ? it.title : ''),
				content: String(it && it.content ? it.content : '')
			}))
			.filter((it) => it.title || it.content)
	} catch (e) {
		console.warn('[renjiao-textbook-loader] load failed', fileName, e)
		return []
	}
}
