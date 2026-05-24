import {
	loadHanziWriterCharData,
	setHanziWriterDataBase,
	LOCAL_HANZI_WRITER_BASE
} from './hanzi-writer-loader.js'
import { isAppPlus } from './uni-platform.js'

const TYPE = {
	NORMAL: 'normal',
	ANIMATION: 'animation',
	STROKE: 'stroke',
	TEST: 'test'
}

const TEST_STATUS = {
	CORRECT: 'correct',
	MISTAKE: 'mistake',
	COMPLETE: 'complete'
}

const DRAW_OPTION_DEFAULT = {
	showOutline: true,
	showCharacter: true,
	currentColor: '#b44',
	clear: true,
	length: 60,
	padding: 5,
	outlineColor: '#ddd',
	backgroundColor: '#fff',
	strokeColor: '#555',
	radicalColor: null,
	strokeFadeDuration: 400,
	lineStraight: true,
	lineCross: true,
	lineWidth: 1,
	lineColor: '#ddd',
	lineDash: true,
	border: true,
	borderWidth: 1,
	borderColor: '#ccc',
	borderDash: false,
	strokeAnimationSpeed: 1,
	delayBetweenStrokes: 1000,
	delayBetweenLoops: 200,
	autoAnimate: true,
	animateComplete: () => {},
	stepByStep: true,
	loopAnimate: false,
	strokeHighlightSpeed: 20,
	highlightColor: '#aaf',
	drawingColor: '#333',
	drawingWidth: 4,
	showHintAfterMisses: 3,
	highlightOnComplete: true,
	highlightCompleteColor: null,
	onTestStatus: null,
	// 测验：松手时只评 testState.activeStroke 对应的一笔
	testStrictOrder: true,
	/** 标准笔画容差半径（px），距离阈值由此推导 */
	testFitRadius: 30,
	/** 用户点到标准笔画的最小距离均值上限（默认 fitRadius×0.72） */
	testMeanDistMax: null,
	/** 距离方差上限（默认 (fitRadius×0.85)²，方差小=贴合稳定） */
	testDistVarianceMax: null,
	/** 落在容差带内的采样点比例下限 */
	testInBandMin: 0.52,
	/** 轨迹长度 / 标准中线长度 */
	testLengthMinRatio: 0.28,
	testLengthMaxRatio: 1.55,
	/** 起笔、收笔到标准中线端点的最大距离（默认 fitRadius×1.35） */
	testEndpointMaxDist: 15,
	/** 起笔→收笔方向与标准夹角余弦下限（0.707≈45°，小于则判为横穿/方向不对） */
	testDirectionMinCos: 0.9,
	/** 动画读音顿笔：中线拐点夹角阈值（仅动画，不参与测验） */
	testCornerAngleCos: 0.62,
	/** 为 true 时在控制台输出逐点距离与未通过原因 */
	testDebugLog: false,
	onWriterReady: null,
	// 字形相对外框的内缩比例（基于可绘区域），略大则字离田字格线更远
	charInsetRatio: 0.0
}

function normalizeText(text = '') {
	const chars = String(text).match(/[\u4e00-\u9fa5]/g)
	return chars ? chars.join('') : ''
}

/** 测验阈值：null/undefined/≤0 时用 fallback（避免 Number(null)===0 误判） */
function resolvePositiveTestOption(value, fallback) {
	if (value == null || value === '') return fallback
	const n = Number(value)
	return Number.isFinite(n) && n > 0 ? n : fallback
}

function parseCanvasId(el) {
	if (typeof el !== 'string') return 'cnchar-draw-native'
	return el.replace(/^#/, '') || 'cnchar-draw-native'
}

const SVG_PATH_CACHE = Object.create(null)
const WORD_NOT_FOUND_CALLBACKS = []

function mergeOption(type, input = {}) {
	const style = input.style || {}
	const line = input.line || {}
	const animation = input.animation || {}
	const stroke = input.stroke || {}
	const test = input.test || {}
	const flattened = {
		...DRAW_OPTION_DEFAULT,
		...style,
		...line,
		...animation,
		...stroke,
		...test
	}
	if (type === TYPE.ANIMATION && !(input.animation && Object.prototype.hasOwnProperty.call(input.animation, 'showCharacter'))) {
		flattened.showCharacter = false
	}
	if (type === TYPE.STROKE) {
		flattened.showCharacter = false
	}
	flattened.width = flattened.length
	flattened.height = flattened.length
	flattened.clear = typeof input.clear === 'boolean' ? input.clear : flattened.clear
	return flattened
}

function triggerWordNotFound(word) {
	WORD_NOT_FOUND_CALLBACKS.forEach((cb) => {
		try { cb(word) } catch (e) { console.warn(e) }
	})
}

function requestJSON(url) {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method: 'GET',
			success(res) {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data)
					return
				}
				reject(new Error(`request failed: ${res.statusCode}`))
			},
			fail(err) {
				reject(err)
			}
		})
	})
}

async function loadCharData(char) {
	return loadHanziWriterCharData(char, requestJSON)
}

function isFinitePoint(p) {
	return p && Number.isFinite(p.x) && Number.isFinite(p.y)
}

function isValidPolyline(points) {
	return Array.isArray(points) && points.length >= 2 && points.every(isFinitePoint)
}

