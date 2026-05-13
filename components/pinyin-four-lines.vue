<template>
	<view class="pfl" :class="rootClass">
		<view class="pfl-sheet">
			<!-- 四线：顶线 / 上中分界(虚线) / 基准线(实线) / 底线 -->
			<view class="pfl-lines" aria-hidden="true">
				<view class="pfl-line-top"></view>
				<view class="pfl-line-dash"></view>
				<view class="pfl-line-base"></view>
				<view class="pfl-line-bottom"></view>
			</view>
			<view class="pfl-write-area">
				<view class="pfl-glyphs-row">
					<text
						v-for="(g, gi) in glyphs"
						:key="gi + '-' + g.ch"
						class="pfl-glyph"
						:class="'pfl-glyph--' + g.kind"
					>{{ g.ch }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { splitPinyinSyllableGlyphs } from '@/utils/pinyin-writing-standard.js'

export default {
	name: 'PinyinFourLines',
	props: {
		/** 单个音节或小写字母符号，勿含空格 */
		text: {
			type: String,
			default: ''
		},
		/** compact 课字卡 · grid 拼音Tab格子 · tone 音调格子 · md 摘要条 · lg 详情 */
		size: {
			type: String,
			default: 'grid'
		}
	},
	computed: {
		display() {
			return String(this.text || '').trim() || ''
		},
		glyphs() {
			const raw = this.display
			if (!raw) return []
			const list = splitPinyinSyllableGlyphs(raw).filter((g) => g.ch)
			return list.length ? list : [{ ch: raw, kind: 'mid' }]
		},
		rootClass() {
			const s = this.size
			const allowed = ['compact', 'grid', 'tone', 'md', 'lg']
			return allowed.includes(s) ? `pfl--${s}` : 'pfl--grid'
		}
	}
}
</script>

<style scoped>
/*
 * 排版说明（rpx vs em）：
 * - 格子高度、边距、线宽：用 rpx，随 uni 750 设计宽缩放，布局稳定。
 * - 拼音字号：用 calc(var(--pfl-cell-h) * n/d)，与格子高度同一基准，等比例随屏缩放。
 * - .pfl-glyphs-row 与 .pfl-glyph 同字号，基线对齐由书写区 flex 与基准线布局决定。
 */
/* 四线三格：上 / 中 / 下三等分，线位在 1/3 与 2/3 高度处 */
.pfl {
	--pfl-cell-h: 72rpx;
	display: inline-flex;
	vertical-align: bottom;
	flex-shrink: 0;
	box-sizing: border-box;
	max-width: 100%;
}

.pfl-sheet {
	position: relative;
	box-sizing: border-box;
	overflow: visible;
	min-width: 0.65em;
}

.pfl-lines {
	position: absolute;
	inset: 0;
	pointer-events: none;
	box-sizing: border-box;
}

.pfl-line-top {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	border-top: 1rpx solid #5d7a91;
}

.pfl-line-dash {
	position: absolute;
	left: 0;
	right: 0;
	top: calc(100% / 3);
	height: 0;
	border-top: 1rpx dashed rgba(90, 118, 138, 0.75);
}

.pfl-line-base {
	position: absolute;
	left: 0;
	right: 0;
	top: calc(200% / 3);
	height: 0;
	border-top: 2rpx solid #3d5266;
}

.pfl-line-bottom {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	border-bottom: 1rpx solid #5d7a91;
}

/* 书写区至基准线（高度的 2/3），字母基线对齐中格底 = 与基准实线重合 */
.pfl-write-area {
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

.pfl-glyphs-row {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	align-items: baseline;
	justify-content: center;
	box-sizing: border-box;
	line-height: 0;
	overflow: visible;
}

.pfl-glyph {
	color: #1e3a4c;
	font-weight: 700;
	line-height: 1;
	letter-spacing: 0;
	font-family: 'Pinyin Regular', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
}

/* 占格类型：配合 baseline 对齐；必要时再做微调 */
.pfl-glyph--asc,
.pfl-glyph--desc,
.pfl-glyph--mid {
	position: relative;
}

/* 尺寸：--pfl-cell-h 为格子高度，字号 = 高度 × 固定比例 */
.pfl--compact {
	--pfl-cell-h: 44rpx;
}

.pfl--compact .pfl-sheet {
	height: var(--pfl-cell-h);
	min-width: 30rpx;
	padding: 0 2rpx;
}

.pfl--compact .pfl-glyphs-row,
.pfl--compact .pfl-glyph {
	font-size: calc(var(--pfl-cell-h) * 29 / 44);
}

.pfl--grid {
	--pfl-cell-h: 72rpx;
}

.pfl--grid .pfl-sheet {
	height: var(--pfl-cell-h);
	min-width: 48rpx;
	padding: 0 4rpx;
}

.pfl--grid .pfl-glyphs-row,
.pfl--grid .pfl-glyph {
	font-size: calc(var(--pfl-cell-h) * 47 / 72);
}

.pfl--tone {
	--pfl-cell-h: 58rpx;
}

.pfl--tone .pfl-sheet {
	height: var(--pfl-cell-h);
	min-width: 40rpx;
	padding: 0 4rpx;
}

.pfl--tone .pfl-glyphs-row,
.pfl--tone .pfl-glyph {
	font-size: calc(var(--pfl-cell-h) * 39 / 58);
}

.pfl--md {
	--pfl-cell-h: 58rpx;
}

.pfl--md .pfl-sheet {
	height: var(--pfl-cell-h);
	min-width: 44rpx;
	padding: 0 6rpx;
}

.pfl--md .pfl-glyphs-row,
.pfl--md .pfl-glyph {
	font-size: calc(var(--pfl-cell-h) * 35 / 58);
}

.pfl--md .pfl-glyph {
	font-weight: 600;
}

.pfl--lg {
	--pfl-cell-h: 80rpx;
}

.pfl--lg .pfl-sheet {
	height: var(--pfl-cell-h);
	min-width: 52rpx;
	padding: 0 8rpx;
}

.pfl--lg .pfl-glyphs-row,
.pfl--lg .pfl-glyph {
	font-size: calc(var(--pfl-cell-h) * 43 / 80);
}
</style>
