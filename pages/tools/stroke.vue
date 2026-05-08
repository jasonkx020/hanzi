<template>
	<view class="content">
		<view class="vip-strip" @click="goVip">
			<text class="vip-strip-icon">◇</text>
			<text class="vip-strip-text">{{ vipActive ? '会员已开通 · 查看权益' : '家长专区 · 开通会员解锁全年级与练习' }}</text>
			<text class="vip-strip-arrow">›</text>
		</view>
		<view class="title-wrap">
			<text class="title">{{ word }}</text>
		</view>
		<view class="input-row">
			<input
				v-model="inputWord"
				class="hanzi-input"
				type="text"
				placeholder="请输入汉字，如：我 或 中国"
				confirm-type="done"
				@confirm="applyInputWord"
			/>
			<button size="mini" type="primary" @click="applyInputWord">应用</button>
		</view>
		<text class="pinyin">拼音：{{ pinyinText }}</text>
		<view class="control-row">
			<button size="mini" @click="runDraw('normal')">normal</button>
			<button size="mini" @click="runDraw('animation')">animation</button>
			<button size="mini" @click="runDraw('stroke')">stroke</button>
			<button size="mini" @click="runDraw('test')">test</button>
		</view>
		<view class="control-row">
			<button size="mini" @click="startAnimation">开始</button>
			<button size="mini" @click="pauseAnimation">暂停</button>
			<button size="mini" @click="resumeAnimation">恢复</button>
			<button size="mini" @click="restartAnimation">重播</button>
			<button size="mini" @click="drawNextStroke">下一笔</button>
		</view>
		<view class="control-row">
			<button size="mini" type="warn" @click="testWordNotFound">测试404回调</button>
		</view>
		<view v-if="testFeedback || testHistory.length" class="test-panel">
			<text
				v-if="testFeedback"
				class="test-feedback"
				:class="testFeedbackType === 'bad' ? 'test-feedback-bad' : 'test-feedback-ok'"
			>{{ testFeedback }}</text>
			<text class="test-order-title">书写顺序记录（最新在前）</text>
			<text v-for="(item, idx) in testHistory" :key="`${idx}-${item}`" class="test-order-item">{{ item }}</text>
		</view>
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
		<text v-if="!strokeReady" class="fallback-char">我</text>
	</view>
</template>

<script>
import drawNative from '@/utils/draw-native.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import { isVipActive } from '@/utils/vip.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { addCharWrongCount } from '@/utils/user-progress-storage.js'

/** 与 utils/draw-native.js 中 canvasSize = length + 30 保持一致 */
const STROKE_DRAW_LENGTH = 180