/** 点到线段最短距离 */
function distPointToSegment(p, a, b) {
	const dx = b.x - a.x
	const dy = b.y - a.y
	const len2 = dx * dx + dy * dy
	if (len2 < 1e-6) return Math.hypot(p.x - a.x, p.y - a.y)
	let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
	t = Math.max(0, Math.min(1, t))
	return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** 点到折线最短距离 */
function minDistToPolyline(p, polyline) {
	if (!isFinitePoint(p) || !isValidPolyline(polyline)) return Number.POSITIVE_INFINITY
	let min = Number.POSITIVE_INFINITY
	for (let i = 0; i < polyline.length - 1; i++) {
		min = Math.min(min, distPointToSegment(p, polyline[i], polyline[i + 1]))
	}
	return min
}

function polylineLength(polyline) {
	if (!isValidPolyline(polyline)) return 0
	let len = 0
	for (let i = 0; i < polyline.length - 1; i++) {
		len += Math.hypot(polyline[i + 1].x - polyline[i].x, polyline[i + 1].y - polyline[i].y)
	}
	return len
}

function interpLine(p0, p1, stepPx) {
	const dx = p1.x - p0.x
	const dy = p1.y - p0.y
	const dist = Math.hypot(dx, dy)
	if (dist < 1e-3) return [p0]
	const n = Math.max(1, Math.ceil(dist / stepPx))
	const out = []
	for (let i = 0; i <= n; i++) {
		const t = i / n
		out.push({ x: p0.x + dx * t, y: p0.y + dy * t })
	}
	return out
}

function sampleQuadratic(p0, p1, p2, stepPx) {
	const chord = Math.hypot(p2.x - p0.x, p2.y - p0.y)
	const n = Math.max(2, Math.ceil(chord / stepPx))
	const out = []
	for (let i = 0; i <= n; i++) {
		const t = i / n
		const mt = 1 - t
		out.push({
			x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
			y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
		})
	}
	return out
}

function sampleCubic(p0, p1, p2, p3, stepPx) {
	const chord = Math.hypot(p3.x - p0.x, p3.y - p0.y)
	const n = Math.max(3, Math.ceil(chord / stepPx))
	const out = []
	for (let i = 0; i <= n; i++) {
		const t = i / n
		const mt = 1 - t
		out.push({
			x:
				mt * mt * mt * p0.x +
				3 * mt * mt * t * p1.x +
				3 * mt * t * t * p2.x +
				t * t * t * p3.x,
			y:
				mt * mt * mt * p0.y +
				3 * mt * mt * t * p1.y +
				3 * mt * t * t * p2.y +
				t * t * t * p3.y
		})
	}
	return out
}

/** 将 SVG 笔画轮廓采样为 canvas 折线（与绘制用的 mapPoint 一致） */
function sampleSvgCommandsToPolyline(cmds, mapXY, stepPx = 7) {
	if (!cmds?.length || typeof mapXY !== 'function') return []
	const out = []
	let x = 0
	let y = 0
	const push = (p) => {
		if (isFinitePoint(p)) out.push(p)
	}
	for (let i = 0; i < cmds.length; i++) {
		const c = cmds[i]
		if (c.type === 'M') {
			x = c.x
			y = c.y
			push(mapXY(x, y))
		} else if (c.type === 'L') {
			const p0 = mapXY(x, y)
			const p1 = mapXY(c.x, c.y)
			interpLine(p0, p1, stepPx).forEach(push)
			x = c.x
			y = c.y
		} else if (c.type === 'Q') {
			const p0 = mapXY(x, y)
			const p1 = mapXY(c.x1, c.y1)
			const p2 = mapXY(c.x, c.y)
			sampleQuadratic(p0, p1, p2, stepPx).forEach(push)
			x = c.x
			y = c.y
		} else if (c.type === 'C') {
			const p0 = mapXY(x, y)
			const p1 = mapXY(c.x1, c.y1)
			const p2 = mapXY(c.x2, c.y2)
			const p3 = mapXY(c.x, c.y)
			sampleCubic(p0, p1, p2, p3, stepPx).forEach(push)
			x = c.x
			y = c.y
		}
	}
	return out
}

/** 点集中有多少比例落在折线容差带内 */
function fractionPointsNearPolyline(points, polyline, radius) {
	if (!points?.length || !isValidPolyline(polyline) || !Number.isFinite(radius)) return 0
	let hit = 0
	for (let i = 0; i < points.length; i++) {
		if (minDistToPolyline(points[i], polyline) <= radius) hit++
	}
	return hit / points.length
}

function minAvgDistToPolylines(samples, polylines) {
	if (!samples?.length || !polylines?.length) return Number.POSITIVE_INFINITY
	let sum = 0
	for (let i = 0; i < samples.length; i++) {
		let best = Number.POSITIVE_INFINITY
		for (let j = 0; j < polylines.length; j++) {
			best = Math.min(best, minDistToPolyline(samples[i], polylines[j]))
		}
		sum += best
	}
	return sum / samples.length
}

/**
 * 用户笔迹到标准笔画（轮廓+中线）的距离统计：均值、方差、容差内占比
 * @returns {{ mean, variance, max, inBand, count, points: Array<{ i, x, y, dist, inBand, devFromMean }> }}
 */
function computeStrokeDistanceStats(userSamples, refPolylines, fitRadius) {
	const empty = {
		mean: Number.POSITIVE_INFINITY,
		variance: Number.POSITIVE_INFINITY,
		max: Number.POSITIVE_INFINITY,
		inBand: 0,
		count: 0,
		points: []
	}
	if (!userSamples?.length || !refPolylines?.length) return empty

	const band = Number.isFinite(fitRadius) ? fitRadius : 24
	const points = []
	for (let i = 0; i < userSamples.length; i++) {
		const p = userSamples[i]
		let minD = Number.POSITIVE_INFINITY
		for (let j = 0; j < refPolylines.length; j++) {
			const line = refPolylines[j]
			if (!isValidPolyline(line)) continue
			minD = Math.min(minD, minDistToPolyline(p, line))
		}
		if (!Number.isFinite(minD)) continue
		points.push({
			i,
			x: p.x,
			y: p.y,
			dist: minD,
			inBand: minD <= band,
			devFromMean: 0
		})
	}
	const count = points.length
	if (!count) return empty

	let mean = 0
	for (let k = 0; k < count; k++) mean += points[k].dist
	mean /= count
	let variance = 0
	let max = points[0].dist
	let inBandN = 0
	for (let k = 0; k < count; k++) {
		const d = points[k].dist
		const dev = d - mean
		points[k].devFromMean = dev
		variance += dev * dev
		if (d > max) max = d
		if (points[k].inBand) inBandN++
	}
	variance /= count

	return {
		mean,
		variance,
		max,
		inBand: inBandN / count,
		count,
		points
	}
}

/** 点投影到折线，返回弧长参数 t∈[0,1] 及最短距离 */
function projectPointOntoPolyline(p, polyline) {
	if (!isFinitePoint(p) || !isValidPolyline(polyline)) {
		return { t: 0, dist: Number.POSITIVE_INFINITY }
	}
	const totalLen = polylineLength(polyline)
	if (totalLen < 1e-3) {
		return { t: 0, dist: Math.hypot(p.x - polyline[0].x, p.y - polyline[0].y) }
	}
	let bestDist = Number.POSITIVE_INFINITY
	let bestT = 0
	let acc = 0
	for (let i = 0; i < polyline.length - 1; i++) {
		const a = polyline[i]
		const b = polyline[i + 1]
		const dx = b.x - a.x
		const dy = b.y - a.y
		const segLen2 = dx * dx + dy * dy
		let localT = 0
		if (segLen2 > 1e-6) {
			localT = ((p.x - a.x) * dx + (p.y - a.y) * dy) / segLen2
			localT = Math.max(0, Math.min(1, localT))
		}
		const px = a.x + dx * localT
		const py = a.y + dy * localT
		const dist = Math.hypot(p.x - px, p.y - py)
		const tGlobal = (acc + localT * Math.sqrt(segLen2)) / totalLen
		if (dist < bestDist) {
			bestDist = dist
			bestT = tGlobal
		}
		acc += Math.sqrt(segLen2)
	}
	return { t: Math.max(0, Math.min(1, bestT)), dist: bestDist }
}

/**
 * 笔顺方向：整体矢量夹角 + 沿中线参数是否单调向前 + 起收笔位置
 */
function computeStrokeDirectionMetrics(userSamples, median) {
	if (!isValidPolyline(median) || !userSamples?.length || userSamples.length < 2) {
		return {
			cos: -1,
			progress: 0,
			startDist: Number.POSITIVE_INFINITY,
			endDist: Number.POSITIVE_INFINITY,
			spanT: 0
		}
	}
	const mStart = median[0]
	const mEnd = median[median.length - 1]
	const uStart = userSamples[0]
	const uEnd = userSamples[userSamples.length - 1]
	const ux = uEnd.x - uStart.x
	const uy = uEnd.y - uStart.y
	const tx = mEnd.x - mStart.x
	const ty = mEnd.y - mStart.y
	const uLen = Math.hypot(ux, uy) || 1
	const tLen = Math.hypot(tx, ty) || 1
	const cos = (ux / uLen) * (tx / tLen) + (uy / uLen) * (ty / tLen)

	const ts = userSamples.map((p) => projectPointOntoPolyline(p, median).t)
	let forward = 0
	let backward = 0
	for (let i = 1; i < ts.length; i++) {
		const d = ts[i] - ts[i - 1]
		if (d > 0.025) forward++
		else if (d < -0.025) backward++
	}
	const progress = forward / Math.max(1, forward + backward)
	const spanT = Math.max(0, Math.max(...ts) - Math.min(...ts))
	const startDist = Math.hypot(uStart.x - mStart.x, uStart.y - mStart.y)
	const endDist = Math.hypot(uEnd.x - mEnd.x, uEnd.y - mEnd.y)

	return {
		cos,
		progress,
		startDist,
		endDist,
		spanT
	}
}

/** 起笔、收笔端点与标准中线两端点的直线距离（单独判定，避免横穿仅中段重合） */
function computeStrokeEndpointMetrics(userPath, median) {
	if (!userPath?.length || !isValidPolyline(median)) {
		return {
			startDist: Number.POSITIVE_INFINITY,
			endDist: Number.POSITIVE_INFINITY,
			startDistToWrongEnd: Number.POSITIVE_INFINITY,
			endDistToWrongEnd: Number.POSITIVE_INFINITY
		}
	}
	const mStart = median[0]
	const mEnd = median[median.length - 1]
	const uStart = userPath[0]
	const uEnd = userPath[userPath.length - 1]
	return {
		startDist: Math.hypot(uStart.x - mStart.x, uStart.y - mStart.y),
		endDist: Math.hypot(uEnd.x - mEnd.x, uEnd.y - mEnd.y),
		startDistToWrongEnd: Math.hypot(uStart.x - mEnd.x, uStart.y - mEnd.y),
		endDistToWrongEnd: Math.hypot(uEnd.x - mStart.x, uEnd.y - mStart.y)
	}
}

/**
 * 从中线提取拐点（与动画顿笔判定一致：相邻段夹角突变）
 * @returns {{ corners: Array<{ point: {x,y}, t: number, index: number }>, totalLen: number }}
 */
function extractMedianCorners(median, angleCosThreshold = 0.62) {
	if (!isValidPolyline(median)) {
		return { corners: [], totalLen: 0 }
	}
	const totalLen = polylineLength(median)
	if (median.length < 3 || totalLen < 1e-3) {
		return { corners: [], totalLen: Math.max(1, totalLen) }
	}
	const cumulative = [0]
	for (let i = 0; i < median.length - 1; i++) {
		cumulative.push(
			cumulative[cumulative.length - 1] +
				Math.hypot(median[i + 1].x - median[i].x, median[i + 1].y - median[i].y)
		)
	}
	const normalize = (x, y) => {
		const len = Math.hypot(x, y) || 1
		return { x: x / len, y: y / len }
	}
	const angleCos = (a, b) => a.x * b.x + a.y * b.y
	const corners = []
	for (let i = 1; i < median.length - 1; i++) {
		const p0 = median[i - 1]
		const p1 = median[i]
		const p2 = median[i + 1]
		const vA = normalize(p1.x - p0.x, p1.y - p0.y)
		const vB = normalize(p2.x - p1.x, p2.y - p1.y)
		if (angleCos(vA, vB) < angleCosThreshold) {
			corners.push({
				point: { x: p1.x, y: p1.y },
				t: cumulative[i] / totalLen,
				index: i
			})
		}
	}
	return { corners, totalLen }
}

/** 合并弧长上过近的重复拐点 */
function mergeCloseCorners(corners, minTGap = 0.07) {
	if (!corners?.length) return []
	const sorted = corners.slice().sort((a, b) => a.t - b.t)
	const out = [sorted[0]]
	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i].t - out[out.length - 1].t >= minTGap) {
			out.push(sorted[i])
		}
	}
	return out
}

/**
 * 连笔/多折笔：拐点须被经过，且各分段（横→折→弯→钩）按顺序有轨迹覆盖
 */
function evaluateCornerCoverage(userSamples, median, corners, fitRadius, options = {}) {
	if (!corners?.length) {
		return {
			required: false,
			pass: true,
			hitRatio: 1,
			segmentRatio: 1,
			orderPass: true,
			hitCount: 0,
			cornerCount: 0
		}
	}
	if (!userSamples?.length || !isValidPolyline(median)) {
		return {
			required: true,
			pass: false,
			hitRatio: 0,
			segmentRatio: 0,
			orderPass: false,
			hitCount: 0,
			cornerCount: corners.length
		}
	}

	const cornerRadius = fitRadius * (Number(options.cornerRadiusScale) || 1.4)
	const minHitRatio = Number(options.minHitRatio ?? 0.8)
	const minSegmentRatio = Number(options.minSegmentCoverage ?? 0.85)
	const tSlack = Number(options.tSlack ?? 0.04)

	let hitCount = 0
	const cornerHitT = []
	for (let c = 0; c < corners.length; c++) {
		const corner = corners[c]
		let bestDist = Number.POSITIVE_INFINITY
		let hitT = null
		for (let i = 0; i < userSamples.length; i++) {
			const u = userSamples[i]
			const d = Math.hypot(u.x - corner.point.x, u.y - corner.point.y)
			if (d < bestDist) {
				bestDist = d
				if (d <= cornerRadius) {
					hitT = projectPointOntoPolyline(u, median).t
				}
			}
		}
		if (bestDist <= cornerRadius) {
			hitCount++
			cornerHitT.push({ t: hitT != null ? hitT : corner.t, cornerT: corner.t })
		}
	}
	const hitRatio = hitCount / corners.length

	const userTs = userSamples.map((p) => projectPointOntoPolyline(p, median).t)
	const breaks = [0, ...corners.map((c) => c.t), 1]
	let segmentsOk = 0
	for (let s = 0; s < breaks.length - 1; s++) {
		const t0 = Math.max(0, breaks[s] - tSlack)
		const t1 = Math.min(1, breaks[s + 1] + tSlack)
		const covered = userTs.some((t) => t >= t0 && t <= t1)
		if (covered) segmentsOk++
	}
	const segmentRatio = segmentsOk / Math.max(1, breaks.length - 1)

	let orderPass = true
	let lastT = -1
	for (let i = 0; i < cornerHitT.length; i++) {
		const ht = cornerHitT[i].t
		if (ht < lastT - tSlack * 2) {
			orderPass = false
			break
		}
		lastT = Math.max(lastT, ht)
	}

	const pass = hitRatio >= minHitRatio && segmentRatio >= minSegmentRatio && orderPass

	return {
		required: true,
		pass,
		hitRatio,
		segmentRatio,
		orderPass,
		hitCount,
		cornerCount: corners.length
	}
}

function tokenizePath(path) {
	const tokens = []
	const reg = /([a-zA-Z])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/g
	let m = reg.exec(path)
	while (m) {
		tokens.push(m[1] || m[2])
		m = reg.exec(path)
	}
	return tokens
}

