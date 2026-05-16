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
	// draw-native 扩展：测试模式严格度配置（保持默认兼容）
	testStrictOrder: true,
	testDirectionWeight: 0.35,
	testScoreThreshold: null,
	// 字形相对外框的内缩比例（基于可绘区域），略大则字离田字格线更远
	charInsetRatio: 0.08
}

function normalizeText(text = '') {
	const chars = String(text).match(/[\u4e00-\u9fa5]/g)
	return chars ? chars.join('') : ''
}

function parseCanvasId(el) {
	if (typeof el !== 'string') return 'cnchar-draw-native'
	return el.replace(/^#/, '') || 'cnchar-draw-native'
}

const CHAR_DATA_CACHE = Object.create(null)
const SVG_PATH_CACHE = Object.create(null)
const WORD_NOT_FOUND_CALLBACKS = []
let HANZI_WRITER_DATA_BASE = 'https://unpkg.com/hanzi-writer-data@latest'

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
	if (CHAR_DATA_CACHE[char]) return CHAR_DATA_CACHE[char]
	const url = `${HANZI_WRITER_DATA_BASE}/${encodeURIComponent(char)}.json`
	const data = await requestJSON(url)
	CHAR_DATA_CACHE[char] = data
	return data
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
		this.frameInterval = 1000 / 60
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
				if (!this.destroyed) this.strokeAudioHold = false
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
		const maxJump = Math.max(28, canvasSize * 0.32)
		const minDist = 2.5
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
		const medians = this.charData?.medians || []
		const stroke = medians[strokeIndex]
		if (!stroke || stroke.length < 2) return null
		const { canvasSize } = this.getSize()
		const mapped = stroke.map((p) => this.mapPoint(p, canvasSize))
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

	getMappedMedian(strokeIndex) {
		const medians = this.charData?.medians || []
		const stroke = medians[strokeIndex]
		if (!stroke || stroke.length < 2) return []
		const { canvasSize } = this.getSize()
		return stroke.map((p) => this.mapPoint(p, canvasSize))
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

	computeStrokeMatchScore(userPath, strokeIndex) {
		const target = this.getMappedMedian(strokeIndex)
		if (!userPath || userPath.length < 2 || !target.length) return Number.POSITIVE_INFINITY
		const userSamples = this.resamplePoints(userPath, 8)
		const targetSamples = this.resamplePoints(target, 8)
		let sum = 0
		for (let i = 0; i < Math.min(userSamples.length, targetSamples.length); i++) {
			const dx = userSamples[i].x - targetSamples[i].x
			const dy = userSamples[i].y - targetSamples[i].y
			sum += Math.hypot(dx, dy)
		}
		return sum / Math.min(userSamples.length, targetSamples.length)
	}

	computeDirectionPenalty(userPath, strokeIndex) {
		const target = this.getMappedMedian(strokeIndex)
		if (!userPath || userPath.length < 2 || !target || target.length < 2) return 0
		const uStart = userPath[0]
		const uEnd = userPath[userPath.length - 1]
		const tStart = target[0]
		const tEnd = target[target.length - 1]
		const ux = uEnd.x - uStart.x
		const uy = uEnd.y - uStart.y
		const tx = tEnd.x - tStart.x
		const ty = tEnd.y - tStart.y
		const uLen = Math.hypot(ux, uy) || 1
		const tLen = Math.hypot(tx, ty) || 1
		const cos = (ux / uLen) * (tx / tLen) + (uy / uLen) * (ty / tLen)
		// cos: 1 同向, -1 反向 -> 惩罚范围 [0,1]
		return (1 - cos) / 2
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
		const begin = () => {
			this.stopTestGuideBlink()
			this.testGuideActive = false
			this.testGuideShown = false
			this.testState.drawing = true
			this.testState.path = []
			const p = this.resolveTouchPoint(touch, detail)
			if (p) this.appendTestPathPoint(p)
			if (this.testState.path.length) this.drawState(this.testState.activeStroke, 0)
		}
		this.updateCanvasRect(begin)
	}

	handleTouchMove(touch, detail) {
		if (this.type !== TYPE.TEST || !this.testState.drawing) return
		const p = this.resolveTouchPoint(touch, detail)
		if (!p) return
		if (!this.appendTestPathPoint(p)) return
		this.drawState(this.testState.activeStroke, 0)
	}

	handleTouchEnd() {
		if (this.type !== TYPE.TEST || !this.testState.drawing) return
		this.testState.drawing = false
		const total = this.charData?.medians?.length || 0
		const strokeIndex = this.testState.activeStroke
		if (strokeIndex >= total) return
		if (this.testState.path.length < 2) {
			this.testState.mistakesOnStroke += 1
			this.testState.totalMistakes += 1
			this.emitTestStatus(TEST_STATUS.MISTAKE, {
				expectedStroke: strokeIndex,
				reason: 'tooShort'
			})
			this.drawState(this.testState.activeStroke, 0)
			return
		}
		const endTarget = this.getMedianPoint(strokeIndex, 1)
		const endPoint = this.testState.path[this.testState.path.length - 1]
		if (!endTarget || !endPoint) return
		const endDist = Math.hypot(endPoint.x - endTarget.x, endPoint.y - endTarget.y)
		const score = this.computeStrokeMatchScore(this.testState.path, strokeIndex)
		const directionPenalty = this.computeDirectionPenalty(this.testState.path, strokeIndex)
		const directionWeight = Math.max(0, Math.min(1, Number(this.option.testDirectionWeight ?? 0.35)))
		const finalScore = score * (1 + directionPenalty * directionWeight)
		const dynamicThreshold = Math.max(13, Number(this.option.drawingWidth || 4) * 3.6)
		const passThreshold = Number.isFinite(Number(this.option.testScoreThreshold))
			? Number(this.option.testScoreThreshold)
			: dynamicThreshold
		const endpointThreshold = Math.max(16, Number(this.option.drawingWidth || 4) * 4.8)
		const strictOrder = this.option.testStrictOrder !== false
		const expectedStroke = this.testState.activeStroke
		const orderPass = strictOrder ? strokeIndex === expectedStroke : strokeIndex >= expectedStroke
		const pass = finalScore <= passThreshold && endDist <= endpointThreshold && orderPass
		if (pass) {
			const finishedPath = this.testState.path.slice()
			this.emitTestStatus(TEST_STATUS.CORRECT, {
				drawnPath: {
					pathString: this.buildPathString(finishedPath),
					points: finishedPath
				},
				score: Number(finalScore.toFixed(3))
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
		} else {
			this.testState.totalMistakes += 1
			this.testState.mistakesOnStroke += 1
			let hinted = false
			this.emitTestStatus(TEST_STATUS.MISTAKE, {
				drawnPath: {
					pathString: this.buildPathString(this.testState.path),
					points: this.testState.path
				},
				score: Number(finalScore.toFixed(3)),
				expectedStroke
			})
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
			return
		}
		this.drawState(this.testState.activeStroke, 0)
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
			this.drawState(0, 0)
			if (this.pendingStart && this.type === TYPE.ANIMATION) {
				this.pendingStart = false
				this.startAnimation()
			}
			if (this.type === TYPE.NORMAL) {
				this.notifyComplete(true)
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
		const cumulative = [0]
		let totalLen = 0
		for (let i = 0; i < pts.length - 1; i++) {
			const dx = pts[i + 1].x - pts[i].x
			const dy = pts[i + 1].y - pts[i].y
			totalLen += Math.hypot(dx, dy)
			cumulative.push(totalLen)
		}
		const normalize = (x, y) => {
			const len = Math.hypot(x, y) || 1
			return { x: x / len, y: y / len }
		}
		const angleCos = (v1, v2) => v1.x * v2.x + v1.y * v2.y
		const cornerLens = []
		for (let i = 1; i < pts.length - 1; i++) {
			const p0 = pts[i - 1]
			const p1 = pts[i]
			const p2 = pts[i + 1]
			const vA = normalize(p1.x - p0.x, p1.y - p0.y)
			const vB = normalize(p2.x - p1.x, p2.y - p1.y)
			// 角度突变视为“需要顿笔”的拐点
			if (angleCos(vA, vB) < 0.62) {
				cornerLens.push(cumulative[i])
			}
		}
		return { totalLen: Math.max(1, totalLen), cornerLens }
	}

	getStrokeTimeline(strokeIndex, canvasSize) {
		const key = `${strokeIndex}-${canvasSize}`
		if (this.strokeTimelineCache[key]) return this.strokeTimelineCache[key]
		const medians = this.charData?.medians || []
		const timeline = this.buildStrokeTimeline(medians[strokeIndex] || [], canvasSize)
		this.strokeTimelineCache[key] = timeline
		return timeline
	}

	drawStrokePath(pathString, color, canvasSize) {
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

	buildStrokePath(pathString, canvasSize) {
		if (!pathString) return false
		const cmds = parseSvgPath(pathString)
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

	drawStrokeProgressClipped(pathString, mappedMedian, ratio, color, width, canvasSize) {
		if (!pathString || !mappedMedian || !mappedMedian.length) return
		const ctx = this.ctx
		ctx.save()
		const ok = this.buildStrokePath(pathString, canvasSize)
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

	drawState(completedStrokeCount = 0, currentStrokeRatio = 0) {
		if (this.destroyed) return
		const { canvasSize } = this.getSize()
		const outlineColor = this.option.outlineColor || '#d5d5d5'
		const strokeColor = this.option.strokeColor || '#2c3e50'
		const currentColor = this.option.currentColor || '#e74c3c'
		const strokeWidth = Math.max(8, Math.round(canvasSize * 0.05))
		const medians = this.charData?.medians || []
		const strokePaths = this.charData?.strokes || []

		const ctx = this.ctx
		ctx.clearRect(0, 0, canvasSize, canvasSize)
		this.drawGrid(canvasSize)

		const testCompleted = this.type === TYPE.TEST ? this.testState.activeStroke : completedStrokeCount
		// 反向绘制：后写笔画先画，保证先写笔画始终位于最上层
		for (let i = medians.length - 1; i >= 0; i--) {
			const mapped = medians[i].map((p) => this.mapPoint(p, canvasSize))
			// 底层用真实笔画轮廓，贴近标准字形
			this.drawStrokePath(strokePaths[i], outlineColor, canvasSize)

			// normal 模式直接完整成字；stroke/test 保留受控绘制
			if (this.type === TYPE.NORMAL) {
				this.drawStrokePath(strokePaths[i], strokeColor, canvasSize)
				continue
			}

			if (i < testCompleted) {
				this.drawStrokePath(strokePaths[i], strokeColor, canvasSize)
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
				this.drawStrokePath(strokePaths[i], guideColor, canvasSize)
			} else if (i === testCompleted && this.type === TYPE.ANIMATION) {
				// 当前笔接近结束时，直接填充完整轮廓，避免“竖钩拐点没写到”的视觉缺口
				if (currentStrokeRatio >= 0.995) {
					this.drawStrokePath(strokePaths[i], strokeColor, canvasSize)
					continue
				}
				// 当前笔画仍使用中线渐进，保证一笔一笔写出的动态感
				this.drawStrokePath(strokePaths[i], 'rgba(44,62,80,0.18)', canvasSize)
				this.drawStrokeProgressClipped(
					strokePaths[i],
					mapped,
					currentStrokeRatio,
					currentColor,
					Math.round(strokeWidth * 1.95),
					canvasSize
				)
				this.drawStrokeProgressClipped(
					strokePaths[i],
					mapped,
					currentStrokeRatio,
					currentColor,
					strokeWidth,
					canvasSize
				)
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
		const delayBetweenStrokes = Number(this.animationOpt.delayBetweenStrokes) || 280
		const loopAnimate = this.animationOpt.loopAnimate !== false
		const delayBetweenLoops = Number(this.animationOpt.delayBetweenLoops) || 1000
		const speed = Number(this.animationOpt.strokeAnimationSpeed) || 1
		const strokeDuration = Math.max(
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

			if (this.phase === 'drawing') {
				let currentLen = this.strokeProgress * totalLen
				const deltaLen = (dt / strokeDuration) * totalLen
				let nextLen = Math.min(totalLen, currentLen + deltaLen)

				const nextCornerLen = timeline.cornerLens[this.cornerPauseCursor + 1]
				if (
					typeof nextCornerLen === 'number' &&
					nextLen >= nextCornerLen &&
					nextCornerLen > currentLen
				) {
					this.cornerPauseCursor += 1
					this.notifyStrokeCorner(this.strokeIndex, this.cornerPauseCursor)
				}

				this.strokeProgress = Math.min(1, nextLen / totalLen)
				if (this.strokeProgress >= 1 && this.phase !== 'waiting') {
					const fromSeg = this.cornerPauseCursor + 2
					this.phase = 'waiting'
					this.waitElapsed = 0
					this.notifyStrokeTrailSegments(this.strokeIndex, fromSeg)
				}
			} else {
				this.waitElapsed += dt
				this.strokeProgress = 1
				if (this.waitElapsed >= delayBetweenStrokes && !this.strokeAudioHold) {
					const nextIndex = this.strokeIndex + 1
					this.strokeIndex = nextIndex
					this.strokeElapsed = 0
					this.strokeProgress = 0
					this.phase = 'drawing'
					this.cornerPauseCursor = -1
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

			this.drawState(this.strokeIndex, this.strokeProgress)
			this._scheduleAnimationTick(tick)
		}

		this.strokeIndex = 0
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
	if (typeof url === 'string' && url.trim()) {
		HANZI_WRITER_DATA_BASE = url.replace(/\/$/, '')
	}
}
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
