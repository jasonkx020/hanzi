<template>
	<view class="pflr" :class="'pflr--' + size">
		<view class="pflr-sheet">
			<view class="pflr-lines" aria-hidden="true">
				<view class="pflr-line-top"></view>
				<view class="pflr-line-dash"></view>
				<view class="pflr-line-base"></view>
				<view class="pflr-line-bottom"></view>
			</view>
			<view class="pflr-cols">
				<view
					v-for="(col, ci) in columns"
					:key="ci + '-' + col.syl"
					class="pflr-cell"
					:class="{ 'pflr-cell--interactive': interactive }"
					@click.stop="onCellClick(ci, col)"
				>
					<view class="pflr-write-area">
						<view class="pflr-glyphs-row">
							<text
								v-for="(g, gi) in col.glyphs"
								:key="gi + '-' + g.ch"
								class="pflr-glyph"
								:class="'pflr-glyph--' + g.kind"
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

export default {
	name: 'PinyinFourLinesRow',
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
		}
	},
	computed: {
		list() {
			const arr = Array.isArray(this.syllables)
				? this.syllables.map((s) => String(s || '').trim()).filter(Boolean)
				: []
			return arr.length ? arr : ['—']
		},
		columns() {
			return this.list.map((syl) => {
				const raw = String(syl || '').trim()
				const list = splitPinyinSyllableGlyphs(raw).filter((g) => g.ch)
				const glyphs = list.length ? list : raw ? [{ ch: raw, kind: 'mid' }] : [{ ch: '—', kind: 'mid' }]
				return { syl: raw, glyphs }
			})
		}
	},
	methods: {
		onCellClick(ci, col) {
			if (!this.interactive) return
			this.$emit('cell-click', { index: ci, syllable: col.syl })
		}
	}
}
</script>

<style scoped>
/* 与 pinyin-four-lines 一致：整行共用一套四线，列间竖线分隔；字号随 --pfl-cell-h 等比 */
.pflr {
	--pfl-cell-h: 58rpx;
	width: 100%;
	box-sizing: border-box;
	min-width: 0;
}

.pflr-sheet {
	position: relative;
	box-sizing: border-box;
	width: 100%;
	overflow: visible;
}

.pflr-lines {
	position: absolute;
	inset: 0;
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
	inset: 0;
	display: flex;
	flex-direction: row;
	align-items: stretch;
	z-index: 1;
	box-sizing: border-box;
}

.pflr-cell {
	flex: 1;
	min-width: 0;
	position: relative;
	box-sizing: border-box;
	border-right: 1rpx solid rgba(125, 154, 173, 0.45);
}

.pflr-cell:last-child {
	border-right: none;
}

.pflr-cell--interactive:active {
	opacity: 0.92;
}

.pflr-write-area {
	position: absolute;
	left: 2rpx;
	right: 2rpx;
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
	align-items: baseline;
	justify-content: center;
	box-sizing: border-box;
	line-height: 0;
	overflow: visible;
}

.pflr-glyph {
	color: #1e3a4c;
	font-weight: 700;
	line-height: 1;
	letter-spacing: 0;
	font-family: 'Pinyin Regular', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
}

.pflr-glyph--asc,
.pflr-glyph--desc,
.pflr-glyph--mid {
	position: relative;
}

/* —— 尺寸（与单格 pinyin-four-lines 对齐，比例一致）—— */
.pflr--compact {
	--pfl-cell-h: 44rpx;
}

.pflr--compact .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--compact .pflr-glyphs-row,
.pflr--compact .pflr-glyph {
	font-size: calc(var(--pfl-cell-h) * 29 / 44);
}

.pflr--grid {
	--pfl-cell-h: 72rpx;
}

.pflr--grid .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--grid .pflr-glyphs-row,
.pflr--grid .pflr-glyph {
	font-size: calc(var(--pfl-cell-h) * 47 / 72);
}

.pflr--tone {
	--pfl-cell-h: 58rpx;
}

.pflr--tone .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--tone .pflr-glyphs-row,
.pflr--tone .pflr-glyph {
	font-size: calc(var(--pfl-cell-h) * 39 / 58);
}

.pflr--md {
	--pfl-cell-h: 58rpx;
}

.pflr--md .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--md .pflr-glyphs-row,
.pflr--md .pflr-glyph {
	font-size: calc(var(--pfl-cell-h) * 35 / 58);
}

.pflr--md .pflr-glyph {
	font-weight: 600;
}

.pflr--lg {
	--pfl-cell-h: 80rpx;
}

.pflr--lg .pflr-sheet {
	height: var(--pfl-cell-h);
}

.pflr--lg .pflr-glyphs-row,
.pflr--lg .pflr-glyph {
	font-size: calc(var(--pfl-cell-h) * 43 / 80);
}
</style>
