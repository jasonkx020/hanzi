<template>
	<view
		class="pflr"
		:class="[
			'pflr--' + size,
			{ 'pflr--metric-shift': metricShift, 'pflr--reading-glow': highlightColumnIndex >= 0 }
		]"
	>
		<view class="pflr-sheet" :style="sheetColorStyle">
			<view class="pflr-lines" aria-hidden="true">
				<view class="pflr-line-top"></view>
				<view class="pflr-line-dash"></view>
				<view class="pflr-line-base"></view>
				<view class="pflr-line-bottom"></view>
			</view>
			<view class="pflr-cols">
				<view
					v-for="(col, ci) in columns"
					:key="col.empty ? 'pflr-e-' + ci : ci + '-' + col.syl"
					class="pflr-cell"
					:class="{
						'pflr-cell--interactive': interactive && !col.empty,
						'pflr-cell--empty': col.empty,
						'pflr-cell--reading': highlightColumnIndex === ci && !col.empty
					}"
					@click="onCellClick($event, ci, col)"
				>
					<view v-if="col.empty" class="pflr-cell-spacer" />
					<view v-else class="pflr-write-area">
						<view class="pflr-glyphs-row">
							<text
								v-for="(g, gi) in col.glyphs"
								:key="gi + '-' + g.ch"
								class="pflr-glyph font-pinyin"
								:class="[
									'pflr-glyph--' + g.kind,
									{ 'pflr-glyph--alph-metric': g.alphMetricFix }
								]"
							>{{ g.ch }}</text>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { splitPinyinSyllableGlyphs } from '@/utils/pinyin-writing-standard.js'
import { ensurePinyinFontLoaded } from '@/utils/pinyin-font-loader.js'

/** 手机 / App 端 text 行盒下沉，需相对桌面 H5 略上移才能贴第三线（基线） */
function detectPinyinMetricShift() {
	try {
		const sys = uni.getSystemInfoSync()
		const p = String(sys.platform || '').toLowerCase()
		if (p === 'android' || p === 'ios') return true
		// 开发者工具模拟器
		if (p === 'devtools') return true
		// H5：桌面浏览器 platform 多为 windows/mac/linux，窄屏多为手机浏览器
		const w = Number(sys.windowWidth) || 0
		if (w > 0 && w < 768 && p !== 'windows' && p !== 'mac' && p !== 'linux') return true
		return false
	} catch (_) {
		return false
	}
}

export default {
	name: 'PinyinFourLinesRow',
	data() {
		return {
			metricShift: detectPinyinMetricShift()
		}
	},
	props: {
		syllables: {
			type: Array,
			default: () => []
		},
		size: {
			type: String,
			default: 'md'
		},
		/** 保留兼容（纯 CSS 布局无需测宽，可忽略） */
		minWidthPx: {
			type: Number,
			default: 96
		},
		/** 为 true 时整列可点，向父组件派发 cell-click */
		interactive: {
			type: Boolean,
			default: false
		},
		/** 自动连读时高亮列下标，-1 表示无 */
		highlightColumnIndex: {
			type: Number,
			default: -1
		},
		/** 人教版分类底色（拼音页） */
		sheetBg: {
			type: String,
			default: ''
		},
		/** 人教版分类描边色 */
		sheetBd: {
			type: String,
			default: ''
		}
	},
	created() {
		ensurePinyinFontLoaded()
	},
	computed: {
		list() {
			const raw = Array.isArray(this.syllables) ? this.syllables : []
			if (!raw.length) return ['—']
			const hasReal = raw.some((s) => s != null && String(s).trim())
			if (!hasReal) return ['—']
			return raw.map((s) => {
				if (s == null) return null
				const t = String(s).trim()
				return t === '' ? null : t
			})
		},
		sheetColorStyle() {
			const bg = String(this.sheetBg || '').trim()
			const bd = String(this.sheetBd || '').trim()
			if (!bg && !bd) return {}
			const style = {}
			if (bg) style.backgroundColor = bg
			if (bd) {
				style.borderWidth = '1rpx'
				style.borderStyle = 'solid'
				style.borderColor = bd
				style.borderRadius = '8rpx'
			}
			return style
		},
		columns() {
			return this.list.map((syl) => {
				if (syl == null) {
					return { syl: '', glyphs: [], empty: true }
				}
				const raw = String(syl || '').trim()
				if (!raw) {
					return { syl: '', glyphs: [], empty: true }
				}
				const list = splitPinyinSyllableGlyphs(raw).filter((g) => g.ch)
				const glyphs = list.length
					? list
					: raw
						? [{ ch: raw, kind: 'mid', alphMetricFix: false }]
						: [{ ch: '—', kind: 'mid', alphMetricFix: false }]
				return { syl: raw, glyphs, empty: false }
			})
		}
	},
	methods: {
		onCellClick(ev, ci, col) {
			if (!this.interactive || !col || col.empty) return
			this.$emit('cell-click', { index: ci, syllable: col.syl })
			// 仅交互模式阻止冒泡；非交互时让事件传到外层（如课次页 cell-py-row 点读）
			if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation()
		}
	}
}
</script>

<style scoped>
/* 四线三格多列：各 size 字高；整行 translateY 与格高成比例，底缘对齐基线 */
.pflr {
	--pfl-cell-h: 58rpx;
	/* 整行相对基线的垂直微调（0 = 桌面 H5 默认；负值 = 上移） */
	--pfl-baseline-shift: 0;
	width: 100%;
	box-sizing: border-box;
	min-width: 0;
}

.pflr--metric-shift {
	--pfl-baseline-shift: -0.00;
}

