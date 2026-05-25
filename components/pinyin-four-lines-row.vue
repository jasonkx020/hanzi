<template>

	<view

		class="pflr"

		:class="[

			'pflr--' + size,

			{

				'pflr--metric-shift': metricShift,

				'pflr--auto-wrap': autoWrap

			}

		]"

	>

		<view

			v-for="(line, li) in layoutLines"

			:key="'pflr-line-' + li"

			class="pflr-line-block"

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

						v-for="(col, ci) in line.cells"

						:key="col.empty ? 'pflr-e-' + li + '-' + ci : li + '-' + col.index + '-' + col.syl"

						class="pflr-cell"

						:class="{

							'pflr-cell--interactive': interactive && !col.empty,

							'pflr-cell--empty': col.empty,

							'pflr-cell--reading': highlightColumnIndex === col.index && !col.empty

						}"

						:data-pflr-ci="col.empty ? '' : String(col.index)"

						:style="cellFlexStyle(col, line)"

						@tap.stop="onCellTap(col)"

					>

						<view v-if="col.empty" class="pflr-cell-spacer" />

						<view v-else class="pflr-write-area">

							<view class="pflr-glyphs-row">

								<text

									v-for="(g, gi) in col.glyphs"

									:key="gi + '-' + g.ch"

									class="pflr-glyph"

									:class="[

										glyphFontClass,

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

	</view>

</template>



<script>

import { splitPinyinSyllableGlyphs } from '@/utils/pinyin-writing-standard.js'

import { ensurePinyinFontLoaded } from '@/utils/pinyin-font-loader.js'

import {

	buildFourLinesRowLayout,

	maxUnitsPerRowForWidth

} from '@/utils/pinyin-four-lines-layout.js'



/** 手机 / App 端 text 行盒下沉，需相对桌面 H5 略上移才能贴第三线（基线） */

function detectPinyinMetricShift() {

	try {

		const sys = uni.getSystemInfoSync()

		const p = String(sys.platform || '').toLowerCase()

		if (p === 'android' || p === 'ios') return true

		if (p === 'devtools') return true

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

			metricShift: detectPinyinMetricShift(),

			containerWidthPx: 0,

			unitOverrides: {},

			_layoutPass: 0,

			_lastCellTapAt: 0

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

		/** 保留兼容（由 autoWrap 布局替代固定最小宽） */

		minWidthPx: {

			type: Number,

			default: 96

		},

		interactive: {

			type: Boolean,

			default: false

		},

		highlightColumnIndex: {

			type: Number,

			default: -1

		},

		sheetBg: {

			type: String,

			default: ''

		},

		sheetBd: {

			type: String,

			default: ''

		},

		fontClass: {

			type: String,

			default: 'font-pinyin',

			validator: (v) => ['font-pinyin', 'font-pinyin-step', 'pinyin', 'step'].includes(String(v || ''))

		},

		/** 为 true 时按音节宽度分格，超宽放大、一行放不下自动换到下一格行 */

		autoWrap: {

			type: Boolean,

			default: true

		},

		/** 一行最多音节数（autoWrap 时） */

		maxPerRow: {

			type: Number,

			default: 6

		}

	},

	created() {

		ensurePinyinFontLoaded()

	},

	mounted() {

		this.scheduleMeasure()

	},

	beforeDestroy() {

		if (this._measureTimer != null) {

			clearTimeout(this._measureTimer)

			this._measureTimer = null

		}

	},

	watch: {

		syllables: {

			handler() {

				this.unitOverrides = {}

				this._layoutPass = 0

				this.scheduleMeasure()

			},

			deep: true

		},

		size() {

			this.scheduleMeasure()

		},

		fontClass() {

			this.scheduleMeasure()

		},

		autoWrap() {

			this.unitOverrides = {}

			this._layoutPass = 0

			this.scheduleMeasure()

		}

	},

	computed: {

		glyphFontClass() {

			const v = String(this.fontClass || 'font-pinyin')

			if (v === 'step' || v === 'font-pinyin-step') return 'font-pinyin-step'

			return 'font-pinyin'

		},

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

			return this.list.map((syl, index) => {

				if (syl == null) {

					return { syl: '', glyphs: [], empty: true, index }

				}

				const raw = String(syl || '').trim()

				if (!raw) {

					return { syl: '', glyphs: [], empty: true, index }

				}

				const list = splitPinyinSyllableGlyphs(raw).filter((g) => g.ch)

				const glyphs = list.length

					? list

					: raw

						? [{ ch: raw, kind: 'mid', alphMetricFix: false }]

						: [{ ch: '—', kind: 'mid', alphMetricFix: false }]

				return { syl: raw, glyphs, empty: false, index }

			})

		},

		effectiveMaxUnitsPerRow() {

			if (!this.autoWrap) return 99

			return maxUnitsPerRowForWidth(this.containerWidthPx, this.size)

		},

		layoutLines() {

			if (!this.autoWrap) {

				const cells = this.columns.map((c) => ({ ...c, widthUnits: 1 }))

				return [{ cells, totalUnits: cells.length || 1 }]

			}

			return buildFourLinesRowLayout(this.columns, {

				maxUnitsPerRow: this.effectiveMaxUnitsPerRow,

				maxPerRow: this.maxPerRow,

				unitOverrides: this.unitOverrides

			})

		}

	},

	methods: {

		cellFlexStyle(col, line) {

			if (!this.autoWrap) {

				return { flex: '1 1 0%' }

			}

			const u = Math.max(1, Number(col.widthUnits) || 1)

			return { flex: `${u} ${u} 0%` }

		},

		scheduleMeasure() {

			if (!this.autoWrap) return

			if (this._measureTimer != null) clearTimeout(this._measureTimer)

			this._measureTimer = setTimeout(() => {

				this._measureTimer = null

				this.measureLayout()

			}, 120)

		},

		measureLayout() {

			if (!this.autoWrap || this._layoutPass >= 3) return

			const query = uni.createSelectorQuery().in(this)

			query.select('.pflr').boundingClientRect()

			query.selectAll('.pflr-cell:not(.pflr-cell--empty)').boundingClientRect()

			query.selectAll('.pflr-glyphs-row').boundingClientRect()

			query.exec((res) => {

				if (!res || !res.length) return

				const root = res[0]

				const cells = res[1] || []

				const glyphs = res[2] || []

				if (root && root.width > 0) {

					this.containerWidthPx = root.width

				}

				if (!cells.length || !glyphs.length) return

				const next = { ...this.unitOverrides }

				let changed = false

				const nonEmpty = this.columns.filter((c) => !c.empty)

				const n = Math.min(cells.length, glyphs.length, nonEmpty.length)

				for (let i = 0; i < n; i++) {

					const cell = cells[i]

					const row = glyphs[i]

					const col = nonEmpty[i]

					if (!cell || !row || !col || !row.width || !cell.width) continue

					const idx = col.index

					const pad = 6

					if (row.width + pad > cell.width) {

						const hi = this.highlightColumnIndex

						if (hi >= 0 && idx === hi) continue

						const ratio = (row.width + pad) / cell.width

						const need = Math.max(next[idx] || 1, ratio * 1.08)

						if (need > (next[idx] || 1) + 0.02) {

							next[idx] = need

							changed = true

						}

					}

				}

				this._layoutPass += 1

				if (changed) {

					this.unitOverrides = next

					this.$nextTick(() => this.scheduleMeasure())

				}

			})

		},

		onCellTap(col) {

			if (!this.interactive || !col || col.empty) return

			const syl = String(col.syl || '').trim()

			if (!syl) return

			const now = Date.now()

			if (now - this._lastCellTapAt < 280) return

			this._lastCellTapAt = now

			this.$emit('cell-click', { index: col.index, syllable: syl })

		}

	}

}

