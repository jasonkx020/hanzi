<!--
  @file pinyin-lab-cell.vue
  @layer L1 表现层
  @description UI 组件源文件：pinyin-lab-cell.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<view
		class="pinyin-lab-cell"
		:class="[
			'pinyin-lab-cell--' + rowSize,
			{
				'pinyin-lab-cell--active': active,
				'pinyin-lab-cell--picked': picked,
				'pinyin-lab-cell--long': isLong,
				'pinyin-lab-cell--block': block
			}
		]"
		@click.stop="onWrapClick"
	>
		<pinyin-four-lines-row
			class="pinyin-lab-cell__pflr"
			:syllables="syllableList"
			:size="rowSize"
			:auto-wrap="false"
			:interactive="interactive"
			:sheet-bg="resolvedBg"
			:sheet-bd="resolvedBd"
			:highlight-column-index="highlightIndex"
			@cell-click="onCellClick"
		/>
	</view>
</template>

<script>
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { getPinyinSymbolCategory } from '@/utils/pinyin-pep-category.js'

export default {
	name: 'PinyinLabCell',
	components: { PinyinFourLinesRow },
	props: {
		/** 单个拼音音节（与 syllables 二选一） */
		symbol: { type: String, default: '' },
		/** 多音节时直接传入（如四声一行） */
		syllables: { type: Array, default: null },
		/** compact | md | grid | tone */
		size: { type: String, default: '' },
		/** 用于配色：声母 | 韵母 | 整体认读 | 音调 */
		categoryTab: { type: String, default: '' },
		sheetBg: { type: String, default: '' },
		sheetBd: { type: String, default: '' },
		active: { type: Boolean, default: false },
		picked: { type: Boolean, default: false },
		interactive: { type: Boolean, default: true },
		/** 测验选项：占半行宽 */
		block: { type: Boolean, default: false }
	},
	computed: {
		syllableList() {
			if (Array.isArray(this.syllables) && this.syllables.length) {
				return this.syllables.map((s) => (s == null ? '' : String(s).trim())).filter(Boolean)
			}
			const s = String(this.symbol || '').trim()
			return s ? [s] : ['—']
		},
		rowSize() {
			const forced = String(this.size || '').trim()
			if (forced) return forced
			const maxLen = Math.max(...this.syllableList.map((s) => s.length), 0)
			if (this.syllableList.length > 1) return 'tone'
			return maxLen >= 4 ? 'compact' : 'grid'
		},
		isLong() {
			return Math.max(...this.syllableList.map((s) => s.length), 0) > 2
		},
		highlightIndex() {
			return this.active || this.picked ? 0 : -1
		},
		resolvedBg() {
			if (this.sheetBg) return this.sheetBg
			const tab = String(this.categoryTab || '').trim()
			if (!tab || !this.syllableList[0]) return ''
			const cat = getPinyinSymbolCategory(this.syllableList[0], tab)
			return cat.bg || ''
		},
		resolvedBd() {
			if (this.sheetBd) return this.sheetBd
			const tab = String(this.categoryTab || '').trim()
			if (!tab || !this.syllableList[0]) return ''
			const cat = getPinyinSymbolCategory(this.syllableList[0], tab)
			return cat.bd || ''
		}
	},
	methods: {
		onWrapClick() {
			if (!this.interactive) return
			this.$emit('click')
		},
		onCellClick(payload) {
			if (!this.interactive) return
			this.$emit('click')
			this.$emit('cell-click', payload)
		}
	}
}
</script>

<style scoped>
.pinyin-lab-cell {
	display: inline-flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: center;
	min-width: 100rpx;
	max-width: 100%;
	box-sizing: border-box;
	padding: 6rpx 8rpx;
	border-radius: 18rpx;
	border-width: 4rpx;
	border-style: solid;
	border-color: transparent;
	vertical-align: top;
}

.pinyin-lab-cell--block {
	flex: 1;
	min-width: calc(50% - 10rpx);
}

.pinyin-lab-cell--long {
	min-width: 132rpx;
}

.pinyin-lab-cell--active,
.pinyin-lab-cell--picked {
	border-color: #ff8aab;
	box-shadow: 0 0 0 4rpx rgba(255, 120, 150, 0.35), 0 8rpx 16rpx rgba(196, 77, 106, 0.15);
}

.pinyin-lab-cell__pflr {
	width: 100%;
	min-width: 0;
}
</style>