function parseSvgPath(path) {
	if (SVG_PATH_CACHE[path]) return SVG_PATH_CACHE[path]
	const tokens = tokenizePath(path)
	const commands = []
	let i = 0
	let cmd = ''
	let x = 0
	let y = 0
	let startX = 0
	let startY = 0

	const isCmd = (t) => /^[a-zA-Z]$/.test(t)
	const num = () => Number(tokens[i++])

	while (i < tokens.length) {
		if (isCmd(tokens[i])) cmd = tokens[i++]
		if (!cmd) break

		switch (cmd) {
			case 'M':
			case 'm': {
				const rel = cmd === 'm'
				x = rel ? x + num() : num()
				y = rel ? y + num() : num()
				commands.push({ type: 'M', x, y })
				startX = x
				startY = y
				while (i < tokens.length && !isCmd(tokens[i])) {
					x = rel ? x + num() : num()
					y = rel ? y + num() : num()
					commands.push({ type: 'L', x, y })
				}
				break
			}
			case 'L':
			case 'l': {
				const rel = cmd === 'l'
				while (i < tokens.length && !isCmd(tokens[i])) {
					x = rel ? x + num() : num()
					y = rel ? y + num() : num()
					commands.push({ type: 'L', x, y })
				}
				break
			}
			case 'H':
			case 'h': {
				const rel = cmd === 'h'
				while (i < tokens.length && !isCmd(tokens[i])) {
					x = rel ? x + num() : num()
					commands.push({ type: 'L', x, y })
				}
				break
			}
			case 'V':
			case 'v': {
				const rel = cmd === 'v'
				while (i < tokens.length && !isCmd(tokens[i])) {
					y = rel ? y + num() : num()
					commands.push({ type: 'L', x, y })
				}
				break
			}
			case 'C':
			case 'c': {
				const rel = cmd === 'c'
				while (i < tokens.length && !isCmd(tokens[i])) {
					const x1 = rel ? x + num() : num()
					const y1 = rel ? y + num() : num()
					const x2 = rel ? x + num() : num()
					const y2 = rel ? y + num() : num()
					const x3 = rel ? x + num() : num()
					const y3 = rel ? y + num() : num()
					commands.push({ type: 'C', x1, y1, x2, y2, x: x3, y: y3 })
					x = x3
					y = y3
				}
				break
			}
			case 'Q':
			case 'q': {
				const rel = cmd === 'q'
				while (i < tokens.length && !isCmd(tokens[i])) {
					const x1 = rel ? x + num() : num()
					const y1 = rel ? y + num() : num()
					const x2 = rel ? x + num() : num()
					const y2 = rel ? y + num() : num()
					commands.push({ type: 'Q', x1, y1, x: x2, y: y2 })
					x = x2
					y = y2
				}
				break
			}
			case 'Z':
			case 'z': {
				commands.push({ type: 'Z' })
				x = startX
				y = startY
				break
			}
			default: {
				// 不支持的指令跳过，避免崩溃
				i++
				break
			}
		}
	}
	SVG_PATH_CACHE[path] = commands
	return commands
}

class NativeWriter {
	constructor(options = {}) {
		this.options = options
		this.text = normalizeText(options.text || '').split('')
		this.canvasId = parseCanvasId(options.el)
		this.el = options.el
		this.vm = options.vm
		this.type = options.type || TYPE.NORMAL
		this.style = options.style || {}
		this.animationOpt = options.animation || {}
		this.option = mergeOption(this.type, options)
		this.writers = []
		this._onComplete = options.onComplete
		this.ctx = uni.createCanvasContext(this.canvasId, this.vm)
		this.currentStep = 0
		this.totalSteps = Math.max(4, Math.round((this.animationOpt.strokeAnimationSpeed || 1) * 8))
		this.timer = null
		this.paused = false
		this.destroyed = false
		this.ready = false
		this.pendingStart = false
		this.charData = null
		this.strokeProgress = 0
		this.strokeIndex = 0
		this.frameTimer = null
		this.frameInterval = isAppPlus() ? 1000 / 30 : 1000 / 60
		this._lastDrawAt = 0
		this._mappedMedians = null
		this._parsedStrokes = null
		this._renderCanvasSize = 0
		/** 动画底图：田字格 + 全部灰色轮廓（canvasToTempFilePath） */
		this._outlineSnapshot = ''
		this._outlineSnapshotSize = 0
		this._outlineSnapshotBaking = false
		this.lastTickTime = 0
		this.strokeElapsed = 0
		this.waitElapsed = 0
		this.phase = 'drawing' // drawing | waiting
		this.cornerPauseMs = Math.max(0, Number(this.animationOpt.cornerPauseMs) || 35)
		this.lastPausedCornerIndex = -1
		this.frameCornerIndex = -1
		this.strokeTimelineCache = Object.create(null)
		this.charTransformCache = Object.create(null)
		this.cornerPauseCursor = -1
		/** 为 true 时笔间 waiting 阶段暂不进入下一笔（等读音播完） */
		this.strokeAudioHold = false
		this._strokeDurationFloorMs = 0
		this._waitAfterAudioMs = 0
		this.onStrokeWillStart =
			typeof this.animationOpt.onStrokeWillStart === 'function'
				? this.animationOpt.onStrokeWillStart
				: null
		this.onStrokeCorner =
			typeof this.animationOpt.onStrokeCorner === 'function'
				? this.animationOpt.onStrokeCorner
				: null
		this.onStrokeTrailSegments =
			typeof this.animationOpt.onStrokeTrailSegments === 'function'
				? this.animationOpt.onStrokeTrailSegments
				: null
		this.testState = {
			activeStroke: 0,
			totalMistakes: 0,
			mistakesOnStroke: 0,
			drawing: false,
			path: []
		}
		/** 测验模式：高亮提示「待写」的那一笔 */
		this.testGuideActive = false
		this.testGuideShown = false
		this.testGuideBlinkTimer = null
		/** @type {{ left: number, top: number, width: number, height: number } | null} */
		this._canvasRect = null
		/** 测验几何缓存：按字+canvasSize，逐笔中线/轮廓采样，避免与渲染缓存串笔 */
		this._strokeTestGeometry = null

		this.init()
	}

	notifyComplete(end = true) {
		if (typeof this._onComplete === 'function') {
			this._onComplete()
		}
		if (typeof this.option.animateComplete === 'function') {
			this.option.animateComplete(end)
		}
	}

	_invokeStrokeCallback(fn, args, label) {
		if (!fn || this.destroyed) return
		try {
			const ret = fn(...args)
			if (ret && typeof ret.catch === 'function') {
				ret.catch((e) => console.warn(`[draw-native] ${label}`, e))
			}
		} catch (e) {
			console.warn(`[draw-native] ${label}`, e)
		}
	}

	/** 笔顺动画：该笔第一分段开始（如「横折」的「横」） */
	notifyStrokeAudio(strokeIndex) {
		this._invokeStrokeCallback(
			this.onStrokeWillStart,
			[strokeIndex, this.getMainChar()],
			'onStrokeWillStart'
		)
	}

	/** 中线拐点：触发下一分段读音（不冻结绘制，避免拐弯处卡顿） */
	notifyStrokeCorner(strokeIndex, cornerIndex) {
		this._invokeStrokeCallback(
			this.onStrokeCorner,
			[strokeIndex, cornerIndex, this.getMainChar()],
			'onStrokeCorner'
		)
	}

	/** 该笔收尾：播放拐点未覆盖的剩余音节（如「钩」）；返回 Promise 时动画等其 resolve 再进下一笔 */
	notifyStrokeTrailSegments(strokeIndex, fromSegmentIndex) {
		if (!this.onStrokeTrailSegments || this.destroyed) {
			this.strokeAudioHold = false
			return
		}
		this.strokeAudioHold = true
		try {
			const ret = this.onStrokeTrailSegments(strokeIndex, fromSegmentIndex, this.getMainChar())
			const release = () => {
				if (!this.destroyed) {
					this.strokeAudioHold = false
					this._waitAfterAudioMs = 0
				}
			}
			if (ret && typeof ret.then === 'function') {
				ret.then(release, release)
			} else {
				release()
			}
		} catch (e) {
			console.warn('[draw-native] onStrokeTrailSegments', e)
			this.strokeAudioHold = false
		}
	}

	_scheduleAnimationTick(tick) {
		if (typeof requestAnimationFrame === 'function') {
			this.frameTimer = requestAnimationFrame(() => {
				this.frameTimer = null
				tick()
			})
			return
		}
		this.frameTimer = setTimeout(tick, this.frameInterval)
	}

	_cancelAnimationTick() {
		const id = this.frameTimer
		this.frameTimer = null
		if (id == null) return
		if (typeof cancelAnimationFrame === 'function') {
			try {
				cancelAnimationFrame(id)
				return
			} catch (_) {}
		}
		clearTimeout(id)
	}

	getMainChar() {
		return this.text[0] || ''
	}

	/** 拉长当前笔绘制，避免画完而笔画名读音未播完 */
	setStrokeDurationFloor(ms) {
		const n = Number(ms)
		this._strokeDurationFloorMs = Number.isFinite(n) && n > 0 ? Math.round(n) : 0
	}

	_hasStrokeAudioSync() {
		return !!(this.onStrokeWillStart && this.onStrokeTrailSegments)
	}

	getSize() {
		const length = Number(this.option.length) || 180
		return {
			canvasSize: length + 30,
			fontSize: Math.round(length * 0.78)
		}
	}

	updateCanvasRect(done) {
		if (!this.vm || !this.el) {
			if (typeof done === 'function') done()
			return
		}
		try {
			const query = uni.createSelectorQuery().in(this.vm)
			query
				.select(this.el)
				.boundingClientRect((rect) => {
					if (rect && rect.width > 0 && rect.height > 0) {
						this._canvasRect = rect
					}
					if (typeof done === 'function') done()
				})
				.exec()
		} catch (_) {
			if (typeof done === 'function') done()
		}
	}

	/**
	 * 解析触点坐标（避免 clientX 未换算时落到左上角 0,0）
	 * @param {object} touch touches[0]
	 * @param {object} [detail] 事件 detail（部分端为 canvas 相对坐标）
	 */
	resolveTouchPoint(touch, detail) {
		if (!touch) return null
		const { canvasSize } = this.getSize()
		const padding = 10
		let x
		let y
		let has = false

		if (Number.isFinite(touch.x) && Number.isFinite(touch.y)) {
			x = touch.x
			y = touch.y
			has = true
		} else if (detail && Number.isFinite(detail.x) && Number.isFinite(detail.y)) {
			x = detail.x
			y = detail.y
			has = true
		} else if (Number.isFinite(touch.offsetX) && Number.isFinite(touch.offsetY)) {
			x = touch.offsetX
			y = touch.offsetY
			has = true
		} else if (this._canvasRect) {
			if (Number.isFinite(touch.clientX) && Number.isFinite(touch.clientY)) {
				x = touch.clientX - this._canvasRect.left
				y = touch.clientY - this._canvasRect.top
				has = true
			} else if (Number.isFinite(touch.pageX) && Number.isFinite(touch.pageY)) {
				x = touch.pageX - this._canvasRect.left
				y = touch.pageY - this._canvasRect.top
				has = true
			}
		}

		if (!has) return null

		const rectW = this._canvasRect?.width || 0
		const rectH = this._canvasRect?.height || 0
		if (rectW > 0 && rectH > 0 && Math.abs(rectW - canvasSize) > 1) {
			x = (x / rectW) * canvasSize
			y = (y / rectH) * canvasSize
		}

		x = Math.min(canvasSize - padding, Math.max(padding, x))
		y = Math.min(canvasSize - padding, Math.max(padding, y))
		if (!Number.isFinite(x) || !Number.isFinite(y)) return null
		return { x, y }
	}

