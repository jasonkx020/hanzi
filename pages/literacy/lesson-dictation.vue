<template>
	<view class="page dictation-page">
		<view v-if="phase === 'run'" class="run-shell">
			<view class="top-bar">
				<image class="top-logo" src="/static/logo.png" mode="aspectFit" />
				<view class="top-meta">
					<text class="top-progress">听写 {{ qIndex + 1 }}/{{ totalQ }}</text>
					<text class="top-lesson">{{ lessonTitle }}</text>
				</view>
				<view class="top-hear" @click="onHearAgain">
					<text class="top-hear-icon">🔊</text>
					<text class="top-hear-txt">再听</text>
				</view>
			</view>

			<view class="prompt-row">
				<text class="prompt-mystery">？</text>
				<text v-if="strokeTotal > 0" class="prompt-stroke">第 {{ currentStrokeNo }}/{{ strokeTotal }} 笔</text>
				<text v-else class="prompt-stroke">听音写字</text>
			</view>

			<view class="canvas-area">
				<view class="canvas-shell">
					<canvas
						v-if="canvasReady"
						id="lesson-dictation-canvas"
						canvas-id="lesson-dictation-canvas"
						class="dictation-canvas"
						disable-scroll
						:style="canvasStyle"
						@touchstart="onTouchStart"
						@touchmove="onTouchMove"
						@touchend="onTouchEnd"
						@touchcancel="onTouchCancel"
					/>
					<text v-else class="canvas-fallback">…</text>
				</view>
			</view>

			<view class="bottom-dock">
				<text
					class="feedback-text"
					:class="feedbackType === 'bad' ? 'feedback-text--bad' : feedbackType === 'ok' ? 'feedback-text--ok' : ''"
				>{{ feedbackText }}</text>
				<view class="action-row">
					<button class="action-btn action-btn--ghost" size="mini" :disabled="!canvasReady" @click="resetWriting">
						重写
					</button>
					<button class="action-btn action-btn--primary" size="mini" :disabled="!canvasReady" @click="onManualComplete">
						写好了
					</button>
				</view>
			</view>
		</view>

		<view v-else class="done-shell">
			<image class="done-logo" src="/static/logo.png" mode="aspectFit" />
			<text class="done-title">听写完成</text>
			<text class="done-score">笔顺全对 {{ score }}/{{ totalQ }} 字</text>
			<text class="done-msg">{{ doneEncourage }}</text>
			<button class="back-btn" type="primary" @click="goBackLesson">回字卡</button>
		</view>
	</view>
</template>

<script>
import { takeLessonDictationTransfer } from '@/utils/lesson-mode-session.js'
import { addCharWrongCount, markCharLearned } from '@/utils/user-progress-storage.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { playLessonTargetReading } from '@/utils/lesson-mode-play-target.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import drawNative from '@/utils/draw-native.js'
import { getCncharStrokeNameList } from '@/utils/stroke-order-audio.js'
function firstHanzi(text) {
	const s = String(text || '').trim()
	const m = s.match(/[\u4e00-\u9fff]/)
	return m ? m[0] : ''
}

function orderedUniqueRows(rows) {
	const seen = new Set()
	const out = []
	for (const r of rows || []) {
		const h = firstHanzi(r && r.hanzi)
		if (!h || seen.has(h)) continue
		seen.add(h)
		out.push({
			hanzi: h,
			pinyin: r && r.pinyin != null ? String(r.pinyin) : ''
		})
	}
	return out
}