.pflr-sheet {
	position: relative;
	box-sizing: border-box;
	width: 100%;
	overflow: visible;
}

.pflr-lines {
	position: absolute;
	/* 勿用 inset：Android 7 等旧 WebView 不支持 */
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	pointer-events: none;
	box-sizing: border-box;
}

.pflr-line-top {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	border-top: 1rpx solid #5d7a91;
}

.pflr-line-dash {
	position: absolute;
	left: 0;
	right: 0;
	top: calc(100% / 3);
	height: 0;
	border-top: 1rpx dashed rgba(90, 118, 138, 0.75);
}

.pflr-line-base {
	position: absolute;
	left: 0;
	right: 0;
	top: calc(200% / 3);
	height: 0;
	border-top: 2rpx solid #3d5266;
}

.pflr-line-bottom {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	border-bottom: 1rpx solid #5d7a91;
}

.pflr-cols {
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	display: flex;
	flex-direction: row;
	align-items: stretch;
	z-index: 1;
	box-sizing: border-box;
	overflow: visible;
}

.pflr-cell {
	flex: 1 1 0%;
	min-width: 0;
	position: relative;
	box-sizing: border-box;
	border-right: 1rpx solid rgba(125, 154, 173, 0.45);
	overflow: visible;
}

.pflr-cell:last-child {
	border-right: none;
}

.pflr-cell--empty {
	pointer-events: none;
}

.pflr-cell-spacer {
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
}

.pflr-cell--interactive:active {
	opacity: 0.92;
}

.pflr-cell--reading {
	z-index: 2;
}

.pflr-cell--reading .pflr-sheet,
.pflr-cell--reading .pflr-write-area {
	filter: none;
}

.pflr--reading-glow .pflr-sheet {
	box-shadow: 0 0 0 4rpx rgba(255, 120, 150, 0.55), 0 8rpx 24rpx rgba(196, 77, 106, 0.28);
}

.pflr-cell--reading .pflr-glyphs-row {
	transform: scale(1.12) translateY(calc(var(--pfl-cell-h) * var(--pfl-baseline-shift)));
}

.pflr-cell--reading .pflr-glyph {
	color: #c44d6a;
	font-weight: 600;
}

.pflr-glyph--tone {
	/* 避免连读放大时声调相对主体偏小 */
	font-size: 1em;
	line-height: 1;
}

.pflr-cell--reading .pflr-glyph--tone {
	font-size: 1.08em;
	font-weight: 600;
}

.pflr-write-area {
	position: absolute;
	left: 4rpx;
	right: 4rpx;
	top: 0;
	/* 上 2/3 为书写区，底边对齐第三线（基线）；下伸笔画向下溢出到第 4 线格 */
	height: calc(200% / 3);
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	align-items: center;
	box-sizing: border-box;
	overflow: visible;
}

.pflr-glyphs-row {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: flex-end;
	justify-content: center;
	box-sizing: border-box;
	line-height: 0;
	max-width: 100%;
	/* 勿 hidden：会裁掉 g y 等下伸笔画；横向防重叠靠作业本智能分行 */
	overflow: visible;
	transform: translateY(calc(var(--pfl-cell-h) * var(--pfl-baseline-shift)));
}

.pflr-glyph {
	display: inline-block;
	vertical-align: bottom;
	flex-shrink: 0;
	color: #1e3a4c;
	line-height: 1;
	letter-spacing: 0;
}

.pflr-glyph--asc,
.pflr-glyph--desc,
.pflr-glyph--mid,
.pflr-glyph--tone {
	position: relative;
}

.pflr-glyph--alph-metric {
	font-size: 0.88em;
}

/* —— 尺寸（--pfl-cell-h 为格高，字号与格高成比例）—— */
.pflr--compact {
	--pfl-cell-h: 88rpx;
}

.pflr--compact .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--compact .pflr-glyphs-row,
.pflr--compact .pflr-glyph {
	font-size: calc(var(--pfl-cell-h) * 35 / 44);
}

.pflr--grid {
	--pfl-cell-h: 144rpx;
}

.pflr--grid .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--grid .pflr-glyphs-row,
.pflr--grid .pflr-glyph {
	font-size: calc(var(--pfl-cell-h) * 56 / 72);
}

.pflr--tone {
	--pfl-cell-h: 116rpx;
}

.pflr--tone .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--tone .pflr-glyphs-row,
.pflr--tone .pflr-glyph {
	font-size: calc(var(--pfl-cell-h) * 46 / 58);
}

.pflr--tone .pflr-cell--reading .pflr-glyphs-row {
	transform: scale(1.16) translateY(calc(var(--pfl-cell-h) * var(--pfl-baseline-shift)));
}

.pflr--tone .pflr-cell--reading .pflr-glyph--tone {
	font-size: 1.12em;
}

.pflr--md {
	--pfl-cell-h: 58rpx;
}

.pflr--md .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--md .pflr-glyphs-row,
.pflr--md .pflr-glyph {
	font-size: calc(var(--pfl-cell-h) * 42 / 58);
}

.pflr--lg {
	--pfl-cell-h: 80rpx;
}

.pflr--lg .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--lg .pflr-glyphs-row,
.pflr--lg .pflr-glyph {
	font-size: calc(var(--pfl-cell-h) * 51 / 80);
}

/** 约为 md 格高的 2 倍；拼音比例较 md 略放大以占满中格 */
.pflr--xl {
	--pfl-cell-h: 116rpx;
}

.pflr--xl .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--xl .pflr-glyphs-row,
.pflr--xl .pflr-glyph {
	font-size: calc(var(--pfl-cell-h) * 44 / 58);
}
</style>
