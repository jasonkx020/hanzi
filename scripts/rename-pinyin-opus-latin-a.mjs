/**
 * 将 static/pinyin 下文件名中的 ɑ（U+0251）及 ɑ+组合调号 改为拉丁 a / ā á ǎ à。
 * 两阶段重命名，避免互相覆盖。
 *
 * 用法：node scripts/rename-pinyin-opus-latin-a.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PINYIN_DIR = path.join(ROOT, 'static', 'pinyin')
const U_ALPH = '\u0251'

/** 文件名 stem：ɑ + 组合调 → 预组合拉丁带调 a */
function opusStemToLatinFilename(stem) {
	let s = String(stem)
	const pairs = [
		[U_ALPH + '\u0304', '\u0101'],
		[U_ALPH + '\u0301', '\u00e1'],
		[U_ALPH + '\u030c', '\u01ce'],
		[U_ALPH + '\u0300', '\u00e0']
	]
	for (const [from, to] of pairs) {
		s = s.split(from).join(to)
	}
	s = s.split(U_ALPH).join('a')
	return s
}

function main() {
	if (!fs.existsSync(PINYIN_DIR)) {
		console.error('Missing:', PINYIN_DIR)
		process.exit(1)
	}
	const names = fs.readdirSync(PINYIN_DIR).filter((n) => n.toLowerCase().endsWith('.opus'))
	const jobs = []
	for (const name of names) {
		const stem = name.slice(0, -'.opus'.length)
		if (!stem.includes(U_ALPH)) continue
		const nextStem = opusStemToLatinFilename(stem)
		if (nextStem === stem) continue
		jobs.push({ from: name, stem, nextStem, to: `${nextStem}.opus` })
	}
	const dup = new Map()
	for (const j of jobs) {
		dup.set(j.to, (dup.get(j.to) || 0) + 1)
	}
	for (const [to, c] of dup) {
		if (c > 1) {
			console.error('多个源映射到同一目标:', to)
			process.exit(1)
		}
	}
	const existing = new Set(names)
	for (const j of jobs) {
		if (existing.has(j.to) && j.from !== j.to) {
			console.error('冲突：已存在目标文件', j.to, '来源', j.from)
			process.exit(1)
		}
	}
	const phase1 = jobs.map((j, i) => ({
		absFrom: path.join(PINYIN_DIR, j.from),
		absTmp: path.join(PINYIN_DIR, `.__ren_${i}_${Date.now()}__.opus`),
		absTo: path.join(PINYIN_DIR, j.to),
		meta: j
	}))
	for (const p of phase1) {
		fs.renameSync(p.absFrom, p.absTmp)
	}
	for (const p of phase1) {
		fs.renameSync(p.absTmp, p.absTo)
	}
	console.log(`已重命名 ${jobs.length} 个 opus 文件（ɑ → 拉丁 a / 带调 a）`)
}

main()