export default {
	data() {
		return {
			phase: 'run',
			lessonTitle: '',
			targets: [],
			qIndex: 0,
			score: 0,
			totalQ: 0,
			targetHanzi: '',
			targetPinyin: '',
			autoHearTimer: null,
			advanceTimer: null,
			canvasReady: false,
			canvasLength: 168,
			writer: null,
			mountGen: 0,
			attachTimer: null,
			strokeNames: [],
			strokeTotal: 0,
			activeStroke: 0,
			completed: false,
			feedbackText: '听读音，在格子里按笔顺写',
			feedbackType: '',
			/** 当前字本轮书写中的笔顺/笔画错误次数 */
			charStrokeMistakes: 0,
			advancing: false
		}
	},
	computed: {
		canvasStyle() {
			const px = this.canvasLength + 30
			return { width: px + 'px', height: px + 'px', display: 'block' }
		},
		currentStrokeNo() {
			if (this.completed) return this.strokeTotal
			return Math.min(this.strokeTotal || 1, this.activeStroke + 1)
		},
		doneEncourage() {
			if (!this.totalQ) return '继续加油！'
			const r = this.score / this.totalQ
			if (r >= 1) return '全写对啦！'
			if (r >= 0.6) return '很棒，多练几遍更熟。'
			return '先跟读再来听写也很好。'
		}
	},
	onUnload() {
		this.clearAutoHear()
		this.clearAdvanceTimer()
		this.teardownWriter()
		stopLocalPinyinAudio()
	},
	onHide() {
		stopLocalPinyinAudio()
	},
	onLoad() {
		this.calcCanvasSize()
		const payload = takeLessonDictationTransfer()
		if (!payload || !Array.isArray(payload.rows) || !payload.rows.length) {
			uni.showToast({ title: '题目数据已失效，请从课次字卡重新进入', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1600)
			return
		}
		const title = String(payload.lessonTitle || '').trim()
		if (title) {
			this.lessonTitle = title
			const nav = title.length > 14 ? `${title.slice(0, 13)}…` : title
			uni.setNavigationBarTitle({ title: `${nav} · 听写` })
		} else {
			this.lessonTitle = '本课生字'
			uni.setNavigationBarTitle({ title: '听写' })
		}
		const pool = orderedUniqueRows(payload.rows)
		if (!pool.length) {
			uni.showToast({ title: '本课无生字可听写', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1800)
			return
		}
		this.targets = pool
		this.totalQ = pool.length
		this.qIndex = 0
		this.score = 0
		this.phase = 'run'
		this.loadQuestion(0)
	},
	methods: {
		calcCanvasSize() {
			try {
				const sys = uni.getSystemInfoSync()
				const h = Number(sys.windowHeight) || 667
				const w = Number(sys.windowWidth) || 375
				const reserved = 168
				const avail = h - reserved
				const maxW = w - 48
				const side = Math.min(avail, maxW, 220)
				this.canvasLength = Math.max(140, Math.floor(side - 30))
			} catch (_) {
				this.canvasLength = 168
			}
		},
		clearAutoHear() {
			if (this.autoHearTimer != null) {
				clearTimeout(this.autoHearTimer)
				this.autoHearTimer = null
			}
		},
		clearAdvanceTimer() {
			if (this.advanceTimer != null) {
				clearTimeout(this.advanceTimer)
				this.advanceTimer = null
			}
		},
		scheduleAutoHear() {
			this.clearAutoHear()
			this.autoHearTimer = setTimeout(() => {
				this.autoHearTimer = null
				if (this.phase === 'run' && this.targetHanzi) this.playTargetSound()
			}, 450)
		},
		curriculumDims() {
			const p = getCurriculumPrefs()
			const g = Number(p.grade)
			return {
				textbook_version_id: p.textbook_version_id,
				grade: Number.isFinite(g) && g >= 0 ? g : 1,
				semester: p.semester === '下' ? '下' : '上'
			}
		},
		loadQuestion(idx) {
			const t = this.targets[idx]
			if (!t) {
				this.phase = 'done'
				return
			}
			this.clearAdvanceTimer()
			this.advancing = false
			this.targetHanzi = t.hanzi
			this.targetPinyin = t.pinyin != null ? String(t.pinyin) : ''
			this.completed = false
			this.activeStroke = 0
			this.charStrokeMistakes = 0
			this.feedbackType = ''
			this.feedbackText = '听读音，在格子里按笔顺写'
			this.strokeNames = getCncharStrokeNameList(this.targetHanzi)
			this.strokeTotal = this.strokeNames.length || 0
			this.mountTestWriter()
			this.scheduleAutoHear()
		},
		async playTargetSound() {
			if (this.phase !== 'run' || !this.targetHanzi) return
			stopLocalPinyinAudio()
			await playLessonTargetReading(this.targetHanzi, this.targetPinyin)
		},
		onHearAgain() {
			if (this.phase !== 'run' || !this.targetHanzi) return
			this.clearAutoHear()
			this.playTargetSound()
		},
		sharedDrawOpts() {
			return {
				vm: this,
				style: {
					length: this.canvasLength,
					charInsetRatio: 0.12,
					strokeColor: '#2c3e50',
					outlineColor: '#d5d5d5',
					currentColor: '#5c9ce6',
					drawingColor: '#5c9ce6',
					drawingWidth: 5
				},
				line: {
					show: true,
					borderColor: '#b8d4f0',
					centerColor: '#c5ddf5',
					diagonalColor: '#dceaf8'
				},
				watermark: { text: '', alpha: 0 }
			}
		},
		teardownWriter() {
			if (this.attachTimer) {
				clearTimeout(this.attachTimer)
				this.attachTimer = null
			}
			this.mountGen++
			if (this.writer && typeof this.writer.destroy === 'function') {
				this.writer.destroy()
			}
			this.writer = null
			this.canvasReady = false
		},
		scheduleMount(fn) {
			this.teardownWriter()
			this.canvasReady = true
			const token = ++this.mountGen
			const attach = () => {
				this.attachTimer = null
				if (token !== this.mountGen) return
				fn()
			}
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.attachTimer = setTimeout(attach, 48)
				})
			})
		},
		mountTestWriter() {
			const ch = this.targetHanzi
			if (!ch) return
			this.scheduleMount(() => {
				try {
					const vm = this
					this.writer = drawNative(ch, {
						...this.sharedDrawOpts(),
						el: '#lesson-dictation-canvas',
						type: drawNative.TYPE.TEST,
						animation: { autoAnimate: false },
						test: {
							testStrictOrder: true,
							testDirectionWeight: 0.32,
							testScoreThreshold: 26,
							showHintAfterMisses: 2,
							onTestStatus: ({ index, status, data }) => {
								vm.handleTestStatus(index, status, data || {})
							}
						}
					})
					const total = this.writer?.charData?.medians?.length || 0
					if (total) this.strokeTotal = total
					if (typeof this.writer.updateCanvasRect === 'function') {
						this.writer.updateCanvasRect()
					}
				} catch (e) {
					console.warn('[lesson-dictation] mount test', e)
					uni.showToast({ title: '该字暂不支持听写', icon: 'none' })
					setTimeout(() => this.advanceQuestion(), 1200)
				}
			})
		},
		handleTestStatus(index, status, data = {}) {
			if (this.phase !== 'run' || this.advancing) return
			const strokeNo = Number(index) + 1
			if (status === 'correct') {
				this.feedbackType = 'ok'
				this.activeStroke = strokeNo
				this.feedbackText =
					strokeNo >= this.strokeTotal
						? '最后一笔对了'
						: `第 ${strokeNo} 笔对了，继续`
				return
			}
			if (status === 'mistake') {
				this.charStrokeMistakes += 1
				if (data.reason === 'tooShort') {
					this.feedbackType = 'bad'
					this.feedbackText = '笔画太短，多拖一段再松手'
					return
				}
				const expectedNo = Number(data.expectedStroke) + 1
				this.feedbackType = 'bad'
				this.feedbackText = `应按笔顺写第 ${expectedNo} 笔`
				return
			}
			if (status === 'complete') {
				this.onCharRoundFinished()
			}
		},
		charRoundMistakeCount() {
			const local = Number(this.charStrokeMistakes) || 0
			const fromWriter = Number(this.writer?.testState?.totalMistakes) || 0
			return Math.max(local, fromWriter)
		},
		onCharRoundFinished() {
			if (this.advancing || this.completed) return
			if (this.charRoundMistakeCount() > 0) {
				this.onCharWriteRetryRequired()
				return
			}
			this.onCharWriteSuccess()
		},
		onCharWriteRetryRequired() {
			if (this.advancing) return
			this.completed = false
			const n = this.charRoundMistakeCount()
			const ch = this.targetHanzi
			this.feedbackType = 'bad'
			this.feedbackText =
				n > 1
					? `本轮有 ${n} 处笔顺问题，请按顺序重写`
					: '笔顺有误，请按顺序重写一遍'
			try {
				addCharWrongCount(this.targetHanzi, 1, this.curriculumDims())
			} catch (e) {
				console.warn('[lesson-dictation] addCharWrongCount', e)
			}
			uni.showToast({
				title: ch ? `「${ch}」笔顺有误，请重写` : '笔顺有误，请重写',
				icon: 'none',
				duration: 2400
			})
			setTimeout(() => this.resetWritingForRetry(), 520)
		},
		resetWritingForRetry() {
			if (this.phase !== 'run' || this.advancing) return
			this.charStrokeMistakes = 0
			this.completed = false
			this.activeStroke = 0
			this.feedbackType = ''
			this.feedbackText = '已清空，请再听一遍并按笔顺写'
			if (this.writer && typeof this.writer.resetStrokeTest === 'function') {
				this.writer.resetStrokeTest()
				this.scheduleAutoHear()
				return
			}
			this.mountTestWriter()
			this.scheduleAutoHear()
		},
		onCharWriteSuccess() {
			if (this.advancing || this.completed) return
			this.completed = true
			this.activeStroke = this.strokeTotal
			this.feedbackType = 'ok'
			this.feedbackText = `笔顺全对！是「${this.targetHanzi}」`
			this.score++
			try {
				markCharLearned(this.targetHanzi, this.curriculumDims())
			} catch (e) {
				console.warn('[lesson-dictation] markCharLearned', e)
			}
			uni.showToast({ title: '笔顺全对', icon: 'success', duration: 800 })
			this.clearAdvanceTimer()
			this.advanceTimer = setTimeout(() => {
				this.advanceTimer = null
				this.advanceQuestion()
			}, 850)
		},
		onManualComplete() {
			if (this.phase !== 'run' || this.advancing) return
			if (this.completed) {
				this.advanceQuestion()
				return
			}
			const total = this.strokeTotal || this.writer?.charData?.medians?.length || 0
			const doneStrokes = this.writer?.testState?.activeStroke ?? this.activeStroke
			if (total > 0 && doneStrokes >= total) {
				this.onCharRoundFinished()
				return
			}
			const remaining = Math.max(0, total - doneStrokes)
			uni.showToast({
				title: remaining > 0 ? `还有 ${remaining} 笔` : '请按笔顺写完',
				icon: 'none'
			})
		},
		resetWriting() {
			if (this.phase !== 'run' || this.advancing) return
			this.resetWritingForRetry()
		},
		advanceQuestion() {
			if (this.advancing) return
			this.advancing = true
			this.clearAutoHear()
			this.clearAdvanceTimer()
			this.teardownWriter()
			this.qIndex++
			if (this.qIndex >= this.totalQ) {
				this.phase = 'done'
				this.advancing = false
				return
			}
			this.advancing = false
			this.loadQuestion(this.qIndex)
		},
		pickCanvasTouch(e) {
			if (!e) return null
			return (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || null
		},
		onTouchStart(e) {
			if (this.completed || this.advancing) return
			const t = this.pickCanvasTouch(e)
			if (t && this.writer?.handleTouchStart) {
				this.writer.handleTouchStart(t, e.detail)
			}
		},
		onTouchMove(e) {
			if (this.completed || this.advancing) return
			const t = this.pickCanvasTouch(e)
			if (t && this.writer?.handleTouchMove) {
				this.writer.handleTouchMove(t, e.detail)
			}
		},
		onTouchEnd() {
			if (this.completed || this.advancing) return
			if (this.writer?.handleTouchEnd) {
				this.writer.handleTouchEnd()
			}
		},
		onTouchCancel() {
			this.onTouchEnd()
		},
		goBackLesson() {
			this.clearAutoHear()
			this.clearAdvanceTimer()
			this.teardownWriter()
			stopLocalPinyinAudio()
			uni.navigateBack()
		}
	}
}
</script>

