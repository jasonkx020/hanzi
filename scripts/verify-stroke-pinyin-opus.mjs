/**
 * 检查笔画映射所需带调音节是否均有 static/pinyin/*.opus
 * 运行：node scripts/verify-stroke-pinyin-opus.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { STROKE_REQUIRED_SYLLABLES, STROKE_LABEL_SYLLABLES } from '../data/stroke-name-pinyin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pinyinDir = path.join(__dirname, '../static/pinyin')

const missing = []
for (const s of STROKE_REQUIRED_SYLLABLES) {
	const f = path.join(pinyinDir, `${s}.opus`)
	if (!fs.existsSync(f)) missing.push(s)
}

console.log('笔画名数量:', Object.keys(STROKE_LABEL_SYLLABLES).length)
console.log('所需音节数:', STROKE_REQUIRED_SYLLABLES.length)
console.log('所需音节:', STROKE_REQUIRED_SYLLABLES.join(', '))
if (missing.length) {
	console.error('缺少 opus 文件:', missing.join(', '))
	process.exit(1)
}
console.log('全部音节 opus 已存在。')
