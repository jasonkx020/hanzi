/**
 * @file apply-copyright-headers.mjs
 * @module scripts
 * @description 批量为应用源文件写入 @copyright 文件头（登记前请在 constants/copyright-meta.js 填写著作权人）
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 *
 * 运行：
 *   node scripts/apply-copyright-headers.mjs          # 预览（dry-run）
 *   node scripts/apply-copyright-headers.mjs --write    # 写入磁盘
 */
import fs from 'node:fs'
import path from 'node:path'
import {
	collectSourceFiles,
	hasCopyrightHeader,
	loadCopyrightMeta,
	prependCopyrightHeader,
	repoRootFromImportMeta,
	shouldIncludeRelPath
} from './lib/soft-copyright.mjs'

const rootDir = repoRootFromImportMeta(import.meta.url)
const meta = loadCopyrightMeta(rootDir)
const writeMode = process.argv.includes('--write')

/** 额外纳入写头的根目录（含 scripts、tests） */
function collectAllHeaderTargets(root) {
	const seen = new Set(collectSourceFiles(root))
	const extraDirs = ['scripts', 'tests', 'mixins']
	for (const dir of extraDirs) {
		const absDir = path.join(root, dir)
		if (!fs.existsSync(absDir)) continue
		walk(root, absDir, seen)
	}
	if (fs.existsSync(path.join(root, 'constants/copyright-meta.js'))) {
		seen.add('constants/copyright-meta.js')
	}
	return [...seen].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function walk(root, absDir, seen) {
	for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
		const abs = path.join(absDir, entry.name)
		if (entry.isDirectory()) {
			walk(root, abs, seen)
			continue
		}
		const rel = path.relative(root, abs).replace(/\\/g, '/')
		if (shouldIncludeRelPath(rel) || (rel.startsWith('scripts/') && /\.(js|mjs)$/i.test(rel))) {
			seen.add(rel)
		}
	}
}

const targets = collectAllHeaderTargets(rootDir)
let changed = 0
let skipped = 0
let synced = 0
const changedFiles = []

for (const relPath of targets) {
	const abs = path.join(rootDir, relPath)
	const original = fs.readFileSync(abs, 'utf8')
	const result = prependCopyrightHeader(relPath, original, meta)
	if (!result.changed) {
		skipped += 1
		continue
	}
	if (hasCopyrightHeader(original)) synced += 1
	else changed += 1
	changedFiles.push(relPath)
	if (writeMode) {
		fs.writeFileSync(abs, result.text, 'utf8')
	}
}

console.log(writeMode ? '【写入模式】' : '【预览模式】未修改磁盘，追加 --write 执行写入')
console.log(`著作权人：${meta.COPYRIGHT_HOLDER}`)
console.log(`目标文件：${targets.length}，新增头：${changed}，同步姓名：${synced}，无变化：${skipped}`)
if (changedFiles.length) {
	console.log('将写入/已写入版权头的文件：')
	for (const f of changedFiles) console.log(`  ${f}`)
}
if (!writeMode && changed > 0) {
	console.log('\n确认无误后执行：npm run copyright:apply')
}
