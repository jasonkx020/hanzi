<template>
	<meng-sub-page title="四声词典" subtitle="点一行，听四声连读" avatar-pose="book" :overlap-body="true">
		<view class="chart-page">
			<view class="chart-tabs">
				<view
					v-for="b in blocks"
					:key="b.key"
					class="chart-tab"
					:class="{ 'chart-tab--on': activeBlockKey === b.key }"
					@click="activeBlockKey = b.key"
				>
					<text>{{ b.title }}</text>
				</view>
			</view>

			<view class="chart-head">
				<text class="chart-head-cell chart-head-cell--bare">音节</text>
				<text v-for="lab in columnLabels" :key="lab" class="chart-head-cell">{{ lab }}</text>
			</view>

			<scroll-view scroll-y class="chart-scroll" :show-scrollbar="false">
				<view
					v-for="(row, ri) in activeRows"
					:key="row.bareStem + '-' + ri"
					class="chart-row"
					:class="{ 'chart-row--playing': playingRow === ri }"
					@click="onRowTap(row, ri)"
				>
					<pinyin-lab-cell
						class="chart-row-stem"
						:symbol="row.stemLabel || row.bareStem || row.bare"
						:sheet-bg="row.cat.bg"
						:sheet-bd="row.cat.bd"
						size="compact"
						:interactive="false"
					/>
					<view class="chart-row-pflr" @click.stop>
						<pinyin-four-lines-row
							size="tone"
							interactive
							:sheet-bg="row.cat.bg"
							:sheet-bd="row.cat.bd"
							:syllables="toneRowDisplays(row)"
							font-class="font-pinyin-step"
							@cell-click="(p) => onToneCellClick(row, p)"
						/>
					</view>
					<text class="chart-row-chain-hint">▶ 四声</text>
				</view>
			</scroll-view>

			<text class="chart-foot">点格子听单个音；点整行听 mā→má→mǎ→mà</text>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import PinyinLabCell from '@/components/pinyin-lab-cell.vue'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { TONE_COLUMN_LABELS } from '@/utils/pinyin-tone-lab/constants.js'
import { getToneChartBlocks } from '@/utils/pinyin-tone-lab/chart-data.js'
import { loadToneLabProgress } from '@/utils/pinyin-tone-lab/progress.js'
import { playToneChainForBare } from '@/utils/pinyin-tone-lab/play-tone-chain.js'
import {
	getLocalPinyinAudioPath,
	playPinyinLocalAudio,
	stopLocalPinyinAudio
} from '@/utils/play-pinyin-local-audio.js'

export default {
	components: { MengSubPage, PinyinLabCell, PinyinFourLinesRow },
	data() {
		const progress = loadToneLabProgress()
		return {
			columnLabels: TONE_COLUMN_LABELS,
			blocks: getToneChartBlocks({ includeWhole: !!progress.level3Done }),
			activeBlockKey: 'final',
			playingRow: -1,
			busy: false
		}
	},
	computed: {
		activeRows() {
			const b = this.blocks.find((x) => x.key === this.activeBlockKey)
			return b?.rows || []
		}
	},
	onShow() {
		const progress = loadToneLabProgress()
		this.blocks = getToneChartBlocks({ includeWhole: !!progress.level3Done })
	},
	onHide() {
		stopLocalPinyinAudio()
		this.playingRow = -1
	},
	onUnload() {
		stopLocalPinyinAudio()
	},
	methods: {
		toneRowDisplays(row) {
			return (row && row.cells ? row.cells : []).map((c) => c.display)
		},
		onToneCellClick(row, payload) {
			const idx = payload && typeof payload.index === 'number' ? payload.index : -1
			const cell = row && row.cells && idx >= 0 ? row.cells[idx] : null
			if (cell) this.onCellTap(cell)
		},
		async onCellTap(cell) {
			if (!cell?.play || cell.disabled || this.busy) return
			this.busy = true
			stopLocalPinyinAudio()
			try {
				await playPinyinLocalAudio(getLocalPinyinAudioPath(cell.play), { timeoutMs: 3200 })
			} catch (_) {}
			this.busy = false
		},
		async onRowTap(row, ri) {
			if (this.busy) return
			const bare = row.bareStem || row.bare
			if (!bare) return
			this.busy = true
			this.playingRow = ri
			stopLocalPinyinAudio()
			await playToneChainForBare(bare, { gapMs: 480 })
			this.playingRow = -1
			this.busy = false
		}
	}
}
</script>

<style scoped>
.chart-page {
	padding: 4rpx 4rpx 24rpx;
	display: flex;
	flex-direction: column;
	min-height: 60vh;
}

.chart-tabs {
	display: flex;
	flex-direction: row;
	margin-bottom: 12rpx;
}

.chart-tab {
	flex: 1;
	text-align: center;
	padding: 16rpx;
	border-radius: 16rpx;
	background: #fff;
	border: 3rpx solid var(--meng-border-warm);
	font-size: 28rpx;
	font-weight: 700;
	color: #6d5e52;
}

.chart-tab--on {
	background: #ffd4f0;
	border-color: #ff8aab;
	color: #c44d6a;
}

.chart-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 8rpx 4rpx;
	margin-bottom: 8rpx;
}

.chart-head-cell {
	flex: 1;
	text-align: center;
	font-size: 22rpx;
	font-weight: 700;
	color: #6b6560;
}

.chart-head-cell--bare {
	flex: 0.8;
	text-align: left;
	padding-left: 8rpx;
}

.chart-scroll {
	flex: 1;
	max-height: 62vh;
}

.chart-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 14rpx 8rpx;
	margin-bottom: 10rpx;
	border-radius: 20rpx;
	background: #fff;
	border: 3rpx solid var(--meng-border-warm);
}

.chart-row--playing {
	border-color: #7fd49a;
	background: #f0fff4;
}

.chart-row-stem {
	width: 108rpx;
	flex-shrink: 0;
	margin-right: 8rpx;
}

.chart-row-pflr {
	flex: 1;
	min-width: 0;
}

.chart-row-chain-hint {
	flex-shrink: 0;
	font-size: 22rpx;
	font-weight: 700;
	color: #c44d6a;
	padding: 0 8rpx;
}

.chart-foot {
	margin-top: 12rpx;
	text-align: center;
	font-size: 24rpx;
	color: #9a9088;
	line-height: 1.45;
}
</style>