<style scoped>
.dictation-page {
	height: 100vh;
	max-height: 100vh;
	overflow: hidden;
	box-sizing: border-box;
	padding: 8rpx 20rpx 0;
	padding-bottom: constant(safe-area-inset-bottom);
	padding-bottom: env(safe-area-inset-bottom);
	background: linear-gradient(180deg, #e8f4fc 0%, #f5faff 28%, var(--meng-page-bg, #f6f3ec) 100%);
}

.run-shell {
	height: 100%;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.top-bar {
	flex-shrink: 0;
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 8rpx 12rpx;
	margin-bottom: 6rpx;
	border-radius: 20rpx;
	background: rgba(255, 255, 255, 0.92);
	border: 1rpx solid rgba(144, 202, 249, 0.45);
}

.top-logo {
	width: 52rpx;
	height: 52rpx;
	flex-shrink: 0;
	margin-right: 12rpx;
}

.top-meta {
	flex: 1;
	min-width: 0;
}

.top-progress {
	display: block;
	font-size: 28rpx;
	font-weight: 800;
	color: #1565c0;
	line-height: 1.2;
}

.top-lesson {
	display: block;
	font-size: 22rpx;
	color: #78909c;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: 1.25;
}

.top-hear {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 6rpx 14rpx;
	border-radius: 14rpx;
	background: linear-gradient(135deg, #bbdefb, #90caf9);
}

.top-hear:active {
	opacity: 0.9;
}

.top-hear-icon {
	font-size: 28rpx;
	line-height: 1;
}

.top-hear-txt {
	font-size: 20rpx;
	color: #0d47a1;
	font-weight: 700;
}

.prompt-row {
	flex-shrink: 0;
	display: flex;
	flex-direction: row;
	align-items: baseline;
	justify-content: center;
	gap: 16rpx;
	margin-bottom: 4rpx;
}

.prompt-mystery {
	font-size: 44rpx;
	font-weight: 800;
	color: #90caf9;
	line-height: 1;
}

.prompt-stroke {
	font-size: 24rpx;
	color: #1565c0;
	font-weight: 600;
}

.canvas-area {
	flex: 1;
	min-height: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.canvas-shell {
	padding: 8rpx;
	border-radius: 20rpx;
	background: #fff;
	border: 2rpx solid #b8d4f0;
	box-shadow: 0 6rpx 18rpx rgba(21, 101, 192, 0.08);
}

.dictation-canvas {
	display: block;
	border-radius: 6rpx;
}

.canvas-fallback {
	display: block;
	width: 160rpx;
	height: 160rpx;
	line-height: 160rpx;
	text-align: center;
	font-size: 28rpx;
	color: #90a4ae;
}

.bottom-dock {
	flex-shrink: 0;
	padding: 10rpx 0 12rpx;
}

.feedback-text {
	display: block;
	font-size: 24rpx;
	color: #546e7a;
	line-height: 1.4;
	text-align: center;
	margin-bottom: 10rpx;
	padding: 0 8rpx;
}

.feedback-text--ok {
	color: #2e7d32;
	font-weight: 600;
}

.feedback-text--bad {
	color: #e65100;
	font-weight: 600;
}

.action-row {
	display: flex;
	flex-direction: row;
	gap: 12rpx;
}

.action-btn {
	flex: 1;
	margin: 0 !important;
	padding: 0 16rpx !important;
	height: 64rpx !important;
	line-height: 64rpx !important;
	font-size: 26rpx !important;
	border-radius: 16rpx !important;
}

.action-btn--ghost {
	background: #fff !important;
	border: 2rpx solid #90caf9 !important;
	color: #1565c0 !important;
}

.action-btn--primary {
	background: linear-gradient(135deg, #64b5f6, #42a5f5) !important;
	color: #fff !important;
	border: none !important;
	font-weight: 700 !important;
}

.done-shell {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 24rpx;
	box-sizing: border-box;
}

.done-logo {
	width: 88rpx;
	height: 88rpx;
	margin-bottom: 16rpx;
}

.done-title {
	font-size: 36rpx;
	font-weight: 800;
	color: #37474f;
	margin-bottom: 12rpx;
}

.done-score {
	font-size: 30rpx;
	color: #1565c0;
	font-weight: 700;
	margin-bottom: 12rpx;
}

.done-msg {
	font-size: 26rpx;
	color: #78909c;
	text-align: center;
	margin-bottom: 28rpx;
}

.back-btn {
	width: 60%;
	max-width: 360rpx;
	border-radius: 18rpx;
	font-size: 28rpx;
	background: linear-gradient(135deg, #64b5f6, #42a5f5);
}
</style>