	getCanvasPointFromTouch(touch, detail) {
		return this.resolveTouchPoint(touch, detail)
	}

	/** 测试笔迹：去重过密点、丢弃大幅跳变（连点/坏坐标） */
	appendTestPathPoint(point) {
		if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false
		const path = this.testState.path
		const { canvasSize } = this.getSize()
		const minDist = 2.2
		const maxJump =
			path.length <= 1
				? Math.max(canvasSize * 0.92, 100)
				: Math.max(32, canvasSize * 0.42)
		if (path.length) {
			const last = path[path.length - 1]
			const d = Math.hypot(point.x - last.x, point.y - last.y)
			if (d < minDist) return false
			if (d > maxJump) return false
		}
		path.push({ x: point.x, y: point.y })
		return true
	}

	getMedianPoint(strokeIndex, t = 1) {
		const mapped = this.getMappedMedian(strokeIndex)
		if (!isValidPolyline(mapped)) return null
		const cumulative = [0]
		let totalLen = 0
		for (let i = 0; i < mapped.length - 1; i++) {
			const dx = mapped[i + 1].x - mapped[i].x
			const dy = mapped[i + 1].y - mapped[i].y
			totalLen += Math.hypot(dx, dy)
			cumulative.push(totalLen)
		}
		if (totalLen < 0.001) return mapped[mapped.length - 1]
		const target = Math.min(1, Math.max(0, t)) * totalLen
		let seg = 0
		while (seg < cumulative.length - 1 && cumulative[seg + 1] <= target) seg++
		if (seg >= mapped.length - 1) return mapped[mapped.length - 1]
		const startLen = cumulative[seg]
		const segLen = cumulative[seg + 1] - startLen
		const p1 = mapped[seg]
		const p2 = mapped[seg + 1]
		const localT = Math.min(1, Math.max(0, (target - startLen) / (segLen || 1)))
		return {
			x: p1.x + (p2.x - p1.x) * localT,
			y: p1.y + (p2.y - p1.y) * localT
		}
	}

