/**
 * @file strip-gradients.mjs
 * @module scripts
 * @description 源文件：strip-gradients.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 将项目内 linear-gradient / radial-gradient 替换为纯色（取渐变最后一档颜色）
 * 用法: node scripts/strip-gradients.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SKIP_DIRS = new Set(['node_modules', 'unpackage', 'dist', '.git', 'scripts'])

const GRAD_RE = /(?:linear|radial|conic)-gradient\s*\(/gi

function walk(dir, out = []) {
	for (const name of fs.readdirSync(dir)) {
		if (SKIP_DIRS.has(name)) continue
		const p = path.join(dir, name)
		const st = fs.statSync(p)
		if (st.isDirectory()) walk(p, out)
		else if (/\.(vue|css|scss|less)$/.test(name)) out.push(p)
	}
	return out
}

/** 从 gradient 参数字符串中取最后一个色值 */
function lastColorFromGradientArgs(args) {
	const stops = []
	const re =
		/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|var\([^)]+\)|[a-zA-Z]+)\s*(?:\d+(?:\.\d+)?%)?/g
	let m
	while ((m = re.exec(args))) {
		const c = m[1].trim()
		if (c === 'deg' || c === 'to' || c === 'transparent') continue
		if (/^\d/.test(c)) continue
		stops.push(c)
	}
	if (stops.length) return stops[stops.length - 1]
	return 'var(--meng-page-bg)'
}

function replaceGradientsInText(text) {
	let i = 0
	let out = ''
	while (i < text.length) {
		const idx = text.slice(i).search(GRAD_RE)
		if (idx < 0) {
			out += text.slice(i)
			break
		}
		const start = i + idx
		out += text.slice(i, start)
		const open = text.indexOf('(', start)
		if (open < 0) {
			out += text.slice(start)
			break
		}
		let depth = 1
		let j = open + 1
		while (j < text.length && depth > 0) {
			const ch = text[j]
			if (ch === '(') depth++
			else if (ch === ')') depth--
			j++
		}
		const args = text.slice(open + 1, j - 1)
		const solid = lastColorFromGradientArgs(args)
		out += solid
		i = j
	}
	return out
}

const KNOWN = {
	'var(--meng-accent-from), var(--meng-accent-to)': 'var(--meng-accent-solid)',
	'var(--meng-accent-from) 0%, var(--meng-accent-to) 100%': 'var(--meng-accent-solid)',
	'var(--meng-accent-from, #ffb86a), var(--meng-accent-to, #e87a4a)': 'var(--meng-accent-solid, #e87a4a)',
	'var(--meng-banner-soft) 0%, var(--meng-card) 100%': 'var(--meng-card)',
	'var(--meng-card) 0%, var(--meng-banner-soft) 100%': 'var(--meng-card)',
	'var(--meng-leaf-soft) 0%, var(--meng-banner-soft) 100%': 'var(--meng-banner-soft)',
	'var(--meng-leaf, #6bae7d), #5a9a6c': 'var(--meng-leaf, #6bae7d)',
	'transparent 0%, rgba(196, 77, 106, 0.75) 100%': 'rgba(196, 77, 106, 0.35)',
	'transparent 0%, rgba(255, 252, 248, 0.55) 52%, var(--meng-page-bg) 100%':
		'var(--meng-page-bg)'
}

let changed = 0
for (const file of walk(root)) {
	let src = fs.readFileSync(file, 'utf8')
	if (!GRAD_RE.test(src)) continue
	GRAD_RE.lastIndex = 0
	let next = src
	for (const [from, to] of Object.entries(KNOWN)) {
		if (next.includes(from)) next = next.split(from).join(to)
	}
	next = replaceGradientsInText(next)
	if (next !== src) {
		fs.writeFileSync(file, next, 'utf8')
		changed++
		console.log('updated', path.relative(root, file))
	}
}

console.log(`done, ${changed} files`)
