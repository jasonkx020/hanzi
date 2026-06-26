/**
 * @file gen-grade2-up-idioms.mjs
 * @module scripts
 * @description 源文件：gen-grade2-up-idioms.mjs
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 二年级上册附录词语表中的四字成语 → static/booktext/renjiaoban/二年级上册-成语表.json
 * （词语表全文多为两字、三字词；本文件仅收录典型四字成语，见 note）
 * 运行：node scripts/gen-grade2-up-idioms.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renjiaoTextbookJsonFile } from '../constants/renjiao-textbook-filenames.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

/** 来源：二年级上册「词语表」书页（阅读课次）；与识字写字表同册 */
const rawGroups = [
	['阅读', '3', [['四海为家', 'sì hǎi wéi jiā']]],
	['阅读', '10', [['五光十色', 'wǔ guāng shí sè']]],
	['阅读', '11', [['坐井观天', 'zuò jǐng guān tiān']]],
	['阅读', '13', [['自言自语', 'zì yán zì yǔ']]],
	['阅读', '14', [['星星之火', 'xīng xīng zhī huǒ']]],
	['阅读', '16', [['四面八方', 'sì miàn bā fāng']]]
]

const groups = rawGroups.map(([section, lesson, pairs]) => ({
	section,
	lesson,
	chars: pairs.map(([hanzi, pinyin]) => ({ hanzi, pinyin }))
}))

let total = 0
for (const g of groups) total += g.chars.length

const out = {
	textbook_version_id: '统编(人教版)',
	grade: 2,
	semester: '上',
	list_type: '成语表',
	note:
		'由二年级上册教材附录「词语表」中四字成语摘录（阅读第3、10、11、13、14、16课）。词语表脚注「共239个词」为全部词语计数，非成语条数；若印次增收成语请以纸书为准。',
	total,
	groups
}

const outPath = path.join(root, 'static', 'booktext', 'renjiaoban', renjiaoTextbookJsonFile(2, '上', 'idioms'))
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 4), 'utf8')
console.log('[gen] wrote', outPath, 'idioms', total)
