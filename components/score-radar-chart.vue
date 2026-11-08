<!--
  @file score-radar-chart.vue
  @layer L1 表现层
  @description 听写等场景的得分雷达图（canvas 自绘）
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<view class="score-radar">
		<canvas
			:id="canvasId"
			:canvas-id="canvasId"
			class="score-radar-canvas"
			:style="{ width: sizePx + 'px', height: sizePx + 'px' }"
		/>
		<view v-if="showLegend" class="score-radar-legend">
			<view v-for="(a, i) in normalizedAxes" :key="i" class="score-radar-legend-row">
				<text class="score-radar-legend-label">{{ a.label }}</text>
				<text class="score-radar-legend-val">{{ a.display }}</text>
			</view>
		</view>
	</view>
</template>

<script>
function clamp01(n) {
	const x = Number(n)
	if (!Number.isFinite(x)) return 0
	return Math.min(1, Math.max(0, x))
}

export default {
	name: 'ScoreRadarChart',
	props: {
		/** @type {Array<{ label: string, value: number }>} value 为 0～1 或 0～100 */
		axes: {
			type: Array,
			default: () => []
		},
		/** 画布边长 px */
		size: {
			type: Number,
			default: 168
		},
		canvasId: {
			type: String,
			default: 'score-radar-chart'
		},
		showLegend: {
			type: Boolean,
			default: true
		},
		/** 填充色 */
		fillColor: {
			type: String,
			default: 'rgba(232, 122, 74, 0.28)'
		},
		strokeColor: {
			type: String,
			default: '#e87a4a'
		},
		/** 角落紧凑模式：更小画布 + 色块图例 */
		compact: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		sizePx() {
			const raw = Math.floor(Number(this.size) || 168)
			const min = this.compact ? 72 : 120
			return Math.max(min, raw)
		},
		normalizedAxes() {
			return (this.axes || [])
				.map((a) => {
					const label = String((a && a.label) || '').trim() || '—'
					let v = Number(a && a.value)
					if (!Number.isFinite(v)) v = 0
					if (v > 1) v = v / 100
					v = clamp01(v)
					return {
						label,
						value: v,
						display: `${Math.round(v * 100)}`
					}
				})
				.filter((a) => a.label)
		}
	},
	watch: {
		axes: {
			deep: true,
			handler() {
				this.$nextTick(() => this.draw())
			}
		},
		size() {
			this.$nextTick(() => this.draw())
		}
	},
	mounted() {
		this.$nextTick(() => {
			setTimeout(() => this.draw(), 48)
		})
	},
	methods: {
		draw() {
			const axes = this.normalizedAxes
			const n = axes.length
			const size = this.sizePx
			const ctx = uni.createCanvasContext(this.canvasId, this)
			if (!ctx || n < 3) {
				if (ctx) {
					ctx.clearRect(0, 0, size, size)
					ctx.draw()
				}
				return
			}
			const cx = size / 2
			const cy = size / 2
			const maxR = size * 0.34
			const levels = 4

			ctx.clearRect(0, 0, size, size)

			const pointAt = (i, ratio) => {
				const ang = -Math.PI / 2 + (i / n) * Math.PI * 2
				const r = maxR * clamp01(ratio)
				return {
					x: cx + Math.cos(ang) * r,
					y: cy + Math.sin(ang) * r
				}
			}

			for (let lv = levels; lv >= 1; lv--) {
				const t = lv / levels
				ctx.beginPath()
				for (let i = 0; i < n; i++) {
					const p = pointAt(i, t)
					if (i === 0) ctx.moveTo(p.x, p.y)
					else ctx.lineTo(p.x, p.y)
				}
				ctx.closePath()
				ctx.setStrokeStyle(lv === levels ? '#d9d0c4' : '#ebe4da')
				ctx.setLineWidth(lv === levels ? 1.2 : 0.8)
				ctx.stroke()
			}

			for (let i = 0; i < n; i++) {
				const p = pointAt(i, 1)
				ctx.beginPath()
				ctx.moveTo(cx, cy)
				ctx.lineTo(p.x, p.y)
				ctx.setStrokeStyle('#e5ddd2')
				ctx.setLineWidth(0.8)
				ctx.stroke()
			}

			ctx.beginPath()
			for (let i = 0; i < n; i++) {
				const p = pointAt(i, axes[i].value)
				if (i === 0) ctx.moveTo(p.x, p.y)
				else ctx.lineTo(p.x, p.y)
			}
			ctx.closePath()
			ctx.setFillStyle(this.fillColor)
			ctx.fill()
			ctx.setStrokeStyle(this.strokeColor)
			ctx.setLineWidth(2)
			ctx.stroke()

			for (let i = 0; i < n; i++) {
				const p = pointAt(i, axes[i].value)
				ctx.beginPath()
				ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2)
				ctx.setFillStyle(this.strokeColor)
				ctx.fill()
			}

			if (!this.compact) {
				ctx.setFillStyle('#5c3d2e')
				ctx.setFontSize(10)
				ctx.setTextAlign('center')
				ctx.setTextBaseline('middle')
				for (let i = 0; i < n; i++) {
					const labelR = maxR + size * 0.12
					const ang = -Math.PI / 2 + (i / n) * Math.PI * 2
					const lx = cx + Math.cos(ang) * labelR
					const ly = cy + Math.sin(ang) * labelR
					const name = axes[i].label.length > 4 ? axes[i].label.slice(0, 4) : axes[i].label
					ctx.fillText(name, lx, ly)
				}
			}

			ctx.draw()
		}
	}
}
</script>

<style scoped>
.score-radar {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	box-sizing: border-box;
}

.score-radar-canvas {
	display: block;
	flex-shrink: 0;
}

.score-radar-legend {
	width: 100%;
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	gap: 6rpx 10rpx;
	padding: 0 2rpx;
}

.score-radar-legend-row {
	display: flex;
	flex-direction: row;
	align-items: baseline;
	gap: 4rpx;
	padding: 2rpx 8rpx;
	border-radius: 999rpx;
	background: rgba(232, 122, 74, 0.12);
}

.score-radar-legend-label {
	font-size: 18rpx;
	color: #6d5e52;
	font-weight: 600;
}

.score-radar-legend-val {
	font-size: 22rpx;
	font-weight: 800;
	color: #d4562a;
	font-variant-numeric: tabular-nums;
}
</style>
