/**
 * @file rename-renjiao-static-to-english.mjs
 * @module scripts
 * @description 源文件：rename-renjiao-static-to-english.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 将 static/booktext/renjiaoban 下中文文件名改为英文（一次性迁移）
 * 运行：node scripts/rename-renjiao-static-to-english.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const bookDir = path.join(__dirname, '..', 'static', 'booktext', 'renjiaoban')

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }
const TYPE = { 识字表: 'literacy', 写字表: 'writing', 词语表: 'words', 成语表: 'idioms' }

function toEnglish(name) {
	if (name === '幼小衔接.json') return 'preschool-bridge.json'
	let m = /^([一二三四五六])年级(上|下)册\.json$/.exec(name)
	if (m) {
		const g = CN[m[1]]
		const sem = m[2] === '上' ? 'up' : 'down'
		return `grade${g}-${sem}.json`
	}
	m = /^([一二三四五六])年级(上|下)册-(识字表|写字表|词语表|成语表)\.json$/.exec(name)
	if (m) {
		const g = CN[m[1]]
		const sem = m[2] === '上' ? 'up' : 'down'
		const suf = TYPE[m[3]]
		return `grade${g}-${sem}-${suf}.json`
	}
	return null
}

function main() {
	const files = fs.readdirSync(bookDir).filter((f) => f.endsWith('.json'))
	let n = 0
	for (const f of files) {
		const next = toEnglish(f)
		if (!next || next === f) continue
		const from = path.join(bookDir, f)
		const to = path.join(bookDir, next)
		if (!fs.existsSync(from)) continue
		if (fs.existsSync(to)) {
			console.warn('[rename] target exists, skip', f, '->', next)
			continue
		}
		fs.renameSync(from, to)
		console.log('[rename]', f, '->', next)
		n++
	}
	console.log('[rename] done', n, 'files')
}

main()
