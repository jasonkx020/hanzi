/**
 * @file generate-soft-copyright-list.mjs
 * @module scripts
 * @description 生成软著登记用前 30 页 + 后 30 页源程序清单与可打印鉴别材料
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 *
 * 运行：node scripts/generate-soft-copyright-list.mjs
 * 输出：docs/软著-源程序60页清单.md
 *       docs/软著-源程序鉴别材料-前30页.txt
 *       docs/软著-源程序鉴别材料-后30页.txt
 */
import fs from 'node:fs'
import path from 'node:path'
import {
	buildConcatenatedStream,
	collectSourceFiles,
	formatPages,
	LINES_EACH_SIDE,
	LINES_PER_PAGE,
	loadCopyrightMeta,
	PAGE_COUNT_EACH_SIDE,
	renderPagesText,
	repoRootFromImportMeta,
	summarizeFileCoverage,
	TOTAL_PAGES
} from './lib/soft-copyright.mjs'

const rootDir = repoRootFromImportMeta(import.meta.url)
const meta = loadCopyrightMeta(rootDir)
const { SOFTWARE_NAME } = meta
const files = collectSourceFiles(rootDir)
const { chunks, fileSpans, totalLines } = buildConcatenatedStream(rootDir, files)

if (totalLines < LINES_EACH_SIDE * 2) {
	console.warn(
		`警告：源程序合计 ${totalLines} 行，不足 ${LINES_EACH_SIDE * 2} 行；登记时应提交全部源程序而非仅前后各 30 页。`
	)
}

const frontChunks = chunks.slice(0, LINES_EACH_SIDE)
const backChunks = chunks.slice(Math.max(0, totalLines - LINES_EACH_SIDE))

const frontPages = formatPages(frontChunks, 1, PAGE_COUNT_EACH_SIDE, SOFTWARE_NAME)
const backPages = formatPages(
	backChunks,
	PAGE_COUNT_EACH_SIDE + 1,
	TOTAL_PAGES,
	SOFTWARE_NAME
)

const frontCoverage = summarizeFileCoverage(frontChunks, 0, LINES_EACH_SIDE)
const backCoverage = summarizeFileCoverage(backChunks, totalLines - LINES_EACH_SIDE + 1, totalLines)

const frontFileSet = new Set(frontCoverage.map((item) => item.relPath))
const backFileSet = new Set(backCoverage.map((item) => item.relPath))
const onlyFront = [...frontFileSet].filter((p) => !backFileSet.has(p))
const onlyBack = [...backFileSet].filter((p) => !frontFileSet.has(p))
const both = [...frontFileSet].filter((p) => backFileSet.has(p))

const docsDir = path.join(rootDir, 'docs')
fs.mkdirSync(docsDir, { recursive: true })

fs.writeFileSync(
	path.join(docsDir, '软著-源程序鉴别材料-前30页.txt'),
	renderPagesText(frontPages),
	'utf8'
)
fs.writeFileSync(
	path.join(docsDir, '软著-源程序鉴别材料-后30页.txt'),
	renderPagesText(backPages),
	'utf8'
)

const md = `# 萌萌识字 · 软件著作权源程序鉴别材料清单

> 自动生成：\`node scripts/generate-soft-copyright-list.mjs\`  
> 软件名称：${SOFTWARE_NAME}  
> 登记口径：源程序前、后各连续 **${PAGE_COUNT_EACH_SIDE}** 页，共 **${TOTAL_PAGES}** 页；每页 **${LINES_PER_PAGE}** 行（不含页眉分隔行）。

---

## 1. 纳入范围的源程序

以下 **${files.length}** 个文件按 **MM-5L 分层顺序**（pages → components → modules → services → repositories → store → utils → config/constants/data → main.js/App.vue）拼接为连续源程序流（**不含** \`scripts/\` 数据生成工具、\`tests/\`、\`static/\` 资源与 \`uni.promisify.adaptor.js\`）：

| 序号 | 相对路径 | 行数 | 全局行号区间 |
|------|----------|------|--------------|
${fileSpans
	.map(
		(item, index) =>
			`| ${index + 1} | \`${item.relPath}\` | ${item.lineCount} | ${item.startLine}–${item.endLine} |`
	)
	.join('\n')}

