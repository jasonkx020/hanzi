/**
 * 拼音闯关：播放、本地统计
 */
import { getAudioNarrator } from '@/utils/audio-settings.js'
import { playLocalPinyinNeutralThenTone1 } from '@/utils/play-pinyin-local-audio.js'
import { speakBlendedPinyinSyllable } from '@/utils/hanzi-pinyin-blend-speak.js'
import {
	runPinyinPlaySession,
	cancelPinyinPlay
} from '@/utils/pinyin-play-session.js'
import { isPinyinBlendTrainingEnabled } from '@/config/feature-flags.js'
import { starsForDrillScore } from '@/data/pinyin-drill-pools.js'
import { recordPinyinPractice } from '@/utils/achievement-stats-storage.js'

const STORAGE_STATS = 'pinyin_drill_stats_v1'

function defaultStats() {
	return {
		totalPlays: 0,
		totalStars: 0,
		byCategory: {}
	}
}

export function loadDrillStats() {
	try {
		const raw = uni.getStorageSync(STORAGE_STATS)
		if (!raw) return defaultStats()
		const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
		return {
			...defaultStats(),
			...parsed,
			byCategory: { ...defaultStats().byCategory, ...(parsed.byCategory || {}) }
		}
	} catch (_) {
		return defaultStats()
	}
}

/**
 * @param {string} categoryKey
 * @param {number} correct
 * @param {number} total
 */
export function recordDrillRound(categoryKey, correct, total) {
	const stats = loadDrillStats()
	const key = String(categoryKey || 'mix')
	const stars = starsForDrillScore(correct, total)
	const prev = stats.byCategory[key] || { plays: 0, bestStars: 0, lastCorrect: 0, lastTotal: 0 }
	stats.totalPlays += 1
	stats.totalStars += stars
	stats.byCategory[key] = {
		plays: prev.plays + 1,
		bestStars: Math.max(prev.bestStars || 0, stars),
		lastCorrect: correct,
		lastTotal: total,
		lastStars: stars
	}
	try {
		uni.setStorageSync(STORAGE_STATS, JSON.stringify(stats))
	} catch (_) {}
	recordPinyinPractice()
	return { stars, stats }
}

export function getCategoryBestStars(categoryKey) {
	const stats = loadDrillStats()
	return (stats.byCategory[String(categoryKey)] || {}).bestStars || 0
}

/**
 * @param {string} symbol
 * @param {{ blend?: boolean }} opts
 */
export async function playDrillSymbol(symbol, opts = {}) {
	const text = String(symbol || '').trim()
	if (!text) return false
	return runPinyinPlaySession(async ({ isCancelled }) => {
		if (isCancelled()) return false
		const narrator = getAudioNarrator()
		if (opts.blend && isPinyinBlendTrainingEnabled()) {
			return speakBlendedPinyinSyllable(text, {
				narrator,
				useTone1Fb: true,
				blend: true,
				showFailToast: false,
				isCancelled
			})
		}
		return playLocalPinyinNeutralThenTone1(text, true, { isCancelled })
	})
}

export function stopDrillAudio() {
	cancelPinyinPlay()
}
