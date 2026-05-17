<template>
	<view class="stroke-lab-page">
		<view class="lab-hero">
			<meng-avatar pose="book" size="sm" />
			<view class="lab-hero-text">
				<text class="lab-hero-title">笔顺实验室</text>
				<text class="lab-hero-sub">看笔顺、分步写、练一练</text>
			</view>
		</view>
		<view class="lab-card lab-input-card">
			<view class="lab-input-row">
				<text class="lab-input-label">要练的字</text>
				<input
					:value="inputWord"
					class="hanzi-input"
					type="text"
					maxlength="1"
					placeholder="输入一字"
					@focus="onPracticeInputFocus"
					@blur="onPracticeInputBlur"
					@input="onPracticeCharInput"
				/>
			</view>
		</view>

		<view class="lab-card lab-stage-card">
			<view class="lab-canvas-shell">
				<canvas
					v-if="strokeReady"
					canvas-id="stroke-box"
					id="stroke-box"
					class="stroke-canvas"
					disable-scroll
					:style="strokeCanvasInlineStyle"
					@touchstart="onCanvasTouchStart"
					@touchmove="onCanvasTouchMove"
					@touchend="onCanvasTouchEnd"
				/>
				<text v-else class="fallback-char">{{ displayHanzi }}</text>
			</view>

			<text v-if="labMode === 'test'" class="lab-stage-hint">按住田字格书写，松手自动判断笔顺</text>
			<text v-else-if="labMode === 'step'" class="lab-stage-hint">点「下一笔」逐笔显示</text>
			<text v-else class="lab-stage-hint">笔顺自动循环播放，可用下方按钮控制</text>

			<view
				v-if="labMode === 'test' && testFeedback"
				class="lab-test-badge"
				:class="testFeedbackType === 'bad' ? 'lab-test-badge--bad' : 'lab-test-badge--ok'"
			>
				<text class="lab-test-badge-icon">{{ testFeedback }}</text>
			</view>
		</view>

		<scroll-view scroll-x class="lab-mode-scroll" :show-scrollbar="false">
			<view class="lab-mode-row">
				<view
					class="lab-mode-chip lab-mode-chip--anim"
					:class="{ 'lab-mode-chip--on': labMode === 'animation' }"
					@click="setLabMode('animation')"
				>
					<text class="lab-chip-emoji">🎬</text>
					<text class="lab-chip-text">笔顺动画</text>
				</view>
				<view
					class="lab-mode-chip lab-mode-chip--write"
					:class="{ 'lab-mode-chip--on': labMode === 'test' }"
					@click="setLabMode('test')"
				>
					<text class="lab-chip-emoji">✏️</text>
					<text class="lab-chip-text">书写练习</text>
				</view>
				<view
					class="lab-mode-chip lab-mode-chip--step"
					:class="{ 'lab-mode-chip--on': labMode === 'step' }"
					@click="setLabMode('step')"
				>
					<text class="lab-chip-emoji">👣</text>
					<text class="lab-chip-text">分步笔画</text>
				</view>
			</view>
		</scroll-view>

		<view v-if="labMode === 'animation'" class="lab-tool-row">
			<view class="lab-pill lab-pill--sun" @click="startAnimation">
				<text class="lab-pill-emoji">▶️</text>
				<text class="lab-pill-label">播放</text>
			</view>
			<view class="lab-pill lab-pill--lavender" @click="pauseAnimation">
				<text class="lab-pill-emoji">⏸️</text>
				<text class="lab-pill-label">暂停</text>
			</view>
			<view class="lab-pill lab-pill--leaf" @click="resumeAnimation">
				<text class="lab-pill-emoji">⏯️</text>
				<text class="lab-pill-label">继续</text>
			</view>
			<view class="lab-pill lab-pill--pink" @click="restartAnimation">
				<text class="lab-pill-emoji">🔄</text>
				<text class="lab-pill-label">重播</text>
			</view>
		</view>

		<view v-else-if="labMode === 'step'" class="lab-tool-row">
			<view class="lab-pill lab-pill--sun lab-pill--wide" @click="drawNextStroke">
				<text class="lab-pill-emoji">👉</text>
				<text class="lab-pill-label">下一笔</text>
			</view>
			<view class="lab-pill lab-pill--pink lab-pill--wide" @click="restartAnimation">
				<text class="lab-pill-emoji">🐣</text>
				<text class="lab-pill-label">从头开始</text>
			</view>
		</view>

		<view v-if="labMode === 'test' && testHistory.length" class="lab-card lab-log-card">
			<text class="lab-log-title">书写记录</text>
			<text
				v-for="(item, idx) in testHistory"
				:key="`${idx}-${item}`"
				class="lab-log-item"
				:class="logItemClass(item)"
			>{{ item }}</text>
		</view>
	</view>