export default {
	data() {
		return {
			word: '银行行长',
			inputWord: '银行行长',
			pinyinText: '',
			strokeReady: false,
			drawWriter: null,
			wordNotFoundRegistered: false,
			vipActive: false,
			testFeedback: '',
			testFeedbackType: '',
			testHistory: [],
			testWrongAddedAt: 0,
			initialMode: 'animation',
			strokeMountGen: 0,
			strokeAttachTimer: null
		}
	},
	computed: {
		strokeCanvasInlineStyle() {
			const px = STROKE_DRAW_LENGTH + 30
			return {
				width: px + 'px',
				height: px + 'px',
				display: 'block'
			}
		}
	},
	onLoad(query) {
		const fromHanzi = query?.hanzi ? decodeURIComponent(query.hanzi) : ''
		const fromWord = query?.word ? decodeURIComponent(query.word) : ''
		const incoming = fromHanzi || fromWord
		if (query?.mode) this.initialMode = String(query.mode)
		if (incoming) {
			this.word = incoming
			this.inputWord = incoming
		}
	},
	onShow() {
		this.vipActive = isVipActive()
	},
	onReady() {
		this.registerWordNotFoundHook()
		this.initPinyin()
		this.runDraw(this.initialMode)
		this.vipActive = isVipActive()
	},
	onUnload() {
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
		goVip() {
			uni.navigateTo({ url: '/pages/vip/vip' })
		},
		initPinyin() {
			try {
				this.pinyinText = spellDisplayString(this.word, 'poly', 'tone', 'array', 'low')
			} catch (e) {
				this.pinyinText = ''
				console.error(e)
			}
		},
		applyInputWord() {
			const pure = String(this.inputWord || '').match(/[\u4e00-\u9fa5]+/g)
			const nextWord = pure ? pure.join('') : ''
			if (!nextWord) {
				console.warn('[draw-native] 输入无效：请输入至少一个汉字')
				return
			}
			this.word = nextWord
			this.inputWord = nextWord
			this.initPinyin()
			this.runDraw('animation')
		},
		registerWordNotFoundHook() {
			if (this.wordNotFoundRegistered) return
			drawNative.onWordNotFound((word) => {
				console.warn(`[draw-native] onWordNotFound 触发: ${word}`)
			})
			this.wordNotFoundRegistered = true
		},
		destroyWriter() {
			if (this.drawWriter && typeof this.drawWriter.destroy === 'function') {
				this.drawWriter.destroy()
			}
			this.drawWriter = null
		},
		runDraw(mode = 'animation') {
			try {
				if (typeof drawNative !== 'function') {
					this.strokeReady = false
					console.warn('[draw-native] draw-native 未加载，已降级为静态文字显示')
					return
				}
				this.strokeReady = true
				this.destroyWriter()
				if (this.strokeAttachTimer) {
					clearTimeout(this.strokeAttachTimer)
					this.strokeAttachTimer = null
				}
				const token = ++this.strokeMountGen
				const bindMode = mode
				const attach = () => {
					this.strokeAttachTimer = null
					if (token !== this.strokeMountGen) return
					this.mountStrokeWriter(bindMode)
				}
				// App / 小程序端 canvas 常在布局未完成时 createCanvasContext 会绘制失败；双 nextTick + 短暂延迟更稳
				this.$nextTick(() => {
					this.$nextTick(() => {
						this.strokeAttachTimer = setTimeout(attach, 48)
					})
				})
			} catch (e) {
				this.strokeReady = false
				console.warn('[draw-native] 初始化失败，已降级为静态文字显示')
				console.error(e)
			}
		},
		mountStrokeWriter(mode = 'animation') {
			try {
				if (typeof drawNative !== 'function') {
					this.strokeReady = false
					return
				}
				const vm = this
				const typeMap = {
					normal: drawNative.TYPE.NORMAL,
					animation: drawNative.TYPE.ANIMATION,
					stroke: drawNative.TYPE.STROKE,
					test: drawNative.TYPE.TEST
				}
				const targetType = typeMap[mode] || drawNative.TYPE.ANIMATION
				this.resetTestPanel()
				this.drawWriter = drawNative(this.word, {
					el: '#stroke-box',
					vm,
					type: targetType,
					style: {
						length: STROKE_DRAW_LENGTH,
						charInsetRatio: 0.15,
						strokeColor: '#2c3e50',
						outlineColor: '#d5d5d5',
						currentColor: '#e74c3c'
					},
					line: {
						show: true,
						borderColor: '#d7d7d7',
						centerColor: '#cfcfcf',
						diagonalColor: '#e2e2e2'
					},
					watermark: {
						text: 'HanziStroke.com',
						alpha: 0.22,
						fontSize: 12,
						position: 'bottom-right'
					},
					animation: {
						autoAnimate: targetType === drawNative.TYPE.ANIMATION,
						loopAnimate: true,
						strokeAnimationSpeed: 1.2,
						delayBetweenStrokes: 400,
						delayBetweenLoops: 1000
					},
					test: {
						testStrictOrder: true,
						testDirectionWeight: 0.4,
						onTestStatus: ({ index, status, data }) => {
							vm.handleTestStatus(index, status, data)
							const scoreText = typeof data.score === 'number' ? ` score=${data.score}` : ''
							console.log(`[draw-native] test[${index}] ${status}${scoreText} mistakes=${data.totalMistakes}`)
						}
					}
				})
			} catch (e) {
				this.strokeReady = false
				console.warn('[draw-native] mountStrokeWriter 失败，已降级为静态文字显示')
				console.error(e)
			}
		},
		startAnimation() {
			if (!this.drawWriter || typeof this.drawWriter.startAnimation !== 'function') return
			const ok = this.drawWriter.startAnimation()
			console.log(`[draw-native] startAnimation -> ${ok}`)
		},
		pauseAnimation() {
			if (!this.drawWriter || typeof this.drawWriter.pauseAnimation !== 'function') return
			this.drawWriter.pauseAnimation()
			console.log('[draw-native] pauseAnimation 调用完成')
		},
		resumeAnimation() {
			if (!this.drawWriter || typeof this.drawWriter.resumeAnimation !== 'function') return
			this.drawWriter.resumeAnimation()
			console.log('[draw-native] resumeAnimation 调用完成')
		},
		restartAnimation() {
			if (!this.drawWriter || typeof this.drawWriter.restartAnimation !== 'function') return
			this.drawWriter.restartAnimation()
			console.log('[draw-native] restartAnimation 调用完成')
		},
		drawNextStroke() {
			if (!this.drawWriter || typeof this.drawWriter.drawNextStroke !== 'function') return
			const ok = this.drawWriter.drawNextStroke(() => {
				console.log('[draw-native] drawNextStroke 回调触发: 已到最后一笔')
			})
			console.log(`[draw-native] drawNextStroke -> ${ok}`)
		},
		testWordNotFound() {
			try {
				drawNative('ABC', { el: '#stroke-box', vm: this })
			} catch (e) {
				console.log(`[draw-native] 测试404完成: ${e.message}`)
			}
		},
		resetTestPanel() {
			this.testFeedback = ''
			this.testFeedbackType = ''
			this.testHistory = []
			this.testWrongAddedAt = 0
		},
		getPracticeChar() {
			const pure = String(this.word || '').match(/[\u4e00-\u9fa5]/g)
			return pure && pure.length ? pure[0] : ''
		},
		curriculumDims() {
			const p = getCurriculumPrefs()
			return {
				textbook_version_id: p.textbook_version_id,
				grade: Number(p.grade) || 1,
				semester: p.semester === '下' ? '下' : '上'
			}
		},
		pushTestHistory(text) {
			this.testHistory = [text, ...this.testHistory].slice(0, 12)
		},
		handleTestStatus(index, status, data = {}) {
			const strokeNo = Number(index) + 1
			if (status === 'correct') {
				this.testFeedbackType = 'ok'
				this.testFeedback = '✓'
				this.pushTestHistory(`第${strokeNo}笔 ✓ 顺序正确`)
				return
			}
			if (status === 'mistake') {
				const expectedNo = Number(data.expectedStroke) + 1
				this.testFeedbackType = 'bad'
				this.testFeedback = '✗'
				this.pushTestHistory(`第${strokeNo}笔 ✗ 应写第${expectedNo}笔`)
				const now = Date.now()
				// 同一次抬笔事件仅记一次错字，避免重复写库
				if (now - this.testWrongAddedAt > 250) {
					const targetChar = this.getPracticeChar()
					if (targetChar) {
						addCharWrongCount(targetChar, 1, this.curriculumDims())
					}
					this.testWrongAddedAt = now
				}
				return
			}
			if (status === 'complete') {
				this.testFeedbackType = 'ok'
				this.testFeedback = '✓✓'
				this.pushTestHistory('全部笔画通过')
				uni.showToast({ title: '测试通过', icon: 'success' })
			}
		},
		onCanvasTouchStart(e) {
			if (!this.drawWriter || typeof this.drawWriter.handleTouchStart !== 'function') return
			const t = e.touches && e.touches[0]
			if (t) this.drawWriter.handleTouchStart(t)
		},
		onCanvasTouchMove(e) {
			if (!this.drawWriter || typeof this.drawWriter.handleTouchMove !== 'function') return
			const t = e.touches && e.touches[0]
			if (t) this.drawWriter.handleTouchMove(t)
		},
		onCanvasTouchEnd() {
			if (!this.drawWriter || typeof this.drawWriter.handleTouchEnd !== 'function') return
			this.drawWriter.handleTouchEnd()
		}
	}
}
</script>

