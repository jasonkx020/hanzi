/**
 * @file cnchar-setup.js
 * @module utils
 * @description cnchar 延迟初始化：首次查字/描红/拼音展示时再加载插件
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import cnchar from 'cnchar'
import poly from 'cnchar-poly'
import order from 'cnchar-order'
import radical from 'cnchar-radical'
import words from 'cnchar-words'
import explain from 'cnchar-explain'
import trad from 'cnchar-trad'
import voice from 'cnchar-voice'

/** 当前编译目标下挂载到 cnchar.draw 的实现标识（便于排查） */
export let cncharDrawImplementation = ''

let coreInitialized = false
let drawMounted = false
let readyPromise = null

function initCncharCore() {
	if (coreInitialized) return cnchar
	cnchar.use(poly)
	cnchar.use(order)
	cnchar.use(radical)
	cnchar.use(words)
	cnchar.use(explain)
	cnchar.use(trad)
	cnchar.use(voice)
	coreInitialized = true
	return cnchar
}

async function mountDrawImplementation() {
	if (drawMounted) return cnchar
	initCncharCore()
	// #ifdef H5
	const mod = await import('cnchar-draw')
	cnchar.use(mod.default || mod)
	cncharDrawImplementation = 'cnchar-draw'
	// #endif
	// #ifndef H5
	const drawNative = (await import('./draw-native.js')).default
	cnchar.use(drawNative)
	cncharDrawImplementation = 'draw-native'
	// #endif
	drawMounted = true
	return cnchar
}

/**
 * 确保 cnchar 核心插件就绪（拼音/部首/笔画查询，不含 draw）
 * @returns {Promise<typeof cnchar>}
 */
export function ensureCncharReady() {
	if (coreInitialized) return Promise.resolve(cnchar)
	if (!readyPromise) {
		readyPromise = Promise.resolve().then(() => initCncharCore())
	}
	return readyPromise
}

/**
 * 描红/笔顺绘制前调用（含 draw 插件）
 * @returns {Promise<typeof cnchar>}
 */
export function ensureCncharDrawReady() {
	if (drawMounted) return Promise.resolve(cnchar)
	return mountDrawImplementation()
}

/** 同步：仅核心插件（spell/radical 等），不加载 draw */
export function ensureCncharReadySync() {
	return initCncharCore()
}

export { cnchar }
export default cnchar