</template>

<script>
import drawNative from '@/utils/draw-native.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { addCharWrongCount } from '@/utils/user-progress-storage.js'
import MengAvatar from '@/components/meng-avatar.vue'
import { MENG_VOICE, playMengmengVoice, stopMengmengVoice } from '@/utils/mengmeng-voice.js'

const STROKE_DRAW_LENGTH = 200

const LAB_DRAW_MODE = {
	animation: 'animation',
	test: 'test',
	step: 'stroke'
}

export default {
	components: { MengAvatar },
	data() {
		return {
			word: '人',
			inputWord: '人',
			labMode: 'animation',
			strokeReady: false,
			drawWriter: null,
			wordNotFoundRegistered: false,
			testFeedback: '',
			testFeedbackType: '',
			testHistory: [],
			testWrongAddedAt: 0,
			strokeMountGen: 0,
			strokeAttachTimer: null
		}
	},
	computed: {
		displayHanzi() {
			const c = String(this.word || '').trim().charAt(0)
			return c || '—'
		},
		strokeCanvasInlineStyle() {
			const px = STROKE_DRAW_LENGTH + 30
			return {
				width: px + 'px',
				height: px + 'px',
				display: 'block'
			}
		}
	},
	onShow() {
		playMengmengVoice(MENG_VOICE.STROKE_WELCOME, { debounceMs: 500 }).catch(() => {})
	},
	onLoad(query) {
		const fromHanzi = query?.hanzi ? decodeURIComponent(query.hanzi) : ''
		const fromWord = query?.word ? decodeURIComponent(query.word) : ''
		const incoming = (fromHanzi || fromWord).match(/[\u4e00-\u9fff]/)?.[0]
		if (incoming) {
			this.word = incoming
			this.inputWord = incoming
		}
		const mode = String(query?.mode || '').toLowerCase()
		if (mode === 'test') this.labMode = 'test'
		else if (mode === 'stroke' || mode === 'step') this.labMode = 'step'
	},
	onReady() {
		this.registerWordNotFoundHook()
		this.runDraw(LAB_DRAW_MODE[this.labMode] || 'animation')
	},
	onHide() {
		stopMengmengVoice()
	},
	onUnload() {
		stopMengmengVoice()
		if (this.strokeAttachTimer) {
			clearTimeout(this.strokeAttachTimer)
			this.strokeAttachTimer = null
		}
		this.strokeMountGen++
		if (this.drawWriter && typeof this.drawWriter.destroy === 'function') {
			this.drawWriter.destroy()
		}
	},
	methods: {
		logItemClass(item) {
			const s = String(item || '')
			if (s.includes('✓')) return 'lab-log-item--ok'
			if (s.includes('✗')) return 'lab-log-item--bad'
			return ''
		},
		setLabMode(mode) {
			if (this.labMode === mode) return
			this.labMode = mode
			this.runDraw(LAB_DRAW_MODE[mode] || 'animation')
			const voiceId =
				mode === 'test'
					? MENG_VOICE.STROKE_MODE_WRITE
					: mode === 'animation'
						? MENG_VOICE.STROKE_MODE_ANIM
						: ''
			if (voiceId) playMengmengVoice(voiceId, { debounceMs: 300 }).catch(() => {})
		},
		pickLastHanziFromInput(raw) {
			const all = String(raw || '').match(/[\u4e00-\u9fff]/g)
			if (!all || !all.length) return ''
			return all[all.length - 1]
		},
		onPracticeInputFocus() {
			this.inputWord = ''
		},
		onPracticeInputBlur() {
			if (!this.pickLastHanziFromInput(this.inputWord)) {
				this.inputWord = this.word
			}
		},
		onPracticeCharInput(e) {
			const raw = e?.detail?.value != null ? String(e.detail.value) : ''
			const ch = this.pickLastHanziFromInput(raw)
			if (!ch) {
				if (!String(raw || '').trim()) {
					this.$nextTick(() => {
						this.inputWord = ''
					})
				}
				return
			}
			if (this.inputWord !== ch || raw.length > 1) {
				this.inputWord = ch
			}
			if (ch === this.word) return
			this.word = ch
			this.runDraw(LAB_DRAW_MODE[this.labMode] || 'animation')
		},
		registerWordNotFoundHook() {
			if (this.wordNotFoundRegistered) return
			drawNative.onWordNotFound(() => {})
			this.wordNotFoundRegistered = true
		},
		destroyWriter() {
			if (this.drawWriter && typeof this.drawWriter.destroy === 'function') {
				this.drawWriter.destroy()
			}
			this.drawWriter = null
		},
		runDraw(drawMode = 'animation') {
			try {
				if (typeof drawNative !== 'function') {
					this.strokeReady = false
					return
				}
				this.strokeReady = true
				this.destroyWriter()
				if (this.strokeAttachTimer) {
					clearTimeout(this.strokeAttachTimer)
					this.strokeAttachTimer = null
				}
				const token = ++this.strokeMountGen
				const bindMode = drawMode
				const attach = () => {
					this.strokeAttachTimer = null
					if (token !== this.strokeMountGen) return
					this.mountStrokeWriter(bindMode)
				}
				this.$nextTick(() => {
					this.$nextTick(() => {
						this.strokeAttachTimer = setTimeout(attach, 80)
					})
				})
			} catch (e) {
				this.strokeReady = false
				console.warn('[stroke-lab] init failed', e)
			}
		},
		mountStrokeWriter(mode = 'animation') {
			try {
				const vm = this
				const typeMap = {
					normal: drawNative.TYPE.NORMAL,
					animation: drawNative.TYPE.ANIMATION,
					stroke: drawNative.TYPE.STROKE,
					test: drawNative.TYPE.TEST
				}
				const targetType = typeMap[mode] || drawNative.TYPE.ANIMATION
				const isAnim = targetType === drawNative.TYPE.ANIMATION
				this.resetTestPanel()
				this.drawWriter = drawNative(this.word, {
					el: '#stroke-box',
					vm,
					type: targetType,
					style: {
						length: STROKE_DRAW_LENGTH,
						charInsetRatio: 0.12,
						strokeColor: '#2c3e50',
						outlineColor: '#e8d5c8',
						currentColor: '#ff7043',
						drawingColor: '#ff7043',
						drawingWidth: 5,
						guideStrokeColor: '#ff6b9d',
						highlightColor: '#ffab40'
					},
					line: {
						show: true,
						borderColor: '#e0cfc0',
						centerColor: '#d4c4b4',
						diagonalColor: '#ebe0d6'
					},
					watermark: { text: '', alpha: 0 },
					animation: {
						autoAnimate: isAnim,
						loopAnimate: isAnim,
						strokeAnimationSpeed: 0.55,
						strokeDurationMs: 880,
						delayBetweenStrokes: 280,
						delayBetweenLoops: 900
					},
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
				if (typeof this.drawWriter.updateCanvasRect === 'function') {
					this.drawWriter.updateCanvasRect()
				}
			} catch (e) {
				this.strokeReady = false
				uni.showToast({ title: '该字暂不支持', icon: 'none' })
				console.warn('[stroke-lab] mount failed', e)
			}
		},
		startAnimation() {
			if (this.drawWriter?.startAnimation) this.drawWriter.startAnimation()
		},
		pauseAnimation() {
			if (this.drawWriter?.pauseAnimation) this.drawWriter.pauseAnimation()
		},
		resumeAnimation() {
			if (this.drawWriter?.resumeAnimation) this.drawWriter.resumeAnimation()
		},
		restartAnimation() {
			if (this.drawWriter?.restartAnimation) this.drawWriter.restartAnimation()
		},
		drawNextStroke() {
			if (this.drawWriter?.drawNextStroke) {
				playMengmengVoice(MENG_VOICE.STROKE_HINT_PLAY, { minGapMs: 700 }).catch(() => {})
				this.drawWriter.drawNextStroke(() => {})
			}
		},
		resetTestPanel() {
			this.testFeedback = ''
			this.testFeedbackType = ''
			this.testHistory = []
			this.testWrongAddedAt = 0
		},
		getPracticeChar() {
			return String(this.word || '').match(/[\u4e00-\u9fff]/)?.[0] || ''
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
		pushTestHistory(text) {
			this.testHistory = [...this.testHistory, text].slice(-10)
		},
		handleTestStatus(index, status, data = {}) {
			const strokeNo = Number(index) + 1
			if (status === 'correct') {
				this.testFeedbackType = 'ok'
				this.testFeedback = '✓'
				this.pushTestHistory(`第 ${strokeNo} 笔 ✓`)
				playMengmengVoice(MENG_VOICE.STROKE_WRITE_OK, { minGapMs: 900 }).catch(() => {})
				return
			}
			if (status === 'mistake') {
				const expectedNo = Number(data.expectedStroke) + 1
				this.testFeedbackType = 'bad'
				this.testFeedback = '✗'
				this.pushTestHistory(`第 ${strokeNo} 笔 ✗ → 应收第 ${expectedNo} 笔`)
				const now = Date.now()
				if (now - this.testWrongAddedAt > 250) {
					const targetChar = this.getPracticeChar()
					if (targetChar) addCharWrongCount(targetChar, 1, this.curriculumDims())
					this.testWrongAddedAt = now
				}
				playMengmengVoice(MENG_VOICE.STROKE_WRITE_WRONG, { minGapMs: 800 }).catch(() => {})
				return
			}
			if (status === 'complete') {
				this.testFeedbackType = 'ok'
				this.testFeedback = '✓'
				this.pushTestHistory('全部笔画通过')
				playMengmengVoice(MENG_VOICE.STROKE_ALL_DONE, { minGapMs: 2000 }).catch(() => {})
			}
		},
		pickCanvasTouch(e) {
			if (!e) return null
			return (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || null
		},
		onCanvasTouchStart(e) {
			if (!this.drawWriter?.handleTouchStart) return
			const t = this.pickCanvasTouch(e)
			if (t) this.drawWriter.handleTouchStart(t, e.detail)
		},
		onCanvasTouchMove(e) {
			if (!this.drawWriter?.handleTouchMove) return
			const t = this.pickCanvasTouch(e)
			if (t) this.drawWriter.handleTouchMove(t, e.detail)
		},
		onCanvasTouchEnd() {
			if (this.drawWriter?.handleTouchEnd) this.drawWriter.handleTouchEnd()
		}
	}
}
</script>

<style scoped>
.stroke-lab-page {
	min-height: 100vh;
	padding: 20rpx 24rpx 48rpx;
	box-sizing: border-box;
	background: linear-gradient(
		180deg,
		var(--meng-cream) 0%,
		var(--meng-page-bg) 28%,
		var(--meng-page-bg) 100%
	);
}

.lab-hero {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 16rpx;
	padding: 8rpx 4rpx;
}

.lab-hero-text {
	flex: 1;
	min-width: 0;
}

.lab-hero-title {
	display: block;
	font-size: 34rpx;
	font-weight: 800;
	color: var(--meng-text);
}

.lab-hero-sub {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: var(--meng-text-muted);
}

.lab-card {
	width: 100%;
	border-radius: 24rpx;
	background: var(--meng-card-solid);
	border: 1rpx solid var(--meng-border);
	box-shadow: 0 8rpx 28rpx var(--meng-shadow);
	box-sizing: border-box;
}

.lab-input-card {
	padding: 20rpx 22rpx;
	margin-bottom: 16rpx;
}

.lab-input-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 16rpx;
}

.lab-input-label {
	flex-shrink: 0;
	font-size: 28rpx;
	font-weight: 600;
	color: var(--meng-text-secondary);
}

.hanzi-input {
	flex: 1;
	min-width: 0;
	height: 72rpx;
	padding: 0 20rpx;
	font-size: 40rpx;
	font-weight: 700;
	text-align: center;
	border-radius: 16rpx;
	background: #faf8f5;
	border: 1rpx solid var(--meng-border-warm);
	color: var(--meng-text);
}

.lab-stage-card {
	padding: 20rpx 18rpx 22rpx;
	margin-bottom: 16rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.lab-canvas-shell {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 12rpx;
	border-radius: 24rpx;
	background: #fffefb;
	border: 2rpx solid rgba(235, 227, 216, 0.95);
	box-shadow: inset 0 2rpx 10rpx rgba(44, 36, 25, 0.04);
}

.stroke-canvas {
	display: block;
	margin: 0 auto;
}

.fallback-char {
	font-size: 160rpx;
	font-weight: 700;
	color: var(--meng-text-muted);
	line-height: 1;
	padding: 40rpx 0;
}

.lab-stage-hint {
	margin-top: 14rpx;
	font-size: 22rpx;
	color: var(--meng-text-muted);
	text-align: center;
	line-height: 1.45;
}

.lab-test-badge {
	margin-top: 12rpx;
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.lab-test-badge--ok {
	background: var(--meng-leaf-soft);
}

.lab-test-badge--bad {
	background: #fff0f0;
}

.lab-test-badge-icon {
	font-size: 40rpx;
	font-weight: 800;
	line-height: 1;
}

.lab-test-badge--ok .lab-test-badge-icon {
	color: #3d9a5c;
}

.lab-test-badge--bad .lab-test-badge-icon {
	color: #d44;
}

.lab-mode-scroll {
	width: 100%;
	margin-bottom: 14rpx;
	white-space: nowrap;
}

.lab-mode-row {
	display: inline-flex;
	flex-direction: row;
	gap: 16rpx;
	padding: 6rpx 4rpx;
}

.lab-mode-chip {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-width: 168rpx;
	padding: 16rpx 20rpx 14rpx;
	border-radius: 28rpx;
	border: 3rpx solid rgba(255, 255, 255, 0.85);
	box-shadow: 0 8rpx 0 rgba(44, 36, 25, 0.06), 0 10rpx 24rpx rgba(44, 36, 25, 0.08);
}

.lab-mode-chip--anim {
	background: linear-gradient(165deg, #fff9e8 0%, #ffe8b8 100%);
}

.lab-mode-chip--write {
	background: linear-gradient(165deg, #fff5f8 0%, #ffdce8 100%);
}

.lab-mode-chip--step {
	background: linear-gradient(165deg, #eef8ff 0%, #d4ebff 100%);
}

.lab-chip-emoji {
	font-size: 40rpx;
	line-height: 1.1;
	margin-bottom: 4rpx;
}

.lab-chip-text {
	font-size: 24rpx;
	font-weight: 800;
	color: #6d5e52;
}

.lab-mode-chip--on {
	transform: translateY(-4rpx);
	border-color: rgba(255, 255, 255, 0.95);
	box-shadow: 0 10rpx 0 rgba(255, 140, 90, 0.2), 0 14rpx 28rpx rgba(255, 120, 72, 0.22);
}

.lab-mode-chip--anim.lab-mode-chip--on {
	background: linear-gradient(165deg, #ffe9a8 0%, #ffc84d 100%);
}

.lab-mode-chip--write.lab-mode-chip--on {
	background: linear-gradient(165deg, #ffc8dc 0%, #ff9ec4 100%);
	box-shadow: 0 10rpx 0 rgba(255, 120, 160, 0.18), 0 14rpx 28rpx rgba(255, 100, 140, 0.2);
}

.lab-mode-chip--step.lab-mode-chip--on {
	background: linear-gradient(165deg, #b8e4ff 0%, #7ec8ff 100%);
	box-shadow: 0 10rpx 0 rgba(80, 160, 220, 0.2), 0 14rpx 28rpx rgba(80, 150, 210, 0.22);
}

.lab-mode-chip--on .lab-chip-text {
	color: #5a3d28;
}

.lab-tool-row {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	gap: 16rpx;
	margin-bottom: 16rpx;
	padding: 0 4rpx;
}

.lab-pill {
	min-width: 148rpx;
	padding: 14rpx 16rpx 12rpx;
	border-radius: 32rpx;
	border: 3rpx solid rgba(255, 255, 255, 0.75);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 0 rgba(44, 36, 25, 0.07), 0 10rpx 22rpx rgba(44, 36, 25, 0.1);
}

.lab-pill--wide {
	min-width: 200rpx;
	flex: 1;
	max-width: 280rpx;
}

.lab-pill-emoji {
	font-size: 36rpx;
	line-height: 1.1;
	margin-bottom: 4rpx;
}

.lab-pill-label {
	font-size: 26rpx;
	font-weight: 800;
	color: rgba(44, 36, 25, 0.82);
}

.lab-pill--sun {
	background: linear-gradient(165deg, #fff3c4 0%, #ffd45a 55%, #ffb84d 100%);
}

.lab-pill--leaf {
	background: linear-gradient(165deg, #e8fbe8 0%, #a8e6b8 55%, #7fd49a 100%);
}

.lab-pill--lavender {
	background: linear-gradient(165deg, #f3f0ff 0%, #ddd4ff 55%, #c5b8ff 100%);
}

.lab-pill--pink {
	background: linear-gradient(165deg, #fff0f5 0%, #ffc8dc 55%, #ffaac8 100%);
}

.lab-pill--sun .lab-pill-label,
.lab-pill--leaf .lab-pill-label {
	color: #4a3d2a;
}

.lab-pill--lavender .lab-pill-label,
.lab-pill--pink .lab-pill-label {
	color: #5a4568;
}

.lab-log-card {
	padding: 18rpx 22rpx;
}

.lab-log-title {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
	color: var(--meng-text-secondary);
	margin-bottom: 10rpx;
}

.lab-log-item {
	display: block;
	font-size: 24rpx;
	color: var(--meng-text-secondary);
	line-height: 1.5;
}

.lab-log-item--ok {
	color: #3d9a5c;
	font-weight: 600;
}

.lab-log-item--bad {
	color: #c44;
	font-weight: 600;
}
</style>
