/**
 * 仅保留 static/booktext/renjiaoban 课本 JSON 中出现过的汉字笔顺数据。
 *
 * 用法：node scripts/prune-hanzi-writer-data.mjs
 *       node scripts/prune-hanzi-writer-data.mjs --dry-run
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const BOOK_DIR = path.join(ROOT, 'static', 'booktext', 'renjiaoban')
const HANZI_DIR = path.join(ROOT, 'static', 'hanzi-writer-data')
const HANZI_RE = /[\u4e00-\u9fff]/g

const dryRun = process.argv.includes('--dry-run')

function collectHanziFromText(text) {
	const set = new Set()
	let m = HANZI_RE.exec(text)
	while (m) {
		for (const ch of m[0]) set.add(ch)
		m = HANZI_RE.exec(text)
	}
	HANZI_RE.lastIndex = 0
	return set
}

function collectFromBooktext() {
	const needed = new Set()
	if (!fs.existsSync(BOOK_DIR)) {
		console.error('目录不存在:', BOOK_DIR)
		process.exit(1)
	}
	const files = fs.readdirSync(BOOK_DIR).filter((f) => {
		if (!f.endsWith('.json')) return false
		if (f.endsWith('-report.json')) return false
		return true
	})
	for (const f of files) {
		const text = fs.readFileSync(path.join(BOOK_DIR, f), 'utf8')
		for (const ch of collectHanziFromText(text)) needed.add(ch)
	}
	return { needed, files }
}

function main() {
	if (!fs.existsSync(HANZI_DIR)) {
		console.error('未找到:', HANZI_DIR)
		process.exit(1)
	}

	const { needed, files: bookFiles } = collectFromBooktext()
	const existing = fs.readdirSync(HANZI_DIR).filter((f) => f.endsWith('.json'))

	let kept = 0
	let removed = 0
	let missing = 0
	/** @type {string[]} */
	const missingChars = []

	for (const ch of needed) {
		const name = `${ch}.json`
		if (!existing.includes(name)) {
			missing++
			if (missingChars.length < 20) missingChars.push(ch)
		}
	}

	for (const f of existing) {
		const ch = f.replace(/\.json$/u, '')
		if (needed.has(ch)) {
			kept++
			continue
		}
		removed++
		if (!dryRun) {
			fs.unlinkSync(path.join(HANZI_DIR, f))
		}
	}

	console.log(`[${dryRun ? 'dry-run' : 'ok'}] prune hanzi-writer-data`)
	console.log(`     booktext: ${bookFiles.length} files → ${needed.size} unique hanzi`)
	console.log(`     before: ${existing.length} json`)
	console.log(`     kept: ${kept}  removed: ${removed}`)
	if (missing) {
		console.log(`     missing in hanzi-writer-data: ${missing} (run npm run assets:hanzi-writer)`)
		if (missingChars.length) {
			console.log(`     examples: ${missingChars.join('')}${missing > 20 ? '…' : ''}`)
		}
	}
}

main()
