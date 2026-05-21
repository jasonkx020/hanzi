<template>
	<view class="pcm-chart">
		<text v-if="title" class="pcm-chart-title">{{ title }}</text>
		<view class="pcm-chart-canvas-wrap" :style="wrapStyle">
			<canvas
				v-if="canvasSupported && drawReady"
				:canvas-id="canvasId"
				:id="canvasId"
				class="pcm-chart-canvas"
				disable-scroll
				:style="canvasStyle"
			/>
			<view v-else class="pcm-chart-placeholder">
				<text class="pcm-chart-placeholder-text">{{ placeholderText }}</text>
			</view>
		</view>
		<text v-if="hint" class="pcm-chart-hint">{{ hint }}</text>
	</view>
</template>

<script>
import {
	isLegacyCanvasApiAvailable,
	createLegacyCanvasContext,
	flushLegacyCanvasDraw,
	spectrumBarFill
} from '@/utils/uni-legacy-canvas.js'

export default {
	name: 'PcmAudioChart',
	props: {
		canvasId: { type: String, required: true },
		title: { type: String, default: '' },
		hint: { type: String, default: '' },
		/** 'wave' | 'spectrum' */
		mode: { type: String, default: 'wave' },
		/** 波形 0..1 峰値；频谱模式为各柱 0..1 */
		values: { type: Array, default: () => [] },
		active: { type: Boolean, default: false },
		widthPx: { type: Number, default: 320 },
		heightPx: { type: Number, default: 100 },
		/** 父级已检测为 false 时可显式关闭绘制 */
		enabled: { type: Boolean, default: true }
	},
	data() {
		return {
			drawReady: false,
			canvasSupported: false
		}
	},
	computed: {
		wrapStyle() {
			return { height: `${this.heightPx}px` }
		},
		canvasStyle() {
			return {
				width: `${this.widthPx}px`,
				height: `${this.heightPx}px`
			}
		},
		placeholderText() {
			if (!this.enabled) return '图谱已关闭'
			if (!this.canvasSupported) return '当前端不支持 canvas 波形绘制'
			return '画布初始化中…'
		}
	},
	watch: {
		values: {
			handler() {
				this.scheduleDraw()
			},
			deep: true
		},
		active() {
			this.scheduleDraw()
		},
		widthPx() {
			this.scheduleDraw()
		},
		heightPx() {
			this.scheduleDraw()
		},
		enabled(v) {
			if (v) this.bootstrapCanvas()
			else this.clearDrawTimer()
		}
	},
	mounted() {
		this.bootstrapCanvas()
	},
	beforeDestroy() {
		this.clearDrawTimer()
	},
	beforeUnmount() {
		this.clearDrawTimer()
	},
	methods: {
		clearDrawTimer() {
			if (this._drawTimer) {
				clearTimeout(this._drawTimer)
				this._drawTimer = null
			}
		},
		bootstrapCanvas() {
			this.canvasSupported = this.enabled && isLegacyCanvasApiAvailable()
			this.drawReady = false
			if (!this.canvasSupported) return
			this.$nextTick(() => {
				this.drawReady = true
				this.$nextTick(() => this.scheduleDraw())
			})
		},
		scheduleDraw() {
			if (!this.enabled || !this.canvasSupported || !this.drawReady) return
			this.clearDrawTimer()
			this._drawTimer = setTimeout(() => {
				this._drawTimer = null
				this.draw()
			}, 48)
		},
		draw() {
			if (!this.enabled || !this.canvasSupported || !this.drawReady) return
			const vals = this.values || []
			const w = Math.floor(Number(this.widthPx) || 0)
			const h = Math.floor(Number(this.heightPx) || 0)
			if (w < 8 || h < 8) return

			const ctx = createLegacyCanvasContext(this.canvasId, this)
			if (!ctx) return

			try {
				ctx.setFillStyle('#faf8f4')
				ctx.fillRect(0, 0, w, h)

				if (!vals.length) {
					ctx.setFillStyle('#9a948c')
					ctx.setFontSize(12)
					ctx.fillText('暂无 PCM 数据', 12, h / 2 + 4)
					flushLegacyCanvasDraw(ctx)
					return
				}

				if (this.mode === 'spectrum') {
					this.drawSpectrum(ctx, vals, w, h)
				} else {
					this.drawWaveform(ctx, vals, w, h)
				}
				flushLegacyCanvasDraw(ctx)
			} catch (e) {
				console.warn('[pcm-audio-chart] draw failed', this.canvasId, e)
			}
		},
		drawWaveform(ctx, peaks, w, h) {
			const mid = h / 2
			const n = peaks.length
			const barW = w / n
			const stroke = this.active ? '#e87830' : '#5a8fd4'
			const fill = this.active ? 'rgba(232, 120, 48, 0.25)' : 'rgba(90, 143, 212, 0.2)'

			ctx.setStrokeStyle('#e3d9c8')
			ctx.setLineWidth(1)
			ctx.beginPath()
			ctx.moveTo(0, mid)
			ctx.lineTo(w, mid)
			ctx.stroke()

			ctx.setFillStyle(fill)
			ctx.beginPath()
			ctx.moveTo(0, mid)
			for (let i = 0; i < n; i++) {
				const amp = Math.min(1, Math.max(0, peaks[i])) * (h * 0.42)
				const x = i * barW + barW / 2
				ctx.lineTo(x, mid - amp)
			}
			for (let i = n - 1; i >= 0; i--) {
				const amp = Math.min(1, Math.max(0, peaks[i])) * (h * 0.42)
				const x = i * barW + barW / 2
				ctx.lineTo(x, mid + amp)
			}
			ctx.closePath()
			ctx.fill()

			ctx.setStrokeStyle(stroke)
			ctx.setLineWidth(1.5)
			ctx.beginPath()
			for (let i = 0; i < n; i++) {
				const amp = Math.min(1, Math.max(0, peaks[i])) * (h * 0.42)
				const x = i * barW + barW / 2
				const yTop = mid - amp
				if (i === 0) ctx.moveTo(x, yTop)
				else ctx.lineTo(x, yTop)
			}
			ctx.stroke()
		},
		drawSpectrum(ctx, bars, w, h) {
			const n = bars.length
			const gap = 1
			const barW = (w - gap * (n - 1)) / n
			const pad = 4
			for (let i = 0; i < n; i++) {
				const v = Math.min(1, Math.max(0, bars[i]))
				const bh = Math.max(2, v * (h - pad * 2))
				const x = i * (barW + gap)
				const y = h - pad - bh
				ctx.setFillStyle(spectrumBarFill(i, n, this.active))
				ctx.fillRect(x, y, barW, bh)
			}
			ctx.setFillStyle('#9a948c')
			ctx.setFontSize(10)
			ctx.fillText('低', 4, h - 2)
			ctx.fillText('高', w - 18, h - 2)
		}
	}
}
</script>

<style scoped>
.pcm-chart {
	margin-bottom: 16rpx;
}

.pcm-chart-title {
	font-size: 24rpx;
	font-weight: 600;
	color: #8b4518;
	display: block;
	margin-bottom: 8rpx;
}

.pcm-chart-canvas-wrap {
	width: 100%;
	border-radius: 12rpx;
	overflow: hidden;
	border: 1rpx solid #e3d9c8;
	background: #faf8f4;
}

.pcm-chart-canvas {
	display: block;
}

.pcm-chart-placeholder {
	width: 100%;
	height: 100%;
	min-height: 72px;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16rpx;
	box-sizing: border-box;
}

.pcm-chart-placeholder-text {
	font-size: 24rpx;
	color: #9a948c;
	text-align: center;
	line-height: 1.45;
}

.pcm-chart-hint {
	display: block;
	font-size: 22rpx;
	color: #9a948c;
	margin-top: 8rpx;
	line-height: 1.45;
}
</style>
