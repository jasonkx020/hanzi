<!--
  @file hanzi-stroke-player.vue
  @layer L1 表现层
  @description UI 组件源文件：hanzi-stroke-player.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<view class="hanzi-stroke-player" :class="{ 'hanzi-stroke-player--fallback': animFallback }">
		<view class="tianzi-shell" :style="wrapStyle" @click="onCanvasClick">
			<canvas
				v-if="strokeReady && !animFallback"
				:id="resolvedCanvasId"
				:canvas-id="resolvedCanvasId"
				class="stroke-canvas"
				disable-scroll
				:style="canvasStyle"
			/>
			<text v-else class="char-fallback">{{ displayChar }}</text>
			<view
				v-if="showPlayFab && strokeReady && !animFallback"
				class="play-fab"
				:class="{ 'play-fab-on': animating }"
				@click.stop="toggleAnimation"
			>
				<text class="play-fab-icon">{{ animating ? '⏸' : '▶' }}</text>
			</view>
		</view>
		<!-- 始终占位，避免开播后才出现「第 N 笔」把下方内容顶开 -->
		<view v-if="!hideStrokeHint" class="stroke-hint">
			<text v-if="currentStrokeLabel" class="stroke-hint-txt">
				第 {{ strokeIndex + 1 }} 笔 · {{ currentStrokeLabel }}
			</text>
			<text v-else class="stroke-hint-txt stroke-hint-txt--ph">第 1 笔</text>
		</view>
	</view>
</template>

<script>
import drawNative from '@/utils/draw-native.js'
import { getAudioNarrator } from '@/utils/audio-settings.js'
import {
	getCncharStrokeNameList,
	enqueueStrokeSegmentAudio,
	getStrokeAudioQueueTail,
	playStrokeLabelAudio,
	resetStrokeAudioQueue,
	stopStrokeOrderAudio
} from '@/utils/stroke-order-audio.js'
import { sleep } from '@/utils/play-pinyin-local-audio.js'

/** 笔起首音节结束后的短缓冲，再开画 */
const STROKE_AUDIO_LEAD_PAD_MS = 100
/** 笔末读音结束后的缓冲，避免尾音被下一笔掐断 */
const STROKE_AUDIO_TAIL_PAD_MS = 320

let _idSeq = 0

