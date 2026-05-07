<template>
	<view class="content">
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
		<canvas
			v-if="strokeReady"
			canvas-id="stroke-box"
			id="stroke-box"
			class="stroke-canvas"
			@touchstart="onCanvasTouchStart"
			@touchmove="onCanvasTouchMove"
			@touchend="onCanvasTouchEnd"
		/>
		<text v-if="!strokeReady" class="fallback-char">我</text>
	</view>
</template>

<script>
import cnchar from 'cnchar'
import drawNative from '@/utils/draw-native'
cnchar.use(drawNative)

	export default {
		data() {
			return {
				word: '银行行长',
				inputWord: '银行行长',
				pinyinText: '',
				strokeReady: false,
				drawWriter: null,
				wordNotFoundRegistered: false
			}
		},
		onReady() {
			this.registerWordNotFoundHook()
			this.initPinyin()
			this.runDraw('animation')
		},
		onUnload() {
			if (this.drawWriter && typeof this.drawWriter.destroy === 'function') {
				this.drawWriter.destroy()
			}
		},
		methods: {
			initPinyin() {
				try {
					// 使用 poly 按词语语境处理多音字，并带声调输出
					const pyList = cnchar.spell(this.word, 'poly', 'tone', 'array', 'low')
					this.pinyinText = Array.isArray(pyList) ? pyList.join(' ') : String(pyList || '')
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
				cnchar.draw.onWordNotFound((word) => {
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
					if (!cnchar.draw) {
						this.strokeReady = false
						console.warn('[draw-native] 插件未初始化或不可用，已降级为静态文字显示')
						return
					}
					this.strokeReady = true
					this.destroyWriter()
					this.$nextTick(() => {
						const typeMap = {
							normal: cnchar.draw.TYPE.NORMAL,
							animation: cnchar.draw.TYPE.ANIMATION,
							stroke: cnchar.draw.TYPE.STROKE,
							test: cnchar.draw.TYPE.TEST
						}
						const targetType = typeMap[mode] || cnchar.draw.TYPE.ANIMATION
						this.drawWriter = cnchar.draw(this.word, {
							el: '#stroke-box',
							vm: this,
							type: targetType,
							style: {
								length: 180,
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
								autoAnimate: targetType === cnchar.draw.TYPE.ANIMATION,
								loopAnimate: true,
								strokeAnimationSpeed: 1.2,
								delayBetweenStrokes: 400,
								delayBetweenLoops: 1000
							},
							test: {
								testStrictOrder: true,
								testDirectionWeight: 0.4,
								// testScoreThreshold: 20, // 可手动调严格度，越小越严格
								onTestStatus: ({ index, status, data }) => {
									const scoreText = typeof data.score === 'number' ? ` score=${data.score}` : ''
									console.log(`[draw-native] test[${index}] ${status}${scoreText} mistakes=${data.totalMistakes}`)
								}
							}
						})
					})
				} catch (e) {
					this.strokeReady = false
					console.warn('[draw-native] 初始化失败，已降级为静态文字显示')
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
					cnchar.draw('ABC', { el: '#stroke-box', vm: this })
				} catch (e) {
					console.log(`[draw-native] 测试404完成: ${e.message}`)
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
		height: 100vh;
		padding-top: 120rpx;
		box-sizing: border-box;
		overflow: hidden;
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
		align-items: center;
		gap: 12rpx;
		margin-bottom: 16rpx;
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
		flex-wrap: wrap;
		justify-content: center;
		gap: 12rpx;
		margin-bottom: 16rpx;
	}

	.stroke-canvas {
		width: 420rpx;
		height: 420rpx;
		background: #fff;
		border-radius: 12rpx;
	}

	.fallback-char {
		font-size: 220rpx;
		color: #2c3e50;
		line-height: 1;
	}

</style>
