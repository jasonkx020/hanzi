/**
 * @file soft-copyright.mjs
 * @module scripts/lib
 * @description 软著源程序鉴别材料：文件筛选、排序、分页与版权头生成
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const LINES_PER_PAGE = 50
export const PAGE_COUNT_EACH_SIDE = 30
export const TOTAL_PAGES = PAGE_COUNT_EACH_SIDE * 2
export const LINES_EACH_SIDE = LINES_PER_PAGE * PAGE_COUNT_EACH_SIDE

/** 登记鉴别材料优先纳入的应用源程序目录（不含 scripts 数据生成工具） */
export const INCLUDE_DIRS = [
	'components',
	'config',
	'constants',
	'custom-tab-bar',
	'data',
	'mixins',
	'modules',
	'pages',
	'repositories',
	'services',
	'store',
	'utils'
]

export const INCLUDE_ROOT_FILES = ['App.vue', 'main.js']

/** 不纳入鉴别材料与不写版权头的路径片段 */
export const EXCLUDE_PATH_PARTS = [
	'node_modules',
	'unpackage',
	'dist',
	'static',
	'scripts',
	'tests'
]

export const EXCLUDE_FILES = new Set(['uni.promisify.adaptor.js'])

const DEFAULT_COPYRIGHT_META = {
	COPYRIGHT_HOLDER: '（著作权人全称）',
	COPYRIGHT_YEAR: '2026',
	SOFTWARE_NAME: '萌萌识字移动应用软件 V1.0'
}

export function loadCopyrightMeta(rootDir) {
	const metaPath = path.join(rootDir, 'constants/copyright-meta.js')
	if (!fs.existsSync(metaPath)) return { ...DEFAULT_COPYRIGHT_META }
	const text = fs.readFileSync(metaPath, 'utf8')
	const pick = (name) => {
		const m = text.match(new RegExp(`export const ${name} = '([^']*)'`))
		return m?.[1] ?? DEFAULT_COPYRIGHT_META[name]
	}
	return {
		COPYRIGHT_HOLDER: pick('COPYRIGHT_HOLDER'),
		COPYRIGHT_YEAR: pick('COPYRIGHT_YEAR'),
		SOFTWARE_NAME: pick('SOFTWARE_NAME')
	}
}

export function repoRootFromImportMeta(importMetaUrl) {
	let dir = path.dirname(fileURLToPath(importMetaUrl))
	while (dir !== path.dirname(dir)) {
		if (fs.existsSync(path.join(dir, 'manifest.json'))) return dir
		dir = path.dirname(dir)
	}
	throw new Error('无法定位项目根目录（未找到 manifest.json）')
}

export function shouldIncludeRelPath(relPath) {
	const normalized = relPath.replace(/\\/g, '/')
	if (EXCLUDE_FILES.has(normalized)) return false
	if (EXCLUDE_PATH_PARTS.some((part) => normalized.includes(`/${part}/`) || normalized.startsWith(`${part}/`))) {
		return false
	}
	return /\.(js|vue|mjs)$/i.test(normalized)
}

/** 软著鉴别材料拼接顺序：按 MM-5L 自顶向下，同层内字典序；入口文件置于末尾以便后 30 页覆盖 */
export const CONCAT_ORDER = [
	{ kind: 'dir', path: 'pages/' },
	{ kind: 'dir', path: 'components/' },
	{ kind: 'dir', path: 'modules/' },
	{ kind: 'dir', path: 'services/' },
	{ kind: 'dir', path: 'repositories/' },
	{ kind: 'dir', path: 'store/' },
	{ kind: 'dir', path: 'utils/' },
	{ kind: 'dir', path: 'config/' },
	{ kind: 'dir', path: 'constants/' },
	{ kind: 'dir', path: 'data/' },
	{ kind: 'dir', path: 'mixins/' },
	{ kind: 'dir', path: 'custom-tab-bar/' },
	{ kind: 'files', paths: ['main.js', 'App.vue'] }
]

