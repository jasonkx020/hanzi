/**
 * @file play.js
 * @module utils
 * @description 基础设施工具：play.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { playLocalPinyinNeutralThenTone1 } from '@/utils/play-pinyin-local-audio.js'

/**
 * 乐园 / 拼音页「整体认读」播放。
 * static/pinyin 仅有一声带调文件（如 zhī.opus），无 zhi.opus；
 * 跳过无调试听，避免先 404/超时卡住再回退。
 */
export async function playWholeLabSymbol(symbol, opts = {}) {
	const text = String(symbol || '').trim().toLowerCase()
	if (!text) return false
	return playLocalPinyinNeutralThenTone1(text, true, {
		isCancelled: opts.isCancelled,
		skipTonedExact: true
	})
}
