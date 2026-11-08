/**
 * @file score-radar-axes.js
 * @module utils
 * @description 由 strokeResults 汇总雷达轴（0～1），听写 / 写字共用
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */

/**
 * @param {Array<{ dirScore?: number, fitScore?: number, strokeScore?: number, pass?: boolean }>} strokeResults
 * @param {{ expectedCount?: number, actualCount?: number }} [meta]
 * @returns {Array<{ label: string, value: number }>}
 */
export function buildScoreRadarAxes(strokeResults, meta = {}) {
	const list = Array.isArray(strokeResults) ? strokeResults : []
	const exp = Math.max(0, Number(meta.expectedCount) || list.length || 0)
	const act = Math.max(0, Number(meta.actualCount) || list.length || 0)
	let order = 0
	if (exp > 0) {
		if (act === exp) order = 1
		else if (act < exp) order = act / exp
		else order = Math.max(0, 1 - (act - exp) / exp)
	}
	if (!list.length) {
		return [
			{ label: '笔顺', value: order },
			{ label: '方向', value: 0 },
			{ label: '贴合', value: 0 },
			{ label: '综合', value: 0 },
			{ label: '稳定', value: 0 }
		]
	}
	let dirSum = 0
	let fitSum = 0
	let allSum = 0
	let passN = 0
	for (const r of list) {
		dirSum += Number(r.dirScore) || 0
		fitSum += Number(r.fitScore) || 0
		allSum += Number(r.strokeScore) || 0
		if (r.pass) passN += 1
	}
	const n = list.length
	return [
		{ label: '笔顺', value: order },
		{ label: '方向', value: dirSum / n },
		{ label: '贴合', value: fitSum / n },
		{ label: '综合', value: allSum / n },
		{ label: '稳定', value: passN / n }
	]
}
