const GRADE_CN = ['', '一', '二', '三', '四', '五', '六']
const STATIC_BOOKTEXT_ROOT = '/static/booktext/renjiaoban/'

/** 课文 JSON 中与目录对应的可选字段（见 static/booktext/renjiaoban/*.json） */
const TEXTBOOK_EXTRA_KEYS = [
	'unit',
	'unitName',
	'unitTheme',
	'kind',
	'catalogLessonNo',
	'lessonInUnit'
]

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
			.map((it) => {
				if (!it || typeof it !== 'object') return null
				const row = {
					title: String(it.title != null ? it.title : ''),
					content: String(it.content != null ? it.content : '')
				}
				for (let i = 0; i < TEXTBOOK_EXTRA_KEYS.length; i++) {
					const k = TEXTBOOK_EXTRA_KEYS[i]
					if (Object.prototype.hasOwnProperty.call(it, k)) row[k] = it[k]
				}
				return row
			})
			.filter((it) => it && (it.title || it.content))
	} catch (e) {
		console.warn('[renjiao-textbook-loader] load failed', fileName, e)
		return []
	}
}