export function sortFilesForConcat(files) {
	const ordered = []
	const remaining = new Set(files)

	for (const rule of CONCAT_ORDER) {
		if (rule.kind === 'files') {
			for (const name of rule.paths) {
				if (remaining.has(name)) {
					ordered.push(name)
					remaining.delete(name)
				}
			}
			continue
		}
		const inGroup = [...remaining]
			.filter((f) => f.startsWith(rule.path))
			.sort((a, b) => a.localeCompare(b, 'zh-CN'))
		for (const f of inGroup) {
			ordered.push(f)
			remaining.delete(f)
		}
	}

	const tail = [...remaining].sort((a, b) => a.localeCompare(b, 'zh-CN'))
	return [...ordered, ...tail]
}

export function collectSourceFiles(rootDir) {
	const files = []

	for (const name of INCLUDE_ROOT_FILES) {
		const abs = path.join(rootDir, name)
		if (fs.existsSync(abs)) files.push(normalizedRel(rootDir, abs))
	}

	for (const dir of INCLUDE_DIRS) {
		const absDir = path.join(rootDir, dir)
		if (!fs.existsSync(absDir)) continue
		walkDir(rootDir, absDir, files)
	}

	return sortFilesForConcat([...new Set(files)])
}

function walkDir(rootDir, absDir, files) {
	for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
		const abs = path.join(absDir, entry.name)
		if (entry.isDirectory()) {
			walkDir(rootDir, abs, files)
			continue
		}
		const rel = normalizedRel(rootDir, abs)
		if (shouldIncludeRelPath(rel)) files.push(rel)
	}
}

function normalizedRel(rootDir, absPath) {
	return path.relative(rootDir, absPath).replace(/\\/g, '/')
}

export function readFileLines(rootDir, relPath) {
	const text = fs.readFileSync(path.join(rootDir, relPath), 'utf8')
	return text.replace(/\r\n/g, '\n').split('\n')
}

export function buildConcatenatedStream(rootDir, files) {
	const chunks = []
	const fileSpans = []
	let lineNo = 1

	for (const relPath of files) {
		const lines = readFileLines(rootDir, relPath)
		const startLine = lineNo
		const separator = [`/* ===== ${relPath} ===== */`]
		for (const line of lines) {
			chunks.push({ relPath, text: line })
			lineNo += 1
		}
		for (const line of separator) {
			chunks.push({ relPath, text: line })
			lineNo += 1
		}
		const endLine = lineNo - 1
		fileSpans.push({ relPath, startLine, endLine, lineCount: lines.length })
	}

	return { chunks, fileSpans, totalLines: lineNo - 1 }
}

export function sliceByGlobalLines(chunks, startIndex, count) {
	return chunks.slice(startIndex, startIndex + count)
}

export function detectLayer(relPath) {
	if (
		relPath.startsWith('pages/') ||
		relPath.startsWith('components/') ||
		relPath.startsWith('custom-tab-bar/') ||
		relPath === 'App.vue'
	) {
		return 'L1 表现层'
	}
	if (relPath.startsWith('modules/')) return 'L2 应用层'
	if (relPath.startsWith('services/') || relPath.startsWith('data/')) return 'L3 领域层'
	if (relPath.startsWith('repositories/') || relPath.startsWith('store/')) return 'L4 数据层'
	return 'L5 基础设施'
}

export function detectModule(relPath) {
	const parts = relPath.replace(/\\/g, '/').split('/')
	if (parts.length <= 1) return path.basename(relPath, path.extname(relPath))
	if (parts[0] === 'modules' && parts.length >= 3) {
		return `${parts[0]}/${parts[1]}/${parts[2]}`
	}
	return parts[0]
}

export function descriptionFor(relPath) {
	const base = path.basename(relPath)
	if (relPath.startsWith('pages/')) return `路由页面源文件：${base}`
	if (relPath.startsWith('components/')) return `UI 组件源文件：${base}`
	if (relPath.startsWith('modules/')) return `业务用例源文件：${base}`
	if (relPath.startsWith('services/')) return `领域服务源文件：${base}`
	if (relPath.startsWith('repositories/')) return `数据仓储源文件：${base}`
	if (relPath.startsWith('store/')) return `状态存储源文件：${base}`
	if (relPath.startsWith('utils/')) return `基础设施工具：${base}`
	if (relPath.startsWith('constants/')) return `常量定义：${base}`
	if (relPath.startsWith('config/')) return `配置模块：${base}`
	if (relPath.startsWith('data/')) return `领域数据：${base}`
	if (relPath.startsWith('mixins/')) return `Vue mixin：${base}`
	if (relPath === 'main.js') return '应用入口 main.js'
	if (relPath === 'App.vue') return '应用根组件 App.vue'
	return `源文件：${base}`
}

