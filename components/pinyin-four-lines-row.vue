<template>
	<view
		class="pflr"
		:class="[
			'pflr--' + size,
			{
				'pflr--metric-shift': metricShift,
				'pflr--reading-flow': partSeparators,
				'pflr--reading-line': readingLineActive
			}
		]"
		:style="rootLayoutStyle"
	>
		<view class="pflr-sheet" :style="[sheetColorStyle, sheetLayoutStyle]">
			<view class="pflr-lines" aria-hidden="true">
				<view class="pflr-line-top"></view>
				<view class="pflr-line-dash"></view>
				<view class="pflr-line-base"></view>
				<view class="pflr-line-bottom"></view>
			</view>
			<view class="pflr-cols" :class="{ 'pflr-cols--separated': partSeparators }">
				<template
					v-for="(col, ci) in columns"
					:key="col.empty ? 'pflr-e-' + ci : 'pflr-c-' + ci + '-' + col.syl"
				>
					<view
						v-if="partSeparators && ci > 0"
						class="pflr-part-sep"
						aria-hidden="true"
					>
						<text class="pflr-part-sep-text">-</text>
					</view>
					<view
						class="pflr-cell"
						:class="{
							'pflr-cell--interactive': interactive && !col.empty,
							'pflr-cell--empty': col.empty,
							'pflr-cell--reading':
								highlightColumnIndex === ci && !col.empty && !col.readingLine,
							'pflr-cell--part': partSeparators && !col.empty
						}"
						:style="cellPartLayoutStyle(col)"
						@click="onCellClick($event, ci, col)"
					>
						<view v-if="col.empty" class="pflr-cell-spacer" />
						<view v-else-if="col.readingLine" class="pflr-write-area">
							<view class="pflr-glyphs-row pflr-glyphs-row--reading-line">
								<template
									v-for="(seg, si) in col.segments"
									:key="'rs-' + si + '-' + (seg.lookupIndex != null ? seg.lookupIndex : seg.text)"
								>
									<text v-if="seg.type === 'sep'" class="pflr-reading-sep">{{ seg.text }}</text>
									<text
										v-else
										class="pflr-reading-part font-pinyin"
										:class="{
											'pflr-reading-part--on':
												highlightReadingPartIndex === seg.lookupIndex
										}"
										:style="readingPartColorStyle(seg)"
										@click.stop="onReadingPartClick($event, seg)"
									>{{ seg.text }}</text>
								</template>
							</view>
						</view>
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
									:style="glyphColorStyle(ci, col)"
								>{{ g.ch }}</text>
							</view>
						</view>
					</view>
				</template>
			</view>
		</view>
	</view>
</template>

