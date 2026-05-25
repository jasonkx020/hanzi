import { buildToneRows } from './tone-rows.js'

/** 与拼音页韵母 / 整体认读一致（P0 词典数据） */
const VOWEL_SYMBOLS = [
	'a',
	'o',
	'e',
	'i',
	'u',
	'ü',
	'ai',
	'ei',
	'ui',
	'ao',
	'ou',
	'iu',
	'ie',
	'üe',
	'er',
	'an',
	'en',
	'in',
	'un',
	'ün',
	'ang',
	'eng',
	'ing',
	'ong'
]

const WHOLE_SYMBOLS = [
	'zhi',
	'chi',
	'shi',
	'ri',
	'zi',
	'ci',
	'si',
	'yi',
	'wu',
	'yu',
	'ye',
	'yue',
	'yuan',
	'yin',
	'yun',
	'ying'
]

export function getToneChartBlocks(options = {}) {
	const includeWhole = !!options.includeWhole
	const blocks = [
		{
			key: 'final',
			title: '韵母',
			rows: buildToneRows(VOWEL_SYMBOLS, '韵母')
		}
	]
	if (includeWhole) {
		blocks.push({
			key: 'whole',
			title: '整体认读',
			rows: buildToneRows(WHOLE_SYMBOLS, '整体认读')
		})
	}
	return blocks
}
