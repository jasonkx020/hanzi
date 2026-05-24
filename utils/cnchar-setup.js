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
