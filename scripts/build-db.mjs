/**
 * 根据 docs/sqlite/ddl.sql 建表，并写入 scripts/seed-*.json 默认数据，生成 static/db/hanzi_curriculum.db
 * 运行：npm run db:build
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import initSqlJs from 'sql.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const DEFAULT_TV = 'tongbian-rj'
const DEFAULT_GRADE = 1
const DEFAULT_SEMESTER = '上'

async function main() {
	const ddlPath = path.join(root, 'docs/sqlite/ddl.sql')
	let ddl = fs.readFileSync(ddlPath, 'utf8')
	ddl = ddl
		.split('\n')
		.filter((line) => !/^\s*--/.test(line))
		.join('\n')

	const wasmDir = path.join(root, 'node_modules/sql.js/dist')
	const wasmBinary = fs.readFileSync(path.join(wasmDir, 'sql-wasm.wasm'))

	const SQL = await initSqlJs({ wasmBinary })
	const db = new SQL.Database()

	const stmts = ddl
		.split(';')
		.map((s) => s.trim())
		.filter(Boolean)
	for (const s of stmts) {
		db.run(s + ';')
	}

	const seedPath = path.join(__dirname, 'seed-curriculum.json')
	const curriculumRows = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
	const insCur = db.prepare(
		`INSERT INTO hanzi_curriculum (textbook_version_id, grade, semester, list_type, hanzi, pinyin, sort_order, lesson_hint, source_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	)
	for (const r of curriculumRows) {
		insCur.run([
			r.textbook_version_id || DEFAULT_TV,
			Number(r.grade) || DEFAULT_GRADE,
			r.semester || DEFAULT_SEMESTER,
			r.list_type,
			r.hanzi,
			r.pinyin ?? null,
			Number(r.sort_order) || 0,
			r.lesson_hint ?? null,
			r.source_url ?? null
		])
	}
	insCur.free()
	console.log('[build-db] hanzi_curriculum rows:', curriculumRows.length)

	const progressPath = path.join(__dirname, 'seed-user-progress.json')
	if (fs.existsSync(progressPath)) {
		const progressRows = JSON.parse(fs.readFileSync(progressPath, 'utf8'))
		const now = Date.now()
		const insProg = db.prepare(
			`INSERT INTO user_char_progress (textbook_version_id, grade, semester, hanzi, learned, mastered, wrong_count, updated_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		for (const r of progressRows) {
			insProg.run([
				r.textbook_version_id || DEFAULT_TV,
				Number(r.grade) || DEFAULT_GRADE,
				r.semester || DEFAULT_SEMESTER,
				r.hanzi,
				Number(r.learned) ? 1 : 0,
				Number(r.mastered) ? 1 : 0,
				Math.max(0, Number(r.wrong_count) || 0),
				Number(r.updated_at_ms) || now
			])
		}
		insProg.free()
		console.log('[build-db] user_char_progress rows:', progressRows.length)
	}

	const outDir = path.join(root, 'static/db')
	fs.mkdirSync(outDir, { recursive: true })
	const outFile = path.join(outDir, 'hanzi_curriculum.db')
	const bin = db.export()
	fs.writeFileSync(outFile, Buffer.from(bin))
	console.log('[build-db] wrote', outFile, `(${bin.byteLength} bytes)`)
	db.close()
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
