/**
 * 从 Make Me a Hanzi IDS 拆解 + 识字表，生成偏旁导图用精简数据。
 *
 * 用法：
 *   node scripts/build-char-components.mjs
 * 可选环境变量：
 *   MMAH_DICT=path/to/dictionary.txt
 *
 * 输出：
 *   data/char-components.json
 *   data/component-char-index.json
 */
import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const require = createRequire(import.meta.url)

const LIST_TYPE_SHIZI = '识字表'
const OUT_PARTS = path.join(root, 'data', 'char-components.json')
const OUT_INDEX = path.join(root, 'data', 'component-char-index.json')
const RAW_DIR = path.join(root, 'data', 'raw')
const RAW_DICT = path.join(RAW_DIR, 'makemeahanzi-dictionary.txt')
const MMAH_URL =
	'https://cdn.jsdelivr.net/gh/skishore/makemeahanzi@master/dictionary.txt'

/** Ideographic Description Characters — strip these from IDS leaves */
const IDS_DESC =
	/[\u2FF0-\u2FFB\u31EF]/g

function isHanLeaf(ch) {
	if (!ch || ch === '？' || ch === '?') return false
	const cp = ch.codePointAt(0)
	if (cp == null) return false
	// CJK unified + radicals + compatibility
	return (
		(cp >= 0x4e00 && cp <= 0x9fff) ||
		(cp >= 0x3400 && cp <= 0x4dbf) ||
		(cp >= 0xf900 && cp <= 0xfaff) ||
		(cp >= 0x2e80 && cp <= 0x2ef3) ||
		(cp >= 0x2f00 && cp <= 0x2fd5)
	)
}

/** Parse IDS string into unique leaf components (order preserved). */
export function parseIdsLeaves(decomposition) {
	const raw = String(decomposition || '').trim()
	if (!raw || raw.startsWith('？') || raw.startsWith('?')) return []
	const stripped = raw.replace(IDS_DESC, '')
	const out = []
	const seen = new Set()
	for (const ch of stripped) {
		if (!isHanLeaf(ch)) continue
		if (seen.has(ch)) continue
		seen.add(ch)
		out.push(ch)
	}
	return out
}

function loadCurriculumHanzi() {
	const seedPath = path.join(root, 'constants', 'hanzi_curriculum_seed.json')
	const rows = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
	const seen = new Set()
	const list = []
	for (const r of rows || []) {
		if (r.list_type !== LIST_TYPE_SHIZI) continue
		const h = typeof r.hanzi === 'string' ? r.hanzi.trim() : ''
		if (!h || seen.has(h)) continue
		seen.add(h)
		list.push(h)
	}
	return list
}

function downloadFile(url, dest) {
	return new Promise((resolve, reject) => {
		fs.mkdirSync(path.dirname(dest), { recursive: true })
		const file = fs.createWriteStream(dest)
		https
			.get(url, (res) => {
				if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					file.close()
					fs.unlinkSync(dest)
					downloadFile(res.headers.location, dest).then(resolve, reject)
					return
				}
				if (res.statusCode !== 200) {
					reject(new Error(`HTTP ${res.statusCode}`))
					return
				}
				res.pipe(file)
				file.on('finish', () => {
					file.close(() => resolve(dest))
				})
			})
			.on('error', (err) => {
				try {
					fs.unlinkSync(dest)
				} catch (_) {}
				reject(err)
			})
	})
}

async function ensureDict() {
	const envPath = process.env.MMAH_DICT && String(process.env.MMAH_DICT).trim()
	if (envPath && fs.existsSync(envPath)) return envPath
	if (fs.existsSync(RAW_DICT) && fs.statSync(RAW_DICT).size > 1000) return RAW_DICT
	console.log('downloading Make Me a Hanzi dictionary…')
	await downloadFile(MMAH_URL, RAW_DICT)
	return RAW_DICT
}

function loadDecompositionMap(dictPath) {
	const map = new Map()
	const text = fs.readFileSync(dictPath, 'utf8')
	for (const line of text.split(/\n/)) {
		const t = line.trim()
		if (!t) continue
		let o
		try {
			o = JSON.parse(t)
		} catch (_) {
			continue
		}
		const ch = o && o.character
		if (!ch) continue
		map.set(ch, {
			decomposition: o.decomposition || '',
			radical: o.radical || ''
		})
	}
	return map
}

function tryCncharRadical(hanzi) {
	try {
		const cnchar = require('cnchar')
		const radical = require('cnchar-radical')
		cnchar.use(radical)
		const arr = cnchar.radical(hanzi)
		const first = Array.isArray(arr) && arr[0]
		if (first && first.radical) return String(first.radical).trim()
	} catch (_) {}
	return ''
}

function partsForChar(hanzi, mm) {
	const row = mm.get(hanzi)
	const parts = []
	const seen = new Set()
	const push = (p) => {
		const s = String(p || '').trim()
		if (!s || s === hanzi || seen.has(s)) return
		if (!isHanLeaf(s) && s.length !== 1) return
		if (!isHanLeaf(s)) return
		seen.add(s)
		parts.push(s)
	}
	if (row) {
		for (const leaf of parseIdsLeaves(row.decomposition)) push(leaf)
		if (row.radical) push(row.radical)
	}
	const cnRad = tryCncharRadical(hanzi)
	if (cnRad) push(cnRad)
	return parts
}

async function main() {
	const dictPath = await ensureDict()
	const mm = loadDecompositionMap(dictPath)
	const chars = loadCurriculumHanzi()
	console.log(`curriculum shizi chars: ${chars.length}`)
	console.log(`makemeahanzi entries: ${mm.size}`)

	const charComponents = {}
	const index = Object.create(null)
	let withParts = 0

	for (const h of chars) {
		const parts = partsForChar(h, mm)
		if (!parts.length) continue
		withParts += 1
		charComponents[h] = parts
		for (const p of parts) {
			if (!index[p]) index[p] = []
			if (!index[p].includes(h)) index[p].push(h)
		}
	}

	// stable sort related lists
	for (const p of Object.keys(index)) {
		index[p].sort((a, b) => a.localeCompare(b, 'zh-CN'))
	}

	fs.mkdirSync(path.dirname(OUT_PARTS), { recursive: true })
	fs.writeFileSync(OUT_PARTS, JSON.stringify(charComponents), 'utf8')
	fs.writeFileSync(OUT_INDEX, JSON.stringify(index), 'utf8')

	const sample = charComponents['她']
	console.log(`chars with parts: ${withParts}`)
	console.log(`component keys: ${Object.keys(index).length}`)
	console.log(`sample 她 →`, sample)
	console.log(`wrote ${OUT_PARTS}`)
	console.log(`wrote ${OUT_INDEX}`)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