export function jsCopyrightBlock(relPath, meta) {
	const fileName = path.basename(relPath)
	return [
		'/**',
		` * @file ${fileName}`,
		` * @module ${detectModule(relPath)}`,
		` * @description ${descriptionFor(relPath)}`,
		` * @software ${meta.SOFTWARE_NAME}`,
		` * @copyright Copyright (c) ${meta.COPYRIGHT_YEAR} ${meta.COPYRIGHT_HOLDER}. All Rights Reserved.`,
		' */',
		''
	]
}

export function vueCopyrightBlock(relPath, meta) {
	const fileName = path.basename(relPath)
	return [
		'<!--',
		`  @file ${fileName}`,
		`  @layer ${detectLayer(relPath)}`,
		`  @description ${descriptionFor(relPath)}`,
		`  @software ${meta.SOFTWARE_NAME}`,
		`  @copyright Copyright (c) ${meta.COPYRIGHT_YEAR} ${meta.COPYRIGHT_HOLDER}. All Rights Reserved.`,
		'-->',
		''
	]
}

export function hasCopyrightHeader(text) {
	return /@copyright\s+Copyright/i.test(text)
}

export function copyrightLinePattern(meta) {
	return `@copyright Copyright (c) ${meta.COPYRIGHT_YEAR} ${meta.COPYRIGHT_HOLDER}. All Rights Reserved.`
}

export function syncCopyrightHolder(text, meta) {
	if (!hasCopyrightHeader(text)) return { changed: false, text }
	const target = copyrightLinePattern(meta)
	if (text.includes(target)) return { changed: false, text }
	const next = text.replace(
		/@copyright Copyright \(c\) \d{4} .+?\. All Rights Reserved\./g,
		target
	)
	return { changed: next !== text, text: next }
}

export function prependCopyrightHeader(relPath, text, meta) {
	if (hasCopyrightHeader(text)) return syncCopyrightHolder(text, meta)

	const ext = path.extname(relPath).toLowerCase()
	let headerLines
	if (ext === '.vue') headerLines = vueCopyrightBlock(relPath, meta)
	else headerLines = jsCopyrightBlock(relPath, meta)

	const normalized = text.replace(/\r\n/g, '\n')
	const trimmed = normalized.replace(/^\uFEFF/, '')
	const next = `${headerLines.join('\n')}${trimmed}`
	return { changed: true, text: next }
}

export function formatPages(chunks, pageStart, pageEnd, softwareName) {
	const pages = []
	for (let page = pageStart; page <= pageEnd; page += 1) {
		const offset = (page - 1) * LINES_PER_PAGE
		const slice = chunks.slice(offset, offset + LINES_PER_PAGE)
		const body = slice.map((item) => item.text)
		while (body.length < LINES_PER_PAGE) body.push('')
		pages.push({
			page,
			header: `${softwareName} · 源程序鉴别材料 · 第 ${page} 页 / 共 ${TOTAL_PAGES} 页`,
			lines: body
		})
	}
	return pages
}

export function renderPagesText(pages) {
	const out = []
	for (const block of pages) {
		out.push(block.header)
		out.push('='.repeat(72))
		out.push(...block.lines)
		out.push('')
	}
	return out.join('\n')
}

export function summarizeFileCoverage(chunks, globalStart, globalEnd) {
	const hit = new Map()
	chunks.forEach((item, index) => {
		const lineNo = globalStart + index + 1
		if (lineNo > globalEnd) return
		const prev = hit.get(item.relPath) || { first: lineNo, last: lineNo, count: 0 }
		prev.first = Math.min(prev.first, lineNo)
		prev.last = Math.max(prev.last, lineNo)
		prev.count += 1
		hit.set(item.relPath, prev)
	})
	return [...hit.entries()]
		.map(([relPath, meta]) => ({ relPath, ...meta }))
		.sort((a, b) => a.first - b.first)
}