</script>



<style scoped>

/* 四线三格多列：各 size 字高；整行 translateY 与格高成比例，底缘对齐基线 */

.pflr {

	--pfl-cell-h: 58rpx;

	--pfl-baseline-shift: 0;

	width: 100%;

	box-sizing: border-box;

	min-width: 0;

}



.pflr-line-block + .pflr-line-block {

	margin-top: 12rpx;

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

	flex-wrap: nowrap;

	align-items: stretch;

	z-index: 1;

	box-sizing: border-box;

	overflow: visible;

}



.pflr--auto-wrap .pflr-cell {

	flex: 1 1 0%;

	min-width: 0;

}



.pflr-cell {

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

	flex: 1 1 0% !important;

	min-width: 0 !important;

	max-width: none !important;

}



.pflr-cell-spacer {

	position: absolute;

	left: 0;

	top: 0;

	right: 0;

	bottom: 0;

}



.pflr-cell--interactive {

	z-index: 2;

}

.pflr-cell--interactive:active {

	opacity: 0.92;

}

.pflr-cell--interactive .pflr-glyphs-row,

.pflr-cell--interactive .pflr-glyph {

	pointer-events: none;

}



.pflr-cell--reading {

	z-index: 2;

	background-color: rgba(255, 236, 246, 0.5);

	box-shadow: inset 0 0 0 3rpx rgba(255, 138, 171, 0.65);

}



.pflr-cell--reading .pflr-write-area {

	filter: none;

}



.pflr-cell--reading .pflr-glyphs-row {

	transform: translateY(calc(var(--pfl-cell-h) * var(--pfl-baseline-shift)));

}



.pflr-cell--reading .pflr-glyph {

	color: #c44d6a;

}



.pflr-glyph--tone {

	font-size: 1.08em;

	line-height: 1;

	font-weight: 700;

}



.pflr-cell--reading .pflr-glyph--tone {

	color: #c44d6a;

}



.pflr-write-area {

	position: absolute;

	left: 4rpx;

	right: 4rpx;

	top: 0;

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

	--pfl-tone-mark-scale: 1.14;

}



.pflr--tone .pflr-sheet {

	height: var(--pfl-cell-h);

	border-radius: 12rpx;

}



.pflr--tone .pflr-glyphs-row,

.pflr--tone .pflr-glyph {

	font-size: calc(var(--pfl-cell-h) * 48 / 58);

}



.pflr--tone .pflr-glyph--tone {

	font-size: calc(var(--pfl-cell-h) * 48 / 58 * var(--pfl-tone-mark-scale));

}



.pflr--tone .pflr-cell--reading .pflr-glyphs-row {

	transform: translateY(calc(var(--pfl-cell-h) * var(--pfl-baseline-shift)));

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


