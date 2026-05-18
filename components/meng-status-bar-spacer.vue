<template>
	<view
		class="meng-status-bar-spacer"
		:style="spacerStyle"
		aria-hidden="true"
	/>
</template>

<script>
import { getMengNavMetrics } from '@/utils/meng-nav-metrics.js'

/**
 * 自定义导航页顶部状态栏占位（纯 px 高度，避免 inline 中 calc/env 在 App 端失效）。
 */
export default {
	name: 'MengStatusBarSpacer',
	props: {
		/** 指定高度时优先使用（px） */
		heightPx: { type: Number, default: 0 }
	},
	data() {
		return {
			innerPx: 44
		}
	},
	computed: {
		barPx() {
			const forced = Number(this.heightPx)
			if (Number.isFinite(forced) && forced > 0) return Math.round(forced)
			return this.innerPx
		},
		spacerStyle() {
			return {
				height: `${this.barPx}px`,
				width: '100%',
				flexShrink: '0'
			}
		}
	},
	created() {
		this.refresh()
	},
	pageLifetimes: {
		show() {
			this.refresh()
		}
	},
	methods: {
		refresh() {
			this.innerPx = getMengNavMetrics().statusBarPx
		}
	}
}
</script>

<style scoped>
.meng-status-bar-spacer {
	display: block;
	flex-shrink: 0;
	width: 100%;
	pointer-events: none;
}
</style>