<script>
import { splitPinyinSyllableGlyphs } from '@/utils/pinyin-writing-standard.js'
import { ensurePinyinFontLoaded } from '@/utils/pinyin-font-loader.js'
import { getPinyinSymbolCategory } from '@/utils/pinyin-pep-category.js'

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
		/** >0 时四线三格整体宽度固定（rpx），多音节均分列宽 */
		sheetWidthRpx: {
			type: Number,
			default: 0
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
		},
		/** 传入时按列取各音节分类色（声母/韵母等 Tab） */
		categoryTab: {
			type: String,
			default: ''
		},
		/** 拼读练习：音节列之间显示「-」并加宽列距，避免挤叠 */
		partSeparators: {
			type: Boolean,
			default: false
		},
		/** 拼读完整展示串分段（先拼串再显示，单格内按段排版） */
		readingSegments: {
			type: Array,
			default: () => []
		},
		/** 拼读连读时高亮段下标（对应 lookup），-1 无 */
		highlightReadingPartIndex: {
			type: Number,
			default: -1
		}
	},
	created() {
		ensurePinyinFontLoaded()
	},
	computed: {
		readingLineActive() {
			return Array.isArray(this.readingSegments) && this.readingSegments.length > 0
		},
		fixedSheetWidthRpx() {
			const w = Number(this.sheetWidthRpx)
			return Number.isFinite(w) && w > 0 ? w : 0
		},
		rootLayoutStyle() {
			if (this.partSeparators || this.readingLineActive) {
				return { width: '100%' }
			}
			const w = this.fixedSheetWidthRpx
			if (!w) return {}
			return {
				width: `${w}rpx`,
				minWidth: `${w}rpx`,
				maxWidth: `${w}rpx`
			}
		},
		sheetLayoutStyle() {
			if (this.partSeparators || this.readingLineActive) {
				return { width: '100%' }
			}
			const w = this.fixedSheetWidthRpx
			if (!w) return {}
			return {
				width: `${w}rpx`,
				minWidth: `${w}rpx`,
				maxWidth: `${w}rpx`
			}
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
			const bd = String(this.sheetBd || '').trim()
			if (!bd) return {}
			return {
				borderWidth: '1rpx',
				borderStyle: 'solid',
				borderColor: bd,
				borderRadius: '8rpx',
				boxSizing: 'border-box'
			}
		},
		columns() {
			if (this.readingLineActive) {
				const syl = this.list[0]
				if (syl == null) {
					return [{ syl: '', glyphs: [], empty: true, readingLine: false }]
				}
				const raw = String(syl || '').trim()
				if (!raw) {
					return [{ syl: '', glyphs: [], empty: true, readingLine: false }]
				}
				return [
					{
						syl: raw,
						glyphs: [],
						empty: false,
						readingLine: true,
						segments: this.readingSegments
					}
				]
			}
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
		/** 拼读段列宽随字母多少变化，避免等分格撑爆/留空 */
		cellPartLayoutStyle(col) {
			if (!this.partSeparators || !col || col.empty) return {}
			const n = Math.max(1, (col.glyphs && col.glyphs.length) || String(col.syl || '').length)
			const em = n * 0.56 + 0.35
			return {
				flex: '0 0 auto',
				width: 'auto',
				minWidth: `${em}em`,
				maxWidth: 'none'
			}
		},
		colorsForColumn(col) {
			if (!col || col.empty) return { bg: '', bd: '' }
			const tab = String(this.categoryTab || '').trim()
			if (tab) {
				const cat = getPinyinSymbolCategory(col.syl, tab)
				return { bg: cat.bg || '', bd: cat.bd || '' }
			}
			return {
				bg: String(this.sheetBg || '').trim(),
				bd: String(this.sheetBd || '').trim()
			}
		},
		glyphColorStyle(ci, col) {
			if (!col || col.empty || this.highlightColumnIndex !== ci) return {}
			const { bd } = this.colorsForColumn(col)
			return { color: bd || '#c44d6a' }
		},
		readingPartColorStyle(seg) {
			if (!seg || seg.type !== 'part' || this.highlightReadingPartIndex !== seg.lookupIndex) {
				return {}
			}
			const { bd } = this.colorsForColumn({ syl: seg.text, empty: false })
			return { color: bd || '#c44d6a' }
		},
		onReadingPartClick(ev, seg) {
			if (!this.interactive || !seg || seg.type !== 'part') return
			const idx = Number(seg.lookupIndex)
			if (!Number.isFinite(idx) || idx < 0) return
			this.$emit('cell-click', { index: idx, syllable: String(seg.text || '').trim() })
			if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation()
		},
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

/* 拼读序列：同一套四线三格铺满行宽，各段按字数宽窄排列（非等分格） */
.pflr--reading-flow {
	width: 100%;
	box-sizing: border-box;
}

.pflr--reading-flow .pflr-sheet {
	width: 100%;
	box-sizing: border-box;
	overflow: visible;
}

.pflr--reading-flow.pflr--tone,
.pflr--reading-line.pflr--tone {
	--pfl-cell-h: 124rpx;
}

.pflr--reading-line {
	width: 100%;
	box-sizing: border-box;
}

.pflr--reading-line .pflr-sheet {
	width: 100%;
	box-sizing: border-box;
}

.pflr-glyphs-row--reading-line {
	width: 100%;
	max-width: 100%;
	justify-content: center;
	flex-wrap: nowrap;
	white-space: nowrap;
	padding-left: 0.2em;
	padding-right: 0.2em;
	box-sizing: border-box;
}

.pflr-reading-sep {
	font-size: 0.42em;
	font-weight: 500;
	color: rgba(92, 61, 46, 0.28);
	line-height: 1;
	flex-shrink: 0;
}

.pflr-reading-part {
	font-size: 1em;
	line-height: 1;
	flex-shrink: 0;
}

.pflr-reading-part--on {
	font-weight: 600;
}

.pflr-cols--separated {
	width: 100%;
	justify-content: space-evenly;
	align-items: stretch;
	padding: 0 8rpx;
	box-sizing: border-box;
}

.pflr-cols--separated .pflr-cell--part {
	flex: 0 0 auto;
	width: auto;
	min-width: min-content;
	max-width: none;
	border-right: none;
	border-radius: 0;
	padding: 0 6rpx;
	box-sizing: content-box;
}

.pflr-cols--separated .pflr-cell--part .pflr-write-area {
	left: 0;
	right: 0;
}

.pflr-cols--separated .pflr-cell--part .pflr-glyphs-row {
	width: auto;
	max-width: none;
	padding-left: 0.12em;
	padding-right: 0.12em;
	box-sizing: content-box;
	justify-content: center;
	white-space: nowrap;
}

.pflr-cols--separated .pflr-cell--part.pflr-cell--reading {
	background: rgba(255, 228, 240, 0.38);
	border-radius: 8rpx;
}

.pflr-part-sep {
	flex: 0 0 auto;
	width: 28rpx;
	min-width: 28rpx;
	max-width: 28rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	align-self: stretch;
	pointer-events: none;
	box-sizing: border-box;
}

.pflr-part-sep-text {
	font-size: 32rpx;
	font-weight: 600;
	color: rgba(92, 61, 46, 0.26);
	line-height: 1;
	transform: translateY(calc(var(--pfl-cell-h) * -0.05));
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

.pflr-glyph--tone {
	font-size: 1em;
	line-height: 1;
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

/* —— 尺寸（--pfl-cell-h 为格高；字号仅设在 glyphs-row，.font-pinyin 用 em 叠乘缩放）—— */
.pflr--compact {
	--pfl-cell-h: 88rpx;
}

.pflr--compact .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--compact .pflr-glyphs-row {
	font-size: calc(var(--pfl-cell-h) * 35 / 44);
}

.pflr--grid {
	--pfl-cell-h: 144rpx;
}

.pflr--grid .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--grid .pflr-glyphs-row {
	font-size: calc(var(--pfl-cell-h) * 56 / 72);
}

.pflr--tone {
	--pfl-cell-h: 116rpx;
}

.pflr--tone .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--tone .pflr-glyphs-row {
	font-size: calc(var(--pfl-cell-h) * 46 / 58);
}

.pflr--md {
	--pfl-cell-h: 58rpx;
}

.pflr--md .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--md .pflr-glyphs-row {
	font-size: calc(var(--pfl-cell-h) * 42 / 58);
}

.pflr--lg {
	--pfl-cell-h: 80rpx;
}

.pflr--lg .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--lg .pflr-glyphs-row {
	font-size: calc(var(--pfl-cell-h) * 51 / 80);
}

/** 约为 md 格高的 2 倍；拼音比例较 md 略放大以占满中格 */
.pflr--xl {
	--pfl-cell-h: 116rpx;
}

.pflr--xl .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--xl .pflr-glyphs-row {
	font-size: calc(var(--pfl-cell-h) * 44 / 58);
}
</style>