export default {
	name: 'HanziStrokePlayer',
	props: {
		/** 单字（仅取首字） */
		char: {
			type: String,
			default: ''
		},
		/** 整字展示拼音，笔画名无音频时按音节轮询 */
		displayPinyin: {
			type: String,
			default: ''
		},
		canvasId: {
			type: String,
			default: ''
		},
		length: {
			type: Number,
			default: 168
		},
		showPlayFab: {
			type: Boolean,
			default: true
		},
		/** 是否循环笔顺（默认播完即停） */
		loopAnimate: {
			type: Boolean,
			default: false
		},
		/** 每笔开始前播放笔画读音 */
		strokeAudioEnabled: {
			type: Boolean,
			default: true
		},
		narrator: {
			type: String,
			default: ''
		},
		/** 挂载后是否仅显示静态完整字（不自动播动画） */
		previewOnly: {
			type: Boolean,
			default: true
		},
		/**
		 * 闲置展示：preview=挂 NORMAL 整字；blank=只标记 ready，等 playAnimation 再挂
		 * （避免「整字一闪再笔顺」）
		 */
		idleMode: {
			type: String,
			default: 'preview',
			validator: (v) => ['preview', 'blank'].includes(String(v || ''))
		},
		/** 为 true 时不显示组件内笔画提示（由父页自行布局） */
		hideStrokeHint: {
			type: Boolean,
			default: false
		},
		charInsetRatio: {
			type: Number,
			default: 0.12
		},
		strokeColor: {
			type: String,
			default: '#c62828'
		},
		outlineColor: {
			type: String,
			default: '#e8d5c8'
		},
		currentColor: {
			type: String,
			default: '#ff7043'
		}
	},
	emits: ['click-canvas', 'animating-change', 'ready-change', 'stroke-index'],
	data() {
		return {
			resolvedCanvasId: '',
			strokeReady: false,
			animFallback: false,
			animating: false,
			/** 笔顺动画已暂停（可继续），与 stop 后回到静态预览区分 */
			playbackPaused: false,
			writer: null,
			mountGen: 0,
			attachTimer: null,
			wordNotFoundRegistered: false,
			strokeIndex: 0,
			strokeNames: []
		}
	},
	computed: {
		displayChar() {
			const c = String(this.char || '').trim().charAt(0)
			return c || '—'
		},
		canvasStyle() {
			const px = this.length + 30
			return { width: px + 'px', height: px + 'px', display: 'block' }
		},
		wrapStyle() {
			const px = this.length + 30
			return { width: px + 'px', height: px + 'px', boxSizing: 'border-box' }
		},
		currentStrokeLabel() {
			if (!this.strokeNames.length) return ''
			return this.strokeNames[this.strokeIndex] || ''
		},
		effectiveNarrator() {
			return this.narrator || getAudioNarrator()
		},
		isBlankIdle() {
			return String(this.idleMode || '') === 'blank'
		},
		attachDelayMs() {
			/** preview 也尽量贴着挂载，避免弹层已开、田字格/字还空一拍 */
			return this.isBlankIdle ? 0 : 16
		}
	},
	watch: {
		char: {
			handler() {
				this.remount()
			}
		},
		displayPinyin() {
			this.refreshStrokeNames()
		}
	},
	created() {
		this.resolvedCanvasId =
			this.canvasId ||
			`hanzi-stroke-${Date.now()}-${++_idSeq}`
	},
	mounted() {
		this.refreshStrokeNames()
		this.remount()
	},
	beforeUnmount() {
		this.teardown()
	},
	methods: {
		refreshStrokeNames() {
			this.strokeNames = getCncharStrokeNameList(this.displayChar)
		},
		emitAnimating(v) {
			this.animating = v
			this.$emit('animating-change', v)
		},
		onCanvasClick() {
			this.$emit('click-canvas')
		},
		registerWordNotFoundOnce() {
			if (this.wordNotFoundRegistered) return
			drawNative.onWordNotFound(() => {})
			this.wordNotFoundRegistered = true
		},
		sharedDrawOpts() {
			return {
				vm: this,
				style: {
					length: this.length,
					charInsetRatio: this.charInsetRatio,
					strokeColor: this.strokeColor,
					outlineColor: this.outlineColor,
					currentColor: this.currentColor
				},
				line: {
					show: true,
					borderColor: '#e0cfc0',
					centerColor: '#d4c4b4',
					diagonalColor: '#ebe0d6'
				},
				watermark: {
					text: '',
					alpha: 0,
					fontSize: 10,
					position: 'bottom-right'
				},
				test: { onTestStatus: () => {} }
			}
		},
		buildAnimationOpts() {
			const vm = this
			const base = {
				autoAnimate: false,
				loopAnimate: this.loopAnimate,
				strokeAnimationSpeed: 0.5,
				strokeDurationMs: 920,
				delayBetweenStrokes: 144,
				delayBetweenLoops: 1600,
				cornerPauseMs: 0
			}
			if (!this.strokeAudioEnabled) {
				return {
					...base,
					strokeAnimationSpeed: 0.54,
					strokeDurationMs: 780,
					delayBetweenStrokes: 440
				}
			}
			const strokeAudioOpts = () => ({
				displayPinyin: vm.displayPinyin,
				narrator: vm.effectiveNarrator
			})
			return {
				...base,
				/** 读音开启：笔间留白加长，等 hold 释放后再完整计时 */
				delayBetweenStrokes: 520,
				/**
				 * 起笔前整笔读名播完再动笔。
				 * 复合名走同一 InnerAudio 连读，避免分段 play 时 stop 上一音节；
				 * 拐点不再叠播（部分端 onEnded 不准时易被听成「读到一半被掐」）。
				 */
				async onStrokeWillStart(strokeIndex, hanzi) {
					vm.strokeIndex = strokeIndex
					vm.$emit('stroke-index', strokeIndex)
					const opts = strokeAudioOpts()
					const names = getCncharStrokeNameList(hanzi)
					const label = names[strokeIndex] || ''
					if (label) {
						try {
							await playStrokeLabelAudio(label, opts)
						} catch (_) {}
					} else {
						enqueueStrokeSegmentAudio(strokeIndex, 0, hanzi, opts)
						try {
							await getStrokeAudioQueueTail()
						} catch (_) {}
					}
					await sleep(STROKE_AUDIO_LEAD_PAD_MS)
				},
				onStrokeCorner() {},
				async onStrokeTrailSegments() {
					await sleep(STROKE_AUDIO_TAIL_PAD_MS)
				}
			}
		},
		teardown() {
			stopStrokeOrderAudio()
			if (this.attachTimer) {
				clearTimeout(this.attachTimer)
				this.attachTimer = null
			}
			this.mountGen++
			this.emitAnimating(false)
			this.playbackPaused = false
			this.strokeReady = false
			this.animFallback = false
			if (this.writer && typeof this.writer.destroy === 'function') {
				this.writer.destroy()
			}
			this.writer = null
			this.$emit('ready-change', false)
		},
		destroyWriterOnly() {
			if (this.writer && typeof this.writer.destroy === 'function') {
				this.writer.destroy()
			}
			this.writer = null
		},
		remount() {
			this.teardown()
			const ch = this.displayChar
			if (!ch || ch === '—') {
				this.strokeReady = true
				this.$emit('ready-change', true)
				return
			}
			if (typeof drawNative !== 'function') {
				this.strokeReady = true
				this.animFallback = true
				this.$emit('ready-change', true)
				return
			}
			this.registerWordNotFoundOnce()
			this.refreshStrokeNames()
			this.strokeReady = true
			this.animFallback = false
			/** blank：不挂预览，直接 ready，等 playAnimation */
			if (this.isBlankIdle) {
				this.$emit('ready-change', true)
				return
			}
			const token = ++this.mountGen
			const delay = this.attachDelayMs
			const attach = () => {
				this.attachTimer = null
				if (token !== this.mountGen) return
				this.mountPreviewWriter(ch)
			}
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.attachTimer = setTimeout(attach, delay)
				})
			})
		},
		mountPreviewWriter(ch) {
			try {
				this.writer = drawNative(ch, {
					...this.sharedDrawOpts(),
					el: `#${this.resolvedCanvasId}`,
					type: drawNative.TYPE.NORMAL
				})
				this.$emit('ready-change', true)
			} catch (e) {
				console.warn('[hanzi-stroke-player] preview mount failed', e)
				this.writer = null
				this.animFallback = true
				this.$emit('ready-change', true)
			}
		},
		onStrokeAnimationComplete() {
			this.playbackPaused = false
			this.emitAnimating(false)
		},
		mountAnimationWriter(ch) {
			const vm = this
			try {
				this.writer = drawNative(ch, {
					...this.sharedDrawOpts(),
					el: `#${this.resolvedCanvasId}`,
					type: drawNative.TYPE.ANIMATION,
					animation: {
						...this.buildAnimationOpts(),
						autoAnimate: true,
						animateComplete() {
							vm.onStrokeAnimationComplete()
						}
					}
				})
				this.playbackPaused = false
				this.emitAnimating(true)
			} catch (e) {
				console.warn('[hanzi-stroke-player] animation mount failed', e)
				this.writer = null
				this.animFallback = true
				this.emitAnimating(false)
				uni.showToast({ title: '笔顺暂不可用', icon: 'none' })
			}
		},
		playAnimation() {
			const ch = this.displayChar
			if (!ch || ch === '—') return
			if (typeof drawNative !== 'function') {
				uni.showToast({ title: '当前环境暂不支持笔顺', icon: 'none' })
				return
			}
			if (this.animFallback || !this.strokeReady) {
				uni.showToast({ title: '笔顺暂不可用', icon: 'none' })
				return
			}
			resetStrokeAudioQueue()
			this.playbackPaused = false
			this.registerWordNotFoundOnce()
			this.destroyWriterOnly()
			if (this.attachTimer) {
				clearTimeout(this.attachTimer)
				this.attachTimer = null
			}
			const token = ++this.mountGen
			const attach = () => {
				this.attachTimer = null
				if (token !== this.mountGen) return
				this.mountAnimationWriter(ch)
			}
			const delay = this.attachDelayMs
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.attachTimer = setTimeout(attach, delay)
				})
			})
		},
		/** 暂停笔顺（保留当前进度，可继续） */
		pauseAnimation() {
			if (!this.writer || !this.animating) return
			stopStrokeOrderAudio()
			if (typeof this.writer.pauseAnimation === 'function') {
				this.writer.pauseAnimation()
			}
			this.playbackPaused = true
			this.emitAnimating(false)
		},
		/** 从暂停处继续 */
		resumeAnimation() {
			if (!this.writer || !this.playbackPaused) return
			if (typeof this.writer.resumeAnimation === 'function') {
				this.writer.resumeAnimation()
			}
			this.playbackPaused = false
			this.emitAnimating(true)
		},
		/** 完全停止并回到静态预览（页面离开、换字时调用） */
		stopAnimation() {
			stopStrokeOrderAudio()
			this.playbackPaused = false
			if (this.writer && typeof this.writer.stop === 'function') {
				this.writer.stop()
			}
			this.emitAnimating(false)
			this.destroyWriterOnly()
			const ch = this.displayChar
			if (ch && ch !== '—') {
				if (this.isBlankIdle) {
					/**
					 * blank 模式首次 ready 已由 remount 发出；此处勿再 emit，
					 * 否则父级（抽屉）会重跑「读字→笔顺」并 stop 掉正在播的笔画音。
					 */
					this.strokeReady = true
					return
				}
				this.remount()
			}
		},
		toggleAnimation() {
			if (this.animating) {
				this.pauseAnimation()
			} else if (this.playbackPaused && this.writer) {
				this.resumeAnimation()
			} else {
				this.playAnimation()
			}
		},
		/** 供父页 ref 调用 */
		reload() {
			this.remount()
		}
	}
}
</script>

<style scoped>
.hanzi-stroke-player {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.tianzi-shell {
	position: relative;
	border-radius: 16rpx;
	overflow: visible;
	background: #fffefb;
}

.stroke-canvas {
	display: block;
	margin: 0 auto;
}

.char-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	min-height: 198px;
	font-size: 140rpx;
	font-weight: 700;
	color: #c62828;
}

.play-fab {
	position: absolute;
	right: -20rpx;
	top: 50%;
	transform: translateY(-50%);
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	background: var(--meng-accent-solid);
	box-shadow: 0 8rpx 24rpx var(--meng-shadow-warm);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 3;
}

.play-fab-on {
	background: #e64a19;
}

.play-fab-icon {
	font-size: 32rpx;
	color: #fffef9;
	margin-left: 4rpx;
}

.stroke-hint {
	margin-top: 10rpx;
	min-height: 36rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	max-width: 100%;
	box-sizing: border-box;
}

.stroke-hint-txt {
	font-size: 22rpx;
	color: var(--meng-text-muted);
	text-align: center;
	line-height: 1.3;
}

.stroke-hint-txt--ph {
	visibility: hidden;
}
</style>
