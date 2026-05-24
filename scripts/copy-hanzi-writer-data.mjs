/**
 * 将 node_modules/hanzi-writer-data 中的 *.json 复制到 static/hanzi-writer-data
 * 默认仅复制 static/booktext/renjiaoban 课本里出现过的字；加 --all 复制全部。
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'node_modules', 'hanzi-writer-data')
const DEST = path.join(ROOT, 'static', 'hanzi-writer-data')
const BOOK_DIR = path.join(ROOT, 'static', 'booktext', 'renjiaoban')
const HANZI_RE = /[\u4e00-\u9fff]/g
const copyAll = process.argv.includes('--all')

if (!fs.existsSync(SRC)) {
	console.error('未找到 hanzi-writer-data，请先执行: npm install hanzi-writer-data')
	process.exit(1)
}

if (!fs.existsSync(DEST)) {
	fs.mkdirSync(DEST, { recursive: true })
}

/** @returns {Set<string> | null} */
function collectNeededHanzi() {
	const needed = new Set()
	if (!fs.existsSync(BOOK_DIR)) return needed
	for (const name of fs.readdirSync(BOOK_DIR)) {
		if (!name.endsWith('.json') || name.endsWith('-report.json')) continue
		const text = fs.readFileSync(path.join(BOOK_DIR, name), 'utf8')
		let m = HANZI_RE.exec(text)
		while (m) {
			for (const ch of m[0]) needed.add(ch)
			m = HANZI_RE.exec(text)
		}
		HANZI_RE.lastIndex = 0
	}
	return needed
}

let files = fs.readdirSync(SRC).filter((f) => f.endsWith('.json'))
if (!copyAll) {
	const needed = collectNeededHanzi()
	files = files.filter((f) => needed.has(f.replace(/\.json$/u, '')))
}
let copied = 0
let skipped = 0

for (const f of files) {
	const from = path.join(SRC, f)
	const to = path.join(DEST, f)
	try {
		const st = fs.statSync(to)
		const srcSt = fs.statSync(from)
		if (st.size === srcSt.size && st.mtimeMs >= srcSt.mtimeMs) {
			skipped++
			continue
		}
	} catch (_) {}
	fs.copyFileSync(from, to)
	copied++
}

console.log(`[ok] hanzi-writer-data → static/hanzi-writer-data`)
console.log(
	`     mode=${copyAll ? 'all' : 'booktext-only'}  json=${files.length}  copied=${copied}  skipped=${skipped}`
)
if (!copyAll) {
	console.log('     tip: 删除多余文件可执行 npm run assets:hanzi-writer:prune')
}