**拼接后总行数**：${totalLines} 行（含文件分隔注释行 \`/* ===== path ===== */\`）

---

## 2. 前 30 页（第 1–${PAGE_COUNT_EACH_SIDE} 页）覆盖文件

对应输出文件：[\`软著-源程序鉴别材料-前30页.txt\`](./软著-源程序鉴别材料-前30页.txt)

| 文件 | 本段出现行数 | 全局行号（约） |
|------|-------------|----------------|
${frontCoverage.map((item) => `| \`${item.relPath}\` | ${item.count} | ${item.first}–${item.last} |`).join('\n')}

---

## 3. 后 30 页（第 ${PAGE_COUNT_EACH_SIDE + 1}–${TOTAL_PAGES} 页）覆盖文件

对应输出文件：[\`软著-源程序鉴别材料-后30页.txt\`](./软著-源程序鉴别材料-后30页.txt)

| 文件 | 本段出现行数 | 全局行号（约） |
|------|-------------|----------------|
${backCoverage.map((item) => `| \`${item.relPath}\` | ${item.count} | ${item.first}–${item.last} |`).join('\n')}

---

## 4. 文件分布摘要

| 类别 | 数量 | 说明 |
|------|------|------|
| 仅出现在前 30 页 | ${onlyFront.length} | 分层序靠前（主要为 pages/components） |
| 前后均出现 | ${both.length} | 体量较大、跨前后边界的文件 |
| 仅出现在后 30 页 | ${onlyBack.length} | 分层序靠后（utils 尾部与入口文件） |

### 4.1 仅前 30 页

${onlyFront.length ? onlyFront.map((p) => `- \`${p}\``).join('\n') : '（无）'}

### 4.2 仅后 30 页

${onlyBack.length ? onlyBack.map((p) => `- \`${p}\``).join('\n') : '（无）'}

---

## 5. 打印与提交建议

1. **字体**：Courier New / Consolas 等等宽小四号（约 12pt）。
2. **页眉**：每页已含「${SOFTWARE_NAME} · 源程序鉴别材料 · 第 N 页 / 共 ${TOTAL_PAGES} 页」；打印时保留。
3. **顺序**：先打印 \`软著-源程序鉴别材料-前30页.txt\`（第 1–${PAGE_COUNT_EACH_SIDE} 页），再打印 \`软著-源程序鉴别材料-后30页.txt\`（第 ${PAGE_COUNT_EACH_SIDE + 1}–${TOTAL_PAGES} 页），合并为一份 PDF。
4. **登记前**：在 \`constants/copyright-meta.js\` 填写 \`COPYRIGHT_HOLDER\`，运行 \`npm run copyright:apply\` 更新源文件头后，**重新运行** \`npm run copyright:list\` 生成最新鉴别材料。
5. **第三方说明**：鉴别材料已排除 \`node_modules\`；程序运行时依赖 cnchar(MIT)、UniApp 等，建议在申请表附件中另附《第三方组件说明》。

---

## 6. 完整文件清单（MM-5L 拼接序）

${files.map((f, i) => `${i + 1}. \`${f}\``).join('\n')}
`

fs.writeFileSync(path.join(docsDir, '软著-源程序60页清单.md'), md, 'utf8')

console.log(`已纳入 ${files.length} 个源文件，合计 ${totalLines} 行`)
console.log(`前 30 页覆盖 ${frontCoverage.length} 个文件，后 30 页覆盖 ${backCoverage.length} 个文件`)
console.log('已写入：')
console.log('  docs/软著-源程序60页清单.md')
console.log('  docs/软著-源程序鉴别材料-前30页.txt')
console.log('  docs/软著-源程序鉴别材料-后30页.txt')
