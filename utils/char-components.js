/**
 * 偏旁导图：部件拆解与倒排检索（识字表范围，离线 JSON）。
 */
import CHAR_COMPONENTS from '@/data/char-components.json'
import COMPONENT_INDEX from '@/data/component-char-index.json'
import { getRadicalLabel } from '@/repositories/dictionary-repository.js'
import { charMatchesRadicalFilter } from '@/utils/dictionary-radical-filter.js'
import { queryAllShiziCurriculumChars } from '@/utils/curriculum-db.js'

function firstHanzi(text) {
	const s = String(text || '').trim()
	const m = s.match(/[\u4e00-\u9fff]/)
	return m ? m[0] : ''
}

/**
 * @param {string} hanzi
 * @returns {string[]} 可选部件（如 她 → 女、也）
 */
export function getCharParts(hanzi) {
	const h = firstHanzi(hanzi)
	if (!h) return []
	const fromData = CHAR_COMPONENTS[h]
	if (Array.isArray(fromData) && fromData.length) {
		return fromData.map((x) => String(x || '').trim()).filter(Boolean)
	}
	const rad = getRadicalLabel(h)
	if (rad && rad !== '—' && rad !== '-') return [rad]
	return []
}

/**
 * @param {string} part 部件
 * @returns {string[]} 识字表中含该部件的字
 */
export function listCharsByPart(part) {
	const p = String(part || '').trim()
	if (!p) return []
	const fromIndex = COMPONENT_INDEX[p]
	if (Array.isArray(fromIndex) && fromIndex.length) {
		return fromIndex.map((x) => String(x || '').trim()).filter(Boolean)
	}
	return []
}

/**
 * 无倒排数据时：按部首在识字表中筛选（异步）。
 * @param {string} part
 * @returns {Promise<string[]>}
 */
export async function listCharsByPartFallback(part) {
	const p = String(part || '').trim()
	if (!p) return []
	const indexed = listCharsByPart(p)
	if (indexed.length) return indexed
	try {
		const rows = await queryAllShiziCurriculumChars()
		const out = []
		const seen = new Set()
		for (const r of rows || []) {
			const h = firstHanzi(r && r.hanzi)
			if (!h || seen.has(h)) continue
			if (!charMatchesRadicalFilter(h, p)) continue
			seen.add(h)
			out.push(h)
		}
		return out
	} catch (_) {
		return []
	}
}

/**
 * @param {string} hanzi
 * @param {string} part
 * @returns {Promise<string[]>} 相关字（不含源字时可再滤）
 */
export async function listRelatedCharsForPart(hanzi, part) {
	const h = firstHanzi(hanzi)
	const list = await listCharsByPartFallback(part)
	if (!h) return list
	return list.filter((c) => c !== h)
}

export { firstHanzi as firstComponentHanzi }