<style>
.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	min-height: 100vh;
	padding-top: 24rpx;
	padding-bottom: 48rpx;
	box-sizing: border-box;
	background: #f4f1ea;
}

.vip-strip {
	width: 92%;
	display: flex;
	align-items: center;
	padding: 18rpx 22rpx;
	margin-bottom: 28rpx;
	border-radius: 16rpx;
	background: linear-gradient(90deg, #3d4a5c 0%, #4a5d4a 50%, #5c6b4a 100%);
	box-shadow: 0 6rpx 20rpx rgba(61, 74, 92, 0.25);
}

.vip-strip-icon {
	margin-right: 12rpx;
	font-size: 24rpx;
	color: #e8d5a3;
}

.vip-strip-text {
	flex: 1;
	font-size: 24rpx;
	color: #f5f2ea;
	line-height: 1.35;
}

.vip-strip-arrow {
	margin-left: 12rpx;
	font-size: 36rpx;
	color: rgba(255, 255, 255, 0.65);
	line-height: 1;
}

.title-wrap {
	margin-bottom: 24rpx;
}

.title {
	font-size: 48rpx;
	color: #2c3e50;
	font-weight: 600;
}

.pinyin {
	font-size: 34rpx;
	color: #57606a;
	margin-bottom: 20rpx;
}

.input-row {
	width: 92%;
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-bottom: 16rpx;
}

.input-row > * + * {
	margin-left: 12rpx;
}

.hanzi-input {
	flex: 1;
	height: 64rpx;
	border: 1px solid #d9d9d9;
	border-radius: 8rpx;
	padding: 0 18rpx;
	background: #fff;
	font-size: 28rpx;
}

.control-row {
	width: 92%;
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	margin-bottom: 16rpx;
}

.control-row > button {
	margin: 6rpx;
}

.test-panel {
	width: 92%;
	margin-bottom: 12rpx;
	padding: 14rpx 18rpx;
	background: #fff;
	border-radius: 10rpx;
}

.test-feedback {
	font-size: 72rpx;
	line-height: 1;
	text-align: center;
	font-weight: 700;
	margin-bottom: 10rpx;
}

.test-feedback-ok {
	color: #2e9f58;
}

.test-feedback-bad {
	color: #d64545;
}

.test-order-title {
	display: block;
	font-size: 24rpx;
	color: #6b7280;
	margin-bottom: 8rpx;
}

.test-order-item {
	display: block;
	font-size: 24rpx;
	color: #2f3640;
	line-height: 1.45;
}

.stroke-canvas {
	background: #fff;
	border-radius: 12rpx;
	margin-left: auto;
	margin-right: auto;
}

.fallback-char {
	font-size: 220rpx;
	color: #2c3e50;
	line-height: 1;
}
</style>
