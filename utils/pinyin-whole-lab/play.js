/**
 * @file play.js
 * @module utils
 * @description 基础设施工具：play.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { playLocalPinyinNeutralThenTone1 } from '@/utils/play-pinyin-local-audio.js'

/** 乐园内播放整体认读（与拼音页一致：仅本地 opus，无调→一声替补，不 TTS） */
export async function playWholeLabSymbol(symbol, opts = {}) {
	const text = String(symbol || '').trim().toLowerCase()
	if (!text) return false
	return playLocalPinyinNeutralThenTone1(text, true, { isCancelled: opts.isCancelled })
}