	buildPathString(points = []) {
		if (!points.length) return ''
		let s = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`
		for (let i = 1; i < points.length; i++) {
			s += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`
		}
		return s
	}

	resamplePoints(points = [], sampleCount = 8) {
		if (!points || points.length < 2) return points.slice()
		const cumulative = [0]
		let total = 0
		for (let i = 0; i < points.length - 1; i++) {
			const dx = points[i + 1].x - points[i].x
			const dy = points[i + 1].y - points[i].y
			total += Math.hypot(dx, dy)
			cumulative.push(total)
		}
		if (total < 0.001) return [points[0], points[points.length - 1]]
		const out = []
		for (let k = 0; k < sampleCount; k++) {
			const target = (k / (sampleCount - 1)) * total
			let seg = 0
			while (seg < cumulative.length - 1 && cumulative[seg + 1] < target) seg++
			const p1 = points[seg]
			const p2 = points[Math.min(points.length - 1, seg + 1)]
			const segStart = cumulative[seg]
			const segLen = (cumulative[Math.min(cumulative.length - 1, seg + 1)] - segStart) || 1
			const t = Math.min(1, Math.max(0, (target - segStart) / segLen))
			out.push({
				x: p1.x + (p2.x - p1.x) * t,
				y: p1.y + (p2.y - p1.y) * t
			})
		}
		return out
	}

	invalidateTestGeometryCache() {
		this._strokeTestGeometry = null
	}

	getTestFitRadius(canvasSize) {
		return resolvePositiveTestOption(
			this.option.testFitRadius,
			Math.max(18, Math.min(32, canvasSize * 0.11))
		)
	}

	/** 构建/读取当前字逐笔测验几何（中线 + 原始笔画轮廓采样） */
	prepareTestGeometryCache() {
		if (!this.charData) {
			this.invalidateTestGeometryCache()
			return null
		}
		const { canvasSize } = this.getSize()
		const char = this.getMainChar()
		const cache = this._strokeTestGeometry
		if (cache && cache.char === char && cache.canvasSize === canvasSize && cache.strokes?.length) {
			return cache
		}
		const medians = this.charData.medians || []
		const strokePaths = this.charData.strokes || []
		const mapXY = (px, py) => this.mapPoint([px, py], canvasSize)
		const strokes = []
		for (let i = 0; i < medians.length; i++) {
			const median = this.getMappedMedian(i, canvasSize)
			const cmds = this._parsedStrokes?.[i] || parseSvgPath(strokePaths[i] || '')
			const outline = sampleSvgCommandsToPolyline(cmds, mapXY, Math.max(5, Math.round(canvasSize / 32)))
			const refPolylines = []
			if (isValidPolyline(median)) refPolylines.push(median)
			if (outline.length >= 2) refPolylines.push(outline)
			strokes.push({
				median,
				outline,
				refPolylines,
				medianLen: polylineLength(median)
			})
		}
		this._strokeTestGeometry = { char, canvasSize, strokes }
		return this._strokeTestGeometry
	}

	/**
	 * 逐笔判定：用户轨迹与田字格标准笔画（轮廓+中线）的距离均值、方差是否足够小。
	 */
	evaluateStrokeWrite(userPath, strokeIndex) {
		const total = this.charData?.medians?.length || 0
		const expectedStroke = this.testState.activeStroke
		if (strokeIndex !== expectedStroke) {
			return { pass: false, reason: 'order', expectedStroke, strokeIndex }
		}
		if (!userPath || userPath.length < 2) {
			return { pass: false, reason: 'tooShort', expectedStroke }
		}
		const geoCache = this.prepareTestGeometryCache()
		const strokeGeo = geoCache?.strokes?.[strokeIndex]
		if (!strokeGeo || !strokeGeo.refPolylines?.length) {
			return { pass: false, reason: 'noTarget', expectedStroke }
		}

		const { canvasSize } = this.getSize()
		const fitRadius = this.getTestFitRadius(canvasSize)
		const userSamples = this.resamplePoints(userPath, 16)
		const stats = computeStrokeDistanceStats(userSamples, strokeGeo.refPolylines, fitRadius)

		const meanMax = resolvePositiveTestOption(this.option.testMeanDistMax, fitRadius * 0.72)
		const varianceMax = resolvePositiveTestOption(
			this.option.testDistVarianceMax,
			(fitRadius * 0.85) ** 2
		)
		const inBandMin = Number(this.option.testInBandMin ?? 0.52)
		const minLenRatio = Number(this.option.testLengthMinRatio ?? 0.28)
		const maxLenRatio = Number(this.option.testLengthMaxRatio ?? 1.55)
		const targetLen = strokeGeo.medianLen || 1
		const lenRatio = polylineLength(userSamples) / targetLen

		let bestOther = Number.POSITIVE_INFINITY
		for (let i = 0; i < total; i++) {
			if (i === strokeIndex) continue
			const other = geoCache.strokes[i]
			if (!other?.refPolylines?.length) continue
			bestOther = Math.min(bestOther, minAvgDistToPolylines(userSamples, other.refPolylines))
		}
		const wrongStroke =
			Number.isFinite(bestOther) &&
			bestOther < stats.mean * 0.88 &&
			stats.mean - bestOther > fitRadius * 0.2

		const median = strokeGeo.median
		const dir =
			isValidPolyline(median) && userSamples.length >= 2
				? computeStrokeDirectionMetrics(userSamples, median)
				: { cos: -1, startDist: Number.POSITIVE_INFINITY, endDist: Number.POSITIVE_INFINITY }
		const endpoints = computeStrokeEndpointMetrics(userPath, median)

		const endpointMax = resolvePositiveTestOption(
			this.option.testEndpointMaxDist,
			fitRadius * 1.35
		)
		const minDirectionCos = Number(this.option.testDirectionMinCos ?? 0.707)
		const angleDeg =
			dir.cos >= -1 && dir.cos <= 1
				? (Math.acos(Math.max(-1, Math.min(1, dir.cos))) * 180) / Math.PI
				: 180

		const passShape =
			stats.mean <= meanMax &&
			stats.variance <= varianceMax &&
			stats.inBand >= inBandMin
		const passLen = lenRatio >= minLenRatio && lenRatio <= maxLenRatio
		const passEndpoints =
			endpoints.startDist <= endpointMax && endpoints.endDist <= endpointMax
		const passDirection = dir.cos >= minDirectionCos

		const pass = !wrongStroke && passShape && passLen && passEndpoints && passDirection

		let reason = 'offStroke'
		if (wrongStroke) reason = 'wrongStroke'
		else if (!passDirection && dir.cos < 0) reason = 'directionReverse'
		else if (!passDirection) reason = 'direction'
		else if (!passEndpoints) reason = 'endpoints'
		else if (lenRatio < minLenRatio) reason = 'tooShort'
		else if (lenRatio > maxLenRatio) reason = 'tooLong'
		else if (stats.variance > varianceMax) reason = 'unstable'
		else if (stats.mean > meanMax) reason = 'offStroke'

		const result = {
			pass,
			reason,
			expectedStroke,
			strokeIndex,
			meanDist: Number(stats.mean.toFixed(2)),
			distVariance: Number(stats.variance.toFixed(2)),
			maxDist: Number(stats.max.toFixed(2)),
			inBand: Number(stats.inBand.toFixed(3)),
			lenRatio: Number(lenRatio.toFixed(3)),
			fitRadius,
			meanMax: Number(meanMax.toFixed(2)),
			varianceMax: Number(varianceMax.toFixed(2)),
			startDist: Number(endpoints.startDist.toFixed(2)),
			endDist: Number(endpoints.endDist.toFixed(2)),
			endpointMax: Number(endpointMax.toFixed(2)),
			directionCos: Number(dir.cos.toFixed(3)),
			directionAngleDeg: Number(angleDeg.toFixed(1)),
			directionMinCos: minDirectionCos,
			bestOtherDist: Number.isFinite(bestOther) ? Number(bestOther.toFixed(2)) : null,
			debugPoints: stats.points
		}

		if (this.option.testDebugLog) {
			this.logStrokeTestEvaluation(result, {
				char: this.getMainChar(),
				meanMax,
				varianceMax,
				inBandMin,
				minLenRatio,
				maxLenRatio,
				endpointMax,
				minDirectionCos,
				wrongStroke,
				passShape,
				passLen,
				passEndpoints,
				passDirection,
				endpoints,
				rawPathLen: userPath.length
			})
		}

		return result
	}

	/** 控制台输出测验判分明细（需 testDebugLog: true） */
	logStrokeTestEvaluation(result, ctx = {}) {
		const tag = '[draw-native][测验]'
		const strokeNo = Number(result.strokeIndex) + 1
		const mark = result.pass ? '✓' : '✗'
		console.log(
			`${tag} ${ctx.char || '?'} 第${strokeNo}笔 ${mark} ${result.reason || ''}`,
			{
				阈值: {
					fitRadius: result.fitRadius,
					meanDistMax: ctx.meanMax,
					varianceMax: ctx.varianceMax,
					inBandMin: ctx.inBandMin,
					endpointMax: ctx.endpointMax,
					directionMinCos: ctx.minDirectionCos,
					directionMaxDeg: (Math.acos(ctx.minDirectionCos) * 180) / Math.PI,
					lenRatio: [ctx.minLenRatio, ctx.maxLenRatio]
				},
				实测: {
					meanDist: result.meanDist,
					distVariance: result.distVariance,
					maxDist: result.maxDist,
					inBand: result.inBand,
					lenRatio: result.lenRatio,
					起笔距: result.startDist,
					收笔距: result.endDist,
					起笔误连收笔端: ctx.endpoints
						? Number(ctx.endpoints.startDistToWrongEnd.toFixed(2))
						: null,
					收笔误连起笔端: ctx.endpoints
						? Number(ctx.endpoints.endDistToWrongEnd.toFixed(2))
						: null,
					方向夹角: `${result.directionAngleDeg}° (cos=${result.directionCos})`,
					bestOtherDist: result.bestOtherDist
				},
				判定: {
					wrongStroke: ctx.wrongStroke,
					passShape: ctx.passShape,
					passLen: ctx.passLen,
					passEndpoints: ctx.passEndpoints,
					passDirection: ctx.passDirection,
					原始触点数: ctx.rawPathLen
				}
			}
		)

		const pts = result.debugPoints || []
		if (!pts.length) {
			console.log(`${tag} 无采样点`)
			return
		}

		const badBand = pts.filter((p) => !p.inBand)
		const meanLimit = ctx.meanMax > 0 ? ctx.meanMax : Number.POSITIVE_INFINITY
		const varLimit = ctx.varianceMax > 0 ? ctx.varianceMax : Number.POSITIVE_INFINITY
		const badMean = pts.filter((p) => p.dist > meanLimit)
		const worst = pts
			.slice()
			.sort((a, b) => b.dist - a.dist)
			.slice(0, 5)
			.map((p) => `#${p.i}(${p.x.toFixed(0)},${p.y.toFixed(0)}) dist=${p.dist.toFixed(1)}`)

		console.log(`${tag} 问题点: 超容差${badBand.length}/${pts.length} 超均值${badMean.length}/${pts.length} 最远→`, worst.join(' | '))

		const rows = pts.map((p) => {
			const flags = []
			if (!p.inBand) flags.push('超容差')
			if (p.dist > meanLimit) flags.push('超均值')
			if (ctx.varianceMax > 0 && Math.abs(p.devFromMean) > Math.sqrt(varLimit)) flags.push('偏方差')
			const flagStr = flags.length ? ` ← ${flags.join(',')}` : ''
			return `  #${String(p.i).padStart(2, '0')} (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) dist=${p.dist.toFixed(2)}${p.inBand ? '' : ' ✗'}${flagStr}`
		})
		console.log(`${tag} 逐点距离(${pts.length}):\n` + rows.join('\n'))
	}

	showHintStroke(strokeIndex) {
		const total = this.charData?.medians?.length || 0
		if (strokeIndex < 0 || strokeIndex >= total) return
		const prev = this.option.currentColor
		const hintColor = this.option.highlightColor || '#aaf'
		this.option.currentColor = hintColor
		this.drawState(strokeIndex, 1)
		const ms = Math.max(120, Number(this.option.strokeHighlightSpeed || 20) * 12)
		setTimeout(() => {
			this.option.currentColor = prev
			this.drawState(this.testState.activeStroke, 0)
		}, ms)
	}

	emitTestStatus(status, extra = {}) {
		if (typeof this.option.onTestStatus !== 'function') return
		const data = {
			character: this.getMainChar(),
			totalMistakes: this.testState.totalMistakes,
			strokeNum: this.testState.activeStroke,
			mistakesOnStroke: this.testState.mistakesOnStroke,
			strokesRemaining: Math.max(0, (this.charData?.medians?.length || 0) - this.testState.activeStroke - 1),
			...extra
		}
		this.option.onTestStatus({
			index: this.testState.activeStroke,
			status,
			data
		})
	}

	handleTouchStart(touch, detail) {
		if (this.type !== TYPE.TEST || !this.ready || !this.charData) return
		this.stopTestGuideBlink()
		this.testGuideActive = false
		this.testGuideShown = false
		this.testState.drawing = true
		this.testState.path = []
		const p = this.resolveTouchPoint(touch, detail)
		if (p) this.appendTestPathPoint(p)
		if (this.testState.path.length) this.drawState(this.testState.activeStroke, 0)
		this.updateCanvasRect()
	}

	handleTouchMove(touch, detail) {
		if (this.type !== TYPE.TEST || !this.testState.drawing) return
		const p = this.resolveTouchPoint(touch, detail)
		if (!p) return
		if (!this.appendTestPathPoint(p)) return
		this.drawState(this.testState.activeStroke, 0)
	}

	handleTouchEnd(touch, detail) {
		if (this.type !== TYPE.TEST || !this.testState.drawing) return
		if (touch || detail) {
			const p = this.resolveTouchPoint(touch, detail)
			if (p) this.appendTestPathPoint(p)
		}
		this.testState.drawing = false

		const total = this.charData?.medians?.length || 0
		const strokeIndex = this.testState.activeStroke
		if (strokeIndex >= total) return

		const result = this.evaluateStrokeWrite(this.testState.path, strokeIndex)

		if (result.pass) {
			const finishedPath = this.testState.path.slice()
			this.emitTestStatus(TEST_STATUS.CORRECT, {
				strokeIndex,
				expectedStroke: strokeIndex,
				drawnPath: {
					pathString: this.buildPathString(finishedPath),
					points: finishedPath
				},
				userOverlap: result.userOverlap,
				strokeCoverage: result.strokeCoverage,
				lenRatio: result.lenRatio
			})
			this.testState.activeStroke += 1
			this.testState.mistakesOnStroke = 0
			this.testState.path = []
			if (this.testState.activeStroke >= total) {
				this.emitTestStatus(TEST_STATUS.COMPLETE)
				this.notifyComplete(true)
			}
			this.drawState(this.testState.activeStroke, 0)
			return
		}

		this.testState.totalMistakes += 1
		this.testState.mistakesOnStroke += 1
		let hinted = false
		this.emitTestStatus(TEST_STATUS.MISTAKE, {
			strokeIndex,
			expectedStroke: result.expectedStroke ?? strokeIndex,
			reason: result.reason || 'shape',
			drawnPath: {
				pathString: this.buildPathString(this.testState.path),
				points: this.testState.path
			},
			userOverlap: result.userOverlap,
			strokeCoverage: result.strokeCoverage,
			lenRatio: result.lenRatio
		})
		this.testState.path = []
		if (
			this.option.showHintAfterMisses !== false &&
			this.testState.mistakesOnStroke >= Number(this.option.showHintAfterMisses || 3)
		) {
			this.showHintStroke(strokeIndex)
			hinted = true
		}
		if (!hinted) {
			this.drawState(this.testState.activeStroke, 0)
		}
	}

	drawTestPath() {
		if (this.type !== TYPE.TEST) return
		const points = this.testState.path
		if (!points || !points.length) return
		const ctx = this.ctx
		const color = this.option.drawingColor || '#ff7043'
		const width = Number(this.option.drawingWidth) || 4
		ctx.setStrokeStyle(color)
		ctx.setLineWidth(width)
		ctx.setLineCap('round')
		ctx.setLineJoin('round')
		if (points.length === 1) {
			ctx.setFillStyle(color)
			ctx.beginPath()
			ctx.arc(points[0].x, points[0].y, width * 0.55, 0, Math.PI * 2)
			ctx.fill()
			return
		}
		ctx.beginPath()
		ctx.moveTo(points[0].x, points[0].y)
		for (let i = 1; i < points.length; i++) {
			ctx.lineTo(points[i].x, points[i].y)
		}
		ctx.stroke()
	}

	drawGrid(canvasSize) {
		const lineOpt = this.option
		const ctx = this.ctx
		const padding = 10
		const size = canvasSize - padding * 2
		const left = padding
		const top = padding
		const right = left + size
		const bottom = top + size
		const centerX = (left + right) / 2
		const centerY = (top + bottom) / 2
		const borderColor = lineOpt.borderColor || '#d7d7d7'
		const centerColor = lineOpt.centerColor || lineOpt.lineColor || '#cfcfcf'
		const diagColor = lineOpt.diagonalColor || lineOpt.lineColor || '#e2e2e2'
		const borderWidth = Number(lineOpt.borderWidth) || 1.2
		const centerWidth = Number(lineOpt.centerWidth || lineOpt.lineWidth) || 1
		const dash = Array.isArray(lineOpt.diagonalDash) ? lineOpt.diagonalDash : (lineOpt.lineDash ? [4, 5] : [])

		// 外框
		if (lineOpt.border) {
			ctx.setStrokeStyle(borderColor)
			ctx.setLineWidth(borderWidth)
			ctx.setLineDash(lineOpt.borderDash ? [4, 5] : [])
			ctx.strokeRect(left, top, size, size)
		}

		// 十字中线
		if (lineOpt.lineStraight) {
			ctx.setStrokeStyle(centerColor)
			ctx.setLineWidth(centerWidth)
			ctx.beginPath()
			ctx.moveTo(centerX, top)
			ctx.lineTo(centerX, bottom)
			ctx.moveTo(left, centerY)
			ctx.lineTo(right, centerY)
			ctx.stroke()
		}

		// 对角虚线
		if (lineOpt.lineCross) {
			ctx.setStrokeStyle(diagColor)
			ctx.setLineWidth(centerWidth)
			ctx.setLineDash(dash)
			ctx.beginPath()
			ctx.moveTo(left, top)
			ctx.lineTo(right, bottom)
			ctx.moveTo(right, top)
			ctx.lineTo(left, bottom)
			ctx.stroke()
		}
		ctx.setLineDash([])
	}

	drawWatermark(canvasSize) {
		const wm = this.options.watermark || {}
		if (!wm.text) return
		const ctx = this.ctx
		const text = String(wm.text)
		const alpha = Math.max(0, Math.min(1, Number(wm.alpha) || 0.2))
		const color = wm.color || '#999999'
		const size = Number(wm.fontSize) || 13
		const margin = Number(wm.margin) || 10
		const pos = wm.position || 'bottom-right'

		let x = canvasSize - margin
		let y = canvasSize - margin
		let align = 'right'
		let baseline = 'bottom'
		if (pos === 'top-left') {
			x = margin
			y = margin
			align = 'left'
			baseline = 'top'
		} else if (pos === 'top-right') {
			x = canvasSize - margin
			y = margin
			align = 'right'
			baseline = 'top'
		} else if (pos === 'bottom-left') {
			x = margin
			y = canvasSize - margin
			align = 'left'
			baseline = 'bottom'
		}

		ctx.save()
		ctx.setGlobalAlpha(alpha)
		ctx.setFillStyle(color)
		ctx.setFontSize(size)
		ctx.setTextAlign(align)
		ctx.setTextBaseline(baseline)
		ctx.fillText(text, x, y)
		ctx.restore()
	}

	async init() {
		try {
			const char = this.getMainChar()
			if (!char) return
			this.charData = await loadCharData(char)
			this.ready = true
			this.charTransformCache = Object.create(null)
			this.strokeTimelineCache = Object.create(null)
			this.invalidateTestGeometryCache()
			if (this.type === TYPE.TEST) {
				this.testState.activeStroke = 0
				this.testState.totalMistakes = 0
				this.testState.mistakesOnStroke = 0
				this.testState.drawing = false
				this.testState.path = []
			}
			this.prepareRenderCache()
			this.prepareTestGeometryCache()
			if (this.type === TYPE.ANIMATION) {
				this.scheduleBakeOutlineSnapshot()
			}
			this.drawState(0, 0)
			if (this.pendingStart && this.type === TYPE.ANIMATION) {
				this.pendingStart = false
				this.startAnimation()
			}
			if (this.type === TYPE.NORMAL) {
				this.notifyComplete(true)
			}
			if (this.type === TYPE.TEST && typeof this.option.onWriterReady === 'function') {
				try {
					this.option.onWriterReady(this)
				} catch (e) {
					console.warn('[draw-native] onWriterReady', e)
				}
			}
		} catch (e) {
			triggerWordNotFound(this.getMainChar())
			console.warn('[draw-native] load char data failed:', e)
			// 兜底：至少渲染静态字形
			this.drawFallback()
		}
	}

	drawFallback() {
		if (this.destroyed) return
		const char = this.getMainChar()
		if (!char) return
		const { canvasSize, fontSize } = this.getSize()
		const outlineColor = this.option.outlineColor || '#d5d5d5'
		const strokeColor = this.option.strokeColor || '#2c3e50'
		const currentColor = this.option.currentColor || '#e74c3c'
		const ctx = this.ctx
		ctx.clearRect(0, 0, canvasSize, canvasSize)
		this.drawGrid(canvasSize)
		ctx.setTextAlign('center')
		ctx.setTextBaseline('middle')
		ctx.setFontSize(fontSize)

		// 底层轮廓
		ctx.setFillStyle(outlineColor)
		ctx.fillText(char, canvasSize / 2, canvasSize / 2 + 2)

		// 主字色
		ctx.setFillStyle(strokeColor)
		ctx.fillText(char, canvasSize / 2, canvasSize / 2 + 2)
		this.drawWatermark(canvasSize)
		ctx.draw()
	}

	mapPoint(point, canvasSize) {
		const tf = this.getCharTransform(canvasSize)
		if (!tf) {
			const base = 1024
			const padding = 10
			const drawable = canvasSize - padding * 2
			return {
				x: padding + (point[0] / base) * drawable,
				y: padding + ((base - point[1]) / base) * drawable
			}
		}
		return {
			x: tf.left + (point[0] - tf.minX) * tf.scale,
			y: tf.top + (tf.maxY - point[1]) * tf.scale
		}
	}

	getCharTransform(canvasSize) {
		if (!this.charData) return null
		const key = `${this.getMainChar()}-${canvasSize}`
		if (this.charTransformCache[key]) return this.charTransformCache[key]
		const bounds = this.getCharBounds()
		if (!bounds) return null
		const { minX, minY, maxX, maxY } = bounds
		if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
			return null
		}
		const padding = 10
		const inset = Number(this.option.charInsetRatio)
		const innerRatio = Number.isFinite(inset) ? Math.max(0, Math.min(0.28, inset)) : 0.08
		const innerPadding = (canvasSize - padding * 2) * innerRatio
		const drawSize = canvasSize - padding * 2 - innerPadding * 2
		const width = Math.max(1, maxX - minX)
		const height = Math.max(1, maxY - minY)
		const scale = Math.min(drawSize / width, drawSize / height)
		const contentW = width * scale
		const contentH = height * scale
		const left = padding + innerPadding + (drawSize - contentW) / 2
		const top = padding + innerPadding + (drawSize - contentH) / 2
		const tf = { minX, minY, maxX, maxY, scale, left, top }
		this.charTransformCache[key] = tf
		return tf
	}

	getCharBounds() {
		if (!this.charData) return null
		let minX = Number.POSITIVE_INFINITY
		let minY = Number.POSITIVE_INFINITY
		let maxX = Number.NEGATIVE_INFINITY
		let maxY = Number.NEGATIVE_INFINITY
		let hasPoint = false

		const updateBound = (x, y) => {
			if (!Number.isFinite(x) || !Number.isFinite(y)) return
			minX = Math.min(minX, x)
			maxX = Math.max(maxX, x)
			minY = Math.min(minY, y)
			maxY = Math.max(maxY, y)
			hasPoint = true
		}

		// 优先使用真实笔画轮廓计算几何中心，避免仅用中线导致视觉偏移
		const strokePaths = this.charData.strokes || []
		for (let i = 0; i < strokePaths.length; i++) {
			const cmds = parseSvgPath(strokePaths[i] || '')
			for (let j = 0; j < cmds.length; j++) {
				const c = cmds[j]
				if (c.type === 'M' || c.type === 'L') {
					updateBound(c.x, c.y)
				} else if (c.type === 'Q') {
					updateBound(c.x1, c.y1)
					updateBound(c.x, c.y)
				} else if (c.type === 'C') {
					updateBound(c.x1, c.y1)
					updateBound(c.x2, c.y2)
					updateBound(c.x, c.y)
				}
			}
		}

		// 回退：没有轮廓数据时，仍可用中线数据
		if (!hasPoint) {
			const medians = this.charData.medians || []
			for (let i = 0; i < medians.length; i++) {
				const stroke = medians[i]
				for (let j = 0; j < stroke.length; j++) {
					const p = stroke[j]
					updateBound(p[0], p[1])
				}
			}
		}

		if (!hasPoint) return null
		return { minX, minY, maxX, maxY }
	}

	buildStrokeTimeline(medianPoints, canvasSize) {
		if (!medianPoints || medianPoints.length < 2) {
			return { totalLen: 1, cornerLens: [] }
		}
		const pts = medianPoints.map((p) => this.mapPoint(p, canvasSize))
		const threshold = Number(this.option.testCornerAngleCos ?? 0.62)
		const { corners, totalLen } = extractMedianCorners(pts, threshold)
		const merged = mergeCloseCorners(corners)
		const cornerLens = merged.map((c) => c.t * totalLen)
		return { totalLen: Math.max(1, totalLen), cornerLens }
	}

	getStrokeTimeline(strokeIndex, canvasSize) {
		const key = `${strokeIndex}-${canvasSize}`
		if (this.strokeTimelineCache[key]) return this.strokeTimelineCache[key]
		let timeline
		if (
			this._mappedMedians?.[strokeIndex] &&
			this._renderCanvasSize === canvasSize
		) {
			timeline = this.buildStrokeTimelineFromMapped(this._mappedMedians[strokeIndex])
		} else {
			const medians = this.charData?.medians || []
			timeline = this.buildStrokeTimeline(medians[strokeIndex] || [], canvasSize)
		}
		this.strokeTimelineCache[key] = timeline
		return timeline
	}

	prepareRenderCache() {
		if (!this.charData) {
			this._mappedMedians = null
			this._parsedStrokes = null
			this._renderCanvasSize = 0
			this.invalidateTestGeometryCache()
			return
		}
		const { canvasSize } = this.getSize()
		const medians = this.charData.medians || []
		const strokes = this.charData.strokes || []
		const char = this.getMainChar()
		if (
			this._renderCanvasSize !== canvasSize ||
			this._strokeTestGeometry?.char !== char
		) {
			this.invalidateTestGeometryCache()
		}
		this._renderCanvasSize = canvasSize
		this._mappedMedians = medians.map((stroke) =>
			stroke.map((p) => this.mapPoint(p, canvasSize))
		)
		this._parsedStrokes = strokes.map((s) => parseSvgPath(s || ''))
		if (this.type === TYPE.TEST) {
			this.prepareTestGeometryCache()
		}
	}

	buildStrokeTimelineFromMapped(mappedPts) {
		if (!mappedPts || mappedPts.length < 2) {
			return { totalLen: 1, cornerLens: [] }
		}
		const threshold = Number(this.option.testCornerAngleCos ?? 0.62)
		const { corners, totalLen } = extractMedianCorners(mappedPts, threshold)
		const merged = mergeCloseCorners(corners)
		const cornerLens = merged.map((c) => c.t * totalLen)
		return { totalLen: Math.max(1, totalLen), cornerLens }
	}

	getMappedMedian(strokeIndex, canvasSizeOpt) {
		const canvasSize =
			Number.isFinite(Number(canvasSizeOpt)) ? Number(canvasSizeOpt) : this.getSize().canvasSize
		if (
			this._mappedMedians &&
			this._renderCanvasSize === canvasSize &&
			this._mappedMedians[strokeIndex] &&
			isValidPolyline(this._mappedMedians[strokeIndex])
		) {
			return this._mappedMedians[strokeIndex]
		}
		const medians = this.charData?.medians || []
		const stroke = medians[strokeIndex]
		if (!stroke || stroke.length < 2) return []
		const mapped = stroke.map((p) => this.mapPoint(p, canvasSize))
		if (!isValidPolyline(mapped)) {
			console.warn('[draw-native] invalid mapped median', this.getMainChar(), strokeIndex)
			return []
		}
		if (this._mappedMedians && this._renderCanvasSize === canvasSize) {
			this._mappedMedians[strokeIndex] = mapped
		}
		return mapped
	}

	drawStrokePathParsed(cmds, color, canvasSize) {
		if (!cmds || !cmds.length) return
		const ctx = this.ctx
		const mapXY = (px, py) => this.mapPoint([px, py], canvasSize)
		ctx.setFillStyle(color)
		ctx.beginPath()
		for (let i = 0; i < cmds.length; i++) {
			const c = cmds[i]
			if (c.type === 'M') {
				const p = mapXY(c.x, c.y)
				ctx.moveTo(p.x, p.y)
			} else if (c.type === 'L') {
				const p = mapXY(c.x, c.y)
				ctx.lineTo(p.x, p.y)
			} else if (c.type === 'C') {
				const p1 = mapXY(c.x1, c.y1)
				const p2 = mapXY(c.x2, c.y2)
				const p = mapXY(c.x, c.y)
				ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p.x, p.y)
			} else if (c.type === 'Q') {
				const p1 = mapXY(c.x1, c.y1)
				const p = mapXY(c.x, c.y)
				ctx.quadraticCurveTo(p1.x, p1.y, p.x, p.y)
			} else if (c.type === 'Z') {
				ctx.closePath()
			}
		}
		ctx.fill()
	}

	drawStrokePath(pathString, color, canvasSize, strokeIndex = -1) {
		if (strokeIndex >= 0 && this._parsedStrokes?.[strokeIndex]) {
			this.drawStrokePathParsed(this._parsedStrokes[strokeIndex], color, canvasSize)
			return
		}
		if (!pathString) return
		const cmds = parseSvgPath(pathString)
		if (!cmds || !cmds.length) return
		const ctx = this.ctx
		const mapXY = (px, py) => this.mapPoint([px, py], canvasSize)
		ctx.setFillStyle(color)
		ctx.beginPath()
		for (let i = 0; i < cmds.length; i++) {
			const c = cmds[i]
			if (c.type === 'M') {
				const p = mapXY(c.x, c.y)
				ctx.moveTo(p.x, p.y)
			} else if (c.type === 'L') {
				const p = mapXY(c.x, c.y)
				ctx.lineTo(p.x, p.y)
			} else if (c.type === 'C') {
				const p1 = mapXY(c.x1, c.y1)
				const p2 = mapXY(c.x2, c.y2)
				const p = mapXY(c.x, c.y)
				ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p.x, p.y)
			} else if (c.type === 'Q') {
				const p1 = mapXY(c.x1, c.y1)
				const p = mapXY(c.x, c.y)
				ctx.quadraticCurveTo(p1.x, p1.y, p.x, p.y)
			} else if (c.type === 'Z') {
				ctx.closePath()
			}
		}
		ctx.fill()
	}

	buildStrokePathFromParsed(cmds, canvasSize) {
		if (!cmds || !cmds.length) return false
		const ctx = this.ctx
		const mapXY = (px, py) => this.mapPoint([px, py], canvasSize)
		ctx.beginPath()
		for (let i = 0; i < cmds.length; i++) {
			const c = cmds[i]
			if (c.type === 'M') {
				const p = mapXY(c.x, c.y)
				ctx.moveTo(p.x, p.y)
			} else if (c.type === 'L') {
				const p = mapXY(c.x, c.y)
				ctx.lineTo(p.x, p.y)
			} else if (c.type === 'C') {
				const p1 = mapXY(c.x1, c.y1)
				const p2 = mapXY(c.x2, c.y2)
				const p = mapXY(c.x, c.y)
				ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p.x, p.y)
			} else if (c.type === 'Q') {
				const p1 = mapXY(c.x1, c.y1)
				const p = mapXY(c.x, c.y)
				ctx.quadraticCurveTo(p1.x, p1.y, p.x, p.y)
			} else if (c.type === 'Z') {
				ctx.closePath()
			}
		}
		return true
	}

	buildStrokePath(pathString, canvasSize) {
		if (!pathString) return false
		return this.buildStrokePathFromParsed(parseSvgPath(pathString), canvasSize)
	}

	drawStrokeProgressClipped(pathString, mappedMedian, ratio, color, width, canvasSize, strokeIndex = -1) {
		if (!pathString || !mappedMedian || !mappedMedian.length) return
		const ctx = this.ctx
		ctx.save()
		const ok =
			strokeIndex >= 0 && this._parsedStrokes?.[strokeIndex]
				? this.buildStrokePathFromParsed(this._parsedStrokes[strokeIndex], canvasSize)
				: this.buildStrokePath(pathString, canvasSize)
		if (ok) {
			ctx.clip()
		}
		this.drawStrokePolyline(mappedMedian, ratio, color, width)
		ctx.restore()
	}

	drawStrokePolyline(points, ratio = 1, color = '#2c3e50', width = 8) {
		if (!points || points.length < 2 || ratio <= 0) return
		const ctx = this.ctx
		const clampedRatio = Math.min(1, Math.max(0, ratio))

		// 按真实路径长度推进
		const cumulative = [0]
		let totalLen = 0
		for (let i = 0; i < points.length - 1; i++) {
			const dx = points[i + 1].x - points[i].x
			const dy = points[i + 1].y - points[i].y
			totalLen += Math.hypot(dx, dy)
			cumulative.push(totalLen)
		}
		if (totalLen <= 0.0001) return
		let targetLen = clampedRatio * totalLen

		ctx.setStrokeStyle(color)
		ctx.setLineWidth(width)
		ctx.setLineCap('round')
		ctx.setLineJoin('round')
		ctx.beginPath()
		ctx.moveTo(points[0].x, points[0].y)

		let seg = 0
		while (seg < cumulative.length - 1 && cumulative[seg + 1] <= targetLen) {
			ctx.lineTo(points[seg + 1].x, points[seg + 1].y)
			seg++
		}

		if (seg < points.length - 1) {
			const segStartLen = cumulative[seg]
			const segEndLen = cumulative[seg + 1]
			const segLen = segEndLen - segStartLen
			const t = Math.min(1, Math.max(0, (targetLen - segStartLen) / (segLen || 1)))
			const p1 = points[seg]
			const p2 = points[seg + 1]
			const x = p1.x + (p2.x - p1.x) * t
			const y = p1.y + (p2.y - p1.y) * t
			ctx.lineTo(x, y)
		}

		ctx.stroke()
	}

	_shouldThrottleDraw() {
		if (!isAppPlus() || this.type !== TYPE.ANIMATION) return false
		const now = Date.now()
		if (now - (this._lastDrawAt || 0) < 28) return true
		this._lastDrawAt = now
		return false
	}

	invalidateOutlineSnapshot() {
		this._outlineSnapshot = ''
		this._outlineSnapshotSize = 0
		this._outlineSnapshotBaking = false
	}

	scheduleBakeOutlineSnapshot() {
		if (this.type !== TYPE.ANIMATION || !this.charData || this._outlineSnapshotBaking) return
		const { canvasSize } = this.getSize()
		if (this._outlineSnapshot && this._outlineSnapshotSize === canvasSize) return
		this._outlineSnapshotBaking = true
		const ctx = this.ctx
		const outlineColor = this.option.outlineColor || '#d5d5d5'
		const strokePaths = this.charData.strokes || []

		ctx.clearRect(0, 0, canvasSize, canvasSize)
		this.drawGrid(canvasSize)
		for (let i = strokePaths.length - 1; i >= 0; i--) {
			this.drawStrokePath(strokePaths[i], outlineColor, canvasSize, i)
		}
		ctx.draw(false, () => {
			uni.canvasToTempFilePath(
				{
					canvasId: this.canvasId,
					width: canvasSize,
					height: canvasSize,
					destWidth: canvasSize,
					destHeight: canvasSize,
					fileType: 'png',
					quality: 0.92,
					success: (res) => {
						this._outlineSnapshot = res.tempFilePath || ''
						this._outlineSnapshotSize = canvasSize
						this._outlineSnapshotBaking = false
						if (!this.destroyed && this.type === TYPE.ANIMATION) {
							this.drawState(this.strokeIndex, this.strokeProgress)
						}
					},
					fail: (err) => {
						this._outlineSnapshotBaking = false
						console.warn('[draw-native] bake outline snapshot failed', err)
					}
				},
				this.vm
			)
		})
	}

	drawOutlineSnapshot(canvasSize) {
		if (
			!this._outlineSnapshot ||
			this._outlineSnapshotSize !== canvasSize
		) {
			return false
		}
		this.ctx.drawImage(this._outlineSnapshot, 0, 0, canvasSize, canvasSize)
		return true
	}

	drawAllStrokeOutlines(canvasSize, outlineColor, strokePaths) {
		for (let i = strokePaths.length - 1; i >= 0; i--) {
			this.drawStrokePath(strokePaths[i], outlineColor, canvasSize, i)
		}
	}

	drawState(completedStrokeCount = 0, currentStrokeRatio = 0) {
		if (this.destroyed) return
		const { canvasSize } = this.getSize()
		if (this._renderCanvasSize !== canvasSize) {
			this.prepareRenderCache()
			this.invalidateOutlineSnapshot()
			if (this.type === TYPE.ANIMATION) this.scheduleBakeOutlineSnapshot()
		}
		const outlineColor = this.option.outlineColor || '#d5d5d5'
		const strokeColor = this.option.strokeColor || '#2c3e50'
		const currentColor = this.option.currentColor || '#e74c3c'
		const strokeWidth = Math.max(8, Math.round(canvasSize * 0.05))
		const medians = this.charData?.medians || []
		const strokePaths = this.charData?.strokes || []
		const isAnim = this.type === TYPE.ANIMATION

		const ctx = this.ctx
		ctx.clearRect(0, 0, canvasSize, canvasSize)

		const testCompleted = this.type === TYPE.TEST ? this.testState.activeStroke : completedStrokeCount
		const hasOutlineSnapshot = isAnim && this.drawOutlineSnapshot(canvasSize)

		if (!hasOutlineSnapshot) {
			this.drawGrid(canvasSize)
			if (isAnim) {
				this.drawAllStrokeOutlines(canvasSize, outlineColor, strokePaths)
			}
		}

		// 反向绘制：后写笔画先画，保证先写笔画始终位于最上层
		for (let i = medians.length - 1; i >= 0; i--) {
			const mapped = this.getMappedMedian(i, canvasSize)
			const drawPath = (color) => this.drawStrokePath(strokePaths[i], color, canvasSize, i)

			if (this.type === TYPE.NORMAL) {
				drawPath(outlineColor)
				drawPath(strokeColor)
				continue
			}

			if (isAnim) {
				if (hasOutlineSnapshot && i > testCompleted) {
					continue
				}

				if (i < testCompleted) {
					drawPath(strokeColor)
					continue
				}
				if (i === testCompleted) {
					if (currentStrokeRatio >= 0.995) {
						drawPath(strokeColor)
						continue
					}
					drawPath('rgba(44,62,80,0.18)')
					this.drawStrokeProgressClipped(
						strokePaths[i],
						mapped,
						currentStrokeRatio,
						currentColor,
						Math.round(strokeWidth * 1.55),
						canvasSize,
						i
					)
				}
				continue
			}

			if (this.type === TYPE.TEST && i > testCompleted) {
				continue
			}

			drawPath(outlineColor)

			if (i < testCompleted) {
				drawPath(strokeColor)
			} else if (
				i === testCompleted &&
				this.type === TYPE.TEST &&
				this.testGuideActive &&
				this.testGuideShown
			) {
				const guideColor =
					this.option.guideStrokeColor ||
					this.option.highlightColor ||
					'#ff8a65'
				drawPath(guideColor)
			}
		}
		if (this.type === TYPE.TEST) {
			this.drawTestPath()
		}
		this.drawWatermark(canvasSize)
		ctx.draw()
	}

	startAnimation() {
		if (this.type !== TYPE.ANIMATION || this.timer || this.frameTimer || this.destroyed) return false
		if (!this.ready || !this.charData) {
			this.pendingStart = true
			return true
		}
		const delayBetweenStrokes = this._hasStrokeAudioSync()
			? Math.max(160, Number(this.animationOpt.delayBetweenStrokes) || 160)
			: Number(this.animationOpt.delayBetweenStrokes) || 280
		const loopAnimate = this.animationOpt.loopAnimate !== false
		const delayBetweenLoops = Number(this.animationOpt.delayBetweenLoops) || 1000
		const speed = Number(this.animationOpt.strokeAnimationSpeed) || 1
		const strokeDurationBase = Math.max(
			280,
			Math.round((Number(this.animationOpt.strokeDurationMs) || 880) / speed)
		)

		const stopFrameLoop = () => {
			this._cancelAnimationTick()
		}

		const tick = () => {
			if (this.destroyed) return
			if (this.paused) {
				this._scheduleAnimationTick(tick)
				return
			}

			const now = Date.now()
			const rawDt = this.lastTickTime ? now - this.lastTickTime : this.frameInterval
			const dt = Math.min(48, Math.max(8, rawDt))
			this.lastTickTime = now
			const total = this.charData?.medians?.length || 0
			if (total === 0) {
				this.drawFallback()
				stopFrameLoop()
				this.timer = null
				return
			}

			const { canvasSize } = this.getSize()
			const timeline = this.getStrokeTimeline(this.strokeIndex, canvasSize)
			const totalLen = timeline.totalLen || 1
			const strokeDuration = Math.max(
				strokeDurationBase,
				this._strokeDurationFloorMs || 0
			)

			if (this.phase === 'drawing') {
				let currentLen = this.strokeProgress * totalLen
				const deltaLen = (dt / strokeDuration) * totalLen
				let nextLen = Math.min(totalLen, currentLen + deltaLen)

				while (true) {
					const nextCornerLen = timeline.cornerLens[this.cornerPauseCursor + 1]
					if (
						typeof nextCornerLen !== 'number' ||
						nextLen < nextCornerLen ||
						nextCornerLen <= currentLen
					) {
						break
					}
					this.cornerPauseCursor += 1
					this.notifyStrokeCorner(this.strokeIndex, this.cornerPauseCursor)
					currentLen = nextLen
				}

				this.strokeProgress = Math.min(1, nextLen / totalLen)
				if (this.strokeProgress >= 1 && this.phase !== 'waiting') {
					const fromSeg = this.cornerPauseCursor + 2
					this.phase = 'waiting'
					this.waitElapsed = 0
					this._waitAfterAudioMs = 0
					this._strokeDurationFloorMs = 0
					this.notifyStrokeTrailSegments(this.strokeIndex, fromSeg)
				}
			} else {
				this.strokeProgress = 1
				if (!this.strokeAudioHold) {
					this._waitAfterAudioMs += dt
				}
				if (this._waitAfterAudioMs >= delayBetweenStrokes && !this.strokeAudioHold) {
					const nextIndex = this.strokeIndex + 1
					this.strokeIndex = nextIndex
					this.strokeElapsed = 0
					this.strokeProgress = 0
					this.phase = 'drawing'
					this.cornerPauseCursor = -1
					this.waitElapsed = 0
					this._waitAfterAudioMs = 0
					this.notifyStrokeAudio(nextIndex)
				}
			}

			if (this.strokeIndex >= total) {
				this.notifyComplete(true)
				if (loopAnimate) {
					this.strokeIndex = 0
					this.strokeProgress = 0
					this.strokeElapsed = 0
					this.waitElapsed = 0
					this.phase = 'drawing'
					this.cornerPauseCursor = -1
					this.notifyStrokeAudio(0)
					this.drawState(0, 0)
					stopFrameLoop()
					this.timer = setTimeout(() => {
						this.timer = null
						this.lastTickTime = 0
						tick()
					}, delayBetweenLoops)
					return
				}
				this.drawState(total, 1)
				stopFrameLoop()
				this.timer = null
				return
			}

			if (!this._shouldThrottleDraw()) {
				this.drawState(this.strokeIndex, this.strokeProgress)
			}
			this._scheduleAnimationTick(tick)
		}

		this.strokeIndex = 0
		this._lastDrawAt = 0
		this.strokeProgress = 0
		this.strokeElapsed = 0
		this.waitElapsed = 0
		this.phase = 'drawing'
		this.cornerPauseCursor = -1
		this.strokeAudioHold = false
		this.lastTickTime = 0
		this.notifyStrokeAudio(0)
		this.drawState(0, 0)
		this._scheduleAnimationTick(tick)
		return true
	}

	drawNextStroke(onComplete = () => {}) {
		if (this.destroyed || !this.ready || !this.charData) return false
		const total = this.charData.medians.length
		if (this.type === TYPE.STROKE) {
			if (this.strokeIndex >= total) {
				onComplete()
				return false
			}
			this.strokeIndex += 1
			// 手动模式每次“完整写完一笔”
			this.drawState(this.strokeIndex, 0)
			if (this.strokeIndex >= total) {
				this.notifyComplete(true)
				onComplete()
			}
			return true
		}

		if (this.type !== TYPE.ANIMATION) return false
		this.strokeIndex = Math.min(total, this.strokeIndex + 1)
		this.strokeProgress = 0
		this.drawState(this.strokeIndex, 0)
		if (this.strokeIndex >= total) onComplete()
		return true
	}

	stopTestGuideBlink() {
		if (this.testGuideBlinkTimer != null) {
			clearInterval(this.testGuideBlinkTimer)
			this.testGuideBlinkTimer = null
		}
	}

	/**
	 * 测试模式：高亮当前待写笔画；可选闪动吸引注意
	 * @param {boolean} active
	 * @param {{ blink?: boolean, blinkTimes?: number, blinkIntervalMs?: number }} [opts]
	 */
	setTestStrokeGuide(active, opts = {}) {
		if (this.type !== TYPE.TEST || !this.charData) return false
		this.stopTestGuideBlink()
		if (!active) {
			this.testGuideActive = false
			this.testGuideShown = false
			this.drawState(this.testState.activeStroke, 0)
			return true
		}
		this.testGuideActive = true
		const wantBlink = opts.blink !== false
		if (wantBlink) {
			this.startTestGuideBlink(opts)
		} else {
			this.testGuideShown = true
			this.drawState(this.testState.activeStroke, 0)
		}
		return true
	}

	startTestGuideBlink(opts = {}) {
		const cycles = Math.max(1, Math.min(6, Number(opts.blinkTimes) || 3))
		const intervalMs = Math.max(160, Number(opts.blinkIntervalMs) || 280)
		const totalSteps = cycles * 2
		let step = 0
		this.testGuideShown = false
		this.drawState(this.testState.activeStroke, 0)
		this.testGuideBlinkTimer = setInterval(() => {
			if (this.destroyed || !this.testGuideActive) {
				this.stopTestGuideBlink()
				return
			}
			step += 1
			this.testGuideShown = step % 2 === 1
			this.drawState(this.testState.activeStroke, 0)
			if (step >= totalSteps) {
				this.stopTestGuideBlink()
				this.testGuideShown = true
				this.drawState(this.testState.activeStroke, 0)
			}
		}, intervalMs)
	}

	/** 测试模式：清空已写笔画，从第一笔重新开始 */
	resetStrokeTest() {
		if (this.type !== TYPE.TEST || !this.charData) return false
		this.stopTestGuideBlink()
		this.testState.activeStroke = 0
		this.testState.totalMistakes = 0
		this.testState.mistakesOnStroke = 0
		this.testState.drawing = false
		this.testState.path = []
		this.testGuideActive = false
		this.testGuideShown = false
		this.invalidateTestGeometryCache()
		this.prepareRenderCache()
		this.prepareTestGeometryCache()
		this.drawState(0, 0)
		return true
	}

	pauseAnimation() {
		if (this.type !== TYPE.ANIMATION) return
		this.paused = true
	}

	resumeAnimation() {
		if (this.type !== TYPE.ANIMATION) return
		this.paused = false
	}

	restartAnimation() {
		this.stop()
		this.paused = false
		this.strokeIndex = 0
		this.strokeProgress = 0
		this.cornerPauseCursor = -1
		this.strokeAudioHold = false
		if (this.ready) this.drawState(0, 0)
		if (this.type === TYPE.ANIMATION) {
			this.startAnimation()
		}
	}

	stop() {
		if (this.timer) {
			clearTimeout(this.timer)
			this.timer = null
		}
		this._cancelAnimationTick()
		this.strokeAudioHold = false
	}

	destroy() {
		this.stopTestGuideBlink()
		this.stop()
		this.invalidateOutlineSnapshot()
		this.invalidateTestGeometryCache()
		this._mappedMedians = null
		this._parsedStrokes = null
		this.destroyed = true
	}
}

function drawNative(text = '', options = {}) {
	if (typeof text === 'object' && text !== null) {
		options = text
		text = options.text || ''
	}
	const sourceText = text || options.text || ''
	const pureText = normalizeText(sourceText)
	if (!pureText) {
		if (sourceText) triggerWordNotFound(String(sourceText))
		throw new Error('draw-native: text must contain Chinese character')
	}
	const writer = new NativeWriter({
		...options,
		text: pureText
	})
	writer.option.text = pureText

	if (writer.type === TYPE.ANIMATION && (options.animation?.autoAnimate ?? true)) {
		writer.startAnimation()
	}
	return writer
}

drawNative.pluginName = 'draw'
drawNative.TYPE = TYPE
drawNative.TEST_STATUS = TEST_STATUS
drawNative.setResourceBase = (url) => {
	setHanziWriterDataBase(url)
}
drawNative.LOCAL_RESOURCE_BASE = LOCAL_HANZI_WRITER_BASE
drawNative.onWordNotFound = (callback) => {
	if (typeof callback === 'function') {
		WORD_NOT_FOUND_CALLBACKS.push(callback)
	}
}
drawNative._refreshResource = () => {}
drawNative.install = function install(cnchar) {
	cnchar.draw = drawNative
}

export default drawNative
