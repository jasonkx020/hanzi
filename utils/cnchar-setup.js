/**
 * cnchar 统一初始化入口：请在 main.js 首行引入本模块。
 *
 * - 共用扩展：拼音多音（poly）、笔顺序号（order）、部首结构（radical）、
 *   组词（words）、释义（explain）、简繁转换（trad）、语音合成（voice）。
 *
 * - 绘制实现：H5 使用 cnchar-draw；App / 小程序等使用 draw-native（uni canvas）。
 */
import cnchar from 'cnchar'
import poly from 'cnchar-poly'
import order from 'cnchar-order'
import radical from 'cnchar-radical'
import words from 'cnchar-words'
import explain from 'cnchar-explain'
import trad from 'cnchar-trad'
import voice from 'cnchar-voice'

cnchar.use(poly)
cnchar.use(order)
cnchar.use(radical)
cnchar.use(words)
cnchar.use(explain)
cnchar.use(trad)
cnchar.use(voice)

/**
 * 库内/课表拼音纠错（cnchar 3.2.6 及种子数据）
 * - 戌：错挂到 quxu → qūxu，应为 xū
 * - 们：库与课表常标轻声 men，教材单字默认 mén（二声）
 */
export const SPELL_CHAR_PATCHES = Object.freeze({
	戌: 'xū',
	们: 'mén'
})

/**
 * 从 dict.spell[key] 去掉某字的所有声调槽位；无剩余汉字则删键。
 * setSpell 只追加读音，不会清掉错误/旧索引，修补前需先摘掉。
 */
function removeCharFromSpellKey(pinyinKey, hanzi) {
	const spell = cnchar.dict && cnchar.dict.spell
	if (!spell || spell[pinyinKey] == null) return
	const cleaned = String(spell[pinyinKey]).replace(new RegExp(`${hanzi}\\d?`, 'g'), '')
	if (/[\u4e00-\u9fff]/.test(cleaned)) spell[pinyinKey] = cleaned
	else delete spell[pinyinKey]
}

function patchSpell(hanzi, reading, removeFromKeys = []) {
	for (const key of removeFromKeys) removeCharFromSpellKey(key, hanzi)
	cnchar.setSpell(hanzi, reading)
	if (typeof cnchar.setSpellDefault === 'function') {
		cnchar.setSpellDefault(hanzi, reading)
	}
}

/**
 * 展示用拼音纠错：课表/缓存若仍是轻声 men、qūxu 等，统一成带调正确读音。
 * @param {string} hanzi
 * @param {string} [pinyin]
 * @returns {string}
 */
export function applySpellCharPatch(hanzi, pinyin = '') {
	const h = String(hanzi || '')
		.trim()
		.charAt(0)
	const fix = SPELL_CHAR_PATCHES[h]
	if (fix) return fix
	return String(pinyin || '')
		.replace(/\s+/g, ' ')
		.trim()
}

try {
	patchSpell('戌', 'xū', ['quxu'])
	patchSpell('们', 'mén', ['men'])
} catch (_) {}

/** 当前编译目标下挂载到 cnchar.draw 的实现标识（便于排查） */
export let cncharDrawImplementation = ''

// #ifdef H5
import cncharDraw from 'cnchar-draw'

cnchar.use(cncharDraw)
cncharDrawImplementation = 'cnchar-draw'
// #endif

// #ifndef H5
import drawNative from './draw-native.js'
import { LOCAL_HANZI_WRITER_BASE } from './hanzi-writer-loader.js'

drawNative.setResourceBase(LOCAL_HANZI_WRITER_BASE)
cnchar.use(drawNative)
cncharDrawImplementation = 'draw-native'
// #endif

export { cnchar }
export default cnchar
