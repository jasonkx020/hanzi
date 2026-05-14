/**
 * 从 scripts/seed-curriculum.json 生成 constants/hanzi_curriculum_seed.json（供运行时本地内存加载）
 * 课标附录4「识字写字教学基本字表」300字不在此文件重复：运行时由 utils/curriculum-db.js 从
 * static/booktext/renjiaoban/preschool-bridge.json 展开（与人教课文 JSON 同源衔接）。
 * 运行：npm run db:build
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const DEFAULT_TV = '统编(人教版)'
const DEFAULT_GRADE = 1
const DEFAULT_SEMESTER = '上'

function normalizeGrade(val) {
	const n = Number(val)
	if (Number.isFinite(n) && n >= 0 && n <= 6) return n
	return DEFAULT_GRADE
}

function normalizeRows(raw) {
	return raw.map((r, i) => ({
		id: i + 1,
		textbook_version_id: r.textbook_version_id || DEFAULT_TV,
		grade: normalizeGrade(r.grade),
		semester: r.semester || DEFAULT_SEMESTER,
		list_type: r.list_type,
		hanzi: r.hanzi,
		pinyin: r.pinyin ?? null,
		sort_order: Number(r.sort_order) || 0,
		lesson_hint: r.lesson_hint ?? null,
		source_url: r.source_url ?? null
	}))
}

function main() {
	const seedPath = path.join(__dirname, 'seed-curriculum.json')
	const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
	const rows = normalizeRows(raw)
	const outPath = path.join(root, 'constants', 'hanzi_curriculum_seed.json')
	fs.mkdirSync(path.dirname(outPath), { recursive: true })
	fs.writeFileSync(outPath, JSON.stringify(rows))
	console.log('[build-curriculum] wrote', outPath, 'rows:', rows.length, '(textbook seed only; MOE300 from preschool-bridge.json at runtime)')
}

main()
